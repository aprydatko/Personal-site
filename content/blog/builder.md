---
title: "Classical GoF patterns: Builder"
description: A practical guide to the Builder pattern, how it separates construction from representation, and when stepwise object creation improves clarity and correctness.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Builder pattern separates the construction of a complex object from the object’s final representation.

Instead of passing a long list of positional arguments or exposing a partially valid object, a builder collects configuration step by step and produces a validated result at the end.

```text
builder → configure options → validate → build → complete object
```

Builder is useful when an object has many optional parts, construction has meaningful steps, or several representations can be produced from the same construction process.

## The problem it solves

A constructor with many parameters is difficult to read and easy to misuse:

```ts
const report = new Report(
  'sales',
  '2026-01-01',
  '2026-09-13',
  true,
  undefined,
  ['revenue', 'orders'],
  'csv',
);
```

An options object improves names but may still allow invalid combinations:

```ts
const report = createReport({
  type: 'sales',
  from: '2026-01-01',
  to: '2026-09-13',
  includeCharts: true,
  format: 'csv',
});
```

A builder can make the construction flow readable and centralize validation:

```ts
const report = ReportBuilder
  .forType('sales')
  .between('2026-01-01', '2026-09-13')
  .include('revenue', 'orders')
  .withCharts()
  .as('csv')
  .build();
```

## A simple builder

The builder stores construction state and returns the finished object only after validation:

```ts
type Report = {
  type: string;
  from: string;
  to: string;
  fields: string[];
  format: 'json' | 'csv';
  includeCharts: boolean;
};

class ReportBuilder {
  private readonly options: Partial<Report> = {};

  static forType(type: string) {
    const builder = new ReportBuilder();
    builder.options.type = type;
    return builder;
  }

  between(from: string, to: string) {
    this.options.from = from;
    this.options.to = to;
    return this;
  }

  include(...fields: string[]) {
    this.options.fields = fields;
    return this;
  }

  withCharts() {
    this.options.includeCharts = true;
    return this;
  }

  as(format: Report['format']) {
    this.options.format = format;
    return this;
  }

  build(): Report {
    const { type, from, to, fields, format, includeCharts } = this.options;
    if (!type || !from || !to || !fields?.length || !format) {
      throw new Error('Incomplete report configuration');
    }
    if (from > to) throw new Error('Report start must be before its end');

    return {
      type,
      from,
      to,
      fields: [...fields],
      format,
      includeCharts: includeCharts ?? false,
    };
  }
}
```

The built object owns its completed state. Copy arrays and other mutable collections so later builder changes cannot mutate an already-created report.

## Fluent APIs

Returning `this` creates a fluent API. Fluent methods should remain focused and predictable:

```ts
const request = new HttpRequestBuilder()
  .get('/reports')
  .header('accept', 'application/json')
  .timeout(2_000)
  .build();
```

Avoid methods whose names hide expensive work or side effects. `header()` should configure a request; it should not send one. `build()` should create the object and validate it, not unexpectedly perform a remote call.

## Immutable builders

An immutable builder returns a new builder for every step:

```ts
type QueryOptions = {
  filters: Record<string, string>;
  limit: number;
};

const createQueryBuilder = (options: QueryOptions = { filters: {}, limit: 50 }) => ({
  where(field: string, value: string) {
    return createQueryBuilder({
      ...options,
      filters: { ...options.filters, [field]: value },
    });
  },
  limit(limit: number) {
    return createQueryBuilder({ ...options, limit });
  },
  build() {
    return { ...options, filters: { ...options.filters } };
  },
});
```

Immutable builders are safer to reuse and compose, especially in concurrent or functional code. Mutable builders allocate less and can be convenient for one local construction. Choose deliberately and document whether a builder can be reused after `build()`.

## Required steps with staged builders

TypeScript can encode required construction steps as separate interfaces:

```ts
type Named = { name(value: string): WithSource };
type WithSource = { source(value: string): ReadyToBuild };
type ReadyToBuild = { build(): DataPipeline };

const pipelineBuilder = (): Named => {
  let pipelineName = '';
  let sourceName = '';

  const ready: ReadyToBuild = {
    build: () => ({ name: pipelineName, source: sourceName }),
  };

  const withSource: WithSource = {
    source(value) {
      sourceName = value;
      return ready;
    },
  };

  return {
    name(value) {
      pipelineName = value;
      return withSource;
    },
  };
};
```

The caller cannot access `build()` before setting the required fields. Staged builders add types and interfaces, so use them for genuinely important invariants rather than every small object.

Runtime validation is still needed for values such as empty strings, invalid dates, or relationships between fields. Types prevent missing steps at compile time; they cannot validate external input at runtime.

## Director and reusable recipes

The original GoF form often includes a Director that defines a repeatable construction sequence:

```ts
type DashboardBuilder = {
  title(value: string): DashboardBuilder;
  addMetric(name: string): DashboardBuilder;
  addChart(type: 'line' | 'bar'): DashboardBuilder;
  build(): Dashboard;
};

const buildExecutiveDashboard = (builder: DashboardBuilder) =>
  builder
    .title('Executive overview')
    .addMetric('revenue')
    .addMetric('retention')
    .addChart('line')
    .build();
```

A Director is useful when recipes are reused or the order is meaningful. In application code, a named function is often enough. Do not create a Director class solely to match the diagram in a textbook.

## Multiple representations

A single construction process can produce different representations:

```ts
type DocumentBuilder = {
  heading(text: string): DocumentBuilder;
  paragraph(text: string): DocumentBuilder;
  buildHtml(): string;
  buildMarkdown(): string;
};
```

This is a good fit when the same logical content must be rendered as HTML, Markdown, a PDF model, or a search document. Keep representation-specific output in the appropriate builder or renderer; do not make one builder a dumping ground for unrelated formats.

## Builder versus options objects

An options object is usually simpler for a data-shaped object:

```ts
const client = createApiClient({
  baseUrl,
  timeoutMs: 2_000,
  retries: 2,
});
```

Use Builder when construction benefits from named steps, validation across multiple fields, reusable recipes, staged requirements, or multiple output representations. If the object has only a few independent optional values, an options object is clearer and easier to serialize.

## Builder versus Factory

A Factory selects or creates an implementation. A Builder configures one complex result:

```text
Factory → which product should be created?
Builder → how should this product be assembled?
```

They can be combined. An Abstract Factory may provide a family-specific builder, or a builder may use a factory to create internal components. Keep the responsibilities distinct so configuration does not become provider selection and vice versa.

## Defaults and validation

Defaults should be visible and safe:

```ts
const createSearchBuilder = () => {
  let limit = 50;
  let timeoutMs = 1_000;

  return {
    limit(value: number) {
      if (!Number.isInteger(value) || value < 1 || value > 500) {
        throw new Error('Limit must be between 1 and 500');
      }
      limit = value;
      return this;
    },
    timeout(value: number) {
      timeoutMs = value;
      return this;
    },
    build() {
      return { limit, timeoutMs };
    },
  };
};
```

Validate at the boundary where the builder can provide the best error. Validate required combinations in `build()`, and validate individual values in their setter methods when immediate feedback is useful. Avoid producing a partially valid object and hoping a later consumer catches the error.

## Testing builders

Builders are easy to test as pure construction boundaries:

```ts
it('builds a report with defaults and configured fields', () => {
  const report = ReportBuilder
    .forType('sales')
    .between('2026-01-01', '2026-09-13')
    .include('revenue')
    .as('json')
    .build();

  expect(report).toEqual({
    type: 'sales',
    from: '2026-01-01',
    to: '2026-09-13',
    fields: ['revenue'],
    format: 'json',
    includeCharts: false,
  });
});
```

Also test missing required steps, invalid combinations, default values, immutability, repeated `build()` calls, recipe functions, and every supported representation. If a builder performs I/O, keep that behavior behind an injected dependency and test the construction separately from execution.

## Common mistakes

### A builder for a trivial object

An options object or direct constructor is usually better when there are only a few independent fields.

### Mutable state leaks

Returning internal arrays, maps, or nested objects allows callers to mutate the builder’s result. Copy mutable structures or use immutable data.

### Validation only at the end

Some invalid values can be rejected immediately with clearer errors. Validate both individual inputs and cross-field invariants.

### Hidden side effects

`build()` should not unexpectedly save data, send a request, or mutate global state. Construction and execution should have separate names and responsibilities.

### Too many staged types

Staged builders can make APIs noisy and difficult to evolve. Encode only invariants that materially improve correctness.

### Builder as a service locator

A builder should assemble one result, not expose arbitrary dependency lookups. Keep infrastructure selection in factories and composition roots.

## A practical checklist

Before introducing Builder, ask:

- Is the object genuinely complex or likely to gain more construction options?
- Would named steps be clearer than positional arguments or an options object?
- Which fields and combinations are required for a valid result?
- Should the builder be mutable or immutable, and can it be reused?
- Does construction need reusable recipes or multiple representations?
- Who owns validation, defaults, and mutable data copying?
- Can construction be separated from I/O and execution?
- Would a Factory, Factory Method, or direct constructor be simpler?

## Final thoughts

Builder makes complex construction readable, validates invariants before an object escapes, and can support reusable recipes or multiple representations. Its value comes from the construction problem it solves, not from the fluent syntax alone.

Use a builder when the sequence, options, or validation are meaningful. Keep it focused on assembling one result, keep side effects out of construction, and prefer a constructor or options object when they express the domain more directly.
