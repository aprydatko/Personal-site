---
title: "Structural and Architectural Patterns: Layered Architecture"
description: A practical guide to Layered Architecture, how to separate responsibilities and dependencies, and how to keep boundaries useful without adding unnecessary ceremony.
date: "2026-09-11"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

Layered Architecture organizes an application into levels of responsibility, with each layer depending on the layers below it through explicit boundaries.

A common arrangement is:

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

The names and number of layers vary, but the goal is consistent: keep UI, workflow coordination, business rules, and technical details from becoming one entangled implementation.

Layered Architecture is a way to make ownership and dependency direction visible. It is not a requirement that every feature contain one file in every layer.

## The problem layers solve

An unstructured feature can mix transport, business, and persistence details:

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const row = await db.orders.findById(body.orderId);

  if (!row || row.status !== 'draft') {
    return Response.json({ error: 'Cannot submit order' }, { status: 400 });
  }

  await db.orders.update(row.id, { status: 'submitted' });
  await email.send(row.customer_email, 'Order submitted');

  return Response.json({ id: row.id, status: 'submitted' });
}
```

The route knows the database schema, business rule, persistence command, email provider, and response shape. Reusing or testing the operation outside HTTP becomes difficult.

Layering separates the responsibilities:

```text
HTTP route → submit-order use case → order repository / notification port
                                   → domain order rules
```

The route adapts HTTP. The use case coordinates the workflow. The domain protects the rule. Infrastructure implements database and email access.

## The Presentation Layer

The Presentation Layer handles communication with an external caller:

- HTTP routes and controllers.
- GraphQL resolvers.
- CLI commands.
- Background job consumers.
- UI components and ViewModels.
- Request parsing and response serialization.

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const input = parseSubmitOrderRequest(body);

  try {
    const result = await submitOrder.execute(input);
    return Response.json(toOrderResponse(result));
  } catch (error) {
    return toHttpErrorResponse(error);
  }
}
```

Presentation code should not own the complete business workflow. It translates an external protocol into an application operation and translates the result back.

The Presentation Layer can contain presentation validation such as required request fields and response formatting. It should not be the only place where domain invariants are enforced.

## The Application Layer

The Application Layer coordinates use cases. It decides which steps form one meaningful application operation:

```ts
const createSubmitOrder = (dependencies: Dependencies) => ({
  async execute(input: SubmitOrderInput) {
    const order = await dependencies.orders.findById(input.orderId);
    if (!order) throw new OrderNotFoundError(input.orderId);

    order.submit();
    await dependencies.orders.save(order);
    await dependencies.events.publish({
      type: 'order.submitted',
      orderId: order.id,
    });

    return order;
  },
});
```

The Application Layer commonly owns:

- Use cases and workflows.
- Authorization coordination.
- Transaction boundaries.
- Calling domain objects.
- Calling repositories and integration ports.
- Publishing application events.

It should not need to know whether the caller is HTTP, a message consumer, or a CLI command.

This is the focus of the [Service Layer](/blog/service-layer) pattern.

## The Domain Layer

The Domain Layer contains rules and concepts that define the business:

```ts
class Order {
  constructor(
    readonly id: string,
    private status: 'draft' | 'submitted',
  ) {}

  submit() {
    if (this.status !== 'draft') {
      throw new Error('Only draft orders can be submitted');
    }

    this.status = 'submitted';
  }
}
```

Domain code should avoid depending on HTTP, an ORM, a browser, or a specific cloud provider. That makes the rules reusable and testable.

The Domain Layer can include:

- Entities.
- Value objects.
- Domain services.
- Domain policies.
- Business events.
- Invariants and calculations.

Not every application needs a rich domain model. For simple CRUD, a small application service and repository may be enough. Add domain abstractions where rules have real complexity or must be protected across multiple entry points.

## The Infrastructure Layer

Infrastructure implements technical capabilities required by the application:

- Database clients and repositories.
- HTTP clients for external services.
- Message brokers.
- File storage.
- Email and payment providers.
- Clocks, random ID generators, and system adapters.

```ts
const createOrderRepository = (database: Database): OrderRepository => ({
  async findById(id) {
    const row = await database.orders.findById(id);
    return row ? orderRowToDomain(row) : null;
  },

  async save(order) {
    await database.orders.update(order.id, {
      status: order.status,
    });
  },
});
```

The Infrastructure Layer can depend on libraries and providers. The application should depend on a small port or interface instead of constructing those providers inside a use case.

This is where [Repository](/blog/repository) and [Mapper](/blog/mapper) boundaries commonly live.

## Dependency direction

The most important architectural rule is dependency direction. Higher-level policy should not depend directly on lower-level technical details.

```text
Presentation → Application → Domain
       Infrastructure implements ports used by Application / Domain
```

In TypeScript, an application service can define a port:

```ts
type OrderRepository = {
  findById: (id: string) => Promise<Order | null>;
  save: (order: Order) => Promise<void>;
};
```

Infrastructure provides the implementation. The use case depends on the contract, not on the database module.

This is related to the [Dependency Inversion Principle: Stable Policy, Flexible Details](/blog/dependency-inversion-principle). The goal is not to make every dependency abstract; it is to keep volatile technical details from controlling stable business policy.

## A complete layered flow

Consider submitting an order:

```text
HTTP POST /orders/:id/submit
        ↓
Controller parses route and actor
        ↓
Application use case authorizes and coordinates
        ↓
Repository loads Order
        ↓
Domain entity validates and changes status
        ↓
Repository persists the change
        ↓
Event publisher notifies other systems
        ↓
Controller maps result to response DTO
```

Each step has a focused reason to change. Changing the database adapter should not change the order rule. Changing the HTTP response should not change transaction handling.

## Strict and relaxed layering

In strict layering, a layer can call only the immediately lower layer:

```text
Presentation → Application → Domain → Infrastructure
```

In a relaxed layered architecture, a layer may call any lower layer when the dependency is appropriate. For example, a read-only query handler may use a specialized data access adapter without passing through a rich domain entity.

Strict layering makes dependencies easy to explain, but can create pass-through code. Relaxed layering can be practical, but requires stronger conventions and review.

Choose the rule that protects the important boundaries without forcing every simple operation through unnecessary abstractions.

## Layered Architecture and feature organization

Layers can be organized globally:

```text
src/
  controllers/
  services/
  domain/
  repositories/
```

Or by feature, with layers inside each feature:

```text
src/orders/
  presentation/
  application/
  domain/
  infrastructure/
src/users/
  presentation/
  application/
  domain/
  infrastructure/
```

Feature-oriented organization keeps related code close together and reduces cross-feature coupling. Global layers can be easier to discover in a small application. The best choice depends on the number of features, team boundaries, and how often code changes together.

## Queries and commands

Not every read needs the same path as a state-changing command.

A command may load a domain entity, enforce invariants, persist changes, and publish events. A query may need a projection optimized for a screen:

```ts
type OrderListRow = {
  id: string;
  customerName: string;
  total: number;
  status: string;
};

const listOrders = (database: Database) =>
  database.orders.listForDashboard();
```

Routing a query directly to a read model is not automatically a violation of layered architecture. The important questions are whether the boundary is deliberate, whether permissions and consistency are handled, and whether the shortcut leaks technical details into the presentation layer.

## Layered Architecture and external services

An external provider should be hidden behind an application-facing port:

```ts
type PaymentGateway = {
  charge: (input: ChargeInput) => Promise<ChargeResult>;
};

const createPaymentAdapter = (client: StripeLikeClient): PaymentGateway => ({
  async charge(input) {
    const result = await client.createCharge({
      amount_cents: input.amountCents,
      customer_ref: input.customerId,
    });

    return {
      transactionId: result.id,
      status: result.status === 'succeeded' ? 'paid' : 'pending',
    };
  },
});
```

The application knows what it needs from a payment gateway. The adapter knows the provider's API, naming, errors, and response format.

Use [DTOs](/blog/dto) and [Mappers](/blog/mapper) at the integration boundary rather than allowing vendor objects to spread through the application.

## Testing layered systems

Test layers according to their responsibilities:

- Presentation tests verify input parsing, response mapping, and rendering.
- Application tests verify workflow sequencing, authorization, and transaction behavior.
- Domain tests verify invariants and calculations.
- Infrastructure tests verify real database queries, mappings, provider adapters, and serialization.

```ts
it('submits a draft order', async () => {
  const order = new Order('order-1', 'draft');
  const repository = {
    findById: vi.fn().mockResolvedValue(order),
    save: vi.fn().mockResolvedValue(undefined),
  };

  await submitOrder.execute({ orderId: 'order-1' });

  expect(repository.save).toHaveBeenCalledWith(order);
});
```

Do not mock every layer in every test. Unit tests should isolate policy; integration tests should prove that infrastructure actually works; end-to-end tests should verify a small number of critical paths.

## Common mistakes

### Layers as folders only

Creating `controllers`, `services`, and `repositories` directories does not establish dependency direction. A service that imports a route handler is still tangled regardless of its location.

### Pass-through layers

If every layer merely renames a method and forwards the same object, the design may be adding ceremony without protecting a boundary. Keep a layer when it owns a real responsibility or isolates a likely change.

### A giant service layer

Putting every workflow into one `ApplicationService` creates a new global dependency. Organize application code around cohesive use cases or features.

### Domain code depending on infrastructure

Importing an ORM entity, HTTP client, or framework request into the Domain Layer reverses the intended direction. Use ports, values, or adapters at the boundary.

### Leaking models between layers

Passing database rows directly to Views or external API objects into domain rules couples layers to representations that they do not own. Map deliberately.

### Confusing transactions with layers

A transaction is a consistency boundary, not a layer. It may span repositories and infrastructure while being coordinated by an application use case.

### Enforcing strict layers everywhere

A small read operation may not need five abstractions. Use the simplest path that preserves security, consistency, and changeability.

## A practical checklist

Before adding or changing a layer, ask:

- Which responsibility does this layer own?
- Which direction may dependencies flow?
- Is the boundary protecting a real source of change?
- Are DTOs and mappers needed between representations?
- Who owns transactions, authorization, and side effects?
- Can each layer be tested at its natural boundary?
- Is the organization by feature or by global layer clearer here?
- Am I adding an abstraction that removes coupling, or only moving code between folders?

## Final thoughts

Layered Architecture separates presentation, application workflows, domain policy, and infrastructure details. It makes dependency direction visible and gives each part of the system a focused reason to change.

Use layers to protect meaningful boundaries, not to satisfy a diagram. Keep higher-level policy independent from technical details, map data at crossings, test each responsibility appropriately, and allow simple features to remain simple. Good layering creates clarity without turning every operation into a ceremony.
