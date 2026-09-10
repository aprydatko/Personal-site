---
title: "Core Patterns: Iterator"
description: A practical guide to the Iterator pattern, how to traverse collections without exposing their structure, and how generators make lazy and asynchronous data practical.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Iterator pattern provides a standard way to traverse a collection without exposing how that collection stores or produces its values.

Instead of requiring callers to know whether data lives in an array, tree, graph, database cursor, or remote stream, the collection exposes a sequence. The caller asks for the next value until iteration is complete.

JavaScript already uses this pattern throughout the language. Arrays, `Set`, `Map`, strings, generators, and many custom collections can be used with `for...of` because they implement the iterable protocol.

## The basic iterator protocol

An iterator has a `next()` method that returns a result with `value` and `done`:

```ts
type IteratorResult<T> =
  | { value: T; done: false }
  | { value: undefined; done: true };

const createCountIterator = (limit: number) => {
  let current = 0;

  return {
    next(): IteratorResult<number> {
      if (current >= limit) {
        return { value: undefined, done: true };
      }

      return { value: current++, done: false };
    },
  };
};

const iterator = createCountIterator(3);
iterator.next(); // { value: 0, done: false }
iterator.next(); // { value: 1, done: false }
iterator.next(); // { value: 2, done: false }
iterator.next(); // { value: undefined, done: true }
```

Most application code does not call `next()` manually. It consumes an iterable through a language construct or helper.

## Iterable versus iterator

An iterator is the object that produces the next value. An iterable is an object that can create an iterator through `[Symbol.iterator]()`.

```ts
const range = {
  start: 1,
  end: 3,

  *[Symbol.iterator]() {
    for (let value = this.start; value <= this.end; value += 1) {
      yield value;
    }
  },
};

for (const value of range) {
  console.log(value); // 1, 2, 3
}
```

An iterable can create a fresh iterator for each traversal. That matters because an iterator is usually stateful and is consumed as it advances:

```ts
const values = [1, 2, 3];
const first = values[Symbol.iterator]();
const second = values[Symbol.iterator]();
```

Both iterators can traverse the same array independently.

## Generators simplify iteration

Generator functions use `function*` and `yield` to implement the protocol without manually constructing result objects:

```ts
function* evenNumbers(limit: number) {
  for (let value = 0; value <= limit; value += 1) {
    if (value % 2 === 0) yield value;
  }
}

for (const value of evenNumbers(6)) {
  console.log(value); // 0, 2, 4, 6
}
```

Generators are lazy. The body pauses at each `yield` and continues only when the caller requests another value. This makes them useful for large or potentially unbounded sequences.

## Lazy data pipelines

Iterators can avoid creating intermediate arrays:

```ts
function* map<T, U>(
  values: Iterable<T>,
  transform: (value: T) => U,
): Iterable<U> {
  for (const value of values) {
    yield transform(value);
  }
}

function* filter<T>(
  values: Iterable<T>,
  predicate: (value: T) => boolean,
): Iterable<T> {
  for (const value of values) {
    if (predicate(value)) yield value;
  }
}

const result = filter(
  map([1, 2, 3, 4], (value) => value * 2),
  (value) => value > 4,
);

for (const value of result) {
  console.log(value); // 6, 8
}
```

The transformations happen as values are consumed. This can reduce memory usage and allow the consumer to stop early.

Do not assume lazy pipelines are always faster. For small arrays, built-in methods are often more readable and fast enough. Use laziness when data size, early termination, or deferred work makes it valuable.

## Iterating a tree

An iterator can hide a complex structure such as a tree:

```ts
type TreeNode = {
  value: string;
  children: TreeNode[];
};

function* walkDepthFirst(node: TreeNode): Generator<string> {
  yield node.value;

  for (const child of node.children) {
    yield* walkDepthFirst(child);
  }
}
```

Consumers receive a sequence of values and do not need to know whether traversal is depth-first, breadth-first, or based on another rule. The collection owns traversal policy.

An alternative iterator could provide breadth-first traversal without changing the caller:

```ts
function* walkBreadthFirst(root: TreeNode): Generator<string> {
  const queue = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    yield node.value;
    queue.push(...node.children);
  }
}
```

The choice between traversal strategies can be represented as a [Strategy pattern](/blog/strategy) when the caller needs to select it explicitly.

## Async iterators

An async iterator produces values that may arrive over time. JavaScript consumes one with `for await...of`:

```ts
async function* readPages(fetchPage: (page: number) => Promise<string[]>) {
  let page = 1;

  while (true) {
    const items = await fetchPage(page);
    if (items.length === 0) return;

    yield* items;
    page += 1;
  }
}

for await (const item of readPages(fetchPage)) {
  await process(item);
}
```

Async iterators are useful for paginated APIs, database cursors, file reads, WebSocket messages, and other streams. They let consumers process one value at a time instead of loading the entire result into memory.

The consumer should understand that iteration may perform I/O. A `for await...of` loop can wait, fail, or hold resources. Document cancellation and cleanup behavior for long-lived streams.

## Early termination and cleanup

Consumers can stop iterating early with `break`, `return`, or an exception. A custom iterator that owns resources should implement cleanup through `return()` when necessary.

```ts
async function* openCursor(cursor: DatabaseCursor) {
  try {
    while (await cursor.hasNext()) {
      yield await cursor.next();
    }
  } finally {
    await cursor.close();
  }
}
```

The `finally` block runs when the generator completes or is closed, so the database cursor does not remain open if the consumer stops after the first few values.

For network streams, files, subscriptions, and locks, decide who owns cleanup and make the ownership part of the iterator's contract.

## Iterators and pagination

An iterator can hide pagination details from a caller:

```ts
async function* listAllUsers(api: UsersApi) {
  let cursor: string | undefined;

  do {
    const response = await api.list({ cursor });

    yield* response.users;
    cursor = response.nextCursor;
  } while (cursor);
}
```

The caller can process users uniformly:

```ts
for await (const user of listAllUsers(api)) {
  await updateSearchIndex(user);
}
```

This is convenient, but it can hide request volume and rate limits. Name APIs clearly and expose pagination metadata when consumers need to display progress, resume later, or enforce a request budget.

## Iterator versus collection methods

Use built-in collection methods when the data is already in memory and the operation is simple:

```ts
const activeUsers = users.filter((user) => user.active);
```

Use an iterator when:

- Data is too large to materialize at once.
- Values are generated or fetched lazily.
- The source has a meaningful traversal strategy.
- Consumers may stop early.
- The source is asynchronous or resource-backed.
- The collection's internal structure should stay private.

The Iterator pattern is not a reason to replace every `map` or `for` loop with a generator.

## Iterator versus Command

An Iterator represents a sequence of values or work items. A Command represents one action that can be executed.

```ts
for (const item of items) {
  await process(item); // each item may create or invoke a command
}
```

An iterator can produce commands for a queue, but the concepts remain distinct: Iterator controls traversal; Command controls action lifecycle.

## Testing iterators

Test the sequence, laziness, and termination behavior:

```ts
it('walks a tree depth first', () => {
  const root = {
    value: 'root',
    children: [
      { value: 'a', children: [] },
      { value: 'b', children: [] },
    ],
  };

  expect([...walkDepthFirst(root)]).toEqual(['root', 'a', 'b']);
});
```

For lazy iterators, verify that work does not happen before consumption and that a consumer can stop without processing the remainder. For async iterators, test pagination, errors, cancellation, and resource cleanup.

Avoid tests that rely only on internal arrays or implementation details. The point of an iterator is to provide a traversal contract independent of storage.

## Common mistakes

### Loading everything before returning an iterator

A function named `iterate` that first fetches and stores the entire dataset has lost much of the iterator's benefit. Keep production lazy when memory, latency, or early termination matters.

### Hiding expensive I/O

Iteration may trigger database queries or network requests. Document that behavior, expose useful limits, and instrument it so callers can understand the cost.

### Ignoring cleanup

Open cursors, files, and streams need to be closed when iteration ends early. Use generator cleanup or an explicit disposable resource where appropriate.

### Reusing a consumed iterator

An iterator is often single-use. Return an iterable that creates a fresh iterator when callers may need multiple traversals.

### Unbounded iteration

An infinite or externally driven iterator needs cancellation, limits, or a clear stopping condition. Do not assume the consumer will always remember to stop.

### Overengineering simple arrays

If an array and a normal loop communicate the behavior clearly, use them. The pattern is valuable at a boundary where traversal details, laziness, or resource ownership matter.

## A practical checklist

Before introducing an Iterator, ask:

- Should callers traverse values without knowing the collection's structure?
- Is lazy or incremental processing useful?
- Can the consumer stop early?
- Does iteration perform asynchronous work or hold resources?
- Is the iterator single-use or should each traversal be independent?
- How are errors, cancellation, limits, and cleanup handled?
- Would a built-in collection method or direct loop be clearer?

Name iterators after what they traverse—`listAllUsers`, `walkDepthFirst`, `readPages`, or `streamEvents`—and make hidden I/O or lifetime behavior clear.

## How Iterator connects to other design ideas

An iterator is often exposed by a [Module](/blog/module) that hides storage and traversal details behind an iterable contract.

Traversal choices can be selected with the [Strategy pattern](/blog/strategy), while each yielded unit may be represented as a [Command](/blog/command) for queued or delayed execution.

Async iterators frequently wrap [Adapter](/blog/adapter) boundaries around paginated APIs, database cursors, or streaming SDKs.

When an iterator is used to process many independent items, [Composition: Build Behavior by Combining Small Parts](/blog/composition) can keep fetching, mapping, filtering, and processing as separate stages.

## Final thoughts

The Iterator pattern separates traversal from collection structure. It lets callers process arrays, trees, paginated APIs, and streams through a consistent sequence without knowing how values are stored or produced.

Use iterators when laziness, incremental work, asynchronous data, or traversal policy provides real value. Keep cleanup and cost visible, and use ordinary collection methods when they already express the problem clearly.
