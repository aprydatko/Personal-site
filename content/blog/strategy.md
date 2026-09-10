---
title: "Core Patterns: Strategy"
description: A practical guide to the Strategy pattern, how to encapsulate interchangeable behavior, and when it is better than growing conditional logic.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Strategy pattern represents an algorithm or policy as a separate object or function that can be selected and replaced without changing the code that uses it.

It is useful when one workflow supports several ways to perform a step: different pricing rules, sorting algorithms, payment methods, validation policies, or notification channels.

Instead of placing every variation inside one growing conditional, the workflow depends on a small contract and delegates the variable behavior to a strategy.

## The problem Strategy solves

Imagine a checkout service that calculates discounts with a long conditional:

```ts
const calculateDiscount = (order: Order, customer: Customer) => {
  if (customer.segment === 'premium') {
    return order.subtotal * 0.2;
  }

  if (customer.segment === 'student') {
    return order.subtotal * 0.1;
  }

  if (order.subtotal > 100) {
    return 10;
  }

  return 0;
};
```

This is fine while the rules are few and stable. As rules grow, the function becomes responsible for knowing every policy and every reason the calculation might change.

Strategy moves the variable behavior behind a contract:

```ts
type DiscountStrategy = {
  calculate(order: Order, customer: Customer): number;
};

const premiumDiscount: DiscountStrategy = {
  calculate: (order) => order.subtotal * 0.2,
};

const studentDiscount: DiscountStrategy = {
  calculate: (order) => order.subtotal * 0.1,
};

const noDiscount: DiscountStrategy = {
  calculate: () => 0,
};
```

The checkout workflow can now use any strategy that honors the contract.

```ts
const priceOrder = (
  order: Order,
  customer: Customer,
  discount: DiscountStrategy,
) => {
  const discountAmount = discount.calculate(order, customer);

  return {
    ...order,
    discount: discountAmount,
    total: order.subtotal - discountAmount,
  };
};
```

The workflow owns the sequence of pricing. The strategy owns the discount policy.

## Strategies can be functions

A Strategy does not need to be a class or an interface with one method. If the behavior is naturally a function, a function type is usually clearer:

```ts
type TaxCalculator = (input: {
  subtotal: number;
  country: string;
}) => number;

const calculateUsTax: TaxCalculator = ({ subtotal }) => subtotal * 0.08;
const calculateZeroTax: TaxCalculator = () => 0;

const calculateTotal = (
  subtotal: number,
  country: string,
  calculateTax: TaxCalculator,
) => {
  const tax = calculateTax({ subtotal, country });
  return { subtotal, tax, total: subtotal + tax };
};
```

Passing a function makes the variation visible at the call site and avoids ceremony when there is no state to encapsulate.

Use an object or class when a strategy has several related operations, internal state, lifecycle behavior, or dependencies that deserve a named boundary.

## Selecting a strategy

The caller or composition root should decide which strategy to use. A factory can centralize that decision when it depends on configuration:

```ts
type PricingConfig = {
  plan: 'standard' | 'premium';
};

const createPricingStrategy = (
  config: PricingConfig,
): DiscountStrategy => {
  switch (config.plan) {
    case 'premium':
      return premiumDiscount;
    case 'standard':
      return noDiscount;
  }
};
```

This keeps selection separate from execution. The pricing workflow does not need to inspect configuration or construct policy objects.

That combination connects naturally to the [Factory pattern](/blog/factory): the factory chooses a strategy, while the strategy performs the variable behavior.

## Strategy with dependencies

A strategy can receive dependencies through its constructor or factory. This is useful when the policy needs a clock, repository, feature flag, or external service.

```ts
type ShippingStrategy = {
  calculate(input: ShippingInput): Promise<ShippingQuote>;
};

const createCarrierShipping = (
  carrier: CarrierApi,
): ShippingStrategy => ({
  async calculate(input) {
    const quote = await carrier.getQuote({
      postalCode: input.postalCode,
      weight: input.weight,
    });

    return {
      provider: 'carrier',
      amount: quote.amount,
      deliveryDays: quote.deliveryDays,
    };
  },
});
```

The strategy depends on the small capability it needs, not on a global carrier client. Tests can provide a fake `CarrierApi`, and another strategy can use a flat-rate calculation without any network request.

This is [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection) applied to a replaceable policy.

## Strategy in frontend components

Frontend code often has presentation variations that are better represented as strategies than as many boolean props.

```ts
type EmptyState = (context: { searchTerm: string }) => React.ReactNode;

const renderSearchEmpty: EmptyState = ({ searchTerm }) => (
  <p>No results for “{searchTerm}”.</p>
);

const renderInitialEmpty: EmptyState = () => (
  <p>Start searching to see matching products.</p>
);

type ResultsProps = {
  products: Product[];
  searchTerm: string;
  renderEmpty: EmptyState;
};
```

The component can render the supplied empty-state strategy without knowing why the list is empty. The parent chooses the appropriate behavior based on feature context.

For small differences, ordinary children or a render prop may be the clearest approach. The Strategy pattern is useful when the variation is a meaningful policy used in more than one place or selected at runtime.

## Strategy versus conditional logic

The presence of `if` or `switch` does not automatically mean Strategy is needed. Conditional logic is often the most readable choice when:

- There are only two stable cases.
- The cases belong to one cohesive decision.
- The behavior is unlikely to be reused or replaced.
- Moving the code would make the flow harder to follow.

Strategy becomes more valuable when:

- New variants are added regularly.
- Variants change independently from the workflow.
- Each variant has substantial logic.
- Tests need to exercise the workflow with different policies.
- The selection is made by configuration, user choice, or environment.

The goal is not to eliminate conditionals. The goal is to keep changing policy from spreading through stable workflow code.

## Strategy and Open/Closed design

A stable workflow can remain unchanged while new strategies are added:

```ts
const calculateShipping = async (
  input: ShippingInput,
  strategy: ShippingStrategy,
) => strategy.calculate(input);
```

Adding a pickup strategy does not require modifying `calculateShipping`. It only requires creating another implementation of the contract and selecting it at the boundary.

This is one practical application of the [Open/Closed Principle: Extend Without Rewriting](/blog/open-closed-principle). The principle is not a requirement to create an interface for every possible future. The boundary should appear where variation is real and independently changing.

## Testing with strategies

Strategies make tests precise because a workflow can receive a small fake policy:

```ts
const freeShipping: ShippingStrategy = {
  calculate: async () => ({
    provider: 'test',
    amount: 0,
    deliveryDays: 1,
  }),
};

const quote = await calculateShipping(input, freeShipping);

expect(quote.amount).toBe(0);
```

You can test the workflow independently from carrier APIs, tax providers, or complex pricing rules. You should still test each real strategy separately; replacing every strategy with a fake would only test that delegation occurred.

## Common mistakes

### A strategy interface with one permanent implementation

If there is no meaningful variation and no boundary to replace, an abstraction may be premature. Start with a direct function and extract a strategy when a second behavior creates a real design pressure.

### Strategies that know too much

A strategy should own one variable policy. If it loads users, sends emails, writes orders, and calculates shipping, it is probably a service or workflow with several responsibilities.

### Selecting inside every caller

If every caller contains the same `switch` to choose a strategy, the selection decision is not centralized. Put it in a factory, composition root, or feature boundary.

### Strategies with incompatible contracts

If each implementation needs different inputs or returns fundamentally different results, forcing them behind one interface hides important differences. Split the workflows or define a contract that represents a genuinely shared capability.

### Replacing a simple data map with classes

Sometimes a lookup table is enough:

```ts
const taxRates = { standard: 0.08, reduced: 0.04 };
```

Use a Strategy when behavior has logic, dependencies, state, or a meaningful replacement boundary—not merely because a value varies.

## Strategy and related patterns

| Pattern | Main question it answers |
| --- | --- |
| Strategy | Which interchangeable policy should perform this behavior? |
| Factory | How should the policy or object be created? |
| Template Method | Which steps stay fixed while subclasses customize selected steps? |
| State | Which behavior should apply based on the object's current state? |
| Command | How can an action be represented as an object or function? |
| Policy object | How can a business rule be named and passed explicitly? |

Strategy and State can look similar because both delegate behavior. Strategy is usually chosen by a caller and can be swapped from outside. State changes as the object moves through its lifecycle and often controls the object's own transitions.

## A practical checklist

When considering Strategy, ask:

- Is there a behavior that varies independently from the main workflow?
- Do multiple algorithms or policies honor the same contract?
- Is the choice made by configuration, user input, environment, or runtime state?
- Would a function parameter be enough?
- Can each strategy be tested independently?
- Is selection happening in one clear boundary?
- Am I adding an abstraction because variation exists, or only because it might exist someday?

Name strategies after the policy they represent: `calculateTax`, `premiumDiscount`, `carrierShipping`, or `renderEmptyState`. Names that describe behavior make the design easier to discover than generic names such as `StrategyA` or `Handler`.

## How Strategy connects to other design ideas

Strategy is a focused form of [Composition: Build Behavior by Combining Small Parts](/blog/composition). A workflow is assembled with the policy that defines its variable behavior.

It also benefits from [Cohesion and Coupling: The Shape of Maintainable Software](/blog/cohesion-coupling). Each strategy can remain cohesive while the workflow depends only on a small contract.

Strategies are often created by a [Factory](/blog/factory), supplied through [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection), and kept behind a [Module](/blog/module) boundary.

## Final thoughts

The Strategy pattern gives changing behavior a named, replaceable home. Use it when algorithms or policies vary independently and a stable workflow should not know every detail of each variant.

Keep the contract small, select strategies at a clear boundary, and prefer a plain function when that is all the behavior needs. Good Strategy design makes variation explicit without turning straightforward code into a framework.
