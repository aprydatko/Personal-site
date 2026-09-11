---
title: "Closure for Encapsulation"
description: How closures create private state, protect invariants, and make small modules easier to compose and test.
date: "2026-09-11"
category: Functional Programming
readingTime: 6 min read
featured: false
published: true
---

A closure is a function together with the variables it can still access from the surrounding scope.

In JavaScript, closures are created whenever an inner function uses a value from an outer function or module. The outer function may finish executing, but the captured values remain available to the inner function.

That behavior gives closures an important design use: they can keep state private while exposing only the operations that are allowed to use it.

## The basic idea

```ts
const createCounter = () => {
  let count = 0;

  return () => {
    count += 1;
    return count;
  };
};

const nextCount = createCounter();

nextCount(); // 1
nextCount(); // 2
```

`count` is not available through `nextCount`. The returned function can read and update it because it closes over the variable, but callers cannot directly assign an invalid value.

The function returned by `createCounter` is therefore more than an operation. It is an operation plus a private piece of state.

## Encapsulation without a class

Encapsulation means keeping implementation details behind a boundary and exposing a controlled interface. A class is one way to create that boundary, but it is not the only one.

```ts
type BankAccount = {
  deposit: (amount: number) => number;
  withdraw: (amount: number) => number;
  getBalance: () => number;
};

const createBankAccount = (initialBalance: number): BankAccount => {
  let balance = initialBalance;

  return {
    deposit(amount) {
      if (amount <= 0) throw new Error('Deposit must be positive');
      balance += amount;
      return balance;
    },

    withdraw(amount) {
      if (amount <= 0) throw new Error('Withdrawal must be positive');
      if (amount > balance) throw new Error('Insufficient funds');
      balance -= amount;
      return balance;
    },

    getBalance() {
      return balance;
    },
  };
};
```

The account exposes operations, not the `balance` variable itself. Every change passes through the rules in `deposit` and `withdraw`, so the object can protect its invariant: the balance cannot become negative through the public API.

This is sometimes called the module pattern. The closure is the private storage, and the returned object is the public interface.

## Why private state matters

Without encapsulation, every caller must remember every rule:

```ts
const account = { balance: 100 };
account.balance = -500; // invalid state is possible
```

Once invalid state is possible, every consumer needs defensive checks. A closure moves those checks to the place where the state changes:

```ts
const account = createBankAccount(100);
account.withdraw(25); // 75
// account.balance is not accessible
```

The result is a smaller set of legal state transitions. Encapsulation is not just about hiding data; it is about making incorrect operations difficult or impossible to express.

## Independent closure instances

Each call to the outer function creates a fresh environment:

```ts
const firstCounter = createCounter();
const secondCounter = createCounter();

firstCounter(); // 1
firstCounter(); // 2
secondCounter(); // 1
```

`firstCounter` and `secondCounter` do not share `count`. This makes closure factories useful for creating independent sessions, caches, stores, or configuration-bound services.

The same idea appears in [Higher-Order Functions: Functional Patterns](/blog/higher-order-functions-functional-patterns). A higher-order function can return a specialized function that carries private configuration through a closure.

## Encapsulating a cache

A closure can hide a cache while exposing a simple lookup operation:

```ts
const createMemoized = <Input, Output>(
  calculate: (input: Input) => Output,
) => {
  const cache = new Map<Input, Output>();

  return (input: Input): Output => {
    if (cache.has(input)) return cache.get(input)!;

    const output = calculate(input);
    cache.set(input, output);
    return output;
  };
};

const square = createMemoized((value: number) => value * value);
square(4); // calculates and stores 16
square(4); // returns the cached 16
```

The caller does not need to know that caching exists, and cannot accidentally clear or modify the internal `Map`.

However, private state still has a lifetime. The cache remains reachable as long as the returned function remains reachable. For unbounded or long-lived caches, define an eviction policy, expose a `clear` operation, or use a cache with bounded storage.

## Encapsulating configuration

Closures can bind configuration once and expose a narrower operation:

```ts
type Logger = (message: string) => void;

const createLogger = (service: string, write: Logger) =>
  (message: string) => write(`[${service}] ${message}`);

const log = createLogger('payments', console.log);
log('charge completed');
```

The returned logger does not need to receive `service` on every call. The configuration is fixed at construction time, while the message remains variable.

This can make dependencies explicit at the composition boundary:

```ts
const createUserService = (repository: UserRepository) => ({
  async findActiveUsers() {
    const users = await repository.findAll();
    return users.filter((user) => user.active);
  },
});
```

The service closes over the repository. Tests can create it with a fake repository, and production code can provide the real one. This is a lightweight form of [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection).

## Encapsulation and asynchronous work

Closures can protect state across asynchronous operations, but concurrency must be considered:

```ts
const createRequestTracker = () => {
  let completed = 0;

  return {
    recordCompletion() {
      completed += 1;
    },
    getCompleted() {
      return completed;
    },
  };
};
```

In JavaScript, each individual update runs synchronously, but asynchronous workflows can still interleave in ways that make a state transition incorrect. If an operation reads state, waits, and then writes state, protect the whole transition with an appropriate queue, transaction, or concurrency control mechanism.

A closure hides state; it does not automatically make that state thread-safe, durable, or transactional.

## Closures in event handlers

Event handlers often close over the context they need:

```ts
const createDeleteHandler = (userId: string, deleteUser: (id: string) => void) =>
  () => deleteUser(userId);

button.addEventListener('click', createDeleteHandler(user.id, deleteUser));
```

The handler remembers which user it belongs to, so the event system only needs to call a zero-argument function.

Be aware of the lifetime of handlers. If a component or subscription is removed but its listener is not cleaned up, the closure may keep references to data alive longer than intended. Register and unregister event handlers as a pair.

## Closures and private methods

Closures and class private fields solve related problems in different ways.

Use a closure when:

- The state belongs to one factory-created instance.
- A small object or function is enough as the public interface.
- You want to hide implementation details without exposing a class shape.
- Behavior is naturally composed from functions.

Use a class when:

- Many instances share methods through a prototype.
- The object has a rich lifecycle or inheritance boundary.
- A class-based API is required by a framework or library.
- The instance needs a recognizable type or protocol.

Neither approach is automatically more encapsulated. The quality of the boundary depends on what the public API allows and how clearly it represents the object's responsibilities.

## Common mistakes

### Returning the private value directly

If a getter returns a mutable object by reference, callers can modify the supposedly private state:

```ts
const getItems = () => items; // exposes the internal array
```

Return a copy or a read-only view when callers should not mutate the original:

```ts
const getItems = () => [...items];
```

For nested data, choose a copy or immutable data structure appropriate to the depth and performance requirements.

### Creating one closure per item unnecessarily

Closures are useful, but creating many function objects and captured environments can add memory overhead. For large collections, measure before choosing per-item closures over shared methods or data-oriented structures.

### Hiding too much

An abstraction can become difficult to operate if important behavior is invisible. Document whether a closure performs I/O, caches values, owns resources, or retains references. Encapsulation should hide implementation details, not operational consequences.

### Capturing stale values

A closure captures a binding from its surrounding scope. In long-lived callbacks, that callback may continue using an older configuration or snapshot than the caller expects. Decide whether the closure should capture a value once or read current state through an explicit accessor.

### Using a closure as a substitute for validation

Private state reduces the ways invalid data can enter a module, but inputs still need validation at the boundary. A closure does not make external data trustworthy.

## Testing closure-based modules

Test the public behavior, not the hidden variables:

```ts
it('does not allow an account to be overdrawn', () => {
  const account = createBankAccount(50);

  expect(() => account.withdraw(75)).toThrow('Insufficient funds');
  expect(account.getBalance()).toBe(50);
});
```

This test verifies the invariant without depending on how the balance is stored. That gives you freedom to replace the closure with a class, database-backed implementation, or another internal representation later.

For closure-based caches and services, also test lifetime behavior, repeated calls, independent instances, errors, and cleanup where relevant.

## Closure versus module boundaries

A closure is a small runtime boundary. A module is usually a file-level boundary that controls what other files can import. They work well together:

```ts
// create-session.ts
export const createSession = (userId: string) => {
  let lastActivity = Date.now();

  return {
    touch() {
      lastActivity = Date.now();
    },
    isForUser(id: string) {
      return id === userId;
    },
  };
};
```

The module exposes the factory, while each created session encapsulates its own state. This combination keeps construction public and representation private.

## A practical checklist

When using a closure for encapsulation, ask:

- Which state must be protected from direct mutation?
- What are the legal operations on that state?
- Does the returned API preserve the important invariants?
- Are mutable objects being returned by reference?
- How long will the closure live, and what does it retain?
- Does it hide I/O, caching, resource ownership, or other operational behavior?
- Would a class or module boundary communicate the design more clearly?
- Can the behavior be tested entirely through the public interface?

## Final thoughts

Closures provide a lightweight way to keep state private and expose only meaningful operations. They are especially effective for counters, caches, configured services, event handlers, and small module-like objects.

Use a closure when the private state and its operations form a cohesive unit. Keep the public API narrow, protect mutable data, document lifetime and side effects, and test the boundary rather than the hidden implementation. Good closure-based design turns encapsulation into a property of the code structure—not just a convention that callers must remember.
