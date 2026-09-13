---
title: "Classical GoF patterns: State"
description: A practical guide to the State pattern, how an object changes behavior as its internal state changes, and how to make transitions explicit and testable.
date: "2026-09-13"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

The State pattern lets an object change its behavior when its internal state changes. The object delegates state-dependent behavior to a current state object instead of accumulating conditionals in one large class.

```text
Context → current State
             ├── behavior()
             └── transition()
```

It is useful when an entity has meaningful modes, each mode permits different operations, and transitions between modes are part of the domain.

## The problem it solves

An order can behave differently depending on its status:

```ts
const cancelOrder = (order: Order) => {
  if (order.status === 'pending') return order.cancel();
  if (order.status === 'paid') return order.requestRefund();
  if (order.status === 'shipped') return order.requestReturn();
  throw new Error('Order cannot be canceled');
};
```

As states and operations grow, the conditionals spread across the entity, services, controllers, and UI. State gives each mode a focused home.

```text
OrderContext
├── PendingOrderState
├── PaidOrderState
├── ShippedOrderState
└── CanceledOrderState
```

## The basic contract

The context exposes operations while delegating to its current state:

```ts
type OrderState = {
  cancel(): Promise<void>;
  pay(paymentId: string): Promise<void>;
  ship(trackingNumber: string): Promise<void>;
};

type OrderContext = {
  cancel(): Promise<void>;
  pay(paymentId: string): Promise<void>;
  ship(trackingNumber: string): Promise<void>;
};
```

A state needs access to the context or a narrow transition capability:

```ts
type OrderStateContext = {
  setState(state: OrderState): void;
  orderId: string;
};
```

Keep state objects focused on behavior and transitions. They should not reach into arbitrary global state or bypass the context’s invariants.

## State-specific behavior

Each state implements only the behavior that is valid for its mode:

```ts
const pendingOrder = (
  context: OrderStateContext,
  payments: { authorize(paymentId: string): Promise<void> },
): OrderState => ({
  async cancel() {
    context.setState(canceledOrder(context));
  },
  async pay(paymentId) {
    await payments.authorize(paymentId);
    context.setState(paidOrder(context));
  },
  async ship() {
    throw new Error('Pending order must be paid before shipping');
  },
});
```

The context delegates calls:

```ts
const createOrder = (dependencies: Dependencies): OrderContext => {
  let state: OrderState;
  const context: OrderStateContext & OrderContext = {
    orderId: dependencies.orderId,
    setState(next) {
      state = next;
    },
    cancel: () => state.cancel(),
    pay: (paymentId) => state.pay(paymentId),
    ship: (trackingNumber) => state.ship(trackingNumber),
  };

  state = pendingOrder(context, dependencies.payments);
  return context;
};
```

The example demonstrates the shape. For durable domain entities, store the state value explicitly and reconstruct the appropriate behavior after loading from persistence.

## Explicit state machines

For important workflows, represent states and events as data before choosing implementation style:

```ts
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'canceled';
type OrderEvent =
  | { type: 'payment_succeeded'; paymentId: string }
  | { type: 'shipment_created'; trackingNumber: string }
  | { type: 'cancel_requested' };

const transitions: Record<OrderStatus, Partial<Record<OrderEvent['type'], OrderStatus>>> = {
  pending: { payment_succeeded: 'paid', cancel_requested: 'canceled' },
  paid: { shipment_created: 'shipped', cancel_requested: 'canceled' },
  shipped: {},
  canceled: {},
};
```

An explicit transition table makes the allowed graph easy to inspect, generate documentation for, and test. State objects are often better when each state has substantial behavior; a transition table is often better when the state graph is the main complexity.

## Invalid transitions

Reject invalid transitions deliberately:

```ts
const transition = (status: OrderStatus, event: OrderEvent['type']): OrderStatus => {
  const next = transitions[status][event];
  if (!next) throw new Error(`Cannot apply ${event} while order is ${status}`);
  return next;
};
```

Do not silently ignore an event unless ignoring it is a documented idempotent behavior. A repeated `payment_succeeded` event may return the existing paid result when it has the same payment ID, while a payment for a different ID should be rejected.

## State ownership

The context should own the current state and enforce invariants around transitions. A state should not mutate unrelated aggregates or persist itself through a hidden global repository.

```ts
const changeOrderState = async (
  order: Order,
  next: OrderStatus,
  repository: { save(order: Order): Promise<void> },
) => {
  order.status = next;
  await repository.save(order);
};
```

In a domain model, the entity can expose named methods such as `pay()` and `ship()` while keeping the status field private. In an application service, the state machine can coordinate transactions and external effects around those domain transitions.

## State versus Strategy

Strategy selects an interchangeable algorithm, usually from outside the context. State represents a mode that can change from inside the context as a result of events:

```text
Strategy → choose how to perform an operation
State    → current mode determines behavior and transitions
```

The implementations can look similar. If the selected object changes because the entity progressed through a lifecycle, State communicates the intent better. If a caller simply chooses pricing or compression behavior, Strategy is usually the clearer pattern.

## State versus Command

Command represents an action or request. State represents the mode in which that action is interpreted:

```text
Command → “ship this order”
State   → “shipping is valid only after payment”
```

They work well together. A command can be accepted by a state, persisted, retried, and produce a transition event.

## Persistence and rehydration

Persist a stable state identifier, not a runtime class name:

```ts
type PersistedOrder = {
  id: string;
  status: OrderStatus;
  version: number;
};
```

After loading, rehydrate behavior from the status:

```ts
const stateFor = (status: OrderStatus, context: OrderStateContext): OrderState => {
  if (status === 'pending') return pendingOrder(context, dependencies.payments);
  if (status === 'paid') return paidOrder(context, dependencies.shipping);
  if (status === 'shipped') return shippedOrder(context);
  return canceledOrder(context);
};
```

Use schema versions and migration rules when states evolve. A persisted record may contain a state that the current code no longer supports; fail clearly or migrate it before enabling behavior.

## Concurrent transitions

Two requests can try to transition the same entity at once:

```text
request A reads pending
request B reads pending
request A pays → paid
request B cancels → canceled
```

Use optimistic concurrency with a version, a database transaction, or a serialized command stream:

```sql
update orders
set status = 'paid', version = version + 1
where id = $1 and status = 'pending' and version = $2;
```

If no row is updated, reload and decide whether the command is stale, already handled, or invalid in the new state. In-memory state objects do not protect a distributed entity from concurrent writers.

## Async state transitions

A transition can involve external work, but do not expose a state change before the required local transaction commits:

```text
authorize payment → persist order as paid → publish OrderPaid
```

Use an outbox for reliable event publication. For long-running transitions, model intermediate states such as `payment_pending` instead of keeping a request open indefinitely. A Saga may coordinate the larger workflow when several services participate.

## Testing State

Test each state’s allowed and rejected operations:

```ts
it('does not ship an unpaid order', async () => {
  const order = createOrder({ orderId: 'order-1', payments: fakePayments });

  await expect(order.ship('track-1')).rejects.toThrow(
    'Pending order must be paid before shipping',
  );
});
```

Also test every legal transition, invalid transitions, idempotent repeated events, persistence and rehydration, version conflicts, side-effect failures, rollback or compensation, state-specific authorization, and terminal states. Transition-table tests can verify that no unexpected path exists between states.

## Common mistakes

### One giant state class

If every operation still contains a switch over all states, the behavior has not been separated. Move state-specific decisions behind the state contract or an explicit transition table.

### States with hidden global side effects

State objects that directly reach into repositories, queues, and globals are difficult to test and reason about. Inject focused capabilities and keep transaction orchestration visible.

### Ignoring invalid events

Silent invalid transitions hide bugs and out-of-order messages. Reject, ignore, or deduplicate only according to an explicit contract.

### Persisting runtime class names

Class names are implementation details and can change during refactoring. Persist stable state identifiers and versions.

### In-memory state for durable workflows

Process restarts lose in-memory state. Persist lifecycle state and progress for workflows that must resume.

### Missing concurrency control

Multiple instances can transition the same entity simultaneously. Use version checks, locks, or serialized ownership where correctness requires it.

## A practical checklist

Before introducing State, ask:

- Does the object have meaningful modes with different valid behavior?
- Are state transitions part of the domain rather than incidental flags?
- Would a transition table or simple conditional be clearer?
- Which component owns the current state and legal transitions?
- What are the terminal states and invalid-event rules?
- How are state and versions persisted and rehydrated?
- What protects transitions from concurrent writers and duplicate events?
- Do external effects require an outbox, compensation, or a Saga?

## Final thoughts

State turns lifecycle-dependent behavior into explicit, focused modes. It reduces conditional complexity when each state has meaningful rules and transitions, while making invalid operations easier to reject and test.

Keep state identifiers stable, persist transitions that must survive restarts, protect writes with concurrency control, and keep side effects at clear application boundaries. For a small number of simple cases, a direct conditional or transition table may communicate the design better than a family of state objects.
