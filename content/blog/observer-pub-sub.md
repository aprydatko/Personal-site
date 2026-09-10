---
title: "Core Patterns: Observer / Pub-Sub"
description: A practical guide to Observer and Publish-Subscribe patterns, how they decouple events from reactions, and how to use them without creating invisible application flow.
date: "2026-09-10"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Observer and Publish-Subscribe patterns let one part of a system announce that something happened while other parts react to it.

They are useful when several consumers need to respond to the same change: a UI should update after a store changes, analytics should record a completed checkout, or a cache should be invalidated after data is updated.

The patterns reduce direct coupling between the producer and its consumers. But they also make control flow less visible. A notification can trigger work far away from the code that emitted it, so event names, payloads, ownership, and cleanup need to be designed carefully.

## The Observer pattern

In Observer, observers subscribe directly to a subject. The subject owns the list of observers and notifies them when its state changes.

```ts
type Observer<T> = (value: T) => void;

export class ObservableValue<T> {
  private observers = new Set<Observer<T>>();

  constructor(private value: T) {}

  get() {
    return this.value;
  }

  set(value: T) {
    this.value = value;
    this.observers.forEach((observer) => observer(value));
  }

  subscribe(observer: Observer<T>) {
    this.observers.add(observer);

    return () => {
      this.observers.delete(observer);
    };
  }
}
```

The `subscribe` method returns an unsubscribe function. That detail is essential: an observer that is never removed can keep components, requests, or other objects alive longer than intended.

Usage stays direct:

```ts
const selectedTab = new ObservableValue('overview');

const unsubscribe = selectedTab.subscribe((tab) => {
  console.log(`Selected tab: ${tab}`);
});

selectedTab.set('activity');
unsubscribe();
```

The subject knows that it has observers, but it does not need to know what each observer does.

## The Publish-Subscribe pattern

Publish-Subscribe introduces an intermediary, often called an event bus or broker. Publishers send messages to a topic, and subscribers listen to that topic without being directly connected to the publisher.

```ts
type Events = {
  'order.placed': { orderId: string; customerId: string };
  'order.cancelled': { orderId: string; reason: string };
};

export class EventBus<TEvents extends Record<string, unknown>> {
  private handlers = new Map<
    keyof TEvents,
    Set<(payload: TEvents[keyof TEvents]) => void>
  >();

  subscribe<TKey extends keyof TEvents>(
    topic: TKey,
    handler: (payload: TEvents[TKey]) => void,
  ) {
    const handlers = this.handlers.get(topic) ?? new Set();
    handlers.add(handler as (payload: TEvents[keyof TEvents]) => void);
    this.handlers.set(topic, handlers);

    return () => handlers.delete(handler as (payload: TEvents[keyof TEvents]) => void);
  }

  publish<TKey extends keyof TEvents>(topic: TKey, payload: TEvents[TKey]) {
    this.handlers.get(topic)?.forEach((handler) => handler(payload));
  }
}
```

The publisher only knows the event bus and topic. It does not hold references to individual subscribers.

```ts
const events = new EventBus<Events>();

events.subscribe('order.placed', ({ orderId }) => {
  analytics.track('order_placed', { orderId });
});

events.subscribe('order.placed', ({ customerId }) => {
  emailQueue.enqueue({ customerId, template: 'order-confirmation' });
});

events.publish('order.placed', {
  orderId: 'order-1',
  customerId: 'customer-1',
});
```

The event bus is the intermediary that creates the extra decoupling.

## Observer versus Pub-Sub

The distinction is about the relationship between the producer and the consumer.

| Pattern | Connection | Typical use |
| --- | --- | --- |
| Observer | Observers subscribe directly to a subject | State changes, UI models, local stores |
| Publish-Subscribe | Publishers and subscribers communicate through topics and a broker | Domain events, cross-feature notifications, integrations |

An Observer usually describes a subject's state or lifecycle. Pub-Sub usually describes an event or message that has happened. In practice, many event emitters are called “observers” even though they behave like a small Pub-Sub broker.

The name matters less than the contract. Be clear about whether subscribers receive the current state, a new state, a one-time event, or a durable message.

## Events versus commands

An event says that something already happened:

```ts
events.publish('order.placed', { orderId, customerId });
```

A command asks a particular owner to do something:

```ts
await orderService.cancel(orderId);
```

Do not use events to disguise commands. A topic such as `order.cancel` may have several subscribers and unclear ownership. A method call is often better when one component owns the operation and the caller needs a result or error.

Events work best for facts that can have multiple independent reactions. Commands work best for intentional requests with one clear owner.

## Synchronous and asynchronous notification

An in-memory observer is often synchronous: subscribers run during the `set` or `publish` call.

```ts
store.update(nextState); // subscribers run before this returns
```

Synchronous delivery is simple and useful for local state, but one slow or failing subscriber can affect the publisher. Decide what should happen when a handler throws:

```ts
publish(topic, payload) {
  this.handlers.get(topic)?.forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      this.logger.error('Event handler failed', { topic, error });
    }
  });
}
```

For asynchronous work, an in-process event bus is not a durable queue. If the process exits, the message is lost. If delivery, retries, ordering, or cross-process communication matter, use an infrastructure message broker or queue with those guarantees.

```ts
await queue.publish('order.placed', {
  orderId,
  customerId,
});
```

Do not call an in-memory event emitter a queue unless it actually provides queue semantics.

## Observers in frontend applications

Observer is common in UI state management. A store exposes a snapshot and a subscription mechanism:

```ts
type State = {
  count: number;
};

const createStore = (initial: State) => {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState(next: State) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
```

React integrations should subscribe and unsubscribe with the framework's lifecycle tools. The important design principle is that the component reads a snapshot and reacts to a change; it does not need to know which other components are subscribed.

For simple local state, framework state primitives are usually clearer than creating a custom global event bus. Use an event pattern when the event is genuinely shared across a feature or application boundary.

## Domain events

Domain events capture meaningful facts in domain language:

```ts
type UserRegistered = {
  type: 'user.registered';
  userId: string;
  registeredAt: string;
};
```

The registration workflow can publish this event after the user is successfully created. Independent handlers can send a welcome email, update analytics, or create a profile without putting every side effect inside the registration function.

That separation is valuable, but the event should not become a hidden substitute for required business steps. If the registration operation is not complete until a specific action succeeds, make that action explicit in the workflow or use a reliable transactional mechanism.

Name events as facts, use stable payloads, and document whether handlers run before the operation returns or later in a background process.

## Lifecycle and memory leaks

Every subscription creates a relationship that must eventually end. Common failure modes include:

- A component subscribes on every render without removing the previous handler.
- A request-scoped listener is attached to a process-wide bus.
- A test adds a handler and leaves it active for the next test.
- A long-lived singleton retains short-lived objects.

Treat the unsubscribe function as part of the subscription contract:

```ts
const stop = events.subscribe('order.placed', handleOrderPlaced);

try {
  await runFeature();
} finally {
  stop();
}
```

For long-lived application subscriptions, register them in one composition or startup boundary so ownership is easy to find.

## Common mistakes

### One global event bus for everything

A universal bus creates invisible coupling. Any module can publish or subscribe to any topic, and no one can easily see the feature's dependencies. Prefer feature-specific buses, typed event maps, or direct calls when the relationship is local.

### Vague event names

Names such as `updated`, `changed`, or `data-ready` lack context. Prefer names that communicate the subject and fact: `order.placed`, `profile.avatar.updated`, or `invoice.payment-failed`.

### Unstable payloads

Subscribers depend on event payloads even when the type is not visible. Treat event schemas as contracts. Include identifiers and stable facts rather than passing an entire mutable model that encourages consumers to depend on internals.

### Hidden ordering assumptions

If handler B must always run after handler A, independent subscriptions may be the wrong design. Make the sequence explicit in a workflow or create a higher-level event that represents the completed step.

### Swallowing errors silently

If a notification fails, decide whether to fail the operation, retry, log, or record the failure for later processing. A `try/catch` that only ignores the error makes the system appear successful while losing work.

## A practical checklist

Before introducing Observer or Pub-Sub, ask:

- Is this a state change, an event, or a command?
- Does the producer need a result from the consumer?
- How many consumers should be able to react?
- Is direct composition or a function call clearer?
- Who owns the subscription and when is it removed?
- Are delivery, ordering, retry, and durability requirements explicit?
- Is the event name and payload a stable contract?
- Is the event bus scoped to the feature or application boundary?

Start with a direct callback or local observer when the relationship is close. Introduce a broker when the decoupling solves a real problem, not simply because events feel flexible.

## How Observer and Pub-Sub connect to other design ideas

The patterns support [Separation of Concerns: Keep Each Part Focused](/blog/separation-of-concerns) by allowing a producer to announce a fact without owning every reaction.

They work with [Composition: Build Behavior by Combining Small Parts](/blog/composition), but event-driven composition should remain discoverable. A system is easier to maintain when important workflows are explicit and optional reactions are event-driven.

An event bus is often exposed through a [Module](/blog/module) with a small, typed public API. Its lifetime and dependencies can be assembled with a [Factory](/blog/factory) or at the composition root.

Finally, an event may be published by a shared [Singleton](/blog/singleton), but that combination needs care: a process-wide bus must not accidentally retain request-specific subscribers or user data.

## Final thoughts

Observer and Publish-Subscribe are useful ways to separate “something happened” from “what should react.” Use direct observers for local state and focused relationships; use Pub-Sub when an intermediary genuinely improves decoupling between independent parts.

Make event contracts typed and meaningful, make subscription ownership explicit, and choose delivery guarantees that match the work. Events should clarify the architecture, not turn important control flow into a mystery.
