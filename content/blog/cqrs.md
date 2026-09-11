---
title: "Structural and Architectural Patterns: CQRS"
description: A practical guide to Command Query Responsibility Segregation, how separate read and write models clarify workflows, and when CQRS is worth its complexity.
date: "2026-09-11"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

Command Query Responsibility Segregation, or CQRS, separates operations that change state from operations that read state.

The central rule is:

- A Command asks the system to perform an action and may change state.
- A Query asks for information and does not change state.

```text
Command → write model → state change → events / projection updates
Query   → read model  → view-ready result
```

CQRS does not require two databases, event sourcing, microservices, or asynchronous messaging. The smallest useful form is simply giving commands and queries different contracts and responsibilities.

## The problem CQRS solves

A single model can become awkward when it must support both rich business writes and efficient screen-specific reads:

```ts
type OrderService = {
  create: (input: CreateOrderInput) => Promise<Order>;
  updateStatus: (id: string, status: string) => Promise<Order>;
  listDashboardRows: () => Promise<Order[]>;
  calculateCustomerSummary: (id: string) => Promise<CustomerSummary>;
};
```

The same object now combines commands, queries, domain rules, persistence concerns, and presentation projections. Reads may load large aggregates, while writes may need invariants and transactions that are irrelevant to a dashboard.

CQRS separates the shapes:

```ts
type SubmitOrder = {
  execute: (input: { orderId: string }) => Promise<{ orderId: string }>;
};

type ListOrderRows = {
  execute: () => Promise<OrderListRow[]>;
};
```

The write side protects state transitions. The read side returns data shaped for the consumer.

## Commands represent intent

A command represents a requested state change:

```ts
type SubmitOrderCommand = {
  orderId: string;
  actorId: string;
};

const submitOrder = async (
  command: SubmitOrderCommand,
  dependencies: Dependencies,
) => {
  const order = await dependencies.orders.findById(command.orderId);
  if (!order) throw new Error('Order not found');

  await dependencies.permissions.assertCanSubmit(command.actorId, order);
  order.submit();
  await dependencies.orders.save(order);

  return { orderId: order.id };
};
```

Commands usually return an acknowledgment, identifier, or result of the state transition. They should not be designed as general-purpose data-fetching methods.

A command may be synchronous or asynchronous. It may publish events or enqueue work after a successful state change, but its side effects should be explicit.

## Queries return read-oriented data

A query can use a projection that matches the screen or consumer:

```ts
type OrderListRow = {
  id: string;
  customerName: string;
  total: number;
  status: string;
  submittedAt: string | null;
};

const listOrderRows = (database: Database) =>
  database.orderDashboard.list<OrderListRow>({
    orderBy: 'submitted_at desc',
  });
```

The query does not need to load full `Order` entities or invoke domain methods. It can use joins, denormalized tables, database views, or a search index when those are appropriate for the read requirement.

The query should not mutate state. Avoid hidden writes such as updating a last-viewed timestamp or warming a cache with business side effects inside a method named `get`.

## Separate contracts, not necessarily separate databases

The simplest CQRS implementation can use one database and one application:

```text
Commands → application services → domain + repositories → PostgreSQL
Queries  → query handlers       → SQL/read repositories → PostgreSQL
```

The separation is conceptual and contractual. It can be enough to clarify code ownership and prevent query concerns from distorting the write model.

Use separate databases only when the operational or scaling benefits justify the added synchronization, deployment, backup, and consistency complexity.

## Command handlers

A command handler coordinates one state-changing operation:

```ts
type CreateProjectCommand = {
  ownerId: string;
  name: string;
};

const createProject = ({ projects, clock, ids }: Dependencies) =>
  async (command: CreateProjectCommand) => {
    const project = Project.create({
      id: ids.generate(),
      ownerId: command.ownerId,
      name: command.name,
      createdAt: clock.now(),
    });

    await projects.save(project);
    return { projectId: project.id };
  };
```

The handler can use domain entities, repositories, transactions, authorization, and output ports. It should not also become a general query service.

Command handlers are a form of [Service Layer](/blog/service-layer) organized around state-changing use cases.

## Query handlers

A query handler coordinates data retrieval:

```ts
type ListProjectsQuery = {
  ownerId: string;
  search?: string;
};

const listProjects = (queries: ProjectQueries) =>
  (query: ListProjectsQuery) => queries.listForOwner({
    ownerId: query.ownerId,
    search: query.search?.trim(),
  });
```

The result can be a DTO designed for a specific View:

```ts
type ProjectCard = {
  id: string;
  name: string;
  taskCount: number;
  updatedAt: string;
};
```

There is no requirement to reconstruct domain aggregates for every read. A query can use a direct projection when no domain behavior is needed.

## Read models and projections

A read model is data organized for efficient queries. It may be a database view, materialized table, search index, cache, or in-memory projection.

```ts
type ProjectSummaryProjection = {
  project_id: string;
  project_name: string;
  owner_name: string;
  open_task_count: number;
};
```

The projection can be updated when commands produce events:

```ts
const onTaskCompleted = async (event: TaskCompletedEvent) => {
  await projectSummary.update(event.projectId, {
    openTaskCount: decrementByOne,
  });
};
```

A projection is a derived representation, not necessarily the source of truth. Define how it is rebuilt, repaired, versioned, and monitored.

## Eventual consistency

When a read model is updated asynchronously, a successful command may be visible on the write side before it appears in the read model:

```text
Submit order → write committed → event published → projection updated
                                      ↑ delay
Dashboard query may briefly show the old status.
```

This is eventual consistency. It can be acceptable for dashboards, search, recommendations, and analytics. It may be unacceptable for a balance, authorization decision, or confirmation that must reflect the just-completed write.

Make consistency expectations part of the feature contract. Options include:

- Read from the write model immediately after a command.
- Return the command result and update the UI optimistically.
- Include a version or position the query can wait for.
- Update a small projection synchronously in the same transaction.
- Accept and communicate a short delay.

Do not introduce asynchronous projections without deciding how users experience the delay.

## Command and query models can evolve independently

A write model may prioritize invariants and normalized data:

```ts
class Invoice {
  issue() {
    // enforce invoice rules
  }
}
```

A read model may prioritize a single fast query:

```ts
type InvoiceListRow = {
  id: string;
  customerName: string;
  total: number;
  status: string;
};
```

The two models can change for different reasons. A new reporting screen should not require weakening the domain model, and a new domain invariant should not require rebuilding every read DTO.

## CQRS and event sourcing

CQRS and Event Sourcing are independent patterns that are often combined.

CQRS separates commands and queries. Event Sourcing stores state changes as an append-only event history instead of only storing the current state.

```text
CQRS only:
Command → current write model
Query   → current read model

CQRS + Event Sourcing:
Command → events → reconstructed write state / projections
Query   → read projections
```

Event Sourcing adds significant concerns: event schema evolution, replay, snapshots, ordering, idempotency, and operational tooling. Do not adopt it merely because CQRS is useful.

## CQRS and transactions

Commands usually own transaction boundaries:

```ts
const approveInvoice = ({ transaction, invoices, events }: Dependencies) =>
  async (invoiceId: string) => transaction.run(async (context) => {
    const invoice = await context.invoices.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    invoice.approve();
    await context.invoices.save(invoice);
    await context.events.record({ type: 'invoice.approved', invoiceId });
  });
```

Recording an event in the same transaction can support reliable projection updates through an outbox. Publishing directly to a remote broker inside the transaction creates a partial-failure problem: the database may commit while publishing fails.

Queries should generally avoid changing transactional state. If a query needs a consistent snapshot, make the read isolation and freshness requirement explicit.

## CQRS and APIs

An API can expose commands and queries through different endpoints or simply different application handlers:

```text
POST /orders/:id/submit  → SubmitOrderCommand
GET  /orders             → ListOrdersQuery
```

The HTTP layer is still an adapter. It maps request DTOs to commands and queries, then maps results to response DTOs.

Do not force REST endpoints into command/query names if the external contract is already clear. The separation belongs in application behavior even when transport URLs remain resource-oriented.

## CQRS and frontend state

A frontend can use commands for actions and queries for screen data:

```ts
const onSubmit = async () => {
  const result = await submitOrder({ orderId });
  orderStore.applyCommandResult(result);
  await refreshOrderList();
};
```

The View can render query results and dispatch commands without knowing persistence details. [Flux / Unidirectional Data Flow](/blog/flux-unidirectional-data-flow) can provide the client-side state flow, while CQRS organizes application operations behind it.

Avoid treating every button click as a remote command if the action only changes local UI state. CQRS is about responsibility and state ownership, not renaming every event.

## Testing CQRS systems

Test commands as business workflows:

```ts
it('approves an invoice and saves the changed state', async () => {
  const invoice = Invoice.from({ id: 'invoice-1', status: 'pending' });
  const save = vi.fn().mockResolvedValue(undefined);
  const handler = createApproveInvoice({
    invoices: {
      findById: vi.fn().mockResolvedValue(invoice),
      save,
    },
  });

  await handler({ invoiceId: invoice.id });

  expect(save).toHaveBeenCalledWith(invoice);
});
```

Test queries against representative read data and verify filtering, pagination, ordering, and authorization. Test projections with event sequences, replay behavior, duplicate events, and rebuilds when the projection is asynchronous.

Integration tests should verify that commands persist correctly and query handlers use the intended indexes or views. End-to-end tests should cover critical consistency expectations.

## Common mistakes

### Two models without a reason

Separating commands and queries adds concepts and maintenance. If one simple model serves both cleanly, ordinary application services may be better.

### Assuming CQRS requires two databases

It does not. Start with separate contracts and handlers. Split storage only when scaling, workload, or autonomy needs justify it.

### Rebuilding aggregates for every query

If a screen needs a small projection, a direct read model may be clearer and faster. Do not use the write model for every read out of habit.

### Ignoring eventual consistency

Users may see old data after a successful command. Define freshness expectations, expose command results, or use a read-your-writes strategy where necessary.

### Treating queries as side-effect free while hiding writes

Cache warming, audit updates, and “last viewed” writes are still effects. Put them in explicit operations or document the behavior.

### Duplicating business rules in read models

A projection can derive display data, but it should not become a second authority for whether a command is allowed. Commands must enforce rules against the authoritative write state.

### Ignoring projection failure and rebuilds

An asynchronous read model can fall behind or become corrupt. Define replay, reconciliation, monitoring, and recovery before relying on it for important screens.

## A practical checklist

Before adopting CQRS, ask:

- Are read and write workloads or models genuinely different?
- Which operations are commands, and what invariants do they protect?
- Which queries need screen-specific projections?
- Can one database support the separation initially?
- What consistency does each user flow require?
- How are projections updated, rebuilt, monitored, and repaired?
- Are command handlers idempotent where retries are possible?
- Would a simpler Service Layer be enough for this feature?

## Final thoughts

CQRS separates the responsibility to change state from the responsibility to read it. Commands protect workflows and invariants; queries return data optimized for consumers; projections can connect the two when read models need a different shape.

Start with separate contracts and handlers before introducing separate databases, asynchronous projections, or event sourcing. Make consistency visible, keep business rules on the command side, and adopt the additional machinery only when the application's read/write pressures justify it.
