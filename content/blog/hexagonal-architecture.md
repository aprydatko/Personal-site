---
title: "Hexagonal Architecture: Ports and Adapters in Practice"
description: A practical guide to Hexagonal Architecture, how ports and adapters isolate application rules, and when the pattern is useful without adding unnecessary complexity.
date: "2026-09-14"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

Hexagonal Architecture organizes an application around its core behavior and treats databases, web frameworks, message brokers, and external services as replaceable adapters.

It is also known as Ports and Adapters. The name comes from a useful mental model: the application core sits in the middle, and different technologies connect to it through explicit ports.

```text
                    HTTP adapter
                         │
Database adapter ── input / output ports ── Payment adapter
                         │
                    Application core
```

The hexagon is not a required shape or a fixed number of layers. It represents an application whose important behavior is independent from the way the outside world interacts with it.

## The problem Ports and Adapters solves

An application often begins with business behavior embedded in a delivery mechanism:

```ts
export const postOrder = async (request: Request) => {
  const body = await request.json();
  const order = await database.orders.create({ data: body });

  await stripe.paymentIntents.create({
    amount: order.total * 100,
    currency: 'usd',
  });

  return Response.json(order);
};
```

This handler knows about HTTP, the database schema, and Stripe's API. Testing the order workflow now requires recreating those details. Replacing Stripe or adding a queue consumer means finding and reworking code that was never really about HTTP.

Hexagonal Architecture moves the workflow into the application core:

```text
HTTP request → input adapter → SubmitOrder port → application core
                                                   │
                                      Payment port ─┘
                                                   │
                                Stripe output adapter
```

The adapters translate external protocols. The core decides what the application should do.

## Input and output ports

Ports are interfaces that describe how the application communicates with the outside world. There are two broad kinds.

Input ports expose actions the application can perform. They are also called driving or primary ports because an external actor drives the application through them:

```ts
export type SubmitOrder = {
  execute: (input: { orderId: string; actorId: string }) => Promise<{
    orderId: string;
    authorizationId: string;
  }>;
};
```

Output ports describe capabilities the application needs from an external system. They are also called driven or secondary ports:

```ts
export type OrderRepository = {
  findById: (orderId: string) => Promise<Order | null>;
  save: (order: Order) => Promise<void>;
};

export type PaymentGateway = {
  authorize: (input: PaymentAuthorization) => Promise<Authorization>;
};
```

The distinction is about direction. An HTTP route calls an input port. The application calls an output port. Both are contracts owned by the application rather than by the technology at the edge.

## The application core

The core contains the behavior that makes the application what it is. It can include domain entities, value objects, policies, and use cases.

An entity protects rules about its own state:

```ts
export class Order {
  private constructor(
    readonly id: string,
    private status: 'draft' | 'submitted',
  ) {}

  static from(input: { id: string; status: 'draft' | 'submitted' }) {
    return new Order(input.id, input.status);
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

A use case coordinates a broader workflow through ports:

```ts
export const createSubmitOrder = (dependencies: {
  orders: OrderRepository;
  payments: PaymentGateway;
}): SubmitOrder => ({
  execute: async ({ orderId, actorId }) => {
    const order = await dependencies.orders.findById(orderId);
    if (!order) throw new Error('Order not found');

    await assertCanSubmit(actorId, order);
    order.submit();

    const authorization = await dependencies.payments.authorize({
      orderId: order.id,
    });

    await dependencies.orders.save(order);
    return {
      orderId: order.id,
      authorizationId: authorization.id,
    };
  },
});
```

The use case does not know whether `orders` is backed by PostgreSQL or an in-memory store. It does not know whether payments go through Stripe or a bank API. Those decisions belong to adapters.

## Adapters translate, they do not own policy

An adapter converts an external representation into the port's language.

An HTTP adapter handles transport concerns:

```ts
export const postOrder = async (request: Request) => {
  const body = await request.json();
  const result = await submitOrder.execute({
    orderId: String(body.orderId),
    actorId: String(request.headers.get('x-user-id')),
  });

  return Response.json(result, { status: 202 });
};
```

It should not decide whether the order can be submitted. That is application or domain policy.

A payment adapter translates the application's request into a provider-specific call:

```ts
export const createStripeGateway = (stripe: Stripe): PaymentGateway => ({
  authorize: async ({ orderId }) => {
    const payment = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      metadata: { orderId },
    });

    return { id: payment.id };
  },
});
```

Provider errors, response shapes, and SDK types stop at the adapter boundary. The core receives a stable application result.

## The dependency rule

The most important rule is that dependencies point inward:

```text
Web framework ───────┐
Database client ─────┼──→ application ports and core rules
Payment SDK ─────────┘
```

The direction of control can look surprising. The application defines `PaymentGateway`, while the infrastructure package implements it. This is dependency inversion: the policy owns the interface it needs, and details conform to that policy.

Avoid importing infrastructure types into the core:

```ts
// Leaks a database detail inward.
import { PrismaClient } from '@prisma/client';

export const submitOrder = (database: PrismaClient) => {
  // ...
};
```

Prefer the port:

```ts
export const submitOrder = (orders: OrderRepository) => {
  // ...
};
```

This makes the dependency visible, replaceable, and easy to fake in a test.

## Persistence adapters and mapping

The database is an adapter, even when it is the most important detail in the system. Persistence models often have concerns that do not belong in the domain: generated columns, indexes, foreign keys, soft-delete flags, or ORM metadata.

```ts
export const createSqlOrderRepository = (
  database: Database,
): OrderRepository => ({
  findById: async (orderId) => {
    const row = await database.orders.findUnique({ where: { id: orderId } });
    if (!row) return null;

    return Order.from({
      id: row.id,
      status: row.status,
    });
  },
  save: async (order) => {
    await database.orders.update({
      where: { id: order.id },
      data: { status: order.currentStatus },
    });
  },
});
```

The mapper is not needless duplication. It prevents a storage change from silently changing the domain model. For simple CRUD, a domain object and a persistence record may intentionally have the same shape, but that should be a conscious choice.

## Testing the core with different adapters

The main benefit of ports is the ability to test the core without starting infrastructure:

```ts
it('submits an order and authorizes its payment', async () => {
  const order = Order.from({ id: 'order-1', status: 'draft' });
  const authorize = vi.fn().mockResolvedValue({ id: 'auth-1' });
  const save = vi.fn().mockResolvedValue(undefined);
  const submitOrder = createSubmitOrder({
    orders: {
      findById: vi.fn().mockResolvedValue(order),
      save,
    },
    payments: { authorize },
  });

  const result = await submitOrder.execute({
    orderId: order.id,
    actorId: 'user-1',
  });

  expect(authorize).toHaveBeenCalledWith({ orderId: 'order-1' });
  expect(save).toHaveBeenCalledWith(order);
  expect(result.authorizationId).toBe('auth-1');
});
```

Adapters need their own tests. A repository integration test can verify SQL mapping and transaction behavior. A provider adapter test can verify request construction and error translation. End-to-end tests can then focus on a small number of critical paths.

Ports do not mean every test must use mocks. A lightweight in-memory adapter can be more useful than a collection of interaction assertions when testing a complete application workflow.

## Hexagonal Architecture and Clean Architecture

Hexagonal Architecture and [Clean Architecture](/blog/clean-architecture) share the same essential idea: protect application policy from infrastructure details.

The terminology emphasizes different things:

```text
Hexagonal Architecture → ports and adapters around a core
Clean Architecture      → dependency direction through concentric layers
```

They are compatible rather than competing recipes. A Clean Architecture application can use ports and adapters inside its application boundary. A modular monolith can apply the pattern independently inside each feature module; see [Modular Architecture](/blog/modular-architecture) for the broader boundary discussion.

## Common mistakes

### Ports that mirror vendor APIs

An interface named `StripePaymentGateway` with Stripe request and response types is not a useful application port. It merely relocates the SDK dependency. Define the smallest contract the application actually needs.

### Adapters containing business rules

If the Stripe adapter decides whether an order is eligible for payment, the policy is in the wrong place. The adapter should translate and report provider behavior; the core should decide application behavior.

### One giant port

A `SystemDependencies` interface with dozens of methods couples every use case to every capability. Prefer focused ports such as `OrderRepository`, `PaymentGateway`, and `EventPublisher`.

### Confusing an adapter with a wrapper

A wrapper can expose the same API with a different name. An adapter translates between models, error semantics, and protocols. If no boundary is being protected, a direct dependency may be clearer.

### Overusing asynchronous messaging

An event adapter can decouple modules, but it introduces retries, ordering, observability, and eventual consistency. Use a direct port when the caller needs an immediate result and the relationship is simple.

### Treating the database as the domain

A database schema is optimized for persistence and queries. It is not automatically a model of business behavior. Keep invariants in the core, even when database constraints provide additional protection.

## When to use it

Hexagonal Architecture is especially useful when:

- Business rules are important or likely to evolve.
- The application has several entry points, such as HTTP, jobs, and messages.
- External integrations are unstable, expensive, or likely to change.
- Fast, isolated tests are valuable.
- The team needs clear ownership between product behavior and infrastructure.

A small CRUD feature with no meaningful rules may not need a full ports-and-adapters structure. Start with one boundary around the behavior that matters. Introduce a port when it protects a real dependency or makes a use case easier to test.

## A practical checklist

When reviewing a hexagonal design, ask:

- What is the application core responsible for?
- Which actions are exposed through input ports?
- Which external capabilities are described by output ports?
- Do ports use application language instead of vendor language?
- Are adapters limited to translation and infrastructure concerns?
- Does dependency direction point toward the core?
- Can core tests run without a network or database?
- Are retries, transactions, and eventual consistency explicit?

If a boundary is unclear, draw the dependency arrows and follow the imports. The code will usually reveal whether the core is actually independent.

## Final thoughts

Hexagonal Architecture keeps the application’s behavior at the center and makes its connections replaceable. Input adapters drive the application through use cases. Output adapters satisfy the capabilities those use cases require. Ports keep both sides connected without coupling the core to a protocol or vendor.

Use the pattern to protect meaningful boundaries, not to maximize abstraction. A few well-designed ports can make a system dramatically easier to test and evolve; a port for every function can make it harder to understand. The right level of hexagonal architecture is the one that keeps the important business decisions independent from the details around them.
