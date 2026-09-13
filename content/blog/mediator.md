---
title: "Classical GoF patterns: Mediator"
description: A practical guide to the Mediator pattern, how a central coordinator reduces direct object coupling, and how to keep collaboration logic explicit without creating a god object.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Mediator pattern encapsulates how a group of objects collaborates so the objects do not need direct references to one another.

```text
without Mediator:
  component A ↔ component B ↔ component C
       ↕              ↕
  many direct relationships

with Mediator:
  component A →
  component B → Mediator ← component C
```

Each participating object, often called a colleague, reports an event or requests an action through the mediator. The mediator coordinates the workflow and decides which colleagues should respond.

## The problem it solves

UI controls are a classic example. A dialog may contain a text field, checkbox, select, and submit button. If every control knows about every other control, changes become difficult to reason about:

```ts
class SubmitButton {
  onClick() {
    form.emailField.validate();
    form.termsCheckbox.isChecked();
    form.dialog.showLoading();
  }
}
```

The button is now coupled to the entire form. A mediator gives controls a smaller relationship:

```ts
type CheckoutMediator = {
  notify(sender: string, event: string): void;
};

type CheckoutControl = {
  setMediator(mediator: CheckoutMediator): void;
};
```

The button reports `submit_clicked`; the mediator coordinates validation, loading, and submission.

## A simple mediator

The mediator owns collaboration rules:

```ts
const createCheckoutMediator = (dependencies: {
  email: { value(): string; showError(message: string): void };
  terms: { checked(): boolean; showError(message: string): void };
  submit: { setEnabled(enabled: boolean): void };
  checkout: { submit(email: string): Promise<void> };
}) => ({
  notify(sender: string, event: string) {
    if (sender === 'email' || sender === 'terms') {
      dependencies.submit.setEnabled(
        dependencies.email.value().length > 0 && dependencies.terms.checked(),
      );
      return;
    }

    if (sender === 'submit' && event === 'clicked') {
      void dependencies.checkout.submit(dependencies.email.value());
    }
  },
});
```

The controls no longer need to know one another. The mediator becomes the visible place to inspect the collaboration policy.

## Colleagues and contracts

A colleague should depend on a narrow mediator contract:

```ts
type Mediator = {
  notify(event: DomainEvent): void;
};

type DomainEvent =
  | { type: 'email.changed'; value: string }
  | { type: 'terms.changed'; checked: boolean }
  | { type: 'submit.requested' };
```

Typed events are safer than stringly typed sender and event pairs. The mediator can evolve its internal coordination without exposing every colleague to every other colleague.

```ts
const emailField = {
  onChange(value: string, mediator: Mediator) {
    mediator.notify({ type: 'email.changed', value });
  },
};
```

Keep event payloads in application language. Do not pass a framework event object or a vendor-specific widget instance through the mediator unless the mediator is intentionally a UI adapter.

## Mediator as a workflow coordinator

The pattern also fits application workflows where several collaborators participate in one use case:

```ts
type ReservationMediator = {
  reserve(input: ReserveInput): Promise<ReservationResult>;
};

const createReservationMediator = (services: {
  inventory: InventoryService;
  pricing: PricingService;
  payments: PaymentService;
}) => ({
  async reserve(input: ReserveInput) {
    const price = await services.pricing.quote(input);
    await services.inventory.hold(input.items);

    try {
      return await services.payments.authorize(price.total);
    } catch (error) {
      await services.inventory.release(input.items);
      throw error;
    }
  },
});
```

This is close to an application service or Saga orchestrator. The name matters less than the responsibility: coordinate a collaboration while keeping individual services focused. If the workflow spans durable transactions and asynchronous compensation, use explicit Saga state rather than hiding it inside an in-memory mediator.

## Event-driven mediation

A mediator can coordinate by receiving events and publishing commands:

```text
colleague → domain event → mediator → command → colleague
```

For example:

```ts
const onOrderPlaced = async (event: OrderPlaced) => {
  await commands.send({
    type: 'reserve.inventory',
    orderId: event.orderId,
    items: event.items,
  });
};
```

When communication crosses process boundaries, the mediator needs durable state, idempotent handling, retries, and observable message IDs. An in-process mediator and a distributed event bus have similar shapes but very different delivery and failure guarantees.

## Mediator versus Facade

A Facade provides a simpler interface over a subsystem, usually for one caller. A Mediator coordinates peer objects that would otherwise communicate directly:

```text
Facade   → simplify access to a subsystem
Mediator → coordinate collaboration among colleagues
```

A mediator may expose a facade-like API to an application layer, but its defining purpose is reducing peer-to-peer coupling.

## Mediator versus Observer

Observer lets many subscribers react to a published notification. Mediator encapsulates collaboration logic and can decide which colleagues to notify or which commands to issue:

```text
Observer  → subject broadcasts to subscribers
Mediator  → coordinator owns the interaction policy
```

An event emitter is useful for independent reactions. A mediator is more appropriate when the relationship between events and actions is part of a workflow and should be owned in one place.

## Mediator versus Chain of Responsibility

Chain of Responsibility passes a request through ordered handlers, usually until one handles it. Mediator coordinates multiple known participants:

```text
Chain    → ordered delegation / one likely owner
Mediator → peer collaboration / explicit workflow
```

Use a chain for fallback resolution. Use a mediator when several collaborators may respond to one event or when the coordination rules themselves need a home.

## Avoiding the god mediator

A mediator becomes a god object when it owns every business rule, persistence operation, validation rule, and integration in a growing application.

Split by workflow or bounded context:

```text
CheckoutMediator
AccountRecoveryMediator
ShippingWorkflow
```

Keep domain invariants in domain objects and application rules in focused use cases. The mediator should coordinate; it should not become the only place where all behavior lives.

Name operations after the workflow they coordinate rather than exposing arbitrary colleague lookups:

```ts
// clearer
checkoutMediator.confirmOrder(input);

// service-locator smell
mediator.get('payment').call('authorize', input);
```

## Synchronous and asynchronous behavior

A synchronous in-process mediator can return a result directly. An asynchronous mediator should make completion and failure explicit:

```ts
type JobMediator = {
  startExport(input: ExportInput): Promise<{ jobId: string }>;
};

const startExport = async (input: ExportInput, jobs: JobQueue) => {
  const jobId = crypto.randomUUID();
  await jobs.publish({ type: 'export.requested', jobId, input });
  return { jobId };
};
```

For long-running work, return an operation ID and persist status instead of making the caller wait inside the mediator. Define retries, idempotency, cancellation, and compensation around each asynchronous step.

## Testing Mediators

Test coordination with small collaborator fakes:

```ts
it('enables submit only when required controls are valid', () => {
  const submit = { setEnabled: vi.fn() };
  const mediator = createCheckoutMediator({
    email: { value: () => 'user@example.com', showError: vi.fn() },
    terms: { checked: () => true, showError: vi.fn() },
    submit,
    checkout: { submit: vi.fn() },
  });

  mediator.notify('email', 'changed');

  expect(submit.setEnabled).toHaveBeenCalledWith(true);
});
```

Also test event routing, invalid transitions, collaborator failure, retries, duplicate events, async completion, cancellation, and that colleagues do not directly depend on one another. Workflow-level tests should verify the intended sequence without requiring real external systems.

## Common mistakes

### Centralizing everything

A mediator should reduce collaboration coupling, not become a replacement for every domain service. Keep ownership boundaries visible.

### Stringly typed events

Free-form event names and payloads fail at runtime and are hard to discover. Use typed commands and events where the language supports them.

### Hidden asynchronous work

A notification that starts a job without communicating its lifecycle creates unreliable callers. Return status or an operation ID for long-running flows.

### Using a mediator for independent broadcasts

If subscribers do not need coordinated decisions, Observer or pub/sub may be simpler and less coupled.

### Direct framework leakage

Passing DOM events, UI component instances, or broker-specific objects through the mediator ties the collaboration contract to infrastructure.

### No durable state for distributed workflows

An in-memory mediator cannot resume after process failure. Persist state and use idempotent messages for cross-process coordination.

## A practical checklist

Before introducing Mediator, ask:

- Which objects are too tightly coupled through peer-to-peer collaboration?
- What workflow or interaction should own their coordination?
- Can the mediator contract use typed domain events and commands?
- Are domain invariants still owned by domain components?
- Is this an in-process interaction, a durable workflow, or a distributed message flow?
- Do long-running operations need an operation ID and persisted status?
- Would Facade, Observer, Chain of Responsibility, or a direct use case be clearer?
- Is the mediator focused enough to avoid becoming a god object?

## Final thoughts

Mediator gives collaboration logic a deliberate home and keeps participating objects focused on their own responsibilities. It is valuable when peer-to-peer references form a dense web or when a workflow needs explicit coordination.

Keep the contract typed and small, separate coordination from domain rules, and split mediators by workflow or bounded context. For distributed work, add durable state, idempotency, retries, and observability rather than treating an in-process mediator as a transaction coordinator.
