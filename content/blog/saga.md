---
title: "Backend and distributed-system patterns: Saga"
description: A practical guide to the Saga pattern, how distributed workflows coordinate local transactions, and how to design compensation, retries, and recovery.
date: "2026-09-13"
category: Backend
readingTime: 8 min read
featured: false
published: true
---

A Saga coordinates a business workflow across multiple services by splitting it into local transactions. If a later step fails, the workflow runs compensating actions for the steps that already succeeded.

```text
reserve inventory → authorize payment → create shipment
       ↓ failure            ↓ failure
release inventory ← refund payment ← cancel reservation
```

Each local transaction commits independently. The Saga does not provide one ACID transaction across service boundaries; it provides a way to reach a defined business outcome despite partial failure.

## The problem Saga solves

A single database transaction is not available when a workflow spans separate services or stores:

```text
Order Service → Inventory Service → Payment Service → Shipping Service
```

Holding a distributed lock or trying to coordinate a two-phase commit can create latency, availability, and operational coupling. A Saga accepts that intermediate states exist and makes the transitions and recovery behavior explicit.

## Local transactions and compensation

Each step should have a local commit and, where possible, a semantic undo:

| Step | Local transaction | Compensation |
| --- | --- | --- |
| Create order | Store `pending` order | Cancel order |
| Reserve stock | Hold inventory | Release reservation |
| Authorize payment | Create authorization | Void or refund payment |
| Create shipment | Register shipment | Cancel shipment |

Compensation is not a database rollback. A refund is a new payment operation; an already-sent email cannot truly be unsent; a shipment may require contacting a carrier. Model the business meaning of reversal rather than pretending the original side effect never happened.

## Saga state

Persist Saga state so a process restart does not erase the workflow:

```ts
type OrderSaga = {
  id: string;
  orderId: string;
  status: 'running' | 'completed' | 'compensating' | 'failed';
  currentStep: string;
  completedSteps: string[];
  failureReason?: string;
  updatedAt: Date;
};
```

The state record should support resuming, inspecting, retrying, and reconciling a stuck workflow. Avoid storing only an in-memory promise or relying on a process-local queue.

## Orchestration

An orchestrated Saga has a coordinator that tells each participant what to do:

```text
orchestrator → ReserveInventory
orchestrator ← InventoryReserved
orchestrator → AuthorizePayment
orchestrator ← PaymentAuthorized
orchestrator → CreateShipment
```

The orchestrator owns workflow order and compensation:

```ts
const runOrderSaga = async (order: Order, services: Services) => {
  const completed: string[] = [];

  try {
    await services.inventory.reserve(order.items);
    completed.push('inventory');

    await services.payments.authorize(order.total);
    completed.push('payment');

    await services.shipping.create(order.address, order.items);
    return { status: 'completed' as const };
  } catch (error) {
    await compensate(completed, order, services);
    return { status: 'compensated' as const, reason: error };
  }
};
```

This example shows the shape, but production orchestration should persist after every successful step and use durable commands and events. If the process crashes after payment succeeds, a restarted orchestrator must know whether to continue, query status, or compensate.

Orchestration is often easier to inspect and test. Its tradeoff is a more central workflow component that must understand participant contracts.

## Choreography

In a choreographed Saga, services react to events without one central coordinator:

```text
OrderCreated → Inventory service reserves stock
InventoryReserved → Payment service authorizes payment
PaymentAuthorized → Shipping service creates shipment
```

Each service publishes an event after its local transaction. A failure produces a compensating event:

```text
PaymentRejected → Inventory service releases reservation
```

Choreography can reduce central coupling, but the workflow becomes distributed across event handlers. Event names, ownership, ordering, replay, and observability need especially careful design. If the process is hard to draw or explain, an orchestrator may be clearer.

## Reliable event publication

Never update local state and publish an event as unrelated operations:

```text
database commits → process crashes → event never published
```

Use an outbox record in the same local transaction:

```text
local state + outbox event → one database commit
outbox publisher → broker → consumer
```

The outbox publisher may publish more than once, so consumers must be idempotent. Track an event ID or command ID and make local handling safe under duplicate delivery.

## Compensation is a business action

A compensation can fail or be incomplete:

```text
payment authorized → shipping fails → refund requested → refund provider unavailable
```

Do not silently abandon the Saga. Persist the compensating step, retry transient failures, route permanent failures to a dead-letter or manual review queue, and expose the workflow state to operations.

Some actions require a forward recovery instead of compensation. If a shipment cannot be canceled, the business may create a return workflow or contact fulfillment. Design the allowed outcomes with the domain owner.

## Ordering and state transitions

Participants should reject invalid or stale commands:

```ts
const reserveInventory = async (command: ReserveInventoryCommand) => {
  const order = await orders.find(command.orderId);
  if (!order) throw new Error('order_not_found');
  if (order.version !== command.expectedVersion) throw new Error('stale_command');
  if (order.status !== 'pending') return { alreadyHandled: true };

  await orders.markReserved(order.id, command.reservationId);
  return { alreadyHandled: false };
};
```

Use explicit states and legal transitions. A late `PaymentAuthorized` event should not move a canceled order back to paid without a defined policy. Version checks, unique operation IDs, and idempotent handlers protect against retries and reordering.

## Timeouts and retries

A Saga needs deadlines at both the step and workflow level:

```text
step timeout: payment authorization must answer within 10 seconds
workflow deadline: order must resolve within 15 minutes
```

Retry only transient failures, use bounded backoff, and preserve command identity. A timeout does not prove that the remote step failed; it may have committed before the response was lost. Query status or use an idempotency key before sending the operation again.

Retries should not trigger compensation prematurely. First determine whether the step is still processing, succeeded, or failed. For long-running operations, model `pending` as a real state and use a callback, poller, or reconciliation job.

## Consistency and user experience

During a Saga, users may observe intermediate state:

```text
order status: awaiting payment
inventory: reserved
shipment: not created yet
```

Expose meaningful states rather than pretending the workflow is instantaneous. A status endpoint, progress events, or a clear “processing” UI can make eventual consistency understandable.

Never use a stale read model to make a safety-critical decision. Participants should validate commands against their own authoritative state.

## When not to use Saga

Prefer a local transaction when all data belongs to one database and the workflow can be atomic there. A Saga adds durable state, messaging, compensation, retries, and operational tooling.

Do not use it for a simple request-response call that can be protected by a timeout, retry, or Circuit Breaker. Use a Saga when the business workflow genuinely spans independent local transactions and needs recovery across partial success.

## Testing Sagas

Test the workflow as a state machine:

```ts
it('compensates inventory when payment authorization fails', async () => {
  const services = createFakeServices({ paymentFailure: true });

  const result = await runOrderSaga(order, services);

  expect(result.status).toBe('compensated');
  expect(services.inventory.release).toHaveBeenCalledWith(order.items);
});
```

Also test failures at every step, compensation failures, duplicate events, out-of-order events, process restart, timeout after remote success, retry exhaustion, and manual recovery. Property-based or table-driven tests work well for valid and invalid state transitions.

Integration tests should verify the outbox transaction, consumer idempotency, broker redelivery, and persistence of Saga state. End-to-end tests should cover the user-visible intermediate and final states.

## Observability and operations

Give every workflow a correlation ID and record:

- Saga status and current step;
- time spent in each step;
- command and event IDs;
- retry and compensation counts;
- oldest running and compensating workflows;
- dead-letter and manual-review volume;
- final outcome and failure reason.

Provide safe operational actions such as retrying a failed step, resuming a paused Saga, or marking a known external outcome. These actions must be audited and respect idempotency; “retry everything” is not a recovery strategy.

## Common mistakes

### Treating compensation as rollback

Remote side effects cannot always be undone. Define semantic compensation or forward recovery for each step.

### In-memory workflow state

Process restarts and deploys are normal. Persist state and progress after each local transaction.

### Publishing events outside the transaction

A crash can commit local state without publishing the event. Use an outbox or equivalent reliable publication mechanism.

### Non-idempotent participants

Retries and redelivery are expected. Commands need stable operation IDs and durable deduplication or naturally idempotent state transitions.

### Unbounded compensation

A failing compensation can loop forever. Set deadlines, classify failures, and route unresolved work to reconciliation or manual review.

### Hidden choreography

If ownership and event relationships are unclear, the workflow is already difficult to operate. Prefer explicit orchestration or document the event graph and invariants.

## A practical checklist

Before introducing a Saga, ask:

- Which local transactions make up the business workflow?
- What is the authoritative state and legal transition for each step?
- What compensates each successful side effect, and what happens if compensation fails?
- Should coordination be orchestrated or choreographed?
- Are state, commands, events, and outbox records durable?
- Are steps idempotent under retries and duplicate delivery?
- What are the step deadlines and overall workflow deadline?
- How will users observe intermediate state?
- Can operators inspect, retry, reconcile, and audit stuck workflows?

## Final thoughts

Saga makes distributed transactions explicit as a sequence of local commits and business-level recovery actions. It accepts eventual consistency and partial failure instead of hiding them behind an unreliable global transaction.

Start with clear states, durable progress, idempotent commands, reliable event publication, and a compensation plan that reflects real business behavior. Choose orchestration when workflow visibility matters; choose choreography when event ownership is naturally decentralized and the resulting system remains operable.
