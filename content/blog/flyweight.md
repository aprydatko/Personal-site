---
title: "Classical GoF patterns: Flyweight"
description: A practical guide to the Flyweight pattern, how immutable intrinsic state can be shared across many objects, and how to avoid identity and mutation bugs.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Flyweight pattern reduces memory and construction cost by sharing reusable objects that contain common, immutable state.

```text
many logical objects → shared flyweight + external context
```

The pattern separates state into two categories:

- Intrinsic state is stable and shareable. It belongs to the flyweight.
- Extrinsic state varies per use. The caller supplies it for each operation.

```text
tree node = shared TreeSpecies('oak') + position, scale, rotation
```

One `TreeSpecies` can support thousands of logical trees while each tree keeps only its unique position and appearance data.

## The problem it solves

Large structures often repeat the same data:

```ts
type Tree = {
  species: string;
  texture: Uint8Array;
  position: { x: number; y: number };
  scale: number;
};
```

If every tree stores its own species metadata and texture, memory grows with the number of instances. A Flyweight moves shared data into a reusable object:

```ts
type TreeSpecies = {
  name: string;
  texture: Uint8Array;
  color: string;
};

type TreeInstance = {
  species: TreeSpecies;
  x: number;
  y: number;
  scale: number;
};
```

The instance contains only extrinsic state. The species object should be immutable or otherwise protected from per-instance mutation.

## A flyweight factory

A factory ensures equivalent intrinsic state uses one shared instance:

```ts
class TreeSpeciesFactory {
  private readonly species = new Map<string, TreeSpecies>();

  get(name: string, texture: Uint8Array, color: string) {
    const existing = this.species.get(name);
    if (existing) return existing;

    const value: TreeSpecies = Object.freeze({
      name,
      texture,
      color,
    });
    this.species.set(name, value);
    return value;
  }
}
```

The cache key must represent every field that affects intrinsic behavior. If two species have the same name but different textures, using only the name creates a silent data collision. In many systems, load and validate the resource before inserting it into the factory.

## Intrinsic and extrinsic state

A practical test is to ask whether the value changes for each logical instance:

```text
intrinsic: species name, texture, material, font metrics
extrinsic: position, user ID, selection, timestamp, request context
```

Do not put mutable or identity-specific data into a flyweight. A selected row, current owner, or request-scoped permission does not belong in a shared object.

```ts
type Glyph = {
  character: string;
  font: Font;
  render(context: { x: number; y: number; color: string }): void;
};
```

The glyph owns reusable font and character data. Position and color arrive through the render context.

## Rendering example

Text editors are a classic Flyweight use case. A document may contain millions of character positions but only a limited set of character and font combinations:

```ts
const renderDocument = (
  runs: Array<{ glyph: Glyph; x: number; y: number; color: string }>,
) => {
  for (const run of runs) {
    run.glyph.render({ x: run.x, y: run.y, color: run.color });
  }
};
```

The document stores extrinsic layout information. The glyph factory shares intrinsic font and character data. This reduces memory when the repeated state is large and the number of unique combinations is small.

## Flyweight versus Prototype

Prototype creates a new instance by copying an existing one. Flyweight returns an existing shared instance and supplies changing state externally:

```text
Prototype → independent copy with cloned state
Flyweight → shared immutable state reused by many clients
```

Use Prototype when each new object must become independently configurable. Use Flyweight when common state should remain shared and immutable.

## Flyweight versus cache

A cache stores values to avoid recomputation or I/O. A Flyweight defines shared object identity and separates common state from per-use context:

```text
Cache     → reuse a previously produced value
Flyweight → design objects for safe structural sharing
```

A Flyweight factory often uses a cache internally, but not every cache is a Flyweight. A cached API response is usually returned as a value, not as a shared intrinsic component of many logical objects.

## Immutability and shared references

Shared state must not be modified through one client:

```ts
type Material = Readonly<{
  texture: Readonly<Uint8Array>;
  roughness: number;
}>;
```

TypeScript’s `Readonly` helps communicate intent but does not deeply freeze typed arrays or prevent all runtime mutation. Encapsulate mutable resources, expose read-only views, or copy data at the boundary. If the underlying library mutates a buffer during rendering, it is not safe to share without synchronization.

## Lifecycle and eviction

A flyweight factory can grow without bound if keys come from untrusted or high-cardinality input:

```ts
const factory = new FlyweightFactory({ maxEntries: 10_000 });
```

Eviction is safe only if no live logical object requires the evicted flyweight, or if it can be reconstructed identically. Weak references can allow unused flyweights to be collected, but garbage collection is nondeterministic and should not be the only capacity policy for critical resources.

For expensive assets, use reference counting, an explicit release lifecycle, an LRU cache, or a resource manager with a bounded memory budget. Make ownership clear: a shared flyweight should not be closed by an arbitrary instance.

## Concurrency

In concurrent code, two callers can request the same flyweight at once. An in-memory `Map` is sufficient only when the runtime’s execution model makes the check-and-insert atomic for the relevant scope. Across processes, each process may have its own flyweight pool.

Do not coordinate shared object identity across machines unless the benefit is worth the distributed complexity. The pattern usually saves memory within one process; distributed caches solve a different problem.

If initialization is asynchronous, deduplicate the initialization promise and ensure failed initialization is removed or retried deliberately:

```ts
const loadFlyweight = async (key: string) => {
  const existing = pending.get(key);
  if (existing) return existing;

  const loading = loadAsset(key).catch((error) => {
    pending.delete(key);
    throw error;
  });
  pending.set(key, loading);
  return loading;
};
```

## When sharing is not worthwhile

Flyweight adds a lookup, an indirection, and a lifetime policy. It can be slower or harder to reason about when:

- intrinsic objects are small;
- there are few repeated instances;
- the factory has high-cardinality keys;
- the shared object is frequently mutated;
- object identity creates synchronization or debugging cost.

Measure memory and construction costs before adding the pattern. A plain value object may be clearer and fast enough.

## Security and tenant boundaries

Shared objects must not carry tenant-specific or user-specific data unless the key includes the correct isolation scope:

```text
safe:  template:tenant-a:invoice:v2
unsafe: template:invoice:v2  // if content differs by tenant
```

A shared flyweight containing authorization, secrets, or personalized content can leak state across callers. Keep security context extrinsic and pass it explicitly to operations that need it.

## Testing Flyweights

Test reuse and isolation separately:

```ts
it('returns the same flyweight for the same intrinsic key', () => {
  const factory = new TreeSpeciesFactory();
  const first = factory.get('oak', texture, 'green');
  const second = factory.get('oak', texture, 'green');

  expect(second).toBe(first);
});
```

Also test different intrinsic values do not collide, shared state cannot be mutated through clients, extrinsic state remains instance-specific, eviction behavior, failed initialization, concurrent requests, resource cleanup, and tenant scoping.

## Common mistakes

### Sharing mutable state

One logical object can alter every other object using the flyweight. Make intrinsic state immutable or protect mutations behind safe operations.

### Incomplete cache keys

If the key omits a field that affects behavior, different products can receive the wrong shared object. Define key construction alongside the intrinsic contract.

### Storing extrinsic state inside the flyweight

Positions, users, selections, and request context make the object unsafe to share. Pass them to each operation.

### Unbounded pools

A factory keyed by arbitrary input can become a memory leak. Bound cardinality and define eviction or cleanup.

### Closing shared resources per instance

One instance must not close a client or asset still used by others. Let the factory or resource manager own shared lifecycle.

### Optimizing without measurement

Indirection and synchronization can cost more than duplicated small objects. Confirm that memory or construction pressure is real.

## A practical checklist

Before introducing Flyweight, ask:

- Which state is truly intrinsic, stable, and safe to share?
- Which state must remain external to each logical instance?
- Is the repeated state large enough for sharing to matter?
- Are flyweight keys complete, bounded, and tenant-safe?
- Can shared objects remain immutable throughout their lifetime?
- Who owns initialization, eviction, and cleanup?
- What happens under concurrent requests or failed asset loading?
- Would ordinary values, Prototype, or a cache be simpler?

## Final thoughts

Flyweight reduces memory by sharing immutable intrinsic state while keeping per-use context outside the shared object. Its success depends on a sharp boundary between what is common and what is unique.

Use a focused factory, complete keys, safe lifecycle ownership, and explicit extrinsic context. If the state is small, mutable, or rarely repeated, prefer the simpler design and let measurement—not the pattern name—justify the indirection.
