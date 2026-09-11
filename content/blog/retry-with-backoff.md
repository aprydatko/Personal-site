---
title: "Retry with Backoff"
description: How to retry transient failures safely using bounded exponential backoff, jitter, cancellation, and idempotent operations.
date: "2026-09-11"
category: Reliability
readingTime: 7 min read
featured: false
published: true
---

Retry with backoff is a resilience pattern for operations that may fail temporarily.

Instead of failing immediately or retrying in a tight loop, the caller waits before trying again. The wait usually grows after each failure, giving a recovering service, network, or resource time to become available.

```ts
const wait = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

const retry = async <T>(
  operation: () => Promise<T>,
  attempts: number,
  delayMs: number,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await wait(delayMs);
    }
  }

  throw lastError;
};
```

This fixed-delay version is a starting point. A production retry policy usually adds exponential growth, jitter, a maximum delay, an overall time budget, and a rule for which errors are retryable.

## Transient versus permanent failures

Retrying makes sense only when a later attempt has a reasonable chance of succeeding.

Transient failures may include:

- A temporary network disconnect.
- A service returning `503 Service Unavailable`.
- A rate limit that includes a future retry time.
- A database connection that is being re-established.
- A short-lived timeout from an overloaded dependency.

Permanent failures usually should not be retried:

- Invalid credentials.
- Malformed input.
- A missing resource when the request will not change.
- A permission error.
- A validation failure.

The operation or error type should provide enough information to make this decision. Blindly retrying every exception can amplify incidents and delay useful error reporting.

## Exponential backoff

Exponential backoff increases the delay after each failure:

```ts
const exponentialDelay = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
) => Math.min(
  maxDelayMs,
  baseDelayMs * 2 ** attempt,
);

// 100ms, 200ms, 400ms, 800ms, ... up to the maximum
```

The growing delay reduces pressure on a dependency that may already be overloaded. A maximum prevents the wait from becoming unexpectedly large.

The exact sequence is a policy choice. Define whether `attempt` starts at zero for the first retry or at one for the first operation, and test the result explicitly.

## Jitter prevents synchronized retries

If many clients fail at the same time and all use the same backoff sequence, they may retry at the same moments. This creates a synchronized burst known as a thundering herd.

Jitter adds controlled randomness:

```ts
const fullJitterDelay = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number = Math.random,
) => {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(random() * (cap + 1));
};
```

Injecting `random` makes the policy testable. Other jitter strategies include equal jitter and decorrelated jitter. The important goal is to spread retries rather than have every client follow an identical schedule.

## A bounded retry helper

A reusable helper should make its policy visible:

```ts
type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  random?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
};

const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> => {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs,
    shouldRetry = () => true,
    random = Math.random,
    sleep = wait,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const hasAttemptsLeft = attempt < maxAttempts - 1;
      if (!hasAttemptsLeft || !shouldRetry(error, attempt)) break;

      const delay = fullJitterDelay(
        attempt,
        baseDelayMs,
        maxDelayMs,
        random,
      );

      await sleep(delay);
    }
  }

  throw lastError;
};
```

The helper limits attempts and delegates retry classification to the caller. A production implementation may also accept logging, an abort signal, a total time budget, and a server-provided retry delay.

## Respecting server guidance

Some services provide a `Retry-After` header or an equivalent field. When present, the client should generally respect it within a safe maximum:

```ts
const chooseRetryDelay = (
  serverDelayMs: number | undefined,
  calculatedDelayMs: number,
  maxDelayMs: number,
) => Math.min(
  maxDelayMs,
  serverDelayMs ?? calculatedDelayMs,
);
```

The server may know more about rate limits and recovery than the client does. Still enforce a client-side maximum and overall deadline so a malformed or excessive server delay does not hold a request forever.

## Idempotency is essential

Retrying repeats an operation. That is safe only when repeating it does not create an incorrect result.

Reads are often naturally idempotent. Writes require more care:

```ts
await retryWithBackoff(
  () => api.createPayment({
    amount,
    idempotencyKey: requestId,
  }),
  options,
);
```

An idempotency key lets the server recognize that repeated requests represent the same logical operation. Without one, a timeout after a successful payment could cause a retry to charge the customer twice.

If an operation is not idempotent and cannot be made so, do not add blind retries. Use a workflow with explicit status lookup, compensation, or manual recovery instead.

## HTTP retry decisions

HTTP status codes provide useful signals, but the correct policy depends on the API:

- `408 Request Timeout` may be retryable.
- `429 Too Many Requests` is often retryable, respecting `Retry-After`.
- `500 Internal Server Error` may be transient.
- `502 Bad Gateway`, `503 Service Unavailable`, and `504 Gateway Timeout` may be transient.
- `400 Bad Request` is usually not retryable.
- `401 Unauthorized` needs refreshed credentials or user action.
- `403 Forbidden` is usually not fixed by retrying.
- `404 Not Found` is usually not retryable unless eventual consistency is expected.

Do not treat status codes as a complete policy. Request method, idempotency, service documentation, and error payloads also matter.

## Cancellation and deadlines

Retries can outlive the user action or request that started them. Accept an abort signal and stop before another attempt:

```ts
const waitWithSignal = (durationMs: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = setTimeout(resolve, durationMs);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
```

The operation itself must also accept the signal if in-flight work should be cancelled:

```ts
const response = await fetch(url, { signal });
```

An attempt limit is not the same as a time limit. A few long delays can still exceed the caller's deadline, so use both when the request has a bounded lifetime.

## Retry budgets and layered retries

Retries at multiple layers multiply. A database client may retry, the API client may retry, and a queue consumer may retry the whole message. What appears to be three attempts at each layer can become many actual operations.

Choose one owner for most retry policy, or make budgets explicit across layers. Log the attempt number and the original operation ID so failures can be traced without confusing a retry with a new business action.

## Retry with a fallback

Sometimes exhausting retries should produce a fallback rather than only an exception:

```ts
const loadRecommendations = async () => {
  try {
    return await retryWithBackoff(fetchRecommendations, options);
  } catch {
    return [];
  }
};
```

Fallbacks are appropriate only when the degraded result is safe and visible. An empty recommendation list may be acceptable; silently treating a failed payment or authorization check as success is not.

Keep the original error available for logging and diagnostics even when the user receives a friendly fallback.

## Observability

Retries can hide problems if they are not observable. Record:

- Operation name and request or correlation ID.
- Attempt number and total attempts.
- Error classification.
- Chosen delay and whether jitter was applied.
- Total elapsed time.
- Final success or failure.

Avoid logging sensitive request data. Metrics should distinguish first-attempt success from eventual success after retries, because a high retry-success rate can still indicate an unhealthy dependency.

## Common mistakes

### Retrying every error

Invalid input, permissions, and authentication failures usually need correction, not another request. Classify errors explicitly.

### Retrying non-idempotent operations

Repeated side effects can duplicate orders, charges, messages, or records. Use idempotency keys or an operation-specific recovery protocol.

### No maximum delay or attempt count

An unbounded retry loop can keep resources occupied forever and hide a permanent outage. Set attempts, delay, and total time limits.

### No jitter

Identical backoff schedules can synchronize clients and create another load spike. Add jitter for distributed clients.

### Ignoring cancellation

A user may navigate away while retries continue. Stop when the owner aborts or its deadline expires.

### Logging every retry as a new failure

This can make an incident appear much larger and obscure the original operation. Include attempt context and aggregate where appropriate.

### Stacking retry policies blindly

Nested retries can multiply delays and requests. Establish which layer owns retry behavior.

## Testing retry policies

Inject waiting and randomness so tests do not need real time:

```ts
it('retries a transient failure and then succeeds', async () => {
  const operation = vi.fn()
    .mockRejectedValueOnce(new Error('temporary'))
    .mockResolvedValueOnce('ok');
  const sleep = vi.fn().mockResolvedValue(undefined);

  const result = await retryWithBackoff(operation, {
    maxAttempts: 2,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    random: () => 0,
    sleep,
  });

  expect(result).toBe('ok');
  expect(operation).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledTimes(1);
});
```

If the implementation does not inject `sleep` yet, use fake timers or extract the delay policy separately. Test attempt limits, non-retryable errors, backoff caps, jitter bounds, `Retry-After`, cancellation, deadlines, and idempotency behavior.

## A practical checklist

Before adding retry with backoff, ask:

- Is the failure likely transient?
- Is repeating the operation safe and idempotent?
- Which layer owns retry policy?
- What is the maximum attempt count and total time?
- Should the delay grow exponentially, and how much jitter is needed?
- Does the server provide retry guidance?
- Can the caller cancel or reach a deadline?
- What telemetry will show retries and final outcomes?
- What safe fallback or recovery path exists after exhaustion?

## Final thoughts

Retry with backoff gives temporary failures room to recover while limiting pressure on dependencies. A reliable policy is bounded, selective, jittered, observable, and cancellable.

Treat retries as part of the operation’s contract. Confirm idempotency, respect server guidance, avoid multiplying policies across layers, and test timing without waiting in real time. Retrying is valuable when it recovers transient faults; it is harmful when it hides permanent failures or repeats unsafe side effects.
