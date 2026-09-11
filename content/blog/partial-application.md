---
title: "Partial Application"
description: How partial application creates specialized functions by fixing known arguments, and when it improves reuse, composition, and dependency boundaries.
date: "2026-09-11"
category: Functional Programming
readingTime: 6 min read
featured: false
published: true
---

Partial application creates a new function by fixing some arguments of an existing function.

Suppose a general function needs a logger, a user ID, and a message:

```ts
const logForUser = (
  logger: (message: string) => void,
  userId: string,
  message: string,
) => {
  logger(`[user:${userId}] ${message}`);
};
```

If the logger and user ID are already known, partial application creates a function that only needs the message:

```ts
const createUserLogger = (
  logger: (message: string) => void,
  userId: string,
) => (message: string) => logForUser(logger, userId, message);

const log = createUserLogger(console.log, 'user-123');
log('profile updated');
```

The new function is more specific than the original one. It carries the shared context and exposes only the input that changes from call to call.

## Partial application versus currying

Partial application and currying are related, but they change a function in different ways.

Partial application fixes some arguments of a multi-argument function:

```ts
const calculateTotal = (
  taxRate: number,
  discount: number,
  subtotal: number,
) => subtotal * (1 + taxRate) - discount;

const calculateStandardTotal = (subtotal: number) =>
  calculateTotal(0.2, 5, subtotal);
```

Currying transforms the function into one-argument stages:

```ts
const curriedTotal = (taxRate: number) =>
  (discount: number) =>
  (subtotal: number) => subtotal * (1 + taxRate) - discount;

const calculateStandardTotal = curriedTotal(0.2)(5);
```

The partially applied function can fix any selected group of arguments, depending on the helper or wrapper you use. A curried function always exposes its arguments one at a time in a defined order.

In practice, both techniques use closures and produce specialized functions. The distinction is useful when designing the API, not as a reason to add unnecessary abstraction.

## Why specialize a function?

General functions are reusable, but passing the same configuration repeatedly makes call sites noisy and increases the chance of inconsistency:

```ts
sendMetric(metrics, 'checkout', 'started');
sendMetric(metrics, 'checkout', 'completed');
sendMetric(metrics, 'checkout', 'failed');
```

Partial application binds the shared context once:

```ts
const trackCheckout = createMetricTracker(metrics, 'checkout');

trackCheckout('started');
trackCheckout('completed');
trackCheckout('failed');
```

The specialized function communicates the domain context and reduces repetition. It also gives tests a smaller unit to exercise.

## A small partial-application helper

For a function whose arguments are fixed from left to right, a small helper is enough:

```ts
const partial = <A, B, Result>(
  operation: (first: A, second: B) => Result,
  first: A,
) => (second: B): Result => operation(first, second);

const add = (left: number, right: number) => left + right;
const addTen = partial(add, 10);

addTen(5); // 15
```

The helper makes the intended contract explicit: fix the first argument and return a function for the second.

For more arguments, write a domain-specific factory when possible:

```ts
const createPriceCalculator = (taxRate: number, discount: number) =>
  (subtotal: number) => subtotal * (1 + taxRate) - discount;
```

A named factory usually gives better documentation and type errors than a completely generic variadic `partial` helper.

## Configuration and data

Partial application is clearest when configuration is stable and data changes. Consider a formatter:

```ts
const formatNumber = (
  locale: string,
  currency: string,
  value: number,
) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
}).format(value);

const formatEuro = (value: number) =>
  formatNumber('de-DE', 'EUR', value);

formatEuro(1250); // '1.250,00 €'
```

The locale and currency belong to the formatter's configuration. The amount belongs to each individual call. A specialized function makes that separation visible.

## Partial application in collection operations

Specialized functions fit callback-based APIs such as `map` and `filter`:

```ts
type Product = { name: string; price: number };

const costsAtLeast = (minimum: number) =>
  (product: Product) => product.price >= minimum;

const premiumProducts = products.filter(costsAtLeast(100));
```

The filter operation supplies each product; the threshold is configured once. This is the same general idea as [Higher-Order Functions: Functional Patterns](/blog/higher-order-functions-functional-patterns), where behavior is passed as a value.

## Partial application for validation

Validation rules often have stable configuration and changing input:

```ts
type Validator<T> = (value: T) => string | undefined;

const matches = (pattern: RegExp, message: string): Validator<string> =>
  (value) => pattern.test(value) ? undefined : message;

const isEmail = matches(
  /^[^@]+@[^@]+\.[^@]+$/,
  'Enter a valid email address',
);

isEmail('person@example.com'); // undefined
```

The pattern and message are fixed when the rule is created. The returned validator can be reused by forms, API boundaries, or tests.

Keep validation functions pure when possible. A validator that changes shared state or performs unexpected I/O is difficult to reuse safely.

## Partial application and dependency injection

Partial application is a lightweight way to supply dependencies at a composition boundary:

```ts
type Clock = () => Date;
type Session = { expiresAt: Date };

const isSessionExpired = (clock: Clock, session: Session) =>
  clock() >= session.expiresAt;

const createExpirationChecker = (clock: Clock) =>
  (session: Session) => isSessionExpired(clock, session);

const isExpired = createExpirationChecker(() => new Date());
```

Production code can provide the real clock, while tests can provide a fixed one:

```ts
const isExpiredAtNoon = createExpirationChecker(
  () => new Date('2026-09-11T12:00:00Z'),
);
```

The dependency is not hidden in a global variable. It is bound when the specialized function is built. This is closely related to [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection).

## Partial application for event handlers

Browser and UI APIs usually provide the event as the final callback argument. Partial application can bind application context first:

```ts
const handleDelete = (
  deleteItem: (id: string) => void,
  itemId: string,
  event: MouseEvent,
) => {
  event.preventDefault();
  deleteItem(itemId);
};

const createDeleteHandler =
  (deleteItem: (id: string) => void, itemId: string) =>
  (event: MouseEvent) => handleDelete(deleteItem, itemId, event);

const onDelete = createDeleteHandler(deleteItem, item.id);
button.addEventListener('click', onDelete);
```

Keep a reference to `onDelete` if the listener must later be removed. Calling `createDeleteHandler` again creates a different function, even when it receives the same arguments.

## Partial application and asynchronous operations

An API client can be configured once and then used for specific requests:

```ts
type ApiClient = {
  get: (path: string) => Promise<Response>;
};

const createResourceLoader = (client: ApiClient, resource: string) =>
  async (id: string) => client.get(`/${resource}/${id}`);

const loadUsers = createResourceLoader(client, 'users');
const response = await loadUsers('user-123');
```

The client and resource are stable dependencies. The ID varies per request.

Partial application does not automatically handle retries, caching, cancellation, or authorization. If the specialized function adds those behaviors, make them part of its documented contract.

## Common mistakes

### Binding the wrong arguments

If the argument order is awkward, partial application may produce an unnatural API:

```ts
const format = (value: number, locale: string) => /* ... */ value;
```

If locale is the stable configuration, put it first or write a named factory. Function signatures should support the intended construction order.

### Creating wrappers that add no meaning

This wrapper adds a call but no useful boundary:

```ts
const addOne = (value: number) => add(1, value);
```

It may still be worthwhile when `addOne` is a meaningful domain operation or passed as a callback. Otherwise, a direct expression can be clearer.

### Capturing mutable configuration

A specialized function retains references to the values it captures. If a configuration object can be mutated later, callers may see behavior change unexpectedly. Prefer immutable configuration or create a new specialized function when configuration changes.

### Hiding resource ownership

If a partially applied function captures a database connection, file handle, or subscription, define who closes it and when. A closure does not make resource lifetime automatic.

### Overusing generic helpers

Highly generic partial-application utilities can make inference and errors difficult. Prefer explicit factories for public APIs and reserve generic helpers for small, well-understood internal patterns.

## Partial application and object methods

Methods that depend on `this` need care when passed to a helper:

```ts
const object = {
  prefix: 'item',
  label(value: string) {
    return `${this.prefix}:${value}`;
  },
};

const label = (value: string) => object.label(value);
```

The arrow function preserves the intended receiver. Alternatively, use `object.label.bind(object)` when binding the method is the clearest option.

Avoid treating every method as a plain function. Its receiver is part of its behavior even if it is not visible in the argument list.

## Testing specialized functions

Test both the general operation and the configured function when the boundary has meaningful behavior:

```ts
it('creates a validator with the configured rule', () => {
  const isLongEnough = (value: string) => value.length >= 8;

  const validate = (rule: (value: string) => boolean) =>
    (value: string) => rule(value) ? undefined : 'Invalid value';

  const validatePassword = validate(isLongEnough);

  expect(validatePassword('short')).toBe('Invalid value');
  expect(validatePassword('long-enough')).toBeUndefined();
});
```

Tests should verify the public contract: which arguments are fixed, how changing input is handled, and whether configuration is applied consistently. For dependencies such as clocks or clients, provide fakes at construction time.

## A practical checklist

Before partially applying a function, ask:

- Which arguments are stable configuration and which change per call?
- Is the argument order natural for the intended specialized function?
- Does the new function have a meaningful name and small contract?
- Will the captured dependencies remain valid for its lifetime?
- Can the specialized function be passed directly to a callback API?
- Does a named factory communicate the design better than a generic helper?
- Are resource ownership, side effects, and error behavior still clear?

## Final thoughts

Partial application turns a general operation into a focused one by fixing the context that is already known. It reduces repeated arguments, creates reusable callbacks, and makes dependency boundaries visible.

Use it when the specialized function represents a real operation or makes composition clearer. Prefer named factories for important domain boundaries, keep captured configuration stable, and avoid adding layers that do not improve the code’s meaning.
