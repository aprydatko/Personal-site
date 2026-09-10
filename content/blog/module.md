---
title: "Core Patterns: Module"
description: A practical guide to the Module pattern, how it creates boundaries around state and behavior, and when to use it in modern frontend and backend code.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Module pattern groups related data and behavior behind a focused boundary.

Instead of exposing every variable and helper in a file or object, a module publishes a small public API and keeps its implementation details private. Callers use the capabilities the module offers without needing to know how those capabilities are implemented.

That boundary helps a codebase stay understandable as it grows. A module can own a concept, protect its invariants, and change internally without forcing every caller to change with it.

## What makes something a module?

A module usually has three parts:

- Private state or implementation details.
- Functions that operate on that state or implement the concept.
- A public API containing only what other code needs.

In modern JavaScript and TypeScript, an ES module already gives us the language mechanism for this pattern:

```ts
const items: CartItem[] = [];

const addItem = (item: CartItem) => {
  items.push(item);
};

const getItems = () => items.map((item) => ({ ...item }));

const getTotal = () =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

export { addItem, getItems, getTotal };
```

The `items` array is not exported. Consumers can add an item, read a copy, or calculate the total, but they cannot replace the array or mutate it directly. The module owns the rules for how its state is accessed.

The pattern is not about hiding code for its own sake. It is about making ownership explicit.

## Public API versus implementation

The most important design decision is the module's public API. Every exported name becomes a dependency for its consumers, so exports should describe useful capabilities rather than expose internal steps.

```ts
// Prefer this:
export { createOrder, cancelOrder };

// Avoid exposing details such as:
// export { orderRows, validateOrderRow, recalculateTotals };
```

When callers can reach into internal data structures, the boundary is mostly cosmetic. They begin relying on the shape of the data, the order of operations, or helper functions that were supposed to remain replaceable.

A good module API answers: “What can this concept do?” It does not require callers to know: “Which internal steps make that happen?”

## Encapsulation protects invariants

Encapsulation becomes valuable when a concept has rules that must always remain true. An account balance should not be changed by arbitrary assignment. A shopping cart should not contain a negative quantity. A cache should control how entries expire.

```ts
export const createBalance = (initial = 0) => {
  let value = initial;

  return {
    deposit(amount: number) {
      if (amount <= 0) throw new Error('Amount must be positive');
      value += amount;
    },

    withdraw(amount: number) {
      if (amount <= 0 || amount > value) {
        throw new Error('Invalid withdrawal');
      }
      value -= amount;
    },

    current() {
      return value;
    },
  };
};
```

The returned object exposes operations, not the `value` variable itself. Every state change goes through a rule-checked method. This makes invalid states harder to create and gives the module one place to evolve the rules later.

## Module pattern with closures

A closure is a natural way to create a module instance with private state. Each call to `createBalance` gets its own `value`, which makes the module reusable without sharing state accidentally.

This is useful for:

- Feature-specific state.
- Small stateful services.
- Test doubles with controlled behavior.
- Factories that create independently configured instances.

It is different from a singleton module-level variable. A singleton can be appropriate for truly shared, process-wide concerns, but it also creates hidden coupling. A factory makes ownership and lifetime explicit.

```ts
const createFeatureFlags = (initial: Record<string, boolean> = {}) => {
  const flags = new Map(Object.entries(initial));

  return {
    isEnabled(name: string) {
      return flags.get(name) === true;
    },
    set(name: string, enabled: boolean) {
      flags.set(name, enabled);
    },
  };
};

const checkoutFlags = createFeatureFlags({ newCheckout: true });
```

The caller chooses how many instances exist and which configuration each one receives.

## Modules as architectural boundaries

A module boundary can exist at several scales:

- A small file that exports a few related functions.
- A feature module containing UI, state, and data access for one feature.
- A domain module that owns business rules.
- A package that exposes a stable library API.

The scale can change, but the principle stays the same: keep the inside cohesive and make the outside contract intentional.

For example, a user profile feature might expose:

```ts
export { ProfileForm } from './ProfileForm';
export { useProfile } from './useProfile';
export type { Profile, ProfileUpdate } from './types';
```

Its internal query keys, validation helpers, and request details can remain private. A page depends on the feature's capabilities instead of importing its internal files directly.

This is sometimes called a barrel or facade when one entry point re-exports selected pieces. It is useful when the entry point is curated. A barrel that blindly exports every file can weaken the boundary by making internals public accidentally.

## Modules and dependency direction

The Module pattern works best when dependencies flow toward stable concepts. A domain module should not need to know the details of a particular web framework or database driver.

```ts
// order.ts
export type OrderRepository = {
  save(order: Order): Promise<void>;
};

export const createPlaceOrder = (repository: OrderRepository) => async (
  input: PlaceOrderInput,
) => {
  const order = createOrder(input);
  await repository.save(order);
  return order;
};
```

The module defines the capability it needs. The application boundary can provide a database-backed implementation. This keeps the module focused on order behavior and makes the dependency visible without exposing infrastructure details.

## Common mistakes

### The dumping-ground module

A file named `utils.ts`, `helpers.ts`, or `common.ts` often starts small and becomes a collection of unrelated operations. It is technically a module, but it has low cohesion and no useful conceptual boundary. Prefer names that describe the behavior or domain: `currency.ts`, `order-pricing.ts`, or `date-range.ts`.

### Exporting mutable state

Exporting a mutable array, object, or configuration value lets every consumer change the module's state without going through its rules. Export read-only views or operations instead.

### Circular dependencies

When two modules import each other, ownership becomes unclear and initialization can become fragile. Move shared types into a stable module, introduce a higher-level coordinator, or reverse the dependency through a small interface.

### Over-encapsulation

Not every function needs a factory, class, or private wrapper. A pure function with no state can often be exported directly. Add a boundary when it protects a concept, prevents invalid state, or gives callers a stable contract.

### Deep imports

If consumers regularly import `feature/internal/parser`, the intended boundary is being bypassed. Keep internal paths private by convention, lint rule, package exports, or project structure, and provide a useful public entry point.

## A practical checklist

When designing or reviewing a module, ask:

- What concept or responsibility does this module own?
- Which state and implementation details should remain private?
- Is the public API expressed in terms of capabilities?
- Can the module protect the invariants of its data?
- Are its dependencies explicit and pointing in a sensible direction?
- Are consumers importing the boundary or reaching into internals?
- Does the module have a clear reason to change?

If the answers are unclear, the module may be trying to own too much—or not enough. Start by naming the concept, then make the smallest API that lets callers use it without knowing its internal structure.

## How the Module pattern connects to other design ideas

Modules provide a practical boundary for [Separation of Concerns: Keep Each Part Focused](/blog/separation-of-concerns). A module can keep one kind of knowledge together while preventing unrelated code from reaching inside.

The quality of that boundary depends on [Cohesion and Coupling: The Shape of Maintainable Software](/blog/cohesion-coupling). High cohesion gives the module a meaningful center; low coupling keeps changes from spreading through its consumers.

Modules also support the [Dependency Inversion Principle: Depend on Abstractions](/blog/dependency-inversion-principle) when they define small ports and keep infrastructure behind adapters. And when several focused modules are assembled into a workflow, that is [Composition: Build Behavior by Combining Small Parts](/blog/composition).

## Final thoughts

The Module pattern is a simple way to make ownership and boundaries visible. Keep related behavior together, hide details that callers do not need, and expose a small API built around capabilities.

Use modules to protect invariants and reduce accidental coupling, not to create layers of ceremony. A good module makes the safe path the easy path—and lets its implementation change without making every consumer follow along.
