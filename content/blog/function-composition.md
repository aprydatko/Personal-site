---
title: "Function Composition"
description: How to build larger behavior by connecting small functions, with practical patterns for pipelines, validation, asynchronous work, and testing.
date: "2026-09-11"
category: Functional Programming
readingTime: 7 min read
featured: false
published: true
---

Function composition is the process of combining small functions so that the output of one becomes the input of another.

If `first` produces the value that `second` expects, their composition creates a new function:

```ts
const trim = (value: string) => value.trim();
const toLowerCase = (value: string) => value.toLowerCase();

const normalize = (value: string) => toLowerCase(trim(value));

normalize('  HELLO '); // 'hello'
```

The composed function preserves a simple contract: it accepts a string and returns a string. Each individual function does one transformation, while `normalize` describes how those transformations work together.

This idea supports a useful design boundary: stable workflow code can be assembled from small, independently testable operations.

## Composition order

Mathematically, composition is often written from right to left:

```ts
const compose = <A, B, C>(
  second: (value: B) => C,
  first: (value: A) => B,
) => (value: A): C => second(first(value));

const normalize = compose(toLowerCase, trim);
```

`normalize` runs `trim` first and `toLowerCase` second. The order of the arguments can feel backward when read as ordinary code.

For application code, a left-to-right `pipe` is often easier to scan:

```ts
const pipe = <T>(value: T, ...steps: Array<(value: T) => T>) =>
  steps.reduce((current, step) => step(current), value);

const normalized = pipe(
  '  HELLO ',
  trim,
  toLowerCase,
);
```

Both styles represent the same data flow. Choose one convention and use it consistently.

## Functions need compatible contracts

Composition works when the output type of one function matches the input type of the next:

```ts
const parseNumber = (value: string) => Number(value);
const isPositive = (value: number) => value > 0;

const isPositiveNumber = (value: string) =>
  isPositive(parseNumber(value));
```

TypeScript catches incompatible connections:

```ts
const getLength = (value: string) => value.length;
// compose(getLength, isPositive); // type error: boolean is not a string
```

This is one advantage of small functions with explicit types. Their boundaries make incorrect pipelines visible during development.

## A typed pipe helper

The simplest pipe helper works when every step has the same input and output type:

```ts
const pipe = <T>(value: T, ...steps: Array<(value: T) => T>): T =>
  steps.reduce((current, step) => step(current), value);
```

Real pipelines often transform types at each step. For a fixed number of stages, overloads can preserve useful inference:

```ts
function pipe<A, B>(value: A, first: (value: A) => B): B;
function pipe<A, B, C>(
  value: A,
  first: (value: A) => B,
  second: (value: B) => C,
): C;
function pipe<A, B, C, D>(
  value: A,
  first: (value: A) => B,
  second: (value: B) => C,
  third: (value: C) => D,
): D;
function pipe(value: unknown, ...steps: Array<(value: any) => any>) {
  return steps.reduce((current, step) => step(current), value);
}
```

For a small application, explicit composition is often more readable than maintaining a sophisticated variadic type utility. Use the type machinery that makes the pipeline easier to understand, not merely more generic.

## Named transformations

Composition is most useful when each stage has a meaningful name:

```ts
type Order = { subtotal: number; discount: number };
type PricedOrder = Order & { total: number };

const calculateTotal = (order: Order): PricedOrder => ({
  ...order,
  total: order.subtotal - order.discount,
});

const formatTotal = (order: PricedOrder) =>
  `$${order.total.toFixed(2)}`;

const displayTotal = (order: Order) =>
  formatTotal(calculateTotal(order));
```

The names communicate the domain better than a single callback with several unrelated operations. Named functions also provide useful test boundaries.

## Composition for validation

Validation can be modeled as a sequence of transformations that either returns a valid value or an error. A simple version uses exceptions:

```ts
const requireValue = (value: string) => {
  if (value.trim() === '') throw new Error('Value is required');
  return value;
};

const parseInteger = (value: string) => {
  const result = Number(value);
  if (!Number.isInteger(result)) throw new Error('Value must be an integer');
  return result;
};

const parseRequiredInteger = (value: string) =>
  parseInteger(requireValue(value));
```

The order matters: parsing an empty string before checking it can produce misleading behavior. A pipeline makes that order explicit.

For forms or APIs where multiple errors should be collected, use a result type instead of throwing at the first failure:

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const mapResult = <A, B>(
  result: Result<A>,
  transform: (value: A) => B,
): Result<B> => result.ok
  ? { ok: true, value: transform(result.value) }
  : result;
```

The result type makes failure part of the function contract rather than an invisible control-flow path.

## Composition and side effects

Pure transformations are easy to compose:

```ts
const addTax = (rate: number) => (subtotal: number) => subtotal * (1 + rate);
const roundToCents = (value: number) => Math.round(value * 100) / 100;

const calculateTaxedPrice = (subtotal: number) =>
  roundToCents(addTax(0.2)(subtotal));
```

Side effects require more care:

```ts
const saveOrder = async (order: Order) => {
  await repository.save(order);
  return order;
};

const publishOrder = async (order: Order) => {
  await eventBus.publish('order.created', order);
  return order;
};
```

The functions can be sequenced, but their behavior is no longer just a transformation of values. They can fail, perform I/O, retry, or change external state. Keep those consequences visible in names, return types, and the surrounding workflow.

Composition does not make side effects pure. It only provides a way to connect them.

## Asynchronous composition

For promise-returning functions, a sequential async pipeline can be explicit:

```ts
const pipeAsync = async <T>(
  value: T,
  ...steps: Array<(value: T) => T | Promise<T>>
) => {
  let current = value;

  for (const step of steps) {
    current = await step(current);
  }

  return current;
};
```

Example:

```ts
const loadUser = async (id: string) => api.getUser(id);
const loadPermissions = async (user: User) => api.getPermissions(user.id);

const getUserPermissions = async (id: string) => {
  const user = await loadUser(id);
  return loadPermissions(user);
};
```

The explicit version is often preferable because it shows the intermediate value and makes error handling easy to add. A generic async pipe is useful when many workflows share the same sequencing semantics.

Do not use sequential composition when independent operations should run in parallel:

```ts
const [user, settings] = await Promise.all([
  loadUser(id),
  loadSettings(id),
]);
```

Composition expresses order; it should not accidentally serialize work that has no dependency.

## Composition and dependency injection

Composition is a natural way to assemble dependencies at the edge of an application:

```ts
const createOrderService = ({
  repository,
  clock,
}: {
  repository: OrderRepository;
  clock: () => Date;
}) => ({
  async create(input: CreateOrderInput) {
    const order = buildOrder(input, clock());
    return repository.save(order);
  },
});
```

The service is composed with its repository and clock instead of importing global implementations. Tests can compose the same workflow with fakes.

This connects to [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection) and [Composition: Build Behavior by Combining Small Parts](/blog/composition). The goal is a clear assembly boundary where collaborators are chosen and a focused workflow where they are used.

## Composition in frontend code

Frontend applications compose data transformations before rendering:

```ts
const selectVisibleProducts = (
  products: Product[],
  searchTerm: string,
) => products
  .filter((product) => product.active)
  .filter((product) => product.name
    .toLowerCase()
    .includes(searchTerm.toLowerCase()))
  .sort((left, right) => left.name.localeCompare(right.name));
```

Each step communicates a policy: active products, matching products, alphabetical order. For a pipeline that is reused across screens, extract named selectors or transformations.

Do not hide expensive work behind a chain that runs on every render. Memoize at the correct boundary, move server-side work where appropriate, and keep performance behavior visible.

## Composition versus inheritance

Composition assembles behavior by connecting functions or objects. Inheritance assembles behavior through a class hierarchy.

Composition is often a better fit when:

- Behavior is made of independent operations.
- Different workflows need different combinations.
- Dependencies should be supplied from outside.
- The relationship is “uses” rather than “is a subtype of”.

Inheritance can still be appropriate when a framework requires a base class, or when a genuine subtype relationship and shared lifecycle exist. The point is not to eliminate inheritance, but to choose the boundary that keeps variation local and understandable.

## Common mistakes

### Making the pipeline too long

A long chain can be harder to debug than a named workflow. Split major stages into named functions or use a direct function with clear intermediate variables.

### Hiding errors

If a step can fail, make that behavior visible. Exceptions, result types, and rejected promises each have different composition rules. Do not let a generic helper silently swallow errors.

### Mixing incompatible concerns

A pipeline that normalizes text, writes to a database, sends email, and formats HTML is doing too much. Group related transformations and put side effects at explicit boundaries.

### Overusing point-free style

Point-free code omits explicit arguments:

```ts
const names = users.map(getName);
```

This is concise when the function is obvious. When omitted arguments make the data flow unclear, write the callback explicitly.

### Treating arrays as the only pipeline

Composition can work with values, promises, iterators, result types, and streams. Choose a representation that matches the data and failure model instead of forcing every workflow through array methods.

## Testing composed functions

Test individual transformations and important compositions:

```ts
it('normalizes a tag', () => {
  expect(normalizeTag('  TypeScript ')).toBe('#typescript');
});
```

The unit test for `trim` does not prove that `normalizeTag` calls it in the correct order. A composition test should verify the behavior of the assembled pipeline, especially where ordering, errors, or side effects matter.

For side-effecting workflows, inject collaborators and test the orchestration separately from each collaborator's implementation.

## A practical checklist

Before building a composed pipeline, ask:

- Does each function have one clear responsibility?
- Does every output satisfy the next function's input contract?
- Is the execution order obvious?
- Are errors, side effects, and asynchronous work visible?
- Should independent operations run in parallel instead?
- Would named intermediate functions make the domain clearer?
- Is a helper reducing repetition, or hiding a simple workflow?
- Can the individual steps and important compositions be tested independently?

## Final thoughts

Function composition lets you build larger behavior from small, focused operations. It keeps transformations reusable, makes data flow explicit, and creates natural seams for testing and dependency injection.

Use composition where it clarifies the workflow. Keep pipelines short enough to read, expose failure and side effects, name meaningful stages, and use direct code when it communicates the same idea more clearly. Good composition is not about chaining the most functions—it is about giving each piece a clear place in the whole.
