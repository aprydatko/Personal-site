---
title: "Structural and Architectural Patterns: Service Layer"
description: A practical guide to the Service Layer pattern, how to coordinate application workflows, and how to keep business operations cohesive and testable.
date: "2026-09-11"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Service Layer pattern places application workflows behind a focused boundary.

A service method coordinates the steps required to complete an operation: validate input, load data, apply a business rule, persist changes, publish an event, or call another system.

```ts
const checkout = await checkoutService.complete({
  customerId,
  items,
  paymentMethod,
});
```

The caller does not need to know which repositories, transactions, payment providers, or notifications are involved. The service owns the workflow while collaborators own their specialized responsibilities.

## The problem a Service Layer solves

Without a service boundary, controllers, route handlers, jobs, and UI actions can each implement their own version of the same workflow:

```ts
export async function POST(request: Request) {
  const input = await request.json();
  const user = await db.users.findById(input.userId);

  if (!user || !user.active) {
    return Response.json({ error: 'Invalid user' }, { status: 400 });
  }

  const order = await db.orders.create(input);
  await email.send(user.email, 'Order created');

  return Response.json(order);
}
```

This may work initially, but the same business operation can later be needed from a background job, CLI command, or admin workflow. If each entry point reimplements it, behavior drifts.

A service centralizes the application operation:

```ts
type CheckoutService = {
  complete: (input: CheckoutInput) => Promise<CheckoutResult>;
};

const createCheckoutService = (dependencies: CheckoutDependencies): CheckoutService => ({
  async complete(input) {
    const customer = await dependencies.customers.findById(input.customerId);
    if (!customer || !customer.active) throw new Error('Invalid customer');

    const order = await dependencies.orders.create(input);
    await dependencies.payments.charge(input.paymentMethod, order.total);
    await dependencies.notifications.orderCreated(customer, order);

    return { orderId: order.id };
  },
});
```

The HTTP route becomes an adapter around the service instead of the owner of the workflow.

## Service Layer responsibilities

A service commonly owns:

- Application-level sequencing.
- Coordination between repositories and integrations.
- Transaction boundaries for a use case.
- Authorization decisions that require several pieces of context.
- Conversion from input models to domain operations.
- Publishing events after a successful state change.

A service should not automatically own every concern. Persistence queries belong in [Repositories](/blog/repository), domain invariants belong in domain objects or domain services, and transport concerns belong in controllers, routes, or handlers.

The exact boundaries depend on the application. The useful question is: which layer owns the decision that these steps form one meaningful application operation?

## Services as use cases

One effective style is to organize services around actions rather than technical categories:

```ts
type TransferMoney = {
  execute: (input: TransferInput) => Promise<TransferResult>;
};

const createTransferMoney = (
  dependencies: TransferDependencies,
): TransferMoney => ({
  async execute(input) {
    const source = await dependencies.accounts.findById(input.sourceId);
    const destination = await dependencies.accounts.findById(input.destinationId);

    if (!source || !destination) throw new Error('Account not found');
    if (source.balance < input.amount) throw new Error('Insufficient funds');

    return dependencies.transaction.run(async (context) => {
      await context.accounts.debit(source.id, input.amount);
      await context.accounts.credit(destination.id, input.amount);
      return { sourceId: source.id, destinationId: destination.id };
    });
  },
});
```

`TransferMoney` communicates a business operation. A generic `AccountService` may eventually collect unrelated reads, writes, notifications, and reports.

## Service methods should have clear contracts

A service method should make its input, result, and failure behavior understandable:

```ts
type PublishArticleInput = {
  articleId: string;
  actorId: string;
};

type PublishArticleResult = {
  articleId: string;
  publishedAt: Date;
};

type PublishArticleService = {
  execute: (
    input: PublishArticleInput,
  ) => Promise<PublishArticleResult>;
};
```

Avoid methods that accept a large options object with many unrelated flags. If the operation has different business meanings, create separate use cases or service methods with focused contracts.

Name errors or result types when callers need to distinguish outcomes:

```ts
class ArticleNotFoundError extends Error {}
class ArticleAlreadyPublishedError extends Error {}
```

The transport layer can translate these into HTTP responses, messages, or UI states without forcing the service to know about HTTP or a particular framework.

## Services and domain logic

Not every rule belongs in a Service Layer. Compare a domain rule:

```ts
class Order {
  submit() {
    if (this.status !== 'draft') {
      throw new Error('Only draft orders can be submitted');
    }

    this.status = 'submitted';
  }
}
```

With the application workflow:

```ts
const submitOrder = async (orderId: string, orders: OrderRepository) => {
  const order = await orders.findById(orderId);
  if (!order) throw new Error('Order not found');

  order.submit();
  await orders.save(order);
};
```

The `Order` object protects its own invariant. The service loads it, invokes the operation, and persists the result.

If a rule needs several aggregates or external policies, a domain service may be appropriate. Do not move every `if` into an application service simply because it is convenient.

## Dependency injection

Services should receive collaborators rather than constructing global clients inside methods:

```ts
type CreateInvoiceDependencies = {
  invoices: InvoiceRepository;
  customers: CustomerRepository;
  tax: TaxCalculator;
  clock: () => Date;
};

const createInvoiceService = (
  dependencies: CreateInvoiceDependencies,
) => ({
  async execute(input: CreateInvoiceInput) {
    const customer = await dependencies.customers.findById(input.customerId);
    if (!customer) throw new Error('Customer not found');

    const tax = dependencies.tax.calculate(input.subtotal, customer.country);

    return dependencies.invoices.create({
      ...input,
      tax,
      issuedAt: dependencies.clock(),
    });
  },
});
```

The service can be tested with a fake repository, deterministic clock, and simple tax calculator. This is [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection) applied to an application workflow.

## Service Layer and transactions

When a service coordinates multiple writes, it often defines the transaction boundary:

```ts
const createSubscriptionService = ({
  transaction,
  subscriptions,
  billing,
}: Dependencies) => ({
  async execute(input: CreateSubscriptionInput) {
    return transaction.run(async (context) => {
      const subscription = await context.subscriptions.create(input);
      await context.billing.createInvoice(subscription);
      return subscription;
    });
  },
});
```

The service knows that creating the subscription and its invoice form one application operation. The repositories know how to execute individual persistence commands, but they should not silently create unrelated transactions that prevent atomicity.

External calls complicate transaction boundaries. A database transaction cannot automatically roll back an email, payment, or remote API request. For those workflows, consider an outbox, saga, compensating action, or explicit pending state rather than pretending every step is atomic.

## Events and side effects

A service may publish an event after a successful state change:

```ts
const createOrderService = ({ orders, events }: Dependencies) => ({
  async execute(input: CreateOrderInput) {
    const order = await orders.create(input);
    await events.publish({
      type: 'order.created',
      orderId: order.id,
    });

    return order;
  },
});
```

Decide what happens if event publication fails after persistence succeeds. A transactional outbox can store the event with the database change and publish it later. A retryable event publisher may be sufficient for less critical workflows.

Do not hide important side effects inside a method whose name sounds like a read. `getUser` should not silently send an email or mutate an order.

## Service Layer and authorization

Authorization often belongs at the service boundary because the service has the context needed for the decision:

```ts
const cancelOrder = async (
  input: { orderId: string; actorId: string },
  dependencies: Dependencies,
) => {
  const order = await dependencies.orders.findById(input.orderId);
  if (!order) throw new Error('Order not found');

  const canCancel = await dependencies.permissions.canCancel(
    input.actorId,
    order,
  );

  if (!canCancel) throw new Error('Not allowed');

  order.cancel();
  await dependencies.orders.save(order);
};
```

The service should not rely only on UI checks or route-level authorization when the operation can be called from multiple entry points. Enforce the rule at the boundary that owns the use case.

## Service Layer and controllers

A controller or route handler adapts transport data to a service input and adapts the result to a response:

```ts
export async function POST(request: Request) {
  const input = await request.json();

  try {
    const result = await checkoutService.complete(input);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return toHttpErrorResponse(error);
  }
}
```

The route should not decide how to calculate totals, which repositories to call, or how to publish a domain event. It should parse, authenticate, invoke, and translate.

This keeps the service reusable from an HTTP route, background job, command-line script, or message consumer.

## Testing services

Service tests should exercise workflow decisions with controlled collaborators:

```ts
it('charges and records a completed checkout', async () => {
  const orders = {
    create: vi.fn().mockResolvedValue({ id: 'order-1', total: 25 }),
  };
  const payments = {
    charge: vi.fn().mockResolvedValue({ id: 'payment-1' }),
  };
  const notifications = {
    orderCreated: vi.fn().mockResolvedValue(undefined),
  };

  const service = createCheckoutService({
    customers: { findById: vi.fn().mockResolvedValue({ active: true }) },
    orders,
    payments,
    notifications,
  });

  await service.complete(input);

  expect(payments.charge).toHaveBeenCalledWith(
    input.paymentMethod,
    25,
  );
  expect(notifications.orderCreated).toHaveBeenCalled();
});
```

Also test rejected validation, authorization failures, collaborator failures, transaction behavior, and event or notification policies. Do not replace every collaborator with a mock automatically; use integration tests for repository and adapter behavior.

## Service Layer versus domain service

The terms are often confused.

An application Service Layer coordinates a use case across boundaries: repositories, transactions, external services, and events.

A domain service contains domain logic that does not naturally belong to one entity or value object:

```ts
const calculateShipping = (
  order: Order,
  destination: Address,
  rules: ShippingRules,
) => rules.calculate(order, destination);
```

An application service may call a domain service, then persist the result. The distinction is about responsibility, not whether the code is a class or a function.

## Common mistakes

### The “god service”

A service with users, billing, exports, notifications, and reporting methods is a new global object, not a useful boundary. Split by cohesive business operations or capabilities.

### Anemic pass-through services

If every service method only forwards one repository call and adds no meaningful policy or workflow, the extra layer may not be helping. Add it when it creates a reusable application boundary or owns coordination.

### Putting all business rules in services

Services are convenient, but rules that protect an entity should stay with that entity or a domain abstraction. Otherwise, another caller can mutate the same data without applying the rule.

### Constructing dependencies internally

Creating database clients, clocks, payment providers, and mailers inside service methods makes tests slow and behavior hard to replace. Compose dependencies at the application boundary.

### Hiding transaction boundaries

Callers and maintainers need to know which changes are atomic and what happens when an external side effect fails. Make transaction and consistency behavior explicit.

### Returning transport responses

A service returning `Response`, HTTP status codes, or framework-specific errors is coupled to one adapter. Return application results and domain errors; let the controller translate them.

## A practical checklist

Before introducing a Service Layer, ask:

- Is this a meaningful application operation used by more than one entry point?
- Which steps must be coordinated together?
- Which rules belong in domain objects instead?
- Who owns the transaction boundary?
- Which dependencies should be injected?
- What happens when a database write succeeds but an external side effect fails?
- Can the service be tested without the network or framework runtime?
- Is the service cohesive, or is it becoming a collection of unrelated methods?

## Final thoughts

The Service Layer gives application workflows a stable home. It coordinates repositories, domain behavior, transactions, integrations, authorization, and events without making controllers or jobs responsible for every detail.

Keep services organized around meaningful operations, inject collaborators, preserve domain invariants in the right layer, make side effects and transaction boundaries visible, and split services when their responsibilities stop changing together. A good service is a focused workflow—not a container for every piece of business code.
