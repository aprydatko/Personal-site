---
title: "Classical GoF patterns: Bridge"
description: A practical guide to the Bridge pattern, how it separates an abstraction from its implementation, and how composition prevents class hierarchies from multiplying.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Bridge pattern separates an abstraction from its implementation so both can vary independently.

```text
Abstraction → Implementation
     ↑              ↑
  Report       PdfRenderer
  Dashboard    HtmlRenderer
```

Instead of building one inheritance hierarchy for every combination, the abstraction composes an implementation through a stable interface.

```text
without Bridge:
ReportPdf, ReportHtml, DashboardPdf, DashboardHtml

with Bridge:
Report ─────┐
Dashboard ─┼→ Renderer
            ├→ PdfRenderer
            └→ HtmlRenderer
```

## The problem it solves

Suppose a notification feature varies by message type and delivery channel. Inheritance quickly creates combinations:

```text
WelcomeEmail, WelcomeSms, AlertEmail, AlertSms, DigestEmail, DigestSms
```

The message abstraction and delivery implementation are separate dimensions. A Bridge keeps them independent:

```ts
type Message = { subject: string; body: string };

type Channel = {
  deliver(message: Message, recipient: string): Promise<void>;
};

type Notification = {
  send(recipient: string): Promise<void>;
};
```

An abstraction receives an implementation:

```ts
const createAlert = (
  channel: Channel,
  message: Message,
): Notification => ({
  send: (recipient) => channel.deliver(message, recipient),
});
```

The same `Alert` abstraction can use email, SMS, or an in-memory test channel without creating a subclass for every combination.

## Abstraction and implementation interfaces

The abstraction owns the higher-level workflow. The implementation owns the platform or provider-specific operation:

```ts
type Renderer = {
  heading(text: string): string;
  paragraph(text: string): string;
};

type Document = {
  render(): string;
};

const createReport = (
  renderer: Renderer,
  title: string,
  summary: string,
): Document => ({
  render: () => [renderer.heading(title), renderer.paragraph(summary)].join('\n'),
});
```

Concrete implementations can vary without changing the document abstraction:

```ts
const htmlRenderer: Renderer = {
  heading: (text) => `<h1>${escapeHtml(text)}</h1>`,
  paragraph: (text) => `<p>${escapeHtml(text)}</p>`,
};

const markdownRenderer: Renderer = {
  heading: (text) => `# ${text}`,
  paragraph: (text) => text,
};
```

The abstraction depends on the contract it needs, not on a concrete rendering library.

## Refined abstractions

The GoF form allows a refined abstraction to add higher-level behavior while reusing the same implementation bridge:

```ts
const createDashboard = (
  renderer: Renderer,
  title: string,
  metrics: string[],
): Document => ({
  render: () => [
    renderer.heading(title),
    ...metrics.map((metric) => renderer.paragraph(metric)),
  ].join('\n'),
});
```

`Report` and `Dashboard` vary on the abstraction side. `HtmlRenderer` and `MarkdownRenderer` vary on the implementation side. A new dashboard renderer combination requires no new hierarchy branch.

## Bridge versus Adapter

An Adapter makes an existing incompatible interface fit an expected contract:

```text
Adapter → translate one external interface into another
Bridge  → design two dimensions to vary independently
```

Use an Adapter when the external API already exists and does not match your contract. Use a Bridge when you own the abstraction and implementation boundaries and want to prevent their variation from becoming coupled.

An adapter can still be used as the implementation behind a Bridge. For example, `PdfRenderer` may adapt a third-party PDF library while the document abstraction remains independent of it.

## Bridge versus Strategy

Strategy replaces one algorithm behind a stable context. Bridge separates two structural dimensions that can both have multiple variants:

```text
Strategy → choose one behavior for a context
Bridge   → vary abstraction and implementation independently
```

The implementation side of a Bridge often looks like a Strategy. The distinction is useful for design intent: Strategy focuses on interchangeable behavior; Bridge focuses on avoiding a product of class combinations.

## Dependency inversion

The implementation contract should be small and expressed in the language of the abstraction:

```ts
type Storage = {
  save(documentId: string, content: string): Promise<void>;
};

type Draft = {
  publish(): Promise<void>;
};

const createDraft = (
  storage: Storage,
  id: string,
  content: string,
): Draft => ({
  publish: () => storage.save(id, content),
});
```

The domain or application layer can depend on `Storage`, while infrastructure provides S3, PostgreSQL, filesystem, or fake implementations. Keep provider types and configuration at the composition boundary.

## Runtime selection

Select the implementation at composition time:

```ts
const renderer = config.format === 'html'
  ? htmlRenderer
  : markdownRenderer;

const document = createReport(renderer, title, summary);
```

For tenant-specific or request-specific behavior, pass the implementation explicitly and validate that its lifecycle and permissions match the scope. Avoid a global mutable “current implementation” that makes concurrent requests interfere with one another.

## Async bridges

The implementation can represent an asynchronous infrastructure capability:

```ts
type ImageRenderer = {
  render(input: { sourceKey: string; width: number }): Promise<{ key: string }>;
};

type ProductImage = {
  createThumbnail(width: number): Promise<{ key: string }>;
};

const createProductImage = (
  renderer: ImageRenderer,
  sourceKey: string,
): ProductImage => ({
  createThumbnail: (width) => renderer.render({ sourceKey, width }),
});
```

The abstraction can define the feature-level operation while the implementation handles a CDN, local process, or remote image service. Timeouts, retries, cancellation, and error translation belong at the infrastructure boundary, with their impact made visible to the abstraction's contract.

## Avoiding leaky bridges

A Bridge is weak if the abstraction exposes implementation-specific types:

```ts
type WeakReport = {
  render(pdfOptions: PdfLibraryOptions): Buffer;
};
```

Now every caller depends on the PDF library, and the abstraction cannot evolve independently. Define an application-facing output and translate provider details inside the implementation:

```ts
type RenderedDocument = { contentType: string; body: Uint8Array };
type StrongReport = { render(): Promise<RenderedDocument> };
```

Hide only details that the abstraction does not need. If callers genuinely require PDF-specific options, make that capability an explicit contract rather than leaking a vendor type accidentally.

## Lifecycle and resources

Implementations may own pools, sessions, or browser processes. Make ownership explicit:

```ts
type Renderer = {
  render(input: RenderInput): Promise<RenderedDocument>;
  close?(): Promise<void>;
};
```

The composition root should close shared implementations. An abstraction should not close a bridge it did not create unless ownership is part of its contract. Reuse expensive clients when safe, but create request-scoped implementations when isolation or authorization requires it.

## Testing a Bridge

Test the abstraction with a fake implementation:

```ts
it('renders a report through the provided implementation', () => {
  const renderer: Renderer = {
    heading: vi.fn().mockReturnValue('HEADING'),
    paragraph: vi.fn().mockReturnValue('PARAGRAPH'),
  };
  const report = createReport(renderer, 'Sales', 'Revenue increased');

  expect(report.render()).toBe('HEADING\nPARAGRAPH');
  expect(renderer.heading).toHaveBeenCalledWith('Sales');
});
```

Also test each concrete implementation's output, escaping, error translation, timeouts, lifecycle, and compatibility with every abstraction behavior that matters. Contract tests can ensure multiple implementations satisfy the same bridge interface.

## Common mistakes

### Two dimensions that do not actually vary

If only one side changes, a simple Factory or Strategy may be clearer. Do not introduce a Bridge just because composition is possible.

### Leaking implementation types

Provider or platform types in the abstraction contract recreate the coupling the Bridge should remove.

### A fat implementation interface

If the abstraction depends on dozens of unrelated operations, the bridge is hiding a service locator. Split capabilities and keep the contract narrow.

### Mixing workflow with infrastructure

The abstraction should own feature-level behavior; the implementation should own platform-specific mechanics. Business rules should remain in the domain or application layer.

### Global mutable implementations

Changing a shared implementation at runtime creates race conditions and test interference. Pass implementations explicitly or manage them through a scoped composition boundary.

### Ignoring lifecycle and failure behavior

Remote or stateful implementations need explicit ownership, timeouts, retries, cancellation, and cleanup. A stable interface does not make those concerns disappear.

## A practical checklist

Before introducing Bridge, ask:

- Are there two independent dimensions that will vary over time?
- Would inheritance create a multiplication of combinations?
- What is the smallest abstraction-side contract?
- What is the smallest implementation-side contract?
- Are provider and platform types isolated at the boundary?
- Who selects, owns, and closes the implementation?
- Would Adapter, Strategy, Factory, or direct dependency injection be simpler?
- Can each side evolve and be tested independently?

## Final thoughts

Bridge keeps an abstraction and its implementation from becoming one tangled hierarchy. It is valuable when both sides have meaningful independent variation and composition can express their relationship clearly.

Define narrow contracts, inject the implementation, keep infrastructure details at the edge, and make lifecycle and failure behavior explicit. If there is only one meaningful axis of change, use the simpler pattern that communicates the design more directly.
