---
title: "Separation of Concerns: Keep Each Part Focused"
description: A practical guide to Separation of Concerns, why it matters, and how to apply it across frontend, backend, and application architecture.
date: "2026-09-09"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

Separation of Concerns (SoC) is the practice of organizing software so that each part deals with one meaningful area of responsibility.

It is one of the most useful ideas in software design because change rarely arrives everywhere at once. A pricing rule changes independently from a database driver. A page layout changes independently from an API contract. Authentication policy changes independently from a button's visual styling.

When those concerns are mixed together, a small change creates a large blast radius. When they are separated, the code becomes easier to understand, test, and replace.

## What is a concern?

A concern is a responsibility, decision, or piece of knowledge that matters to the system.

Typical concerns include:

- Presentation: what the user sees and how they interact with it.
- Application flow: the steps needed to complete a use case.
- Domain rules: the business policies that determine what is valid.
- Persistence: how data is stored and retrieved.
- Infrastructure: external services, frameworks, queues, and file systems.
- Cross-cutting behavior: logging, authorization, caching, and monitoring.

SoC does not require every concern to live in its own file. The goal is to make boundaries clear and dependencies intentional. A small feature may reasonably keep related code together; a growing feature may need separate modules or layers.

## A simple example

Imagine an endpoint that creates an order. A tightly coupled version might validate the request, calculate totals, insert rows, send an email, and format the HTTP response in one handler.

```ts
export const POST = async (request: Request) => {
  const input = await request.json();

  if (!input.items?.length) {
    return Response.json({ error: 'Items are required' }, { status: 400 });
  }

  const total = input.items.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + item.price * item.quantity,
    0,
  );

  const order = await database.orders.insert({ ...input, total });
  await emailClient.send({ to: input.email, subject: 'Order created' });

  return Response.json(order, { status: 201 });
};
```

This works, but the handler now knows too much. It is coupled to the request format, the calculation, the database, the email provider, and the response format.

A separated design gives each decision a focused home:

```ts
export const createOrder = async (input: CreateOrderInput) => {
  const order = orderRules.create(input);
  const savedOrder = await orderRepository.save(order);

  await orderNotifications.orderCreated(savedOrder);
  return savedOrder;
};
```

The HTTP route can translate a request into `CreateOrderInput`, the domain can enforce order rules, the repository can handle persistence, and the notification service can hide the email provider. Each part has less to know and fewer reasons to change.

## Separation on the frontend

The same principle applies to UI code. A component becomes difficult to maintain when it renders a complex interface, fetches data, transforms server responses, manages business rules, and tracks analytics all at once.

For example, an order page can separate:

- `OrderPage`: coordinates the page and its loading or error states.
- `OrderSummary`: presents order data.
- `useOrder`: owns fetching and request state.
- `calculateOrderTotal`: contains a reusable pricing rule.
- `trackOrderViewed`: handles analytics.

This separation improves more than readability. `OrderSummary` can be rendered with fixture data, the pricing function can be tested without a browser, and the data-fetching policy can change without rewriting the layout.

The boundary should follow responsibility, not fashion. Creating a hook for every two lines of state or a component for every `<div>` is not separation of concerns; it is fragmentation.

## Layers are boundaries, not bureaucracy

Layered architecture is one common way to apply SoC:

```text
UI / HTTP
    ↓
Application use cases
    ↓
Domain rules
    ↓
Ports and adapters
    ↓
Database, APIs, queues, and frameworks
```

The exact names do not matter as much as the direction of dependency. User-interface code may call an application use case. A use case may use domain rules and an interface for persistence. The database adapter implements that interface without forcing the domain to understand SQL.

This lets the business rules remain stable while delivery mechanisms and infrastructure details evolve.

## SoC and the Single Responsibility Principle

Separation of Concerns and the Single Responsibility Principle are closely related, but they are not identical.

SoC is the broader design idea: keep different responsibilities or kinds of knowledge apart. The Single Responsibility Principle is a more specific guideline about giving a module one reason to change.

Read the related article: [Single Responsibility Principle: One Reason to Change](/blog/single-responsibility-principle).

SoC is also a foundation for the other SOLID principles. Focused concerns lead to smaller interfaces, replaceable implementations, and business logic that depends less on infrastructure. See the overview: [SOLID Principles: A Practical Guide to Maintainable Code](/blog/solid-principles).

## Common mistakes

### Splitting by file type only

Folders named `components`, `services`, and `utils` do not automatically create good boundaries. A business rule hidden in a UI component is still coupled to the UI, even if the file has a different name.

Organize around meaningful responsibilities and use names that communicate the domain: `OrderCalculator`, `SubscriptionPolicy`, or `InvoiceRepository` are more useful than `helpers.ts`.

### Sharing everything

Shared code is not free. A widely imported module becomes difficult to change because many unrelated areas depend on it. Share stable concepts; keep feature-specific behavior close to the feature until reuse is proven.

### Abstracting too early

An abstraction introduced before there is real variation often hides a simple idea behind unnecessary indirection. Start with a clear implementation, then extract a boundary when a second implementation, testing need, or independent rate of change appears.

### Confusing separation with isolation

Separated concerns still need to collaborate. The goal is not zero communication; it is controlled communication through clear inputs, outputs, and contracts.

## A practical checklist

When reviewing a module, ask:

- Does it mix presentation, business rules, and infrastructure?
- Does it have several unrelated reasons to change?
- Can its core behavior be tested without starting the whole application?
- Would replacing an external provider require editing domain logic?
- Are the boundaries named after real responsibilities?
- Is the separation reducing complexity, or only moving code into more files?

If the answers reveal coupling, separate the smallest meaningful concern first. A focused function or clear interface is often enough; a complete architectural rewrite is rarely necessary.

## Final thoughts

Separation of Concerns is a way to manage change. It keeps volatile details from leaking into stable rules and makes each part of a system easier to reason about.

The best design is not the one with the most layers. It is the one where each responsibility has a clear home, dependencies point in understandable directions, and changing one concern does not unexpectedly disturb the rest of the system.
