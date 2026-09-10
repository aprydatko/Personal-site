---
title: "Core Patterns: Decorator"
description: A practical guide to the Decorator pattern, how to add behavior without changing an existing object, and when wrappers are clearer than inheritance.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Decorator pattern adds behavior to an object while preserving the interface that callers already use.

A decorator wraps an existing implementation, performs extra work before or after delegating, and returns an object that can be used wherever the original object was expected. This makes logging, caching, retries, authorization, metrics, and other cross-cutting behavior composable.

The wrapped object keeps doing its original job. The decorator adds a layer around it without modifying its source code or creating a subclass for every combination of behavior.

## The basic shape

Start with a contract:

```ts
type EmailSender = {
  send(input: EmailInput): Promise<void>;
};
```

An ordinary implementation sends the email:

```ts
const emailSender: EmailSender = {
  async send(input) {
    await provider.send(input);
  },
};
```

A logging decorator preserves the same contract:

```ts
const withLogging = (
  sender: EmailSender,
  logger: Logger,
): EmailSender => ({
  async send(input) {
    logger.info('Sending email', { to: input.to });

    try {
      await sender.send(input);
      logger.info('Email sent', { to: input.to });
    } catch (error) {
      logger.error('Email failed', { to: input.to, error });
      throw error;
    }
  },
});
```

The decorated sender can be passed anywhere an `EmailSender` is expected:

```ts
const loggedSender = withLogging(emailSender, logger);
const registerUser = createRegisterUser({ emailSender: loggedSender });
```

The registration workflow does not know whether logging is present.

## Decorator versus inheritance

Inheritance adds behavior by creating a subtype. Decorator adds behavior by wrapping an object.

Inheritance can work when the subtype is a genuine replacement for the parent and the hierarchy is stable. It becomes awkward when behavior varies along several independent dimensions. Logging, caching, retries, metrics, and authorization can create many subclasses or a base class with complicated configuration.

Decorators can be composed:

```ts
const client = withMetrics(
  withRetry(
    withLogging(baseClient, logger),
    retryPolicy,
  ),
  metrics,
);
```

Each wrapper has one focused responsibility, and the composition root decides which layers apply.

This is one practical form of [Composition: Build Behavior by Combining Small Parts](/blog/composition).

## Common decorator behaviors

### Logging and metrics

Observability is a natural fit because the decorator can measure an operation without changing the operation's core implementation:

```ts
const withMetrics = (
  client: ApiClient,
  metrics: Metrics,
): ApiClient => ({
  async request(input) {
    const startedAt = Date.now();

    try {
      const result = await client.request(input);
      metrics.recordSuccess(input.path, Date.now() - startedAt);
      return result;
    } catch (error) {
      metrics.recordFailure(input.path, Date.now() - startedAt);
      throw error;
    }
  },
});
```

The decorator should not alter the result or error contract unless that change is intentional and documented.

### Caching

A cache decorator can avoid repeating expensive work:

```ts
const withCache = <T>(
  loader: () => Promise<T>,
  cache: Cache,
  key: string,
) => async (): Promise<T> => {
  const cached = await cache.get<T>(key);
  if (cached !== undefined) return cached;

  const value = await loader();
  await cache.set(key, value);
  return value;
};
```

For an object interface, the decorator can cache based on method arguments. Be explicit about expiration, invalidation, errors, and whether concurrent requests should share an in-flight promise.

### Retries

Retries belong at a boundary where transient failures can be identified:

```ts
const withRetry = (
  client: ApiClient,
  policy: RetryPolicy,
): ApiClient => ({
  request(input) {
    return retry(() => client.request(input), policy);
  },
});
```

A retry decorator must understand idempotency. Retrying a read is often safer than retrying a payment or another operation that may have succeeded before the response was lost. The decorator should not blindly retry every error.

### Authorization

A decorator can enforce a capability before delegating:

```ts
const withPermission = (
  service: ReportService,
  permissions: PermissionChecker,
): ReportService => ({
  async exportReport(input) {
    const allowed = await permissions.can('report.export', input.userId);
    if (!allowed) throw new ForbiddenError();

    return service.exportReport(input);
  },
});
```

Keep authorization close to the boundary where the capability is exposed. Do not rely on a UI-only decorator or guard for security-sensitive enforcement; server-side boundaries still need to check permissions.

## Decorators as higher-order functions

Functions can be decorated just as objects can:

```ts
type Handler<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

const withTiming = <TInput, TOutput>(
  handler: Handler<TInput, TOutput>,
  report: (durationMs: number) => void,
): Handler<TInput, TOutput> => async (input) => {
  const startedAt = performance.now();

  try {
    return await handler(input);
  } finally {
    report(performance.now() - startedAt);
  }
};
```

This style is often concise for use cases, route handlers, or middleware. The same principle applies: the wrapper preserves the callable contract and adds behavior around it.

## Decorators in frontend applications

In frontend code, composition often replaces class-based decorators. A component wrapper can add behavior while preserving the component's purpose:

```tsx
function withLoading<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P & { isLoading: boolean }> {
  return function LoadingComponent({ isLoading, ...props }) {
    if (isLoading) return <Spinner />;
    return <Component {...(props as P)} />;
  };
}
```

Hooks, providers, and render props can often express the same concern more clearly. A wrapper should add a coherent behavior and preserve understandable prop ownership. Deeply nested wrappers can make debugging and component trees difficult to follow.

For data clients, function decorators are often simpler:

```ts
const withRequestState = <T>(
  request: () => Promise<T>,
  setState: (state: RequestState<T>) => void,
) => async () => {
  setState({ status: 'loading' });

  try {
    const data = await request();
    setState({ status: 'success', data });
    return data;
  } catch (error) {
    setState({ status: 'error', error });
    throw error;
  }
};
```

The request remains responsible for fetching data; the decorator manages the repeated loading-state behavior.

## Order matters

Decorators are not always commutative. Their order can change behavior:

```ts
withRetry(withMetrics(client, metrics), policy);
withMetrics(withRetry(client, policy), metrics);
```

In the first version, metrics may record every retry attempt. In the second, metrics may record one logical request that internally retries. Neither is universally correct; choose deliberately and document the intended measurement.

The same applies to caching and authorization. Authorization should generally happen before returning cached protected data, while caching may be appropriate after permission checks depending on the data scope.

## Preserving the contract

A decorator should preserve the wrapped interface's important behavior:

- Return values should keep the same meaning.
- Errors should remain catchable and identifiable.
- `this` context should not be lost when wrapping methods.
- Cancellation and timeouts should be forwarded where supported.
- Resource cleanup should happen even when the wrapped operation fails.

For example, a decorator that turns a rejected promise into a resolved `null` has changed the contract. That can be valid, but it is no longer transparent and should have a new name or explicit type.

## Testing decorators

Test a decorator with a small fake wrapped object and verify both delegation and added behavior:

```ts
it('records a successful request', async () => {
  const client: ApiClient = {
    request: vi.fn().mockResolvedValue({ ok: true }),
  };
  const metrics = createFakeMetrics();
  const decorated = withMetrics(client, metrics);

  await decorated.request({ path: '/health' });

  expect(client.request).toHaveBeenCalledWith({ path: '/health' });
  expect(metrics.successes).toHaveLength(1);
});
```

Also test failures, cleanup, retries, cache misses and hits, and any ordering assumptions. A decorator is small, but an incorrect wrapper can affect every consumer behind it.

## Common mistakes

### A decorator that changes too much

If the wrapper transforms the domain, selects a different provider, and handles unrelated business rules, it is no longer a focused decorator. Split responsibilities or use a facade or adapter instead.

### Hiding expensive behavior

A decorator that adds network calls, retries, or caching can change performance and reliability. Make important costs visible in naming, documentation, and metrics.

### Losing arguments or context

Function wrappers can accidentally drop arguments or change `this`. Keep the wrapper's signature typed and test the forwarded call.

### Too many wrapper layers

Composability is useful until the call path becomes impossible to inspect. Group stable cross-cutting setup in one composition boundary and keep the list of decorators discoverable.

### Using inheritance for every concern

A base class with logging, caching, authorization, and retry hooks can become rigid. Prefer wrappers when each concern can be added independently and the interface remains stable.

## Decorator versus related patterns

| Pattern | Main question it answers |
| --- | --- |
| Decorator | How can behavior be added while preserving an interface? |
| Adapter | How can an incompatible interface fit the expected contract? |
| Facade | How can a complex subsystem expose a simpler API? |
| Proxy | How can access to an object be controlled or represented? |
| Middleware | How can a request or operation pass through ordered processing steps? |
| Strategy | Which interchangeable algorithm should perform the behavior? |

Decorator and Proxy have similar shapes. A decorator usually adds responsibilities while preserving the object's capability. A proxy often controls access, defers creation, or represents another object, although the terms can overlap.

## A practical checklist

Before adding a decorator, ask:

- Is there repeated cross-cutting behavior around an existing contract?
- Can the wrapper preserve the original interface and important semantics?
- Should the behavior apply to every caller of this instance or only one workflow?
- Does order with other decorators matter?
- Are errors, cancellation, cleanup, and performance effects explicit?
- Would middleware, a facade, an adapter, or a direct function be clearer?
- Can the wrapper be tested independently with a small fake?

Use a decorator when the wrapped behavior remains the core capability and the added concern is orthogonal. Name decorators after what they add: `withLogging`, `withRetry`, `withCache`, or `withPermission`.

## How Decorator connects to other design ideas

Decorators are a natural application of [Composition: Build Behavior by Combining Small Parts](/blog/composition). Small wrappers can be assembled around a core implementation at the composition boundary.

They work with [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection) because each decorator receives the object and services it needs rather than reaching into global state.

An [Adapter](/blog/adapter) can be decorated with logging or retry behavior, while a [Facade](/blog/facade) can expose the resulting capability to a feature. A [Strategy](/blog/strategy) may be wrapped when the selected algorithm needs caching or metrics.

## Final thoughts

The Decorator pattern lets you add behavior without changing a stable implementation or multiplying subclasses. Keep the interface intact, keep each wrapper focused, and assemble layers where their order and scope are visible.

Use decorators for orthogonal concerns such as logging, metrics, caching, retries, and authorization. When the wrapper starts becoming the feature itself, choose a facade, adapter, strategy, or explicit workflow instead.
