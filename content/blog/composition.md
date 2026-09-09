---
title: "Composition: Build Behavior by Combining Small Parts"
description: A practical guide to composition, why it often scales better than inheritance, and how to use it in frontend, backend, and domain design.
date: "2026-09-09"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

Composition is the practice of building a larger behavior by combining smaller, focused parts.

Instead of creating one large abstraction that predicts every future variation, composition lets a system assemble the behavior it needs from independent pieces. A checkout flow can combine pricing, payment, inventory, and notification policies. A UI component can combine a trigger, a panel, and custom content. A service can receive the policies it needs through its constructor.

Composition is powerful because change often affects one behavior at a time. If those behaviors are separate, we can replace one part without rewriting everything around it.

## Composition versus inheritance

Inheritance models an “is-a” relationship. A `SavingsAccount` is an `Account`; a `Square` is a `Shape`.

Composition models a “has-a” or “uses-a” relationship. An order has a pricing policy and uses a payment gateway. A report has a formatter and a data source.

Inheritance can be useful when the parent abstraction is stable and the subtype truly honors its contract. But it also creates a strong relationship between parent and child. Changes to the parent can affect every descendant, and behavior can become spread across a class hierarchy.

With composition, behavior is assembled explicitly:

```ts
interface DiscountPolicy {
  calculate(order: Order): number;
}

interface TaxPolicy {
  calculate(order: Order): number;
}

export class OrderPricing {
  constructor(
    private readonly discountPolicy: DiscountPolicy,
    private readonly taxPolicy: TaxPolicy,
  ) {}

  calculate(order: Order) {
    const discount = this.discountPolicy.calculate(order);
    const subtotal = order.subtotal - discount;
    const tax = this.taxPolicy.calculate({ ...order, subtotal });

    return { subtotal, discount, tax, total: subtotal + tax };
  }
}
```

The pricing service does not need subclasses for every customer type or tax region. It receives the policies that define the current behavior.

## Composition in frontend components

Component composition is especially visible in React and other component-based UI systems. A reusable component should provide structure and behavior while allowing the caller to supply content that varies.

For example, a card does not need to know every possible title, action, or body:

```tsx
type CardProps = {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const Card = ({ title, children, footer }: CardProps) => (
  <article className="card">
    <h2>{title}</h2>
    <div className="card__body">{children}</div>
    {footer ? <footer>{footer}</footer> : null}
  </article>
);
```

The `Card` owns layout and styling, while the caller composes the content:

```tsx
<Card
  title="Your plan"
  footer={<button type="button">Change plan</button>}
>
  <PlanSummary plan={plan} />
</Card>
```

This is more flexible than adding a new prop for every variation, such as `showPlanSummary`, `showChangeButton`, and `showUsageMeter`. Composition keeps the reusable component focused and lets features assemble the parts they need.

## Composing application behavior

Composition is not limited to classes or UI. Use cases can be composed from focused operations.

```ts
type RegisterUserDependencies = {
  users: UserRepository;
  passwordHasher: PasswordHasher;
  welcomeEmail: WelcomeEmailSender;
};

export const createRegisterUser = ({
  users,
  passwordHasher,
  welcomeEmail,
}: RegisterUserDependencies) => async (input: RegisterUserInput) => {
  const passwordHash = await passwordHasher.hash(input.password);
  const user = await users.create({
    email: input.email,
    passwordHash,
  });

  await welcomeEmail.send(user);
  return user;
};
```

The registration workflow is assembled with a repository, a hashing strategy, and an email sender. Tests can provide in-memory or fake implementations. Production code can provide adapters for the actual database, password library, and email provider.

This also makes the composition root visible: the place where the application chooses concrete implementations should be near the application boundary, not hidden inside domain logic.

## Composition and functional design

Small functions can be composed into a pipeline:

```ts
const prepareOrder = (input: OrderInput) => validateOrder(input);
const priceOrder = (order: ValidOrder) => pricing.calculate(order);
const saveOrder = (order: PricedOrder) => orderRepository.save(order);

const createOrder = async (input: OrderInput) => {
  const validOrder = prepareOrder(input);
  const pricedOrder = priceOrder(validOrder);

  return saveOrder(pricedOrder);
};
```

Each function has a narrow purpose, and the workflow describes how those purposes fit together. Composition gives the application a readable sequence without requiring one function to contain every detail.

The example is intentionally straightforward. A pipeline should make dependencies and control flow clearer, not turn simple logic into a puzzle of callbacks and generic abstractions.

## Composition over inheritance is a guideline

“Prefer composition over inheritance” is useful advice, but it is not an absolute law.

Inheritance may be the clearest choice when:

- The subtype is genuinely substitutable for the parent.
- The parent contract is stable and intentionally designed for extension.
- Shared behavior is meaningful and not merely duplicated convenience code.
- The hierarchy reflects a domain relationship users of the system understand.

Composition is usually safer when behavior varies independently. For example, payment method, currency, discount eligibility, and notification channel are separate dimensions. A class hierarchy that combines every possibility quickly creates many classes. Independent policies can be composed without multiplying the hierarchy.

## Common mistakes

### Too many tiny abstractions

Composition can become excessive when every operation receives an interface and a factory. If a behavior has one implementation, no testing boundary, and no meaningful variation, a direct function may be enough.

### Prop drilling without a boundary

In UI code, passing values through many layers can make composition awkward. Use a focused context, a view-model boundary, or a feature-level component when the data genuinely belongs to a shared concern. Do not hide every dependency in global state by default.

### Leaky components

A composed component should expose the extension points that matter while keeping its internal details private. Passing an entire database record or framework object into a presentational component couples it to more knowledge than it needs.

### Composition with incompatible parts

Parts still need compatible contracts. Composition is not simply connecting arbitrary pieces; inputs, outputs, error behavior, and lifecycle expectations must fit together.

## A practical checklist

When deciding whether to compose behavior, ask:

- Which parts of this behavior vary independently?
- Can each part have a small, understandable contract?
- Would inheritance create a hierarchy for combinations rather than true subtypes?
- Can the caller choose or replace a policy without changing the workflow?
- Is the composition making the code easier to read and test?
- Am I introducing an abstraction before there is a real boundary?

Start with the smallest useful composition. A function parameter, a child component, or a constructor dependency may be all that is needed. Add more structure only when the system has a real variation to support.

## How composition connects to other design ideas

Composition works especially well with [Separation of Concerns: Keep Each Part Focused](/blog/separation-of-concerns). Separate concerns create pieces that can be combined without dragging unrelated knowledge across the boundary.

It also supports [Cohesion and Coupling: The Shape of Maintainable Software](/blog/cohesion-coupling). Each composed part can remain cohesive, while the connections between parts stay explicit and limited.

In SOLID design, composition is often the practical result of the Dependency Inversion Principle: high-level workflows receive abstractions and assemble the behavior they need instead of constructing concrete details internally.

## Final thoughts

Composition keeps software adaptable by making behavior assembled rather than inherited by default. It lets a workflow coordinate focused parts, lets a component accept meaningful content, and lets tests replace infrastructure with simple collaborators.

Use it where responsibilities vary independently or where a boundary deserves to be replaced. Keep direct code direct when no such boundary exists. Good composition is not about connecting the most pieces; it is about making the important relationships visible and changeable.
