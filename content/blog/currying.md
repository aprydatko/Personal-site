---
title: "Currying"
description: A practical guide to currying, partial application, and how turning multi-argument functions into reusable steps can improve composition.
date: "2026-09-11"
category: Functional Programming
readingTime: 6 min read
featured: false
published: true
---

Currying transforms a function that accepts several arguments at once into a sequence of functions that each accept one argument.

Instead of calling a function like this:

```ts
const add = (left: number, right: number) => left + right;
add(2, 3); // 5
```

The curried version is called one argument at a time:

```ts
const curriedAdd = (left: number) => (right: number) => left + right;

curriedAdd(2)(3); // 5
```

The first call returns a function that remembers `left`. That returned function is a closure, so currying and [Closure for Encapsulation](/blog/closure-for-encapsulation) are closely related.

## Currying versus partial application

Currying and partial application are related but not identical.

Currying changes the shape of a function from multiple arguments into nested one-argument functions:

```ts
const multiply = (a: number) => (b: number) => a * b;
```

Partial application fixes some arguments of a function and returns a function for the remaining arguments:

```ts
const multiplyBy = (factor: number, value: number) => factor * value;

const multiplyByTen = (value: number) => multiplyBy(10, value);
```

The distinction matters when discussing implementation, but both techniques create a more specific operation from a general one. In everyday code, people sometimes use the terms loosely.

## Why curry a function?

Currying is useful when arguments naturally arrive in stages or when the first arguments represent configuration shared by many calls.

```ts
type Product = { price: number; category: string };

const hasCategory = (category: string) =>
  (product: Product) => product.category === category;

const isBooks = hasCategory('books');
const books = products.filter(isBooks);
```

`hasCategory('books')` creates a reusable predicate. The collection operation only needs to supply one product at a time.

This is one form of higher-order function: the first call receives configuration and returns behavior. See [Higher-Order Functions: Functional Patterns](/blog/higher-order-functions-functional-patterns) for the broader pattern.

## Configuration first, data second

A common convention is to place stable configuration arguments before the changing value:

```ts
const hasMinimumLength = (minimum: number) =>
  (value: string) => value.length >= minimum;

const isLongEnough = hasMinimumLength(8);

['short', 'functional', 'patterns'].filter(isLongEnough);
```

The configured function can be passed to `filter`, validation code, or a form component without repeating the minimum length.

This arrangement also makes dependencies visible at the point where behavior is constructed:

```ts
const createUserFinder = (repository: UserRepository) =>
  (userId: string) => repository.findById(userId);
```

The repository is supplied once; each later call supplies the request-specific ID.

## A typed curry helper

For a small, fixed number of arguments, explicit nested functions are often the clearest choice. A reusable helper can be useful when the pattern appears repeatedly:

```ts
const curry2 = <A, B, Result>(
  operation: (first: A, second: B) => Result,
) => (first: A) => (second: B): Result =>
  operation(first, second);

const curriedAdd = curry2((left: number, right: number) => left + right);
const addFive = curriedAdd(5);

addFive(3); // 8
```

The type parameters describe the two inputs and the result. For functions with three or more arguments, write overloads or use explicit types rather than relying on an overly clever generic implementation.

TypeScript can infer nested function types well when the curried function is written directly:

```ts
const formatDate = (locale: string) =>
  (date: Date) => date.toLocaleDateString(locale);

const formatUsDate = formatDate('en-US');
formatUsDate(new Date());
```

## Currying and composition

Curried functions fit naturally into composition because each stage accepts the result of the previous stage:

```ts
const trim = (value: string) => value.trim();
const toLowerCase = (value: string) => value.toLowerCase();
const addPrefix = (prefix: string) => (value: string) => `${prefix}${value}`;

const normalizeTag = (value: string) =>
  addPrefix('#')(toLowerCase(trim(value)));

normalizeTag('  TypeScript '); // '#typescript'
```

The configured `addPrefix` function can be reused:

```ts
const addHash = addPrefix('#');
const tags = values.map((value) => addHash(value.trim().toLowerCase()));
```

For longer pipelines, a `pipe` helper can keep execution order visible. Currying does not replace composition; it makes functions easier to supply one stage at a time.

## Currying event and request handlers

Currying can bind context to a callback:

```ts
const createClickHandler =
  (productId: string) =>
  (event: MouseEvent) => {
    event.preventDefault();
    addToCart(productId);
  };

button.addEventListener('click', createClickHandler(product.id));
```

The product ID is fixed when the handler is created, while the browser supplies the event later. This is convenient when an API expects a callback with a particular signature.

Remember to remove the same handler reference when cleaning up an event listener. Creating a new curried function for removal will not remove the original listener:

```ts
const handleClick = createClickHandler(product.id);
button.addEventListener('click', handleClick);
button.removeEventListener('click', handleClick);
```

## Currying validation rules

Currying can turn validation configuration into reusable rules:

```ts
type Validator<T> = (value: T) => string | undefined;

const required = (message: string): Validator<string> =>
  (value) => value.trim() === '' ? message : undefined;

const minLength = (minimum: number, message: string): Validator<string> =>
  (value) => value.length < minimum ? message : undefined;

const passwordRules = [
  required('Password is required'),
  minLength(12, 'Password must be at least 12 characters'),
];
```

Each rule is configured once and can be applied to multiple values. The approach works well when validators are pure and return predictable results.

## Currying asynchronous functions

Currying also works with promises:

```ts
const createUserLoader = (api: UsersApi) =>
  async (userId: string) => api.getUser(userId);

const loadUser = createUserLoader(api);
const user = await loadUser('user-123');
```

The function that performs I/O is still asynchronous; currying only changes how its inputs are supplied. It does not make the operation lazy in every sense, nor does it cache or deduplicate requests automatically.

If the configured value is mutable or can expire, document whether the returned function uses the value captured at creation time or reads current state through another dependency.

## Currying and dependency injection

Currying can express dependency injection in a compact form:

```ts
type Clock = () => Date;

const createIsExpired = (clock: Clock) =>
  (expiresAt: Date) => clock() >= expiresAt;

const isExpired = createIsExpired(() => new Date());
```

Tests can provide a fixed clock:

```ts
const isExpiredAtNoon = createIsExpired(
  () => new Date('2026-09-11T12:00:00Z'),
);
```

In real code, choose names that communicate the boundary clearly. A factory such as `createIsExpired` may be easier to discover than an anonymous chain of functions. This is the same principle behind [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection): supply dependencies where the workflow is composed, not hidden in global state.

## Common mistakes

### Currying every function

Currying adds calls and nested function shapes. A direct function is often clearer when all arguments are naturally available at the same point:

```ts
calculateTotal(subtotal, tax, discount);
```

Do not curry a function merely because it is possible. Use it when staged configuration or composition provides a real benefit.

### Confusing a curried API with optional arguments

These are different contracts:

```ts
const curried = (a: number) => (b: number) => a + b;
const optional = (a: number, b?: number) => b === undefined ? a : a + b;
```

The curried function always returns another function after its first call. The optional-argument function returns a result and may use a default behavior.

### Hiding expensive work in the wrong stage

The first call should usually configure behavior, not unexpectedly perform a network request or mutate shared state. Keep construction predictable, and perform request-specific work in the final function unless eager initialization is intentional.

### Losing `this`

When currying a method, passing it as a bare function can lose its receiver:

```ts
const getValue = curry2(object.getValue); // may lose object as `this`
```

Use an arrow function or bind the method explicitly when the operation depends on `this`:

```ts
const getValue = curry2((object: Thing, key: string) => object.getValue(key));
```

### Overly generic curry utilities

A variadic curry helper may require complex overloads and can produce poor type errors. Keep helpers small, support the arities you actually need, and prefer explicit functions when the types become difficult to understand.

## Currying versus other patterns

| Technique | Main purpose |
| --- | --- |
| Currying | Turn one multi-argument function into staged unary functions. |
| Partial application | Fix some arguments and return a function for the rest. |
| Closure | Preserve access to surrounding state after the outer scope returns. |
| Composition | Connect functions so one output becomes another input. |
| Factory | Create an object or function from configuration. |
| Dependency injection | Supply collaborators from an outer composition boundary. |

These techniques often appear together. A curried function uses a closure, can be partially applied, and may be composed into a pipeline or created as part of dependency injection.

## A practical checklist

Before currying a function, ask:

- Do some arguments represent stable configuration shared by many calls?
- Will the returned function be passed to `map`, `filter`, an event API, or another callback-based API?
- Does the staged API make the order of dependencies clearer?
- Would a named factory be easier to discover than nested functions?
- Are the captured values safe to retain for the function's lifetime?
- Does currying improve composition enough to justify the extra call?
- Are the TypeScript types still readable at the call site?

## Final thoughts

Currying turns a general operation into a sequence of more specific operations. It is useful when configuration arrives before data, when callbacks need context, or when functions are being assembled into a pipeline.

Use it selectively. Explicit names, narrow contracts, and predictable construction matter more than following a functional style mechanically. A curried function is valuable when its staged shape communicates the design and creates behavior that can be reused, tested, and composed.
