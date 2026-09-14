---
title: "Modular Architecture: Designing Systems That Can Change"
description: A practical guide to modular architecture, how to choose boundaries, control dependencies, and grow a codebase without turning every change into a system-wide edit.
date: "2026-09-14"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

Modular architecture is the practice of organizing a system into cohesive modules with explicit boundaries and controlled dependencies.

The goal is not to create the most folders, the smallest files, or the most abstract interfaces. The goal is to make change local: a change to pricing should not require understanding notifications, and replacing a payment provider should not rewrite the checkout workflow.

```text
Feature intent → module boundary → stable contract → implementation
```

A module can be a package, a directory, a bounded context, or simply a well-defined part of an application. The physical shape matters less than the relationship between its responsibilities and its dependencies.

## Why modularity matters

As a codebase grows, the cost of a feature is rarely just the new code. It is the number of existing decisions that the feature must know about and the number of unrelated parts that can be affected by a change.

Without useful boundaries, a feature often spreads across technical layers:

```text
controllers/
services/
repositories/
models/
utils/
```

This can be a reasonable starting point, but it makes one business capability difficult to follow. The order workflow may be distributed across several folders, while a single `services` folder slowly becomes a collection of unrelated rules.

Modularity brings the feature back into view. It groups code that changes together and makes the allowed relationships visible. This improves discoverability, testing, ownership, and the ability to replace an implementation safely.

Modularity is closely related to [cohesion and coupling](/blog/cohesion-coupling): keep related behavior together, and keep unnecessary relationships between modules small.

## What makes a good module?

A useful module usually has four properties:

- It has one clear responsibility or business purpose.
- Its public API is smaller than its implementation.
- It owns the rules and data that belong to its responsibility.
- Its dependencies point toward stable concepts rather than unstable details.

Consider an order module:

```ts
export type Order = {
  id: string;
  customerId: string;
  total: Money;
  status: 'draft' | 'submitted' | 'cancelled';
};

export type OrderService = {
  submit: (input: SubmitOrderInput) => Promise<SubmitOrderResult>;
  getById: (orderId: string) => Promise<OrderView | null>;
};
```

Callers do not need to know whether orders are stored in PostgreSQL, sent through an ORM, or reconstructed from events. They need a capability that is meaningful to the application.

The public contract should be intentional. If callers can import every table type, internal mapper, and provider client, the module has a boundary in name only.

## Choose boundaries around change

There is no universal module map. A good boundary follows the way the domain behaves and changes.

For a small commerce application, these may be useful modules:

```text
catalog
orders
payments
fulfillment
customers
```

These are stronger boundaries than `controllers`, `services`, and `repositories` when the main questions are about products, orders, and payment policy. Each module can still contain its own application workflow, domain rules, and infrastructure adapters.

Ask these questions when choosing a boundary:

- Which concepts are always discussed together?
- Which rules must be protected together in one transaction?
- Which team or owner changes this area?
- Which parts are likely to be replaced independently?
- Which data should other modules never modify directly?

The answers are more valuable than copying a diagram from another system. A boundary that reflects real change is easier to maintain than one that only reflects a framework's vocabulary.

## Encapsulation is more than private fields

Encapsulation means that a module controls how its state can change. It is not only a language feature such as `private`; it is also an API design decision.

Avoid exposing mutable records that let any caller bypass domain rules:

```ts
// Any caller can create an invalid transition.
order.status = 'submitted';
```

Expose an operation that expresses the permitted action instead:

```ts
class Order {
  private status: OrderStatus = 'draft';

  submit() {
    if (this.status !== 'draft') {
      throw new Error('Only draft orders can be submitted');
    }

    this.status = 'submitted';
  }
}
```

The module owns the invariant. A database constraint may provide a second line of defense, but callers should not need to remember every rule themselves.

This is also why direct writes across module boundaries are risky. `payments` should not update `orders.status` because it discovered a successful charge. It should communicate through a use case or an explicit event, allowing the orders module to decide whether that transition is valid.

## Control the direction of dependencies

Dependency direction determines which parts of a system are easy to replace. Business rules should not depend directly on web frameworks, database clients, or vendor SDKs.

```text
HTTP adapter ───────┐
Database adapter ───┼──→ application use case → domain rules
Payment adapter ────┘
```

The use case depends on capabilities, while adapters implement those capabilities:

```ts
type PaymentGateway = {
  authorize: (input: {
    amount: number;
    currency: string;
    reference: string;
  }) => Promise<{ authorizationId: string }>;
};

export const submitOrder = async (
  input: SubmitOrderInput,
  dependencies: {
    orders: OrderRepository;
    payments: PaymentGateway;
  },
) => {
  const order = await dependencies.orders.findById(input.orderId);
  if (!order) throw new Error('Order not found');

  order.submit();
  const authorization = await dependencies.payments.authorize({
    amount: order.total.amount,
    currency: order.total.currency,
    reference: order.id,
  });

  await dependencies.orders.save(order);
  return { orderId: order.id, authorizationId: authorization.authorizationId };
};
```

The payment adapter can translate this contract to Stripe, Adyen, or a test double. The business workflow does not need to import any provider-specific types.

Dependency inversion does not mean every function needs an interface. Hide a dependency when it is unstable, expensive to run in tests, owned by another boundary, or likely to have multiple implementations. A direct dependency on a stable standard-library function is usually clearer.

## Organize by feature, then by responsibility

Feature-oriented structure keeps related code close without giving up internal separation:

```text
orders/
  application/
    submit-order.ts
    list-orders.ts
  domain/
    Order.ts
    OrderRepository.ts
  infrastructure/
    SqlOrderRepository.ts
  presentation/
    order-routes.ts
```

The exact labels are optional. What matters is that the module owns its workflow and its boundary. If `submit-order.ts` needs to know how SQL rows are shaped, the infrastructure concern has leaked into the application layer.

For a small application, this can be much simpler:

```text
orders/
  order.ts
  order-service.ts
  order-repository.ts
```

Do not pre-build a deep architecture for a feature that has only one rule and one dependency. Start with a clear boundary and introduce inner layers when they solve a real problem.

## Communication between modules

Modules can communicate through direct contracts, application services, domain events, or messages. Choose the smallest mechanism that expresses the relationship.

Use a direct call when the caller needs an immediate result:

```ts
const quote = await pricing.quote({ productId, quantity });
```

Use an event when another module should react without becoming part of the initiating workflow:

```ts
await events.publish({
  type: 'order.submitted',
  orderId: order.id,
});
```

Events can reduce direct coupling, but they introduce delivery, ordering, retry, and observability concerns. They also make a workflow harder to trace. Do not turn every method call into an event simply to make a diagram look decoupled.

If an event is published after a database transaction, consider an outbox so a committed state change is not separated from its message by a process failure. If delivery can be retried, consumers should be idempotent.

## Modularity and databases

A module boundary is not automatically a separate database or schema. Many modular monoliths use one database while keeping ownership rules in application code.

```text
orders module → orders tables
payments module → payment tables
orders reads payment result through a contract
```

The important rule is ownership: other modules should not write directly to another module's tables. Reads may be shared deliberately, but the trade-off should be explicit. A reporting query that joins multiple contexts is different from business logic quietly depending on another module's internal table shape.

Separate schemas or databases can strengthen boundaries, but they add migrations, transactions, backups, operational ownership, and consistency decisions. Introduce them when independent scaling, security, deployment, or ownership requires it—not as a substitute for clear contracts.

## Testing modular systems

Test each module at the boundary it promises.

Domain tests should exercise rules without a database or network. Application tests should verify workflows with focused fakes for repositories and external capabilities. Adapter tests should verify translation to the database or provider. A small number of end-to-end tests should verify that the pieces are wired together.

```ts
it('rejects submitting an already submitted order', () => {
  const order = Order.from({ status: 'submitted' });

  expect(() => order.submit()).toThrow('Only draft orders can be submitted');
});
```

If a module cannot be tested without booting the entire application, inspect its imports and public surface. It may be coupled to infrastructure that should sit behind a contract.

## Common failure modes

### The distributed monolith

An application can have many modules and still be tightly coupled. If a trivial change requires coordinated edits in every module, the boundaries are probably exposing unstable details or sharing mutable state.

### The shared dumping ground

`common`, `shared`, and `utils` folders tend to become dependency magnets. Move code toward the concept that owns it, and make shared modules small, stable, and genuinely generic.

### Too many abstractions

An interface, factory, and adapter for a dependency that will never vary can obscure a straightforward design. Abstraction has a maintenance cost. Add it when it protects a meaningful boundary.

### Circular dependencies

If `orders` imports `payments` and `payments` imports `orders`, neither module has a clear ownership model. Move the shared concept to a stable contract, introduce an application coordinator, or communicate through an event.

### Premature microservices

A modular monolith gives many benefits of separation with much lower operational cost. Extract a service when independent deployment, scaling, isolation, or team ownership is a proven need. A folder boundary is cheap to change; a network boundary is not.

## A practical checklist

When introducing or reviewing a module, ask:

- Can I describe its purpose in one sentence?
- Do its contents change for related reasons?
- Is its public API smaller than its implementation?
- Who owns its state and invariants?
- Which dependencies are stable contracts, and which are leaked details?
- Can it be tested without unrelated infrastructure?
- What happens when a dependency is unavailable or returns a duplicate message?
- Would a likely future change stay inside this boundary?

If the answers are unclear, make one boundary explicit before adding more machinery. Rename a vague module, move one rule to its owner, or replace a direct provider dependency with a focused capability.

## Final thoughts

Modular architecture is a discipline for managing change. It keeps responsibilities coherent, protects invariants, and makes dependencies visible.

Start with business capabilities, define narrow contracts, and keep implementation details behind them. Use direct calls, events, databases, and services according to the problem—not according to an architectural fashion. The best modular system is not the one with the most boundaries; it is the one where the important boundaries make the next change easier.
