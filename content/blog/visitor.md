---
title: "Classical GoF patterns: Visitor"
description: A practical guide to the Visitor pattern, how to add operations across a stable object structure, and how double dispatch affects extensibility and type safety.
date: "2026-09-13"
category: Architecture
readingTime: 8 min read
featured: false
published: true
---

The Visitor pattern separates an operation from the object structure it operates on. A visitor can perform different behavior for each concrete element type without adding another method to every element for every new operation.

```text
structure → element.accept(visitor)
                 ↓
          visitor.visitConcreteElement(element)
```

Visitor is useful when the element types are relatively stable but new operations over those elements are added frequently: formatting an AST, calculating totals, exporting a document, validating a syntax tree, or collecting metrics.

## The problem it solves

Imagine a document containing headings, paragraphs, and images. Adding HTML output, plain text output, word counts, accessibility checks, and search indexing can make the element interface grow:

```ts
type DocumentElement = {
  renderHtml(): string;
  renderText(): string;
  countWords(): number;
  validateAccessibility(): string[];
};
```

Each element now knows about every operation. Visitor moves those operations into separate objects while keeping the document structure focused on its own data and traversal.

## The visitor contract

Define an operation for each concrete element type:

```ts
type DocumentVisitor<T> = {
  visitHeading(element: Heading): T;
  visitParagraph(element: Paragraph): T;
  visitImage(element: Image): T;
};

type DocumentElement = {
  accept<T>(visitor: DocumentVisitor<T>): T;
};
```

Each element dispatches to its matching visitor method:

```ts
type Heading = DocumentElement & {
  kind: 'heading';
  level: number;
  text: string;
};

const heading = (level: number, text: string): Heading => ({
  kind: 'heading',
  level,
  text,
  accept: (visitor) => visitor.visitHeading({
    kind: 'heading',
    level,
    text,
    accept: visitor.visitHeading,
  }),
});
```

In production code, prefer concrete classes or a cleaner factory to avoid reconstructing the element during dispatch. The important detail is that the element chooses the correct visitor method.

## Double dispatch

The visitor and element cooperate to select behavior based on two types:

```ts
element.accept(visitor);
// element calls visitor.visitHeading(this)
```

The first dispatch selects the element’s `accept` implementation. The second selects the visitor method for that concrete element. This avoids a large `switch` over element kinds inside every operation.

With a class-based model:

```ts
class Paragraph implements DocumentElement {
  constructor(readonly text: string) {}

  accept<T>(visitor: DocumentVisitor<T>): T {
    return visitor.visitParagraph(this);
  }
}
```

The visitor can access the element’s public data while keeping the element’s invariants under its control.

## A concrete HTML visitor

One visitor owns HTML formatting:

```ts
const htmlVisitor: DocumentVisitor<string> = {
  visitHeading: (element) => `<h${element.level}>${escapeHtml(element.text)}</h${element.level}>`,
  visitParagraph: (element) => `<p>${escapeHtml(element.text)}</p>`,
  visitImage: (element) => `<img src="${escapeAttribute(element.src)}" alt="${escapeAttribute(element.alt)}">`,
};
```

The structure can accept another visitor without changing its element classes:

```ts
const textVisitor: DocumentVisitor<string> = {
  visitHeading: (element) => element.text,
  visitParagraph: (element) => element.text,
  visitImage: (element) => element.alt,
};
```

Formatting-specific concerns stay out of the document model.

## Visitors over a Composite

Visitor often pairs with Composite. The composite element delegates traversal to its children, while the visitor handles each leaf:

```ts
class Section implements DocumentElement {
  constructor(readonly children: DocumentElement[]) {}

  accept<T>(visitor: DocumentVisitor<T>): T {
    return visitor.visitSection(this);
  }
}
```

The visitor contract can include the composite:

```ts
type DocumentVisitor<T> = {
  visitHeading(element: Heading): T;
  visitParagraph(element: Paragraph): T;
  visitImage(element: Image): T;
  visitSection(element: Section): T;
};
```

Alternatively, traversal can be separate from element-specific processing:

```ts
const walk = (element: DocumentElement, visitor: DocumentVisitor<void>) => {
  element.accept(visitor);
  if (element instanceof Section) {
    for (const child of element.children) walk(child, visitor);
  }
};
```

Keep traversal ownership clear. If both `Section.accept()` and `walk()` recurse, elements may be visited twice.

## Visitors that return values

Visitors can return strings, numbers, validation results, or a new representation:

```ts
const wordCountVisitor: DocumentVisitor<number> = {
  visitHeading: (element) => element.text.trim().split(/\s+/).filter(Boolean).length,
  visitParagraph: (element) => element.text.trim().split(/\s+/).filter(Boolean).length,
  visitImage: () => 0,
};
```

For a tree, a composite visitor method can combine child results:

```ts
visitSection: (section) => section.children.reduce(
  (total, child) => total + child.accept(wordCountVisitor),
  0,
),
```

Make empty-structure behavior explicit. For sums, zero is natural; for minimums, validation results, and generated output, the identity or error value may be domain-specific.

## Adding operations versus adding elements

Visitor makes adding a new operation easy:

```text
new operation → add one visitor
```

Adding a new element is expensive because every visitor must implement a new method:

```text
new element → update every visitor and every dispatch contract
```

Use Visitor when element types are stable. If new element types are added often, ordinary polymorphic methods, a registry, pattern matching, or a data-oriented operation may be more maintainable.

## Visitor versus Strategy

Strategy selects one algorithm for a context. Visitor applies one operation across different element types:

```text
Strategy → one interchangeable algorithm
Visitor  → one operation with type-specific behavior across a structure
```

A visitor can contain several strategies internally, but keep the concepts separate. If there is no heterogeneous structure to visit, Strategy is usually clearer.

## Visitor versus Interpreter

Interpreter evaluates a language or expression grammar. Visitor can provide one operation over that grammar:

```text
Interpreter → define and evaluate expressions
Visitor     → add formatting, optimization, or analysis over expression nodes
```

An AST interpreter often uses Visitor for evaluation, but the patterns answer different design questions.

## Open and closed designs

Visitor favors a closed set of element types and an open set of operations. This is the opposite tradeoff of a classic object-oriented polymorphic design, where adding a new subtype can be easy but adding new operations requires modifying every subtype.

Choose based on which axis changes more frequently. In functional code, a discriminated union plus exhaustive pattern matching can express the same tradeoff with strong compiler checking:

```ts
type Element =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string };

const toText = (element: Element) => {
  if (element.kind === 'heading') return element.text;
  return element.text;
};
```

The explicit union may be preferable when the structure is data rather than behavior-bearing objects.

## Async visitors

Visitors can perform asynchronous work, but the contract should make that cost visible:

```ts
type AsyncDocumentVisitor<T> = {
  visitImage(element: Image): Promise<T>;
  visitParagraph(element: Paragraph): Promise<T>;
  visitHeading(element: Heading): Promise<T>;
};
```

An indexing visitor may read metadata or upload assets. Bound concurrency during traversal and define failure behavior: stop on the first error, collect errors, or skip optional elements. Do not hide unbounded remote calls in a seemingly simple tree walk.

## Encapsulation and visitor access

Some Visitor implementations need internal element data. Options include:

- expose a stable read-only element interface;
- place Visitor and elements in the same module boundary;
- provide narrow access methods for the operations the domain supports;
- use a data-oriented representation and pure functions.

Avoid making every internal field public merely to satisfy a visitor. If visitors need frequent privileged access, the element boundary may be too weak or the operation may belong on the element itself.

## Testing Visitor

Test dispatch and each operation independently:

```ts
it('dispatches a paragraph to the paragraph visitor method', () => {
  const visitor: DocumentVisitor<string> = {
    visitHeading: vi.fn(),
    visitParagraph: vi.fn().mockReturnValue('paragraph'),
    visitImage: vi.fn(),
  };
  const element = new Paragraph('Hello');

  expect(element.accept(visitor)).toBe('paragraph');
  expect(visitor.visitParagraph).toHaveBeenCalledWith(element);
});
```

Also test every element/visitor combination, composite traversal, empty nodes, ordering, escaping, async failure, cancellation, and exhaustive handling when a new element type is introduced. Snapshot tests can help with render visitors, but semantic assertions should cover important behavior.

## Common mistakes

### Adding Visitor to a changing hierarchy

Every new element forces changes across all visitors. Use Visitor when the element set is stable enough to absorb that cost.

### Duplicating traversal

If both the composite and external walker recurse, elements may be processed twice. Assign traversal ownership to one layer.

### Exposing all internals

Visitor access should not destroy encapsulation. Expose stable, read-only data or narrow capabilities.

### Hiding expensive work

Async visitors can perform network calls for every node. Bound concurrency, time, and memory, and report partial failures explicitly.

### Swallowing unsupported elements

Returning an empty result for an unhandled type can silently corrupt exports or analysis. Prefer exhaustive contracts and explicit unsupported-operation errors.

### Using Visitor for one operation

If the operation is core behavior of each element and unlikely to multiply, a normal method or Strategy is often simpler.

## A practical checklist

Before introducing Visitor, ask:

- Is the object structure heterogeneous and relatively stable?
- Will new operations be added more often than new element types?
- Should traversal live in the structure or in an external walker?
- What state may visitors access without breaking encapsulation?
- Do visitors return values, accumulate results, or perform side effects?
- Are async work, concurrency, and failure behavior explicit?
- Would Composite, Strategy, Interpreter, or exhaustive pattern matching be clearer?
- Can new element types fail loudly at compile time or through tests?

## Final thoughts

Visitor is a deliberate trade: it makes new operations over a stable structure easy while making new element types more expensive. It keeps formatting, analysis, export, and validation concerns separate from the nodes they inspect.

Use it when that change axis matches the domain. Keep traversal ownership clear, preserve encapsulation, make async cost visible, and prefer a simpler method or discriminated union when the object structure or operation set is small.
