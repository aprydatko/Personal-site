---
title: "Cohesion and Coupling: The Shape of Maintainable Software"
description: A practical guide to cohesion and coupling, two complementary ideas for deciding how code should be organized and how modules should depend on one another.
date: "2026-09-09"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

Two of the most useful questions in software design are:

1. Do the things inside this module belong together?
2. Does this module depend on too many other things?

The first question is about cohesion. The second is about coupling.

Good designs generally aim for high cohesion and low coupling: keep related responsibilities together, while limiting unnecessary knowledge between modules. These ideas are not rules for producing a certain number of files or folders. They are tools for making change safer.

## Cohesion: things that belong together

Cohesion describes how closely related the responsibilities inside a module are.

A highly cohesive module has a clear purpose. Its functions work toward the same outcome and tend to change for the same reasons. An order-pricing module might contain discount rules, tax calculation, and total calculation because they all belong to the same pricing concern.

A low-cohesion module is a collection of unrelated operations. A file named `helpers.ts` that formats dates, creates avatars, validates passwords, and builds SQL queries may be convenient at first, but it has no meaningful center.

High cohesion makes code easier to:

- Find, because related behavior has a predictable home.
- Understand, because the module has a focused story.
- Test, because its inputs and outputs are narrower.
- Change, because unrelated features are less likely to be affected.

## Coupling: dependencies between things

Coupling describes how strongly one module depends on another.

Some coupling is necessary. An application must connect its use cases to a database, and a checkout flow must communicate with a payment provider. The goal is not to remove all dependencies. The goal is to keep dependencies small, explicit, and stable.

Tight coupling appears when a module knows too much about another module's internals. For example, an order service that constructs a specific Stripe client, formats provider payloads, interprets provider errors, and stores payment fields is coupled to both Stripe and its persistence model.

With lower coupling, the order service can depend on a focused contract:

```ts
interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

export const placeOrder = async (
  input: PlaceOrderInput,
  paymentGateway: PaymentGateway,
) => {
  const order = orderRules.create(input);
  await paymentGateway.charge({
    amount: order.total,
    currency: order.currency,
  });

  return orderRepository.save(order);
};
```

The use case still depends on a payment capability, but it does not depend on Stripe's SDK or vocabulary. That makes the dependency easier to replace and the core behavior easier to test.

## The relationship between them

Cohesion and coupling work together:

```text
Related responsibilities stay together
                    ↓
Modules have clear, focused boundaries
                    ↓
Dependencies cross those boundaries through small contracts
                    ↓
Changes stay local and systems remain easier to evolve
```

Separating everything can create low cohesion. If one feature is scattered across ten tiny modules, each module may be technically focused but the feature becomes difficult to follow. Combining unrelated responsibilities can increase cohesion temporarily, but it usually creates a large, tightly coupled module as the application grows.

The useful target is not maximum separation. It is a balance: strong internal relationships and deliberately limited external relationships.

## A practical example: notifications

Suppose a registration flow sends a welcome email, writes an audit event, and publishes an analytics event. A low-cohesion implementation might put all of these operations in a generic `NotificationService`.

That name hides three different concerns:

- Customer communication.
- Security or compliance auditing.
- Product analytics.

These concerns have different owners, failure policies, and reasons to change. A better design gives them focused boundaries:

```ts
export const registerUser = async (input: RegisterUserInput) => {
  const user = userRegistration.register(input);
  const savedUser = await userRepository.save(user);

  await welcomeEmailSender.send(savedUser);
  await auditLog.record('user.registered', savedUser.id);
  analytics.track('user_registered', { userId: savedUser.id });

  return savedUser;
};
```

The registration use case coordinates these activities, but each collaborator owns one concern. If the email provider changes, the audit model should not need to change with it.

There is still a design decision here: should all side effects be required before the registration request succeeds? That is an application-policy question, not merely a file-organization question. Cohesive modules make that policy easier to see and change.

## Signs of low cohesion

Watch for these signals:

- A module has unrelated nouns in its public API.
- Its functions are used by completely different features.
- The file changes frequently for unrelated reasons.
- You need comments to explain why several responsibilities share a home.
- Tests for one behavior require setting up data for another.

The fix is usually to identify the concepts that change together and move them behind domain-specific modules. Prefer names that describe the responsibility rather than the technical shape: `OrderPricing` communicates more than `DataHelper`.

## Signs of tight coupling

Common signals include:

- A small change requires edits across many modules.
- Business logic imports framework or vendor-specific code directly.
- Tests need a real database, network service, or browser for simple rules.
- Callers reach into another module's internal data structures.
- Replacing an implementation requires changing every consumer.

The remedy may be a smaller interface, dependency injection, an adapter, or simply a better boundary. Do not introduce an abstraction only because coupling exists; first decide whether the dependency is stable and worth hiding.

## Coupling is not always bad

Coupling has a useful side. Two pieces of code that must change together can be coupled intentionally. A small feature module can keep its data type and view closely connected because that makes the feature easier to maintain.

The problem is accidental coupling: dependencies that cross ownership boundaries, expose unstable details, or make unrelated changes travel together.

It is also possible to over-optimize for low coupling. Excessive indirection can make a codebase harder to read, while tiny interfaces can conceal important relationships. A direct dependency on a stable standard library is often healthier than a custom abstraction around it.

## How this connects to Separation of Concerns

Separation of Concerns provides the broader idea: keep distinct responsibilities apart. Cohesion helps decide what should stay together within a boundary. Coupling helps evaluate the relationships between boundaries.

Read the related article: [Separation of Concerns: Keep Each Part Focused](/blog/separation-of-concerns).

Together, these ideas give a practical design loop:

1. Identify the responsibilities that are being mixed.
2. Group behavior that changes together.
3. Define the smallest useful contracts between groups.
4. Check whether the resulting design is easier to understand and test.

## A design review checklist

When reviewing a module or feature, ask:

- What is this module responsible for?
- Do most of its functions support that same responsibility?
- Which dependencies are essential, and which are implementation details?
- Can a caller use the module without knowing its internals?
- Do the boundaries follow business concepts or merely framework folders?
- Would this design make a likely future change local or widespread?

The answers should guide a small, evidence-based refactor. Move one responsibility, narrow one contract, or hide one unstable dependency. Then let the next real change reveal whether the boundary is useful.

## Final thoughts

High cohesion and low coupling are not aesthetic preferences. They are ways to control the cost of change.

Keep code that belongs together close. Keep unrelated responsibilities apart. Let dependencies cross boundaries through clear, stable contracts. When those three habits become part of everyday design, a codebase can grow without every new feature turning into a system-wide edit.
