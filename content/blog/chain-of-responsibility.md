---
title: "Behavioral Patterns: Chain of Responsibility"
description: A practical guide to the Chain of Responsibility pattern, how requests move through ordered handlers, and when delegation is clearer than a large conditional.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Chain of Responsibility pattern passes a request through an ordered sequence of handlers until one handler processes it or the chain is exhausted.

Each handler knows how to handle one kind of request and whether to delegate to the next handler. The sender does not need to know which concrete handler will respond.

```text
request → handler A → handler B → handler C → fallback
             handled?     handled?     handled?
```

The pattern is useful when several independent rules may respond to the same input: support escalation, authorization policies, validation, discount rules, command routing, and fallback resolution.

## The basic contract

A handler can either return a result or pass the request onward:

```ts
type SupportRequest = {
  category: 'billing' | 'technical' | 'account';
  message: string;
};

type SupportResponse = {
  team: string;
  automated: boolean;
};

type SupportHandler = {
  handle(request: SupportRequest): SupportResponse | null;
};
```

An implementation handles only the case it owns:

```ts
const technicalSupport: SupportHandler = {
  handle(request) {
    if (request.category !== 'technical') return null;

    return { team: 'engineering-support', automated: false };
  },
};
```

Returning `null` means “not mine.” It does not mean the request failed. That distinction lets the chain continue without mixing routing with error handling.

## Building the chain

A small chain runner makes the delegation policy explicit:

```ts
const createSupportChain = (
  handlers: SupportHandler[],
  fallback: SupportHandler,
) => ({
  handle(request: SupportRequest): SupportResponse {
    for (const handler of handlers) {
      const response = handler.handle(request);
      if (response) return response;
    }

    const response = fallback.handle(request);
    if (!response) throw new Error('Support chain has no fallback');

    return response;
  },
});
```

The caller depends on the chain contract rather than knowing which handler is first:

```ts
const support = createSupportChain(
  [billingSupport, technicalSupport, accountSupport],
  generalSupport,
);

const response = support.handle(request);
```

Prefer an explicit fallback when every valid request must receive an answer. Failing loudly is safer than returning an accidental empty response.

## Ordering is behavior

Handlers may overlap. A premium-customer handler and a generic billing handler can both match the same request, so order determines which policy wins:

```ts
const pricing = createDiscountChain([
  vipDiscount,
  seasonalDiscount,
  firstOrderDiscount,
  noDiscount,
]);
```

Put the most specific rules before broad rules. Document whether the chain uses first match, highest priority, or best result. If the business rule is “choose the largest discount,” a first-match chain is the wrong abstraction; collect candidates and select the maximum explicitly.

When order is configured from data, give each handler a numeric priority or a named policy and sort it in one composition boundary. Do not rely on import order or filesystem order.

## Chain versus a large conditional

A conditional is often the right solution when the cases are small, stable, and owned by one decision:

```ts
const routeSupport = (request: SupportRequest) => {
  if (request.category === 'billing') return billingSupport.handle(request);
  if (request.category === 'technical') return technicalSupport.handle(request);
  return accountSupport.handle(request);
};
```

Use a chain when handlers need to evolve independently, be reordered, added by configuration, or reused in different compositions. Do not split a short, stable decision into many classes merely to apply a pattern.

## Linked handlers

The chain can also be represented as linked objects. This is useful when handlers need to delegate conditionally:

```ts
type Next<TRequest, TResult> = (request: TRequest) => TResult;
type Handler<TRequest, TResult> = (request: TRequest, next: Next<TRequest, TResult>) => TResult;

const link = <TRequest, TResult>(
  handlers: Handler<TRequest, TResult>[],
  fallback: Next<TRequest, TResult>,
): Next<TRequest, TResult> => {
  return handlers.reduceRight<Next<TRequest, TResult>>(
    (next, handler) => (request) => handler(request, next),
    fallback,
  );
};
```

This shape resembles middleware because a handler receives `next`. The key distinction is intent: Chain of Responsibility focuses on choosing who handles a request, while middleware usually surrounds a known endpoint with ordered cross-cutting behavior.

## Validation chains

A chain can stop at the first validation failure:

```ts
type ValidationResult = { valid: true } | { valid: false; reason: string };
type Validator<T> = (input: T) => ValidationResult;

const validateCheckout = (validators: Validator<CheckoutInput>) => {
  // compose validators according to the product's error-reporting contract
};
```

Choose the failure model deliberately. First failure is efficient and can protect dependent checks. Collecting every failure is more helpful for forms. If the application needs both behaviors, expose separate functions rather than making one chain secretly change semantics.

## Asynchronous handlers

Handlers often need remote or persistent data. The same first-match idea can be asynchronous:

```ts
type AccessRequest = { userId: string; resource: string };
type AccessDecision = { allowed: boolean; reason: string };
type AsyncAccessHandler = {
  handle(request: AccessRequest): Promise<AccessDecision | null>;
};

const authorize = (handlers: AsyncAccessHandler[]) => async (
  request: AccessRequest,
): Promise<AccessDecision> => {
  for (const handler of handlers) {
    const decision = await handler.handle(request);
    if (decision) return decision;
  }

  return { allowed: false, reason: 'no_policy_matched' };
};
```

Sequential evaluation preserves priority but increases latency. Parallel evaluation may be faster, but it changes semantics, increases load, and can make “first handler wins” impossible. Use parallel work only when handlers are independent and the selection rule supports it.

## Distributed systems and message routing

At a message boundary, a chain can route different event versions or message types to dedicated consumers:

```ts
type Message = { type: string; version: number; payload: unknown };
type MessageHandler = (message: Message) => Promise<boolean>;

const routeMessage = async (
  message: Message,
  handlers: MessageHandler[],
) => {
  for (const handler of handlers) {
    if (await handler(message)) return { handled: true };
  }

  return { handled: false };
};
```

The `boolean` result makes delegation explicit. A handler should return `true` only after it has accepted responsibility. If it fails after accepting the message, the consumer should surface the error to the retry or dead-letter policy rather than allowing a later handler to process the same message as if nothing happened.

In distributed systems, routing is only one concern. Define acknowledgment timing, duplicate delivery behavior, retries, ordering guarantees, and poison-message handling around the chain. A chain does not provide exactly-once processing or global ordering by itself.

## Chain versus middleware and event subscribers

| Pattern | Selection model | Typical use |
| --- | --- | --- |
| Chain of Responsibility | One handler usually handles the request | Fallbacks, routing, policy resolution |
| Middleware | Every layer may run around the next step | Auth, logging, tracing, rate limiting |
| Event subscribers | Many consumers may handle the event | Notifications, projections, integrations |
| Strategy | One algorithm is selected explicitly | Pricing, serialization, storage choice |

If multiple independent consumers must all react, use event publication or a fan-out pipeline. A chain that stops after the first match would silently skip valid subscribers.

## Testing a chain

Test both individual handlers and the composition rules:

```ts
it('delegates until a handler accepts the request', () => {
  const first = { handle: vi.fn().mockReturnValue(null) };
  const second = {
    handle: vi.fn().mockReturnValue({ team: 'accounts', automated: false }),
  };
  const support = createSupportChain([first, second], generalSupport);

  expect(support.handle(request)).toEqual({
    team: 'accounts',
    automated: false,
  });
  expect(first.handle).toHaveBeenCalledOnce();
  expect(second.handle).toHaveBeenCalledOnce();
});
```

Also verify that a later handler is not called after a match, the fallback handles unmatched input, specific rules precede generic rules, and handler errors follow the intended policy. For message chains, include tests for rejected processing and acknowledgment behavior.

## Common mistakes

### Ambiguous ownership

If several handlers can handle the same request, define the precedence rule. Otherwise a harmless reorder can change production behavior.

### No terminal behavior

An unmatched request should produce a clear fallback or a typed “not handled” result. Avoid silent drops at system boundaries.

### Using a chain for fan-out

If every subscriber must react, a first-match chain is incorrect. Use explicit fan-out and handle partial failures separately.

### Hidden remote calls

An asynchronous chain can become a latency multiplier. Measure each handler, set timeouts, and decide whether expensive handlers should be preceded by cheap filters.

### Handlers with unrelated side effects

A handler should decide whether it owns the request and perform the work associated with that responsibility. Keep orchestration, persistence, and cross-cutting concerns in clear layers.

## A practical checklist

Before introducing Chain of Responsibility, ask:

- Is the request handled by one of several possible owners?
- Is first-match, priority, best-match, or another selection rule correct?
- What happens when no handler accepts the request?
- Is handler order explicit, tested, and observable?
- Would a simple conditional or strategy be clearer?
- Are handlers independent enough to add, remove, or reorder safely?
- For async or distributed work, what are the timeout, retry, acknowledgment, and duplicate-delivery rules?
- Should all consumers run instead of only one?

## Final thoughts

Chain of Responsibility keeps request selection out of the sender and lets focused handlers evolve independently. It is a good fit for ordered policies, fallback resolution, routing, and “one of these handlers owns this” workflows.

Make the selection rule visible, keep a reliable terminal behavior, and distinguish single-owner chains from fan-out event processing. When the chain becomes difficult to reason about, replace implicit ordering with an explicit policy or a simpler decision model.
