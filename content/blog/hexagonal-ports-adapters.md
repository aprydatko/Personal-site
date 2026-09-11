---
title: "Structural and Architectural Patterns: Hexagonal / Ports and Adapters"
description: A practical guide to Hexagonal Architecture, how ports define application boundaries, and how adapters keep infrastructure replaceable and testable.
date: "2026-09-11"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

Hexagonal Architecture, also called Ports and Adapters, isolates application and domain logic from external systems.

The application sits at the center. It defines ports—interfaces that describe what it needs or what it can do. Adapters connect those ports to the outside world:

```text
HTTP adapter ─┐
CLI adapter  ─┼─> input port → application core → output port ─┬─> database adapter
Job adapter  ─┘                                             ├─> payment adapter
                                                            └─> email adapter
```

The hexagon is a metaphor, not a required diagram or folder structure. The important property is that external technology depends on application-facing contracts rather than the application importing every infrastructure detail directly.

## The problem Ports and Adapters solves

An application tightly coupled to a framework and provider can become difficult to test or replace:

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const customer = await stripe.customers.retrieve(body.customerId);

  await prisma.orders.create({
    data: {
      customerId: customer.id,
      amount: body.amount,
    },
  });

  await resend.emails.send({
    to: customer.email,
    subject: 'Order created',
  });

  return Response.json({ ok: true });
}
```

This code mixes HTTP, payment provider, ORM, and email details. A unit test needs to understand all of them, and replacing one provider can require rewriting the workflow.

Ports and Adapters separates the core operation:

```ts
type CreateOrder = {
  execute: (input: CreateOrderInput) => Promise<CreateOrderResult>;
};

type PaymentPort = {
  charge: (input: ChargeInput) => Promise<ChargeResult>;
};

type OrderRepositoryPort = {
  save: (order: Order) => Promise<void>;
};
```

The application depends on these capabilities. Stripe, Prisma, Resend, and HTTP are adapter details.

## Ports define capabilities

A port is an interface at the application boundary. It describes a capability in terms the core understands:

```ts
type ClockPort = {
  now: () => Date;
};

type IdGeneratorPort = {
  generate: () => string;
};

type NotificationPort = {
  sendOrderCreated: (input: {
    recipient: string;
    orderId: string;
  }) => Promise<void>;
};
```

The port should not expose a vendor SDK type, database query builder, browser event, or framework request. It should represent what the application needs.

Small ports are easier to implement and test. A port called `ExternalServiceClient` with twenty unrelated methods is usually a provider-shaped abstraction rather than an application-shaped one.

## Primary and secondary adapters

Hexagonal Architecture commonly distinguishes two types of adapters.

### Primary adapters

Primary, or driving, adapters initiate application behavior. They translate external input into calls to input ports:

- HTTP controllers.
- GraphQL resolvers.
- CLI commands.
- Background job consumers.
- Scheduled tasks.
- UI event handlers.

```ts
const httpController = async (request: Request) => {
  const input = parseRequest(await request.json());
  const result = await createOrder.execute(input);
  return Response.json(toResponse(result));
};
```

The Controller drives the application through its input port.

### Secondary adapters

Secondary, or driven, adapters are called by the application through output ports:

- Database repositories.
- Payment gateways.
- Email providers.
- File storage.
- Message publishers.
- System clocks.

```ts
const stripePaymentAdapter: PaymentPort = {
  async charge(input) {
    const result = await stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency,
    });

    return {
      transactionId: result.id,
      status: result.status,
    };
  },
};
```

The application calls the port. The adapter calls the provider.

## The application core

The core contains the rules and workflows that should remain independent from delivery and infrastructure details:

```ts
const createOrderService = (dependencies: {
  payments: PaymentPort;
  orders: OrderRepositoryPort;
  clock: ClockPort;
}) => ({
  async execute(input: CreateOrderInput) {
    const order = Order.create({
      id: input.orderId,
      amount: input.amount,
      createdAt: dependencies.clock.now(),
    });

    await dependencies.payments.charge({
      amountCents: order.amountCents,
      currency: 'USD',
    });

    await dependencies.orders.save(order);
    return order;
  },
});
```

This service can run with a real payment adapter, a test fake, or a future provider without changing the workflow itself.

Hexagonal Architecture does not require a particular domain model style. The core can contain rich entities, functional use cases, application services, or simple workflows depending on the complexity of the problem.

## Dependency inversion

The core should own the port it needs, while infrastructure implements it:

```ts
// application/payment-port.ts
export type PaymentPort = {
  charge: (input: ChargeInput) => Promise<ChargeResult>;
};

// infrastructure/stripe-payment-adapter.ts
export const createStripePaymentAdapter = (
  client: StripeClient,
): PaymentPort => ({
  async charge(input) {
    return client.charge(input);
  },
});
```

The dependency points inward toward the application-owned contract. This is [Dependency Inversion: Stable Policy, Flexible Details](/blog/dependency-inversion-principle) applied to architecture.

Do not place every interface in a shared `types` folder without an owner. The port should live near the application capability it describes, so its design follows application needs rather than the adapter's API.

## Input ports and output ports

Input ports describe what the application allows callers to do:

```ts
type SubmitOrderUseCase = {
  execute: (input: SubmitOrderInput) => Promise<SubmitOrderResult>;
};
```

Output ports describe what the application needs from collaborators:

```ts
type OrderRepository = {
  findById: (id: string) => Promise<Order | null>;
  save: (order: Order) => Promise<void>;
};
```

The terms are useful when documenting a boundary, but the practical rule is more important than the naming: input adapters call the core, and output adapters are called by the core through ports.

## Mapping at adapter boundaries

Adapters should translate external representations into port types:

```ts
type VendorOrder = {
  order_id: string;
  total_cents: number;
  state: 'new' | 'paid';
};

const vendorOrderToDomain = (value: VendorOrder): OrderSnapshot => ({
  id: value.order_id,
  total: value.total_cents / 100,
  status: value.state === 'paid' ? 'paid' : 'pending',
});
```

This keeps vendor field names, status codes, and units from spreading into the core. See [Mapper: Explicit Model Transformations](/blog/mapper) and [DTO: Boundary-Specific Data Shapes](/blog/dto).

An adapter should validate untrusted external data before mapping it. A TypeScript type alone does not validate an HTTP response or queue message at runtime.

## Testing with adapters

The core can be tested with small in-memory adapters:

```ts
const payments: PaymentPort = {
  charge: vi.fn().mockResolvedValue({
    transactionId: 'payment-1',
    status: 'succeeded',
  }),
};

const orders: OrderRepositoryPort = {
  save: vi.fn().mockResolvedValue(undefined),
};

const service = createOrderService({
  payments,
  orders,
  clock: { now: () => new Date('2026-09-11T12:00:00Z') },
});
```

This test verifies application behavior without a payment account, database, clock, or network. The real adapters need their own integration tests against the provider or a realistic test environment.

Test the port contract from both sides:

- Core tests verify that the application calls the port correctly.
- Adapter tests verify that provider requests and responses are translated correctly.
- A small number of end-to-end tests verify the wiring between them.

## Hexagonal Architecture and repositories

A Repository is often a secondary adapter behind an output port:

```ts
type UserReader = {
  findById: (id: string) => Promise<User | null>;
};

const postgresUserAdapter = (database: Database): UserReader => ({
  async findById(id) {
    const row = await database.users.findById(id);
    return row ? userRowToDomain(row) : null;
  },
});
```

The application sees `UserReader`. PostgreSQL sees a query. The port is narrower than the database client and expresses the application's need rather than every storage capability.

See [Repository: Isolate Persistence Details](/blog/repository) for the persistence-specific tradeoffs.

## Hexagonal Architecture and events

An event publisher is another output port:

```ts
type EventPublisher = {
  publish: (event: DomainEvent) => Promise<void>;
};

type DomainEvent = {
  type: 'order.submitted';
  orderId: string;
};
```

The application can use an in-memory publisher in tests and a message-bus adapter in production. If the event must be published atomically with a database transaction, add an outbox or transactional adapter rather than assuming two independent systems can commit together.

## Hexagonal Architecture and UI adapters

A UI can be a primary adapter:

```tsx
const SubmitOrderButton = ({ submit }: { submit: () => Promise<void> }) => (
  <button onClick={() => void submit()}>
    Submit order
  </button>
);
```

The component calls an input port or ViewModel command. It does not need to know which repositories, payment providers, or events the operation uses.

A [MVVM](/blog/mvvm) ViewModel can sit between the UI View and the application input port, adapting loading and error state for presentation.

## Transactions and ports

Transaction handling can be modeled as a port or as an infrastructure concern coordinated by the application:

```ts
type TransactionPort = {
  run: <T>(operation: (context: TransactionContext) => Promise<T>) => Promise<T>;
};
```

The application decides which operations must be atomic. The adapter implements that decision using a database transaction.

External calls cannot usually participate in the same database transaction. A payment charge, email, or message publish may need an outbox, saga, compensation, or pending state. Ports make the dependency visible; they do not eliminate distributed-systems constraints.

## How many ports are enough?

Not every function needs an interface. Add a port when:

- The core should not depend on a volatile technology.
- Multiple adapters are realistic.
- Tests need a controlled substitute.
- The boundary expresses an important application capability.
- The adapter has translation, retries, authorization, or lifecycle behavior.

Avoid interfaces that only duplicate a stable local function or make a simple implementation harder to read. A port should protect a meaningful boundary, not satisfy a checklist.

## Common mistakes

### Ports shaped like vendors

A port with methods named after a provider's SDK is still coupled to that provider. Design the port around what the application needs.

### Anemic ports that leak infrastructure

Returning ORM rows, HTTP responses, SDK errors, or database transactions from a port moves adapter details into the core. Map them to application-facing types.

### An adapter that contains business policy

An email adapter can send a message. It should not decide whether an order may be cancelled. Keep business rules in the core or application service.

### Too many tiny abstractions

Creating a port for every function can obscure the actual architecture. Group related capabilities into cohesive ports and use direct functions when the boundary is stable and local.

### Mocking the port but never testing the adapter

Core tests with fakes do not prove that SQL, provider authentication, serialization, or response mapping works. Test real adapters separately.

### Confusing hexagonal architecture with no dependencies

The core still needs dependencies; it owns contracts for them. The goal is controlled direction and replaceability, not eliminating all collaboration.

## A practical checklist

Before introducing Ports and Adapters, ask:

- Which application policy should remain independent from technology?
- What capabilities does the core need from the outside world?
- Which inputs can drive the application operation?
- Are port names and types expressed in application language?
- Where are validation, mapping, retries, and provider errors handled?
- Who owns transactions, resource lifetimes, and cancellation?
- Are core tests isolated and adapter tests realistic?
- Is this boundary protecting real volatility, or only adding ceremony?

## Final thoughts

Hexagonal Architecture keeps application policy at the center and connects it to the outside world through ports and adapters. Primary adapters drive the core; secondary adapters implement capabilities the core needs.

Use the pattern to isolate volatile frameworks, providers, storage, and delivery mechanisms. Keep ports small and application-shaped, map data at boundaries, test the core with controlled adapters, and test real adapters against realistic dependencies. The hexagon is useful when it makes dependency direction and ownership clearer—not when it becomes a diagram that the code does not actually follow.
