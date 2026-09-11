---
title: "Higher-Order Functions: Functional Patterns"
description: A practical guide to higher-order functions, how they turn behavior into composable values, and when patterns like map, filter, reduce, and decorators improve a design.
date: "2026-09-11"
category: Functional Programming
readingTime: 7 min read
featured: false
published: true
---

A higher-order function is a function that accepts another function as an argument, returns a function, or does both.

That definition is small, but the design idea is powerful: behavior can be treated as data. Instead of hard-coding every variation into a workflow, you can pass the changing operation into a stable function or build a new function around it.

JavaScript makes this style natural. Array methods such as `map`, `filter`, and `reduce` are higher-order functions. Event handlers, middleware, callbacks, render props, and many dependency-injection techniques use the same idea.

## Functions as values

The starting point is that a function can be stored, passed, and returned like any other value:

```ts
type Formatter = (value: number) => string;

const formatCurrency: Formatter = (value) => `$${value.toFixed(2)}`;

const formatList = (values: number[], format: Formatter) =>
  values.map(format);

formatList([10, 12.5], formatCurrency);
// ['$10.00', '$12.50']
```

`formatList` owns the iteration. The caller owns the formatting policy. The two responsibilities can change independently because the variable behavior is explicit at the boundary.

This is often simpler than creating a formatter class or adding a configuration flag to `formatList`.

## What makes a function higher-order?

There are two common forms.

A function can accept behavior:

```ts
const repeat = <T>(value: T, count: number, action: (value: T) => void) => {
  for (let index = 0; index < count; index += 1) {
    action(value);
  }
};

repeat('hello', 2, (value) => console.log(value));
```

Or it can create behavior:

```ts
const multiplyBy = (factor: number) => (value: number) => value * factor;

const double = multiplyBy(2);
double(4); // 8
```

The second form is a function factory. Calling `multiplyBy(2)` creates a function that remembers `factor`. This retained surrounding state is a closure.

## Mapping: transform each value

`map` expresses a common functional pattern: take a collection and transform every item without changing the original collection.

```ts
const prices = [10, 20, 30];
const pricesWithTax = prices.map((price) => price * 1.2);

// prices is still [10, 20, 30]
// pricesWithTax is [12, 24, 36]
```

The callback describes one transformation. `map` describes how that transformation is applied to the collection.

This separation becomes useful when transformations are named and composed:

```ts
type Product = { name: string; price: number };

const getPrice = (product: Product) => product.price;
const addTax = (price: number) => price * 1.2;

const taxedPrices = products.map(getPrice).map(addTax);
```

For small operations, an inline callback is perfectly readable. Give a transformation a name when it represents a domain concept, is reused, or deserves its own test.

## Filtering: keep values that match a rule

`filter` accepts a predicate—a function that answers a yes-or-no question:

```ts
const isActive = (user: User) => user.status === 'active';
const activeUsers = users.filter(isActive);
```

Predicates are useful because they can be composed from smaller predicates:

```ts
const not = <T>(predicate: (value: T) => boolean) =>
  (value: T) => !predicate(value);

const isInactive = not(isActive);
const inactiveUsers = users.filter(isInactive);
```

This style reads like a description of the result: select users that are inactive. It also keeps the selection rule independent from the collection traversal.

Be careful with predicates that perform hidden work. A predicate that makes a network request or mutates state makes a simple-looking `filter` difficult to reason about. Keep predicates deterministic when possible.

## Reducing: combine values into one result

`reduce` applies a function repeatedly to accumulate one result:

```ts
const total = [10, 20, 30].reduce(
  (sum, price) => sum + price,
  0,
);
```

The accumulator can be a number, string, object, or another collection:

```ts
type CountByStatus = Record<string, number>;

const countByStatus = (users: User[]) =>
  users.reduce<CountByStatus>((counts, user) => ({
    ...counts,
    [user.status]: (counts[user.status] ?? 0) + 1,
  }), {});
```

`reduce` is flexible, but flexibility can make intent harder to see. Prefer `map`, `filter`, `find`, `some`, or `every` when one of them expresses the operation directly. A short loop is also often clearer than an elaborate reducer.

## Composition: build a pipeline

Function composition means connecting the output of one function to the input of another:

```ts
const compose = <A, B, C>(
  first: (value: A) => B,
  second: (value: B) => C,
) => (value: A): C => second(first(value));

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const toDomain = (email: string) => email.split('@')[1] ?? '';

const getEmailDomain = compose(normalizeEmail, toDomain);
getEmailDomain('  PERSON@EXAMPLE.COM '); // 'example.com'
```

For more than a few steps, a `pipe` helper can read in execution order:

```ts
const pipe = <T>(value: T, ...steps: Array<(value: T) => T>) =>
  steps.reduce((current, step) => step(current), value);

const label = pipe(
  '  functional patterns ',
  (value) => value.trim(),
  (value) => value.toUpperCase(),
  (value) => `${value}!`,
);
```

The exact helper is less important than the boundary: each step should have a clear input and output. Functions that mutate shared state or accept unrelated arguments are harder to place in a pipeline.

This is one practical form of [Composition: Build Behavior by Combining Small Parts](/blog/composition). The pipeline coordinates small transformations without requiring each transformation to know about the others.

## Partial application and configuration

A higher-order function can turn a general operation into a specific one by capturing configuration:

```ts
type Logger = (message: string) => void;

const withPrefix = (prefix: string, logger: Logger): Logger =>
  (message) => logger(`${prefix} ${message}`);

const info = withPrefix('[INFO]', console.log);
info('server started');
```

This is useful when several calls share part of their configuration. The created function exposes only what still needs to vary.

Do not confuse partial application with hiding important dependencies. If a function captures a database client, clock, or feature flag, make that construction visible at the composition boundary. This keeps the dependency explicit and testable, as described in [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection).

## Decorators: add behavior around a function

A higher-order function can wrap an existing function to add cross-cutting behavior:

```ts
const withTiming = <Args extends unknown[], Result>(
  operation: (...args: Args) => Result,
  now: () => number = () => performance.now(),
) => (...args: Args): Result => {
  const startedAt = now();
  const result = operation(...args);
  console.log(`completed in ${now() - startedAt}ms`);
  return result;
};

const timedParse = withTiming(JSON.parse);
```

Other wrappers can add logging, authorization, retries, caching, validation, or metrics. A wrapper should preserve the original function's contract as much as possible. If it changes error behavior, timing, side effects, or cancellation, document that change.

For asynchronous operations, the wrapper must await the returned promise if it measures completion or catches errors:

```ts
const withRetry = <T>(operation: () => Promise<T>, attempts: number) =>
  async (): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  };
```

Retries are not universally safe. Only retry operations that are idempotent or have a clear duplicate-request policy.

## Higher-order functions in frontend code

Frontend components use higher-order functions whenever they receive callbacks or render functions:

```tsx
type ButtonProps = {
  onSubmit: () => Promise<void>;
  renderLabel: (state: { pending: boolean }) => React.ReactNode;
};

const SubmitButton = ({ onSubmit, renderLabel }: ButtonProps) => {
  // component state omitted for brevity
  const pending = false;

  return (
    <button onClick={onSubmit} disabled={pending}>
      {renderLabel({ pending })}
    </button>
  );
};
```

The component owns interaction and lifecycle. The caller can customize the label without making the component know every possible presentation.

This is a useful technique when the variation is substantial or contextual. For a small visual difference, ordinary props or `children` are usually easier to understand.

## Referential transparency and side effects

Functional patterns work best when functions are predictable: the same input produces the same output and calling the function does not change unrelated state.

```ts
const add = (left: number, right: number) => left + right;
```

`add` is easy to compose and test. By contrast, a callback that mutates a global cache, reads the current time, and sends an email has effects that are not visible in its type.

This does not mean real applications must avoid side effects. It means side effects should be placed at clear edges. Keep transformations and predicates small, and let an outer workflow perform I/O, logging, persistence, or messaging.

## Common mistakes

### Using callbacks to hide a complicated workflow

Passing behavior is not automatically good design. If a callback has many unrelated arguments or controls half of the caller's lifecycle, the contract may be too broad. Split the workflow or introduce a named abstraction.

### Nesting callbacks until control flow disappears

Deeply nested higher-order functions can be harder to read than a direct loop. Use `async`/`await`, named functions, or a small pipeline when the nesting starts to obscure sequencing and error handling.

### Mutating accumulators

Mutation inside `reduce` can be valid for performance, but it creates more reasoning overhead. Prefer immutable updates for small data and clear code; use controlled mutation when profiling shows it matters and the ownership is obvious.

### Capturing stale or expensive state

A closure retains the values it closes over. In long-lived event handlers, subscriptions, or caches, this can retain memory or use outdated configuration. Make the lifetime of created functions clear and recreate them when the surrounding values must change.

### Abstracting one line too early

A function factory or `compose` helper is not automatically clearer than a direct expression. Extract a higher-order function when it names a real policy, removes repeated structure, or creates a useful boundary for testing and replacement.

## Higher-order functions and design patterns

| Functional pattern | Main question it answers |
| --- | --- |
| `map` | How do I transform every value? |
| `filter` | Which values should remain? |
| `reduce` | How do I combine many values into one result? |
| Composition | How do I connect small operations? |
| Partial application | Which configuration can I fix now? |
| Decorator | How can I add behavior around an operation? |
| Function factory | How can I create a specialized operation? |

These patterns overlap with object-oriented design ideas. A decorator function can wrap a service, a function parameter can implement a Strategy, and a function factory can act like a small Factory. The important question is not which style is more fashionable; it is which boundary makes the changing behavior easiest to understand.

## A practical checklist

When considering a higher-order function, ask:

- Is the changing behavior clear enough to represent as a function?
- Does the function have a small, understandable input and output contract?
- Would passing the behavior reduce conditionals or repeated structure?
- Are side effects visible and located at the right boundary?
- Would a named function make the policy easier to test and discover?
- Is a built-in method or direct loop clearer here?
- Does a wrapper preserve the original function's error, timing, and cancellation behavior?

## Final thoughts

Higher-order functions let you separate stable control flow from variable behavior. They support small transformations, reusable predicates, configurable operations, composable pipelines, and decorators without requiring a large class hierarchy.

Use them as a design tool, not a rule. Keep contracts narrow, name meaningful policies, make side effects explicit, and prefer the simplest expression that communicates the workflow. When those boundaries are clear, functional patterns make code easier to extend without making it harder to read.
