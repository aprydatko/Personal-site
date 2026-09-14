---
title: "Clean Architecture: Keep Business Rules Independent"
description: A practical guide to Clean Architecture, its dependency rule, the role of use cases and adapters, and how to apply it without adding unnecessary ceremony.
date: "2026-09-14"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

Clean Architecture is a way to organize software so that important business rules do not depend on frameworks, databases, or delivery mechanisms.

Its central idea is the Dependency Rule:

```text
Dependencies point inward, toward policies and business rules.
```

The web framework may depend on the application. The application may depend on the domain. The domain should not depend on HTTP, SQL, React, or a payment provider.

Clean Architecture is not a required number of layers or folders. It is a strategy for keeping the most valuable and stable decisions protected from volatile technical details.

## The problem it solves

Business logic often starts inside a controller, route handler, or UI component because that is where the feature begins:

```ts
export const postOrder = async (request: Request) => {
  const body = await request.json();
  const order = await database.orders.insert(body);

  if (order.total > 100) {
    await stripe.createPaymentIntent({ amount: order.total * 100 });
  }

  return Response.json(order);
};
```

This code mixes transport parsing, persistence, business policy, and an external provider. It may work, but the order rule is now difficult to test without a request, database, and Stripe client. A change to the payment provider can disturb the workflow even when the business rule has not changed.

Clean Architecture separates those reasons to change. The framework becomes an adapter around an application use case:

```text
HTTP route → use case → domain rules
                 ↓
       repository / gateway ports
                 ↓
       database / provider adapters
```

## The layers

Clean Architecture is commonly described with concentric circles. Names vary, but a useful application-level interpretation has four parts:

- Entities contain core business rules that are independent of a particular workflow.
- Use cases coordinate application-specific workflows.
- Interface adapters translate between internal models and external formats.
- Frameworks and drivers provide infrastructure such as HTTP, SQL, queues, and vendor SDKs.

```text
┌──────────────────────────────────────────────┐
│ Frameworks & drivers: Next.js, PostgreSQL     │
│  ┌────────────────────────────────────────┐  │
│  │ Interface adapters: routes, mappers    │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │ Application: use cases, ports    │  │  │
│  │  │  ┌────────────────────────────┐  │  │  │
│  │  │  │ Domain: entities, policies │  │  │  │
│  │  │  └────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

The diagram is useful only if the dependency direction follows it. Putting a `domain` folder in the center while importing an ORM model from it is not Clean Architecture.

## Entities protect business invariants

An entity represents a business concept whose rules matter regardless of how the system is accessed.

```ts
type OrderStatus = 'draft' | 'submitted' | 'cancelled';

export class Order {
  private constructor(
    readonly id: string,
    private status: OrderStatus,
    readonly total: Money,
  ) {}

  static create(id: string, total: Money) {
    return new Order(id, 'draft', total);
  }

  submit() {
    if (this.status !== 'draft') {
      throw new Error('Only draft orders can be submitted');
    }

    this.status = 'submitted';
  }

  get currentStatus() {
    return this.status;
  }
}
```

The entity does not know whether it came from a form, a database row, or a message. It owns the rule that a submitted order cannot be submitted again.

Not every data structure needs to become an entity. If a type has no behavior or invariant, a plain value object or DTO may be more appropriate. Add domain behavior where it protects a rule, not merely because a class feels more architectural.

## Use cases express application intent

A use case coordinates one meaningful application action. It loads the required data, invokes domain behavior, calls external capabilities, and persists the result.

```ts
type SubmitOrder = {
  execute: (input: { orderId: string }) => Promise<{
    orderId: string;
    authorizationId: string;
  }>;
};

export const createSubmitOrder = (dependencies: {
  orders: OrderRepository;
  payments: PaymentGateway;
}): SubmitOrder => ({
  execute: async ({ orderId }) => {
    const order = await dependencies.orders.findById(orderId);
    if (!order) throw new Error('Order not found');

    order.submit();
    const payment = await dependencies.payments.authorize({
      amount: order.total.amount,
      currency: order.total.currency,
      reference: order.id,
    });

    await dependencies.orders.save(order);
    return { orderId: order.id, authorizationId: payment.authorizationId };
  },
});
```

The use case owns the workflow policy, while the `Order` entity owns the state-transition rule. This distinction keeps entities focused and prevents controllers from becoming application services by accident.

Use cases should also make failure behavior visible. Decide what happens if payment succeeds but saving the order fails, or if a retry repeats the request. A transaction, idempotency key, compensation flow, or explicit pending state may be required. Clean boundaries make these decisions easier to isolate; they do not remove the underlying business complexity.

## Ports define what the application needs

The application layer should describe capabilities in its own language. These interfaces are often called ports:

```ts
export type OrderRepository = {
  findById: (orderId: string) => Promise<Order | null>;
  save: (order: Order) => Promise<void>;
};

export type PaymentGateway = {
  authorize: (input: {
    amount: number;
    currency: string;
    reference: string;
  }) => Promise<{ authorizationId: string }>;
};
```

The port belongs to the side that needs the capability. The use case needs to save an order, so the application defines the repository contract. A PostgreSQL implementation can then adapt its details to that contract:

```ts
export const createSqlOrderRepository = (
  database: Database,
): OrderRepository => ({
  findById: async (orderId) => {
    const row = await database.orders.findUnique({ where: { id: orderId } });
    if (!row) return null;

    return OrderMapper.toDomain(row);
  },
  save: async (order) => {
    await database.orders.update({
      where: { id: order.id },
      data: { status: order.currentStatus },
    });
  },
});
```

The mapper is an important boundary. Database rows, API payloads, and domain objects often have different shapes and lifecycles. Treating them as the same type leaks infrastructure concerns inward.

## Adapters translate at the edges

An adapter converts an external protocol into an internal request, or an internal result into an external response.

```ts
export const postOrder = async (request: Request) => {
  const body = await request.json();
  const result = await submitOrder.execute({
    orderId: String(body.orderId),
  });

  return Response.json(result, { status: 202 });
};
```

The route handles HTTP concerns: parsing, authentication context, status codes, and serialization. It should not decide whether an order is valid or how a payment provider is called.

The same use case can be called by a command-line job, a queue consumer, or a different transport. This is the practical value of separating interface adapters from application policy.

## Dependency injection without a container

Clean Architecture needs replaceable dependencies, but it does not require a dependency-injection framework. Passing dependencies to a factory is often enough:

```ts
const submitOrder = createSubmitOrder({
  orders: createSqlOrderRepository(database),
  payments: createStripeGateway(stripe),
});
```

Tests can provide focused fakes:

```ts
const submitOrder = createSubmitOrder({
  orders: {
    findById: vi.fn().mockResolvedValue(order),
    save: vi.fn().mockResolvedValue(undefined),
  },
  payments: {
    authorize: vi.fn().mockResolvedValue({ authorizationId: 'auth-1' }),
  },
});
```

Manual composition makes the object graph explicit. A container can help in a large application, but hiding all construction behind magic configuration can make ownership and runtime behavior harder to understand.

## Testing by policy and detail

The inner layers should have the fastest and most isolated tests:

```text
domain tests       → entities and policies
use-case tests     → workflows with fake ports
adapter tests      → translation and integration details
end-to-end tests   → critical paths through the system
```

Test business rules with plain values. Test use cases by verifying that the right ports are called and that failures are handled correctly. Test adapters against the real database or provider contract where their translation can fail.

If a domain test needs a browser or a live database, the dependency direction is probably inverted. If every adapter test repeats business rules, some policy may have leaked outward from the domain or use-case layer.

## Clean Architecture and modular architecture

Clean Architecture describes dependency direction and separation between policy and detail. [Modular Architecture](/blog/modular-architecture) describes how to create cohesive boundaries around capabilities and control communication between them.

They work well together:

```text
Module: orders
  domain       → order rules
  application  → submit-order use case + ports
  adapters     → HTTP, SQL, payment integrations
```

Clean Architecture can be applied inside each module. Modular Architecture can organize several such modules inside a monolith or across services. Neither pattern requires microservices, event sourcing, or a particular framework.

## Common mistakes

### Treating layers as folders only

A `domain` folder does not make code independent if it imports a database model. Review imports and dependency direction, not just names.

### Creating anemic domain objects

If entities are only bags of public fields and controllers contain every rule, the architecture has moved behavior outward. Put important invariants near the data they protect.

### Making use cases too thin

A use case that only calls a repository may be fine for a simple read, but state-changing workflows deserve a clear home for authorization, transactions, and coordination.

### Overusing abstractions

Ports are valuable at boundaries that matter. An interface around every local function adds ceremony without reducing meaningful coupling.

### Returning infrastructure types

Do not let ORM records, provider responses, or framework request objects become the application's core language. Map them at the edge.

### Ignoring transaction and retry behavior

Clean Architecture separates concerns; it does not make distributed side effects atomic. Document idempotency, consistency, and failure recovery as part of the use case contract.

### Starting with maximum ceremony

Begin with one business rule, one use case, and one adapter boundary. Add layers when they protect a real change or testing need. Architecture should evolve with evidence.

## A practical checklist

Before calling a design “clean,” ask:

- Can the core business rules run without the framework and database?
- Does each use case represent a meaningful application action?
- Are ports defined in application or domain language?
- Are external formats mapped at the boundary?
- Does dependency direction point toward stable policy?
- Can the important rules be tested quickly and in isolation?
- Are transaction, retry, and consistency policies explicit?
- Is each abstraction paying for itself?

If the answer is no, make the smallest useful correction. Move a rule out of a route, introduce a focused port for a provider, or map a database record before it enters the domain. Small boundary improvements compound over time.

## Final thoughts

Clean Architecture keeps the decisions that matter most independent from the details that change most often. Entities protect business invariants, use cases coordinate intent, ports describe required capabilities, and adapters translate at the edges.

Use it as a way to make dependencies and responsibilities clearer—not as a reason to build layers no one needs. A clean architecture is one where the core of the system remains understandable when the database, framework, interface, or external provider changes.
