---
title: "Memoization"
description: A practical guide to memoization, how caching function results can remove repeated work, and the correctness and memory tradeoffs to consider.
date: "2026-09-11"
category: Functional Programming
readingTime: 7 min read
featured: false
published: true
---

Memoization is an optimization technique that caches the result of a function call and returns the cached result when the same input appears again.

The name comes from remembering. A memoized function remembers previous inputs and outputs so it does not repeat work unnecessarily.

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
square(4); // returns 16 from the cache
```

The second call is faster only if looking up the cached result costs less than running `calculate` again. Memoization trades memory and cache-management complexity for less repeated computation.

## Memoization requires stable results

Memoization is safest when a function is pure: the same input always produces the same output and the function does not depend on hidden mutable state.

```ts
const addTax = (rate: number, subtotal: number) => subtotal * (1 + rate);
```

This function is a good candidate when both `rate` and `subtotal` are part of the cache key. By contrast, caching a function that reads the current time can produce stale results:

```ts
const getCurrentTime = () => new Date();
```

If the result depends on time, a feature flag, locale, database contents, or another external value, that dependency must either be included in the key or the cache must be invalidated when the dependency changes.

Memoization does not make an impure function pure. It only remembers one result from an operation whose conditions may have changed.

## A memoized recursive function

Memoization is especially useful when a recursive algorithm repeats the same subproblems:

```ts
const createFibonacci = () => {
  const cache = new Map<number, number>([
    [0, 0],
    [1, 1],
  ]);

  const fibonacci = (value: number): number => {
    const cached = cache.get(value);
    if (cached !== undefined) return cached;

    const result = fibonacci(value - 1) + fibonacci(value - 2);
    cache.set(value, result);
    return result;
  };

  return fibonacci;
};

const fibonacci = createFibonacci();
fibonacci(40);
```

Without the cache, the recursive implementation recalculates the same values many times. With the cache, each value is calculated once.

For known numeric problems, an iterative algorithm may still be simpler and use less memory. Memoization is a tool for reducing repeated work, not automatically the best algorithm.

## Choosing a cache key

The cache key must represent every input that can affect the result. A function with multiple primitive arguments can use a nested map or a stable serialized key:

```ts
const createTaxCalculator = () => {
  const cache = new Map<string, number>();

  return (country: string, subtotal: number) => {
    const key = `${country}:${subtotal}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const result = calculateTax(country, subtotal);
    cache.set(key, result);
    return result;
  };
};
```

Be careful with string keys. Delimiters, number formatting, normalization, and object ordering can create collisions or unexpected misses. For structured input, define a deliberate key function:

```ts
type SearchInput = { term: string; page: number };

const searchKey = (input: SearchInput) =>
  `${input.term.trim().toLowerCase()}|${input.page}`;
```

The key function is part of the cache's correctness, not just a performance detail.

## Object identity and `Map`

JavaScript `Map` compares object keys by identity:

```ts
const first = { id: 1 };
const second = { id: 1 };

first === second; // false
```

Therefore, a memoized function keyed by objects will miss when callers create equivalent objects separately:

```ts
const memoized = createMemoized((input: { id: number }) => input.id * 2);

memoized({ id: 1 });
memoized({ id: 1 }); // different object identity, recalculates
```

You can use a primitive key, a stable serialization, or a domain-specific identity strategy. Do not blindly serialize every object; serialization has a cost and may lose important distinctions.

## Memoization and closures

A closure is a natural place to keep a private cache:

```ts
const createUserNameLookup = (repository: UserRepository) => {
  const cache = new Map<string, string>();

  return async (userId: string) => {
    const cached = cache.get(userId);
    if (cached) return cached;

    const user = await repository.findById(userId);
    cache.set(userId, user.name);
    return user.name;
  };
};
```

The cache and repository are private to the returned function. This is useful, but the closure also determines lifetime: the cache remains alive while the function remains reachable.

Closures provide encapsulation, not automatic eviction. For long-lived processes, define when entries expire or when the cache is cleared. See [Closure for Encapsulation](/blog/closure-for-encapsulation) for more on private state and lifetime.

## Memoizing asynchronous work

An asynchronous function returns a promise, so you can cache the promise itself to deduplicate concurrent requests:

```ts
const createUserLoader = (api: UsersApi) => {
  const inFlight = new Map<string, Promise<User>>();

  return (userId: string) => {
    const existing = inFlight.get(userId);
    if (existing) return existing;

    const request = api.getUser(userId).finally(() => {
      inFlight.delete(userId);
    });

    inFlight.set(userId, request);
    return request;
  };
};
```

This cache stores only in-flight work. Multiple callers requesting the same user at the same time share one request, but a later call can fetch fresh data.

If you want to cache successful results, use a separate result cache with an explicit expiration policy. Decide what should happen after rejection: retry immediately, cache the failure briefly, or return the same rejected promise.

## Memoization and stale data

Caching data from a database or API raises a freshness question. Common policies include:

- Cache forever for immutable data.
- Clear entries after a time-to-live.
- Invalidate an item after a successful write.
- Refresh in the background while serving the previous value.
- Use versioned keys when the source data has a known version.

```ts
type CacheEntry<T> = { value: T; expiresAt: number };

const createTtlCache = <Key, Value>(ttlMs: number) => {
  const cache = new Map<Key, CacheEntry<Value>>();

  return {
    get(key: Key, now: number) {
      const entry = cache.get(key);
      if (!entry || entry.expiresAt <= now) {
        cache.delete(key);
        return undefined;
      }

      return entry.value;
    },
    set(key: Key, value: Value, now: number) {
      cache.set(key, { value, expiresAt: now + ttlMs });
    },
  };
};
```

Expiration is not invalidation. A value can become incorrect before its TTL ends, so writes and external events may still need to clear the relevant entry.

## Memoization in frontend applications

Frontend code sometimes memoizes derived data to avoid repeating expensive calculations:

```ts
const selectVisibleProducts = (
  products: Product[],
  searchTerm: string,
) => products
  .filter((product) => product.active)
  .filter((product) => product.name
    .toLowerCase()
    .includes(searchTerm.toLowerCase()));
```

Whether this should be memoized depends on the size of the data, the frequency of rendering, and the cost of the calculation. Memoizing every small selector can add complexity without a measurable benefit.

When using reference-based memoization, remember that a newly created array or object is a new input even if its contents are equal. Stable references and correct dependency tracking are part of the memoization contract.

Memoization also does not automatically prevent a component from rendering. It only avoids work performed by the memoized operation.

## Memoization versus caching

Memoization is a specific kind of caching: it caches the output of a function based on its inputs.

General caching may store API responses, rendered pages, database queries, or files using a key that is not simply a function argument list. The broader cache may have TTLs, invalidation events, persistence, size limits, and distributed coordination.

Memoization is usually local to a process and closely tied to a function's contract. Treating a local memoization map as a complete application cache often leads to stale data, unbounded memory, or inconsistent results across processes.

## Common mistakes

### Memoizing cheap work

A `Map` lookup, key construction, and cache management can cost more than repeating a simple calculation. Measure expensive paths or use memoization where repeated work is obvious from the algorithm.

### Caching impure results

If a result depends on hidden state, a cached value can be wrong. Include dependencies in the key or redesign the function so its inputs represent the conditions that affect the result.

### Unbounded memory growth

One unique input can create one permanent entry. Add a maximum size, TTL, eviction policy, or explicit `clear` operation when inputs are not naturally bounded.

### Returning mutable cached objects

If callers mutate a cached object, future callers may observe those mutations. Return immutable data, defensive copies, or a read-only interface according to the performance needs of the application.

### Caching failures accidentally

Caching a rejected promise can make every future call fail until the entry is cleared. Decide explicitly whether failures should be retried, briefly cached, or returned to concurrent callers only.

### Using the wrong identity

Reference-based keys, serialized keys, and domain IDs have different semantics. Choose the identity that matches what “same input” means for the function.

## Testing memoized functions

Test both the returned values and the number of underlying calculations:

```ts
it('calculates each input once', () => {
  let calls = 0;
  const square = createMemoized((value: number) => {
    calls += 1;
    return value * value;
  });

  expect(square(4)).toBe(16);
  expect(square(4)).toBe(16);
  expect(calls).toBe(1);
});
```

Also test cache misses, different keys, invalidation, expiration, mutable results, rejected promises, and concurrent calls when those behaviors matter.

Avoid tests that assert only implementation details such as the use of `Map`. The important contract is whether repeated equivalent inputs produce correct results and whether the expected work is avoided.

## A practical checklist

Before memoizing a function, ask:

- Is the function pure or are all result-changing dependencies represented in the key?
- Is the repeated work expensive enough to justify a cache?
- What does “same input” mean: value equality, object identity, or a domain ID?
- How large can the cache grow?
- When does an entry become stale, and how is it invalidated?
- Can callers mutate returned cached values?
- What happens when an asynchronous calculation fails?
- Have I measured the benefit instead of assuming memoization is faster?

## Final thoughts

Memoization can turn repeated computation into a cheap lookup, especially for recursive algorithms, expensive pure transformations, and duplicate asynchronous requests.

It is also a correctness decision. Cache keys, invalidation, object identity, memory lifetime, mutable results, and failures all affect whether the cached value is safe to reuse. Use memoization when the performance benefit is real, keep the cache policy explicit, and treat freshness as part of the function’s contract.
