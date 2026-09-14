---
title: "Modular Monolith: One Deployment, Clear Boundaries"
description: A practical guide to Modular Monoliths, how to organize business capabilities inside one application, and when a module should become a separate service.
date: "2026-09-14"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

A Modular Monolith is a single deployable application made up of well-defined modules with explicit responsibilities, APIs, and ownership boundaries.

It keeps the operational simplicity of a monolith while applying the separation usually associated with distributed systems:

```text
One process · One deployment · Several autonomous business modules
```

The goal is not to create a miniature microservice platform inside one repository. The goal is to make boundaries real enough that teams can change one part of the system without understanding or accidentally modifying everything else.

## Why choose a Modular Monolith?

A traditional monolith is not inherently bad. One application can be easy to deploy, debug, test, and run locally. Problems appear when its internal boundaries are weak:

```text
Any feature → any table → any shared service → any other feature
```

Over time, business rules spread across controllers, database queries, background jobs, and shared utilities. A small change becomes risky because the system has no clear ownership model.

Microservices address some scaling and autonomy problems, but they also introduce network failures, distributed transactions, deployment coordination, service discovery, observability, and more operational ownership.

A Modular Monolith offers an intermediate design:

```text
                    one deployable application
┌──────────────────────────────────────────────────────┐
│ Catalog │ Orders │ Payments │ Fulfillment │ Accounts  │
│        explicit APIs and controlled dependencies      │
└──────────────────────────────────────────────────────┘
```

The process boundary remains simple while the code boundary becomes intentional.

## Modules should represent capabilities

Organize modules around business capabilities or bounded contexts rather than only technical layers:

```text
catalog/
orders/
payments/
fulfillment/
accounts/
```

The `orders` module should own order behavior, while `payments` should own payment behavior. Both modules may contain their own application workflows, domain model, persistence adapter, and tests.

```text
orders/
  application/
  domain/
  infrastructure/
  public.ts
payments/
  application/
  domain/
  infrastructure/
  public.ts
```

The exact folder names are less important than the rule that a module has a small public surface. See [Modular Architecture](/blog/modular-architecture) for a broader discussion of designing boundaries around change.

## Public APIs create real boundaries

A module should expose capabilities, not its internal data structures:

```ts
// orders/public.ts
export type OrderSummary = {
  id: string;
  status: 'draft' | 'confirmed' | 'cancelled';
};

export type OrdersModule = {
  submit: (input: { orderId: string }) => Promise<{ orderId: string }>;
  findSummary: (orderId: string) => Promise<OrderSummary | null>;
};
```

Other modules should depend on this API rather than importing an `Order` entity, ORM model, or database query:

```ts
const confirmation = await orders.submit({ orderId });
```

If every internal file can be imported by every other module, the directory structure is organizational rather than architectural. Enforce the boundary with package exports, lint rules, project references, or dependency tests where the language and tooling allow it.

## Control dependency direction

Dependencies should follow deliberate business relationships:

```text
Orders → Payments capability
Orders → Inventory capability
Fulfillment ← OrderConfirmed event
```

Avoid cycles such as:

```text
Orders → Payments → Orders
```

A cycle usually indicates unclear ownership. Move coordination into an application workflow, define a smaller shared contract, or communicate through an event when an independent reaction is appropriate.

The module that owns a rule should decide when that rule runs. `payments` should not reach into the orders table to set `orders.status = 'confirmed'`. It can return an authorization result or publish a payment fact; the orders module should own its own state transition.

## Data ownership matters

One database does not mean one shared data model. Give each module ownership of the tables or collections that represent its state:

```text
orders module     → orders, order_lines
payments module   → payment_attempts, authorizations
catalog module    → listings, product_descriptions
```

Other modules interact through an API or a published event. Direct cross-module writes make boundaries porous and make migrations difficult to reason about.

Cross-module reads require a choice. A call to another module is appropriate when the data must be current and the relationship is part of the workflow. A local projection may be better for a high-volume list or search screen:

```text
Orders publishes OrderConfirmed
        ↓
Fulfillment updates its local order projection
```

The projection introduces eventual consistency, so the user flow must define whether a short delay is acceptable. This is a business decision, not just a storage optimization.

## Communication inside the monolith

Modules can communicate through direct calls or events. Use a direct call when the caller needs an immediate answer:

```ts
const available = await inventory.reserve({
  sku: line.sku,
  quantity: line.quantity,
});

if (!available) {
  throw new Error('Some items are unavailable');
}
```

Use an event when another module should react to a fact without being part of the initiating workflow:

```ts
await events.publish({
  type: 'order.confirmed',
  orderId: order.id,
  occurredAt: clock.now().toISOString(),
});
```

An in-process event bus is still a meaningful boundary, but it does not have the same delivery guarantees as a durable broker. If the event is important, record it in an outbox transactionally with the state change and process it with retries and idempotent handlers.

Do not use events for every interaction. They make control flow less direct and require better tracing. A simple synchronous call is often the clearest design inside one process.

## Transactions and consistency

One application and one database can make local transactions straightforward, but module boundaries still require policy.

If a command updates data owned by one module, that module should own the transaction:

```ts
const confirmOrder = async (orderId: string) =>
  database.transaction(async (transaction) => {
    const order = await orders.findForUpdate(orderId, transaction);
    if (!order) throw new Error('Order not found');

    order.confirm();
    await orders.save(order, transaction);
    await outbox.record({ type: 'order.confirmed', orderId }, transaction);
  });
```

If the workflow spans several modules, decide whether to use a synchronous orchestration flow, a process manager, or eventual reactions. Do not hide a distributed-style workflow inside a function that appears to update one record.

As the system grows, a modular monolith can expose the same consistency pressures as microservices while keeping the calls in-process. Keeping those relationships explicit makes a future extraction safer.

## A module can use Clean Architecture inside

The module boundary and the internal dependency direction solve different problems:

```text
Modular Monolith → boundaries between business capabilities
Clean Architecture → dependencies from details toward policy
```

Inside `orders`, the structure might look like:

```text
orders/
  domain/
    Order.ts
    Money.ts
  application/
    confirm-order.ts
    OrderRepository.ts
  adapters/
    SqlOrderRepository.ts
    OrdersHttpController.ts
  public.ts
```

The domain does not import the ORM. The application defines ports. Adapters connect HTTP and persistence. This approach combines naturally with [Clean Architecture](/blog/clean-architecture) and [Hexagonal Architecture](/blog/hexagonal-architecture).

## Testing module boundaries

Test the system at multiple levels:

```text
module unit tests       → domain rules and use cases
module integration tests → adapters and persistence
contract tests           → public APIs and event schemas
end-to-end tests         → critical workflows
```

Module unit tests should not need to start unrelated modules. Contract tests verify that a consumer can rely on the public API or event shape. Architecture tests can catch forbidden imports:

```ts
it('does not allow payments to depend on order persistence', () => {
  expect(dependencyGraph).not.toContain(
    'payments → orders/infrastructure',
  );
});
```

The specific tooling varies, but the principle is stable: make the boundary executable where possible. A rule that exists only in a document will eventually be bypassed by a convenient import.

## Migrating a tangled monolith

You do not need to rewrite the application to create a Modular Monolith. A safer migration is incremental:

1. Choose one capability with a clear business owner.
2. Inventory its current rules, tables, routes, jobs, and dependencies.
3. Define a small public API for the capability.
4. Move one workflow behind that API.
5. Stop new direct imports into the module.
6. Move data ownership and tests gradually.
7. Repeat when the first boundary proves useful.

For example, extract payment behavior from a generic `OrderService` into `payments`. Keep a compatibility function temporarily if callers cannot move at once, but make it delegate to the new module rather than duplicating behavior.

```ts
// Compatibility path during migration
export const chargeOrder = (input: ChargeOrderInput) =>
  payments.authorize({
    orderId: input.orderId,
    amount: input.total,
  });
```

The migration is successful when the old path disappears and ownership becomes clear—not merely when a new folder exists.

## When should a module become a service?

A Modular Monolith does not prohibit future service extraction. It makes the decision more evidence-based.

Consider extraction when a module has a strong boundary and a genuine need for:

- Independent deployment or release timing.
- Independent scaling characteristics.
- Security or compliance isolation.
- A separate team with clear ownership.
- A different availability or technology requirement.
- Operational failures that must not affect the rest of the application.

Do not extract merely because a module is large or because microservices are fashionable. A service boundary turns in-process calls into network calls and local transactions into coordination problems.

Before extraction, identify every public API, event, data dependency, consistency expectation, retry policy, and operational requirement. If these cannot be described clearly inside the monolith, the service boundary is probably not ready.

## Common mistakes

### The distributed monolith in one process

If every module calls every other module synchronously and shares all tables, the system has coupling without the benefits of clear ownership. Reduce the public surface and enforce dependency direction.

### A shared database as a shared API

Reading another module's tables directly may be convenient, but it couples consumers to storage details. Prefer a contract, projection, or a deliberate read model.

### The giant shared module

`common` often becomes the place where boundaries go to disappear. Keep shared code small and stable. Domain-specific behavior belongs to the module that owns its meaning.

### Events without operational design

An in-process event handler can fail after the transaction succeeds. Define delivery, retry, idempotency, ordering, and observability before relying on events for important work.

### Recreating microservices internally

Separate repositories, elaborate message protocols, and remote-style abstractions can add complexity without providing independent deployment. Keep in-process interactions simple until a real boundary requires more.

### Treating folders as enforcement

A folder is not a boundary if every import is allowed. Use package exports, lint rules, dependency checks, and code review to protect the public surface.

## A practical checklist

When designing a Modular Monolith, ask:

- What business capability does each module own?
- Which data and invariants belong to that module?
- What is the smallest public API it needs to expose?
- Which dependencies are direct calls, and which are events?
- Can one module write another module's data?
- What consistency does each cross-module workflow require?
- Can module tests run without unrelated infrastructure?
- Are forbidden dependencies detected automatically?
- What evidence would justify extracting a service later?

The answers should be visible in code, tests, and operational documentation.

## Final thoughts

A Modular Monolith is a deployment choice combined with a boundary discipline. It keeps one application easy to run while making business capabilities easier to understand, test, and change.

Start with clear ownership, narrow public APIs, and controlled data access. Use direct calls and events deliberately. Let real scaling, ownership, security, and availability needs—not architectural fashion—determine whether a module eventually becomes a service.

The best Modular Monolith is not a halfway house. It is a useful architecture in its own right: simple to operate, explicit about business boundaries, and ready to evolve when the system provides evidence for the next step.
