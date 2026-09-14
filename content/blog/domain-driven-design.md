---
title: "Domain-Driven Design: Put the Business Model at the Center"
description: A practical guide to Domain-Driven Design, including ubiquitous language, bounded contexts, entities, value objects, aggregates, and domain events.
date: "2026-09-14"
category: Architecture
readingTime: 9 min read
featured: false
published: true
---

Domain-Driven Design, or DDD, is an approach to designing software around the business domain it serves.

Its most useful lesson is simple: software becomes easier to change when its code reflects the language, rules, and boundaries of the business.

DDD is not a requirement to use microservices, event sourcing, or elaborate class hierarchies. It is a way to discover the important concepts in a problem and give them clear ownership.

```text
Business conversation → domain model → explicit boundaries → software behavior
```

## Start with the domain

The domain is the area of knowledge and activity the software exists to support: selling products, scheduling deliveries, processing insurance claims, or managing subscriptions.

Before choosing tables or frameworks, learn how the business describes its work.

Imagine a team building a marketplace. A conversation might include these statements:

- A seller publishes a listing.
- A buyer places an order for available items.
- A payment is authorized before an order is confirmed.
- A shipment can be created only for a confirmed order.

These statements contain more design information than a generic diagram of controllers and repositories. They suggest concepts, actions, invariants, and relationships that the software should make explicit.

DDD treats domain experts and developers as partners in discovering that model. The goal is not to transcribe every business sentence into a class. The goal is to identify the concepts that help everyone reason about the system consistently.

## Ubiquitous language

Ubiquitous language is a shared vocabulary used by domain experts, developers, tests, documentation, and product interfaces.

If the business says “authorize payment,” the code should not casually call it “charge” when those actions have different meanings. If an order is “confirmed” only after inventory and payment checks, that distinction should not disappear into a generic `status = active` field.

```ts
type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled';

const confirmOrder = (order: Order, payment: PaymentAuthorization) => {
  if (!payment.isApproved) {
    throw new Error('An order requires an approved payment');
  }

  order.confirm();
};
```

Good names reduce translation between conversations and code. They also reveal disagreements. If two teams use “customer” to mean different things, that may be a boundary problem rather than a naming problem.

## Bounded contexts

A bounded context is an explicit boundary within which a particular domain model and vocabulary are consistent.

The word “product” may mean different things in different contexts:

```text
Catalog context     → a sellable listing with title, images, and description
Inventory context   → a stock item with quantity and warehouse location
Order context       → a line item with price captured at purchase time
```

There is no need to force one universal `Product` model across the entire company. Each context can own the meaning relevant to its work and communicate with other contexts through contracts.

```text
Catalog ── ListingPublished ──→ Search
Inventory ── StockReserved ────→ Orders
Orders ── OrderConfirmed ──────→ Fulfillment
```

Bounded contexts are conceptual boundaries first. They can live in one modular monolith, separate packages, or independent services. Splitting a context into a network service adds operational cost, so begin with a clear model and ownership boundary.

This is where DDD connects naturally to [Modular Architecture](/blog/modular-architecture): modules can represent bounded contexts, while explicit contracts keep their models from bleeding into one another.

## Entities and identity

An entity is a domain object defined by continuity of identity rather than only by its current attributes.

Two orders with identical totals are still different orders because they have different identities. An order can change from draft to confirmed while remaining the same order.

```ts
class Order {
  constructor(
    readonly id: OrderId,
    private status: OrderStatus,
  ) {}

  confirm() {
    if (this.status !== 'pending_payment') {
      throw new Error('Only orders awaiting payment can be confirmed');
    }

    this.status = 'confirmed';
  }
}
```

An entity should protect the rules governing its own lifecycle. Callers should ask it to perform meaningful actions rather than changing public fields directly.

Not every database row is an entity. A read-only result for a dashboard may be a projection or DTO. Use domain entities where identity and behavior matter.

## Value objects

A value object is defined by its attributes rather than a unique identity. It is usually immutable and validates its own meaning.

Money is a common example:

```ts
class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static create(amount: number, currency: string) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error('Money must use a non-negative integer amount');
    }

    return new Money(amount, currency.toUpperCase());
  }

  add(other: Money) {
    if (other.currency !== this.currency) {
      throw new Error('Cannot add money in different currencies');
    }

    return Money.create(this.amount + other.amount, this.currency);
  }
}
```

Without a value object, the meaning of a number is easy to lose:

```ts
calculateTax(1000, 20); // Cents? dollars? percentage? rate basis points?
```

```ts
calculateTax(Money.create(1000, 'USD'), TaxRate.percent(20));
```

Value objects make invalid states harder to represent and put related operations near the concept they manipulate. Other examples include email addresses, date ranges, coordinates, and account identifiers.

## Aggregates and consistency boundaries

An aggregate is a cluster of domain objects treated as one unit for changes and consistency. One entity acts as the aggregate root and controls access to the objects inside it.

An order might contain order lines:

```ts
class Order {
  private readonly lines: OrderLine[] = [];

  addLine(productId: string, quantity: number, unitPrice: Money) {
    if (quantity <= 0) {
      throw new Error('Order line quantity must be positive');
    }

    this.lines.push(new OrderLine(productId, quantity, unitPrice));
  }

  get items() {
    return this.lines.map((line) => line.toSnapshot());
  }
}
```

The caller changes the order through the root rather than saving an `OrderLine` independently. This gives the aggregate a place to enforce rules such as “an order must contain at least one line” or “a submitted order cannot accept new lines.”

Aggregates are also transaction boundaries. A command should usually load and save one aggregate as a unit. If a workflow needs to update several large aggregates synchronously, that may signal a missing boundary or a process that should be coordinated asynchronously.

Keep aggregates small enough to load and change safely. Making an entire customer, order history, inventory network, and payment record one aggregate creates contention and makes unrelated changes expensive.

## Repositories and domain services

A repository provides access to domain aggregates without exposing persistence details to the domain or application policy:

```ts
type OrderRepository = {
  findById: (id: OrderId) => Promise<Order | null>;
  save: (order: Order) => Promise<void>;
};
```

The interface expresses what the domain needs. A SQL adapter, document-store adapter, or in-memory implementation can satisfy it.

Some rules do not naturally belong to one entity. A domain service can hold a focused operation involving multiple domain concepts:

```ts
type ShippingQuote = {
  calculate: (input: {
    destination: Address;
    packageWeight: Weight;
  }) => Promise<Money>;
};
```

Do not use “service” as a default home for every rule. First ask whether the behavior belongs to an entity or value object. A domain service should be narrow, named after a meaningful domain operation, and free from transport or persistence concerns.

## Domain events

A domain event records something meaningful that happened in the domain:

```ts
type OrderConfirmed = {
  type: 'order.confirmed';
  orderId: string;
  customerId: string;
  occurredAt: string;
};
```

Events are useful when other parts of the system need to react without being embedded in the original rule. Fulfillment can listen for `order.confirmed` and create a shipment, while analytics records the event separately.

The event should describe a fact, not an instruction disguised as one. “Order confirmed” says what happened. “Create shipment now” is a command that belongs to the receiver's policy.

Events also introduce important operational questions:

- Is delivery synchronous or asynchronous?
- Can the same event arrive more than once?
- How are failed handlers retried?
- Can consumers rebuild their state from the event history?
- Does the initiating transaction need an outbox?

DDD does not require event-driven architecture. Use a direct call when an immediate result is part of the workflow and an event when independent reaction is the clearer relationship.

## Application services coordinate use cases

Domain objects should not know how a request arrived, while application services should not become a dumping ground for every business rule.

An application service coordinates a use case:

```ts
const confirmOrder = (dependencies: {
  orders: OrderRepository;
  payments: PaymentGateway;
  events: EventPublisher;
}) => async (input: { orderId: OrderId }) => {
  const order = await dependencies.orders.findById(input.orderId);
  if (!order) throw new Error('Order not found');

  const payment = await dependencies.payments.authorize({
    orderId: order.id,
  });
  order.confirm();

  await dependencies.orders.save(order);
  await dependencies.events.publish({
    type: 'order.confirmed',
    orderId: order.id,
  });
};
```

The service coordinates repositories, gateways, transactions, and events. The entity still owns the state transition. This separation pairs well with [Clean Architecture](/blog/clean-architecture) and [Hexagonal Architecture](/blog/hexagonal-architecture), where infrastructure connects through ports around the application core.

## Context mapping

When bounded contexts interact, document the relationship between their models. A context map can identify patterns such as:

- A published language: one context exposes a stable event or API contract.
- An anti-corruption layer: an adapter translates an external model into local concepts.
- A shared kernel: two closely collaborating contexts intentionally share a small model.
- A customer-supplier relationship: one context provides a contract that another consumes.

An anti-corruption layer protects a context from importing another context's vocabulary:

```ts
const toOrderProduct = (listing: CatalogListing): OrderProduct => ({
  productId: listing.listingId,
  name: listing.title,
  unitPrice: Money.create(listing.currentPriceCents, listing.currency),
});
```

The order model can evolve according to order rules even if the catalog API changes its representation.

## DDD in a modular monolith

You can apply DDD without deploying multiple services:

```text
src/
  catalog/
    domain/
    application/
    adapters/
  orders/
    domain/
    application/
    adapters/
  fulfillment/
    domain/
    application/
    adapters/
```

Each context owns its domain model and exposes a small public API. The process boundary is shared, but the model boundaries remain explicit. This often gives a team time to learn the domain and validate ownership before accepting the cost of network calls and distributed operations.

## Testing a domain model

DDD makes business scenarios natural test cases:

```ts
it('does not confirm an order before payment is authorized', () => {
  const order = Order.from({
    id: 'order-1',
    status: 'draft',
  });

  expect(() => order.confirm()).toThrow(
    'Only orders awaiting payment can be confirmed',
  );
});
```

Test aggregates and value objects without infrastructure. Test application services with fake repositories and gateways. Test context integrations with contract or integration tests. The strongest tests use the ubiquitous language: “a draft order cannot be confirmed” is more useful than “method call number three throws.”

## Common mistakes

### Modeling the database instead of the domain

Tables are persistence structures. They may support the domain model, but they are not automatically the right objects for expressing business behavior.

### One model for every context

Shared types can look efficient while coupling unrelated concepts. Share a type only when the meaning and ownership are truly shared.

### Giant aggregates

An aggregate that contains every related object creates large transactions and contention. Protect only the invariants that must be consistent together.

### Anemic domain models

If entities expose mutable data and all behavior sits in generic services, the model is not expressing much domain knowledge. Move invariants toward the objects that own them.

### Event everything

Events are valuable for facts and independent reactions, but they make flows harder to trace and introduce consistency delays. Use them deliberately.

### Strategic DDD without tactical DDD

Naming contexts without giving entities, value objects, aggregates, and policies meaningful behavior produces architecture diagrams without protection. Strategic boundaries and tactical modeling should reinforce one another.

### Tactical DDD without strategic boundaries

Beautiful entities can still be coupled to every other part of the system. Define who owns a concept and where its vocabulary applies.

## A practical checklist

When applying DDD to a feature, ask:

- What business problem does this feature support?
- Which words must the team use consistently?
- Which concepts have identity, and which are values?
- Which invariants must change atomically?
- What is the smallest useful aggregate boundary?
- Which context owns each piece of data and behavior?
- Should another context be called directly or notified through a fact?
- Where should external models be translated?
- Can the important scenarios be tested in domain language?

Start small. Model one meaningful workflow, make one invariant explicit, and let conversations with domain experts refine the boundary.

## Final thoughts

Domain-Driven Design is a way to make software speak clearly about the business it serves. Ubiquitous language improves communication. Bounded contexts prevent conflicting models from being forced together. Entities and aggregates protect behavior, while value objects make important concepts precise.

Use DDD where the domain is complex enough to justify careful modeling. Keep the model focused, let boundaries follow ownership and change, and resist adding patterns that do not protect a real rule. The result is software that is not only structured well, but also easier for people to reason about together.
