---
title: "Backend and distributed-system patterns: Middleware"
description: A practical guide to middleware as an ordered pipeline for request processing, cross-cutting concerns, and resilient distributed services.
date: "2026-09-13"
category: Backend
readingTime: 8 min read
featured: false
published: true
---

Middleware is a composable step that runs around a request, command, or message before control reaches the next part of a system.

It is useful when several handlers need the same boundary behavior: authentication, request IDs, logging, rate limiting, validation, metrics, timeouts, or error translation. Instead of copying that behavior into every endpoint, middleware makes the processing order visible at the composition boundary.

The core shape is a pipeline:

```text
request → middleware A → middleware B → handler → response
             ↑                ↓
        before work       after work
```

Middleware is a control-flow pattern, not just an HTTP framework feature. The same idea works for message consumers, background jobs, CLI commands, and application use cases.

## The basic contract

A middleware function receives the current context and a `next` function. Calling `next` continues the pipeline; returning without calling it short-circuits the request.

```ts
type RequestContext = {
  requestId: string;
  user?: { id: string; roles: string[] };
  state: Record<string, unknown>;
};

type Next = () => Promise<Response>;
type Middleware = (context: RequestContext, next: Next) => Promise<Response>;
```

A simple middleware can add behavior before and after the handler:

```ts
const withTiming =
  (clock: { now(): number }): Middleware =>
  async (context, next) => {
    const startedAt = clock.now();

    try {
      return await next();
    } finally {
      const durationMs = clock.now() - startedAt;
      console.info('request.completed', {
        requestId: context.requestId,
        durationMs,
      });
    }
  };
```

The `finally` block matters. It records failures and cancellations as well as successful responses, and it keeps cleanup close to the resource or measurement it owns.

## Middleware is an onion

When middleware is composed, the call path usually has an onion shape:

```text
logging before
  auth before
    handler
  auth after
logging after
```

The order is part of the behavior. A common HTTP pipeline might look like this:

```ts
const pipeline = compose([
  withRequestId(ids),
  withErrorBoundary(errorMapper, logger),
  withAccessLog(logger),
  withAuthentication(tokens),
  withRateLimit(limiter),
  handler,
]);
```

Request ID and error handling belong near the outside so every failure has context. Authentication should usually happen before authorization and before protected work. Rate limiting may need to happen before expensive authentication, depending on the abuse model and whether anonymous requests are also limited.

Do not treat middleware order as incidental array ordering. Document the invariants and test the composition that matters.

## Composition

The composition function turns a list of middleware into one handler. A small implementation is often enough:

```ts
type Handler = (context: RequestContext) => Promise<Response>;

const compose = (layers: Middleware[], endpoint: Handler): Handler =>
  async (context) => {
    let index = -1;

    const dispatch = async (position: number): Promise<Response> => {
      if (position <= index) {
        throw new Error('next() called more than once');
      }
      index = position;

      const layer = layers[position];
      if (!layer) return endpoint(context);

      return layer(context, () => dispatch(position + 1));
    };

    return dispatch(0);
  };
```

The guard against calling `next` twice is important. Double dispatch can execute a handler twice, duplicate a message acknowledgment, or produce confusing response races.

In a framework, use its established middleware abstraction when one exists. Keep custom composition for application-level pipelines where the lifecycle and contract are owned by the system.

## Short-circuiting

Middleware can stop the pipeline when the request cannot proceed:

```ts
const requireRole = (role: string): Middleware => async (context, next) => {
  if (!context.user) {
    return new Response('Unauthenticated', { status: 401 });
  }

  if (!context.user.roles.includes(role)) {
    return new Response('Forbidden', { status: 403 });
  }

  return next();
};
```

Short-circuiting is appropriate for authentication, authorization, validation, maintenance mode, and rate limits. Keep the decision local to the concern. A logging middleware should not quietly become an authorization layer just because it has access to the request.

## Error boundaries

An error middleware should translate errors at a transport boundary while preserving useful diagnostics:

```ts
const withErrorBoundary =
  (logger: { error(error: unknown, fields: Record<string, string>): void }): Middleware =>
  async (context, next) => {
    try {
      return await next();
    } catch (error) {
      logger.error(error, { requestId: context.requestId });

      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'x-request-id': context.requestId },
      });
    }
  };
```

Do not expose stack traces or provider errors to clients by default. At the same time, avoid converting every failure into a generic 500 internally. Classify expected domain errors, validation errors, timeouts, and dependency failures before mapping them to the external protocol.

## Middleware in distributed systems

In a distributed system, middleware often surrounds message handling rather than HTTP handling:

```ts
type MessageContext = {
  messageId: string;
  traceId: string;
  attempt: number;
};

type MessageHandler = (context: MessageContext, payload: unknown) => Promise<void>;

const withIdempotency =
  (processed: { has(id: string): Promise<boolean>; mark(id: string): Promise<void> }): MessageMiddleware =>
  async (context, payload, next) => {
    if (await processed.has(context.messageId)) return;

    await next(context, payload);
    await processed.mark(context.messageId);
  };
```

The example shows an important distributed-systems reality: delivery is often at least once. A consumer can receive the same message again after completing the business action but before acknowledging the broker. Idempotency middleware can reduce duplicate effects, but the state change and the idempotency record need a safe consistency strategy—often one database transaction or a durable idempotency store.

Other useful message middleware includes:

- Trace context extraction and propagation.
- Schema validation at the consumer boundary.
- Retry classification with bounded backoff.
- Dead-letter routing for non-retryable failures.
- Concurrency limits and graceful shutdown.
- Metrics for processing time, lag, retries, and discarded messages.

Retries deserve particular care. Middleware should retry only failures that are likely transient, respect a maximum attempt count, and preserve idempotency keys. A retry around a non-idempotent operation can create duplicate payments, emails, or shipments.

## Context propagation

Request-scoped context is a useful way to carry correlation data without adding the same parameter to every function:

```ts
const withTraceContext =
  (tracer: { start(traceId: string): { end(): void } }): Middleware =>
  async (context, next) => {
    const span = tracer.start(context.requestId);

    try {
      return await next();
    } finally {
      span.end();
    }
  };
```

Pass context explicitly across process boundaries. A local request context does not automatically cross an HTTP call, queue publish, or scheduled job. Put trace IDs, causation IDs, tenant IDs, and idempotency keys into the protocol metadata where they are needed, then validate and normalize them at the receiving boundary.

Avoid putting mutable business state into a generic context bag. Context should carry boundary metadata and scoped capabilities; domain decisions should receive explicit inputs.

## Middleware versus related patterns

| Pattern | Main question it answers |
| --- | --- |
| Middleware | Which ordered steps surround an operation? |
| Decorator | How can behavior be added while preserving an interface? |
| Interceptor | How can a framework hook before and after a method or request? |
| Chain of Responsibility | Which handler should handle this request? |
| Pipeline | How can data pass through a sequence of transformations? |
| Facade | How can a subsystem expose a simpler workflow? |

These shapes overlap. Middleware is especially useful when order, short-circuiting, and continuation are central. A decorator is often clearer when wrapping one stable capability, such as a repository or payment gateway, independent of a request lifecycle.

## Testing middleware

Test each layer with a small fake `next` function:

```ts
it('rejects an unauthenticated request without calling the endpoint', async () => {
  const next = vi.fn();
  const context = { requestId: 'req-1', state: {} };

  const response = await requireRole('admin')(context, next);

  expect(response.status).toBe(401);
  expect(next).not.toHaveBeenCalled();
});
```

Also test successful continuation, thrown errors, cleanup, ordering, timeout behavior, and repeated `next` calls. For message middleware, test duplicate delivery, retryable versus permanent failures, acknowledgment timing, and shutdown while a message is in flight.

Integration tests should exercise the real framework adapter and composition root. Unit tests prove one concern behaves correctly; only a pipeline test proves the order and interaction of several concerns.

## Common mistakes

### Hidden work

Middleware that performs database queries, remote calls, or retries can make every endpoint slower. Name and measure expensive behavior, and apply it only where the contract needs it.

### Incorrect ordering

Logging after an error boundary may miss failures. Authorization after the handler is too late. Retrying a transaction outside its idempotency boundary can repeat side effects. Write down the intended order.

### One giant middleware

If a layer handles authentication, validation, metrics, caching, and business rules, it is a controller or application service in disguise. Split it by responsibility.

### Assuming exactly-once delivery

Message middleware cannot make an unreliable network exactly once. Design consumers to tolerate duplicates and make acknowledgment, transaction, and replay behavior explicit.

### Swallowing errors

Returning a successful response after a failed operation breaks observability and caller expectations. Translate errors deliberately; do not erase them for convenience.

## A practical checklist

Before adding middleware, ask:

- Is the concern truly cross-cutting for this pipeline?
- What must happen before `next`, after `next`, and on error?
- Can the layer short-circuit, and what response or acknowledgment does it own?
- Does ordering with other layers change correctness?
- Are timeouts, retries, cancellation, and cleanup explicit?
- If this is a message consumer, is processing idempotent under duplicate delivery?
- Is the context small, typed, and safe to propagate across boundaries?
- Can the layer be tested independently with a fake continuation?

## Final thoughts

Middleware makes boundary behavior composable and visible. Use it to establish request or message context, enforce cross-cutting policies, measure work, and translate failures before they reach the core handler.

Keep layers narrow, make ordering intentional, and treat distributed delivery as a source of duplicates and partial failure. A well-designed middleware pipeline protects application code from repetitive infrastructure concerns without hiding the system's real control flow.
