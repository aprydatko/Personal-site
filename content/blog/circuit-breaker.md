---
title: "Backend and distributed-system patterns: Circuit Breaker"
description: A practical guide to the Circuit Breaker pattern, how it protects services from cascading failure, and how to design recovery, fallback, and observability.
date: "2026-09-13"
category: Backend
readingTime: 7 min read
featured: false
published: true
---

A Circuit Breaker prevents an application from repeatedly calling a dependency that is failing or unavailable.

Instead of allowing every request to wait for a timeout, the breaker opens after enough failures and rejects calls immediately. After a recovery interval, it permits a small probe request. If the dependency is healthy again, the breaker closes; if not, it opens again.

```text
Closed ── failure threshold ──→ Open
  ↑                              │
  └──── successful probe ── Half-open
                                 │
                   failed probe ┘
```

The goal is graceful degradation and recovery. A circuit breaker does not make a dependency reliable; it limits the damage its failure can cause to callers and shared resources.

## The three states

### Closed

Calls flow to the dependency. The breaker records failures in a rolling window or consecutive-failure counter.

### Open

Calls are rejected locally until the reset timeout expires. The application can return a fallback, cached value, or typed dependency-unavailable error.

### Half-open

Only a limited number of probe calls are allowed. A successful probe indicates recovery; a failed probe returns the circuit to open. Limiting probes prevents a recovering service from being flooded.

## A small contract

Keep the breaker independent from the HTTP or RPC client it protects:

```ts
type CircuitState = 'closed' | 'open' | 'half-open';

type CircuitClock = { now(): number };
type CircuitPolicy = {
  failureThreshold: number;
  resetTimeoutMs: number;
};

type CircuitOpenError = Error & { code: 'circuit_open' };
```

The dependency call should be supplied as a function. This makes the breaker usable around HTTP calls, database connections, message publishers, or any other remote operation.

```ts
type Breaker<T> = {
  execute(operation: () => Promise<T>): Promise<T>;
  state(): CircuitState;
};
```

## Failure classification

Not every error should count toward opening the circuit. A client-side validation error, a 404, or a rejected business operation may prove that the dependency is working correctly.

```ts
const isTransientDependencyFailure = (error: unknown) => {
  if (!(error instanceof DependencyError)) return false;
  return error.code === 'timeout' || error.code === 'unavailable' || error.code === 'overloaded';
};
```

Classify errors at the integration boundary, where provider-specific status codes and exceptions are still available. Treating every exception as an infrastructure failure can open a circuit because of malformed input or a programming bug.

## State transitions

A simplified breaker can be expressed as a state machine:

```ts
const canExecute = (state: CircuitState, openedAt: number | null, now: number, resetTimeoutMs: number) => {
  if (state === 'closed') return true;
  if (state === 'half-open') return true;
  return openedAt !== null && now - openedAt >= resetTimeoutMs;
};
```

In production, the transition and counter updates must be concurrency-safe. Multiple requests may observe an expired open circuit at the same time. Use an atomic state transition or a single-flight probe so only the configured number of recovery calls can pass.

## Fallbacks

An open circuit should not automatically mean “return empty data.” The fallback belongs to the feature contract:

```ts
const getRecommendations = async (userId: string) => {
  try {
    return await recommendationsBreaker.execute(() => recommendationsClient.list(userId));
  } catch (error) {
    if (isCircuitOpen(error) || isTransientDependencyFailure(error)) {
      return recommendationCache.get(userId) ?? [];
    }
    throw error;
  }
};
```

Good fallbacks include a stale cache, a reduced feature, a queued command, or a clear unavailable response. A fallback that hides a required payment, authorization, or inventory decision can be unsafe. Make the degraded behavior explicit to the caller and user.

## Circuit Breaker and retries

Retries and circuit breakers solve different problems:

```text
retry:    recover one operation from a short transient failure
breaker:  stop sending work when a dependency is broadly unhealthy
```

Their order matters. A common arrangement is a short, bounded retry inside the breaker so one logical call can tolerate a brief blip while repeated failure still contributes to opening the circuit:

```ts
const callDependency = () => withRetry(
  () => client.fetch(),
  { maxAttempts: 2, backoffMs: 50 },
);

await breaker.execute(callDependency);
```

Avoid multiplying retries across layers. If an HTTP client, SDK, service client, and circuit breaker each retry, one user request can create a surprising number of downstream calls. Define the retry budget and idempotency policy at the boundary that owns the operation.

## Timeouts are required

A breaker cannot react quickly if calls have no bounded timeout. A dependency that hangs is a failure mode just as important as an explicit 500 response.

```ts
const withTimeout = async <T>(operation: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new DependencyError('timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
```

Prefer a client or platform timeout that also cancels the underlying request. A race that merely rejects the caller while the network operation continues can still consume connections and capacity.

## Distributed deployment concerns

In a multi-instance service, each process may have its own breaker state. That is often useful: one instance should not necessarily stop traffic everywhere because of a local network path or connection pool problem.

For a dependency-wide view, aggregate metrics rather than sharing every state transition. A distributed breaker stored in Redis can coordinate behavior, but it adds latency, another dependency, and its own failure mode. Use it only when coordinated admission control is genuinely required.

Partition breakers by dependency and meaningful scope. A single global breaker for an entire application can disable healthy capabilities when one provider fails. Separate circuits for payment authorization, product search, and email delivery usually produce safer degradation.

## Observability

Record state changes and rejected calls as first-class signals:

```text
circuit.state_changed   dependency=recommendations  from=closed  to=open
circuit.call_rejected   dependency=recommendations  state=open
circuit.probe_succeeded dependency=recommendations
```

Track call volume, failure type, latency, open duration, half-open probe results, and fallback usage. Include the dependency name and circuit scope in metrics, but avoid high-cardinality user or request identifiers in metric labels.

Logs should explain why a circuit opened and when it recovered. Traces should distinguish a locally rejected call from a request that reached the dependency.

## Testing a breaker

Use a fake clock and a controllable operation so tests do not depend on real time:

```ts
it('opens after transient failures and allows a recovery probe', async () => {
  const clock = createFakeClock();
  const breaker = createCircuitBreaker(clock, {
    failureThreshold: 2,
    resetTimeoutMs: 1_000,
  });
  const operation = vi.fn()
    .mockRejectedValueOnce(new DependencyError('unavailable'))
    .mockRejectedValueOnce(new DependencyError('unavailable'))
    .mockResolvedValue('ok');

  await expect(breaker.execute(operation)).rejects.toThrow();
  await expect(breaker.execute(operation)).rejects.toThrow();
  await expect(breaker.execute(operation)).rejects.toMatchObject({ code: 'circuit_open' });

  clock.advanceBy(1_000);
  await expect(breaker.execute(operation)).resolves.toBe('ok');
  expect(breaker.state()).toBe('closed');
});
```

Also test non-transient errors, concurrent probes, timeout classification, fallback behavior, counter reset after success, and recovery after a half-open failure. Integration tests should verify the real client cancels timed-out work and exposes the metrics expected by operations.

## Common mistakes

### Opening on every error

Count only failures that indicate the dependency cannot safely serve requests. Domain rejections and invalid input usually should not trip the circuit.

### No timeout

Hanging calls consume threads, connections, and request budgets. The circuit needs a finite observation window.

### Probing with a full traffic surge

Half-open should admit a small number of probes. Otherwise recovery can create a second outage.

### One circuit for everything

Separate dependencies and capability scopes so one failing provider does not disable unrelated features.

### Treating open as success

An open circuit is an operational state, not a successful business result. Return a typed error or an explicitly designed fallback.

### Ignoring stale recovery

A circuit can remain open after a dependency recovers if no request reaches the reset interval or probe logic is broken. Expose state and recovery metrics, and provide safe operational controls where needed.

## A practical checklist

Before adding a Circuit Breaker, ask:

- What failure modes should count: timeouts, overload, connection errors, 5xx responses?
- What is the timeout and retry budget for one logical operation?
- What fallback is safe for this feature?
- How many failures and over what window should open the circuit?
- How many half-open probes are allowed?
- Should state be local to an instance or coordinated across instances?
- Are circuits separated by dependency and capability?
- Can operators see state changes, rejected calls, and fallback usage?
- Are idempotency and cancellation preserved when retries are involved?

## Final thoughts

Circuit Breaker protects a service from spending its own capacity on a dependency that is already failing. Combine bounded timeouts, carefully classified failures, limited recovery probes, and honest fallbacks.

Keep the breaker close to the dependency boundary, make its state observable, and tune it from real latency and failure patterns. It is a resilience control—not a substitute for healthy dependencies, capacity planning, or good error contracts.
