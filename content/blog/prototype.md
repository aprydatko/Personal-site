---
title: "Classical GoF patterns: Prototype"
description: A practical guide to the Prototype pattern, how objects create new instances by cloning existing ones, and how to avoid shared-state and identity bugs.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Prototype pattern creates new objects by copying an existing prototype instead of constructing every object from scratch.

```text
prototype → clone → customize → new instance
```

It is useful when object construction is expensive, configuration is complex, or the system needs to create variants of a known baseline. The clone should be an independent object with the sharing and identity rules made explicit.

## The basic contract

A prototype exposes a cloning operation:

```ts
type Document = {
  title: string;
  tags: string[];
  metadata: Record<string, string>;
  clone(): Document;
};
```

A concrete implementation should copy mutable state rather than accidentally sharing it:

```ts
const createDocument = (
  title: string,
  tags: string[],
  metadata: Record<string, string>,
): Document => ({
  title,
  tags: [...tags],
  metadata: { ...metadata },
  clone() {
    return createDocument(this.title, this.tags, this.metadata);
  },
});
```

The clone starts with the same configuration, but changing its tags or metadata does not mutate the original.

## Shallow versus deep copies

Primitive values can be copied directly, but arrays, maps, nested objects, and class instances need an explicit policy:

```ts
const shallow = {
  settings: original.settings, // shared reference
};

const independent = {
  settings: { ...original.settings }, // copied one level
};
```

A shallow clone is safe only when referenced objects are immutable or intentionally shared. A deep clone is required when nested mutable state belongs to the prototype and each clone must own an independent graph.

Do not use JSON serialization as a universal deep-clone strategy. It loses dates, maps, sets, undefined values, class behavior, and sometimes precision. Use structured data, a domain-specific copy function, or an established clone mechanism appropriate to the object graph.

## Copying a class

A class can keep cloning close to its state:

```ts
class QueryTemplate {
  constructor(
    readonly filters: Record<string, string>,
    readonly sort: string,
    readonly limit: number,
  ) {}

  clone() {
    return new QueryTemplate(
      { ...this.filters },
      this.sort,
      this.limit,
    );
  }
}
```

The clone preserves the class behavior while copying the mutable filter map. If a class contains a database connection, logger, cache, or other resource, decide whether the clone shares, replaces, or forbids that dependency. Cloning an object is not the same as duplicating external resources.

## Identity-sensitive fields

Not every field should be copied unchanged. A cloned entity may need a new identity, creation time, or ownership:

```ts
type InvoiceDraft = {
  id: string;
  customerId: string;
  lines: InvoiceLine[];
  createdAt: Date;
};

const cloneForCustomer = (
  source: InvoiceDraft,
  customerId: string,
  ids: { generate(): string },
): InvoiceDraft => ({
  id: ids.generate(),
  customerId,
  lines: source.lines.map((line) => ({ ...line })),
  createdAt: new Date(),
});
```

Name specialized operations according to their business meaning. `clone()` suggests a structural copy; `duplicateForCustomer()` communicates that identity and ownership are intentionally changed.

## Prototype registries

A registry stores named prototypes for reuse:

```ts
type ReportTemplate = {
  clone(): ReportTemplate;
  configure(options: { title?: string; ownerId?: string }): ReportTemplate;
};

class ReportTemplateRegistry {
  private readonly templates = new Map<string, ReportTemplate>();

  register(name: string, template: ReportTemplate) {
    this.templates.set(name, template);
  }

  create(name: string, options: { title?: string; ownerId?: string }) {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Unknown report template: ${name}`);

    return template.clone().configure(options);
  }
}
```

The registry centralizes common baselines without exposing construction details to callers. Register immutable or safely isolated prototypes. If callers can mutate a registered prototype, every future clone may inherit accidental changes.

## Prototype versus Factory

A Factory creates an object from a type or configuration. A Prototype creates a new object from an existing configured instance:

```text
Factory   → create a new product from creation rules
Prototype → clone a known product and customize the copy
```

Use a Factory when inputs are small and construction rules are stable. Use Prototype when the baseline contains rich, reusable configuration or when cloning is cheaper or clearer than rebuilding the graph.

## Prototype versus Builder

A Builder assembles a new object step by step. Prototype starts with a complete example:

```text
Builder   → empty or partial state → configure → build
Prototype → configured baseline → clone → modify
```

They can work together. A builder can create prototypes for frequently used variants, and a cloned prototype can be passed into a builder for final customization.

## Immutable prototypes

Immutable prototypes reduce clone complexity because shared state is safe to reuse:

```ts
type Theme = Readonly<{
  colors: Readonly<Record<string, string>>;
  spacing: readonly number[];
}>;

const darkTheme: Theme = Object.freeze({
  colors: Object.freeze({ background: '#101714', foreground: '#f4f4f5' }),
  spacing: Object.freeze([4, 8, 16, 24]),
});
```

An immutable value may be shared rather than copied. This is often safer and cheaper than deep cloning large configuration graphs. A new instance is still needed when identity or mutable lifecycle state belongs to the cloned object.

## Performance and lazy state

Prototype is sometimes chosen to avoid expensive initialization, but lazy sharing can create hidden coupling:

```ts
const clone = {
  compiledSchema: original.compiledSchema, // safe if immutable
  cache: new Map(),                         // new per-instance state
};
```

Share immutable compiled schemas or read-only configuration. Create new caches, locks, request context, and metrics state for each clone. Do not copy open handles, active subscriptions, or in-flight promises unless that behavior is explicitly part of the contract.

## Persistence and serialization

Database records and serialized JSON are not automatically prototypes. Rehydrating a record may produce a plain object without methods or domain invariants:

```ts
const invoice = Invoice.fromPersistence(row);
const draft = invoice.cloneAsDraft();
```

Keep rehydration, cloning, and business duplication separate. A persistence mapper reconstructs an object from storage; a prototype clone defines what state is copied and what identity changes. Validate external or stored data before creating a trusted domain object.

## Testing prototypes

Test independence and identity rules explicitly:

```ts
it('clones mutable document state without sharing references', () => {
  const original = createDocument('Guide', ['architecture'], { version: '1' });
  const copy = original.clone();
  copy.tags.push('patterns');
  copy.metadata.version = '2';

  expect(original.tags).toEqual(['architecture']);
  expect(original.metadata.version).toBe('1');
});
```

Also test nested objects, dates and special values, shared immutable state, resource ownership, identity regeneration, registry lookup, unknown prototypes, and repeated cloning. Performance tests can compare cloning with reconstruction when the pattern exists for cost reasons.

## Common mistakes

### Accidental shared mutable state

A copied object that shares an array, map, or nested object can leak changes between instances. Define copy depth for every mutable field.

### Copying identity blindly

Two domain entities should not accidentally share an ID, ownership, or creation timestamp. Use a domain-specific duplication method when identity changes.

### Cloning resources

Database connections, file handles, subscriptions, and locks generally should not be copied. Share an injected stable dependency or create a new owned resource deliberately.

### Mutable registry entries

If the registry stores mutable prototypes, one caller can change the baseline for everyone. Freeze them, encapsulate mutation, or clone before any modification.

### Generic deep clone

Serialization-based cloning can silently lose behavior and data types. Use explicit copy rules for domain objects.

### Prototype without a construction problem

If a constructor or factory is short and clear, Prototype adds indirection without value. Use it when a configured baseline or expensive object graph is genuinely reusable.

## A practical checklist

Before introducing Prototype, ask:

- Is cloning a configured baseline clearer or cheaper than constructing from scratch?
- Which fields are immutable, shallow-copyable, or deeply owned?
- Which identity, ownership, timestamps, or lifecycle fields must change?
- Which dependencies should be shared, recreated, or excluded?
- Can a registry protect prototypes from mutation?
- Would an options object, Factory, or Builder express the construction better?
- Are clone and duplication semantics tested for nested state and failures?

## Final thoughts

Prototype lets a system create new instances from known, configured examples. Its real design work is deciding what “copy” means: which values are independent, which immutable values may be shared, and which identity or resource fields must be regenerated.

Use explicit clone or domain-specific duplication methods, protect registry baselines, and avoid copying external resources by accident. When the copy rules are harder to explain than the original construction, a Factory or Builder is likely the better boundary.
