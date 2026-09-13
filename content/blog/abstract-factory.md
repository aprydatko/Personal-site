---
title: "Classical GoF patterns: Abstract Factory"
description: A practical guide to the Abstract Factory pattern, how it creates compatible families of objects, and when a factory boundary improves portability and consistency.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Abstract Factory pattern provides an interface for creating a family of related objects without exposing their concrete classes.

```text
Application → AbstractFactory
                  ├── createButton()
                  └── createDialog()

WebFactory  → WebButton  + WebDialog
MobileFactory → MobileButton + MobileDialog
```

The important idea is family compatibility. The application asks one factory for several collaborating products, and the factory guarantees they belong to the same product family.

## The problem it solves

Suppose an application supports different notification providers. A provider may supply an email sender, SMS sender, and template renderer that must be used together:

```ts
type NotificationFactory = {
  createEmailSender(): EmailSender;
  createSmsSender(): SmsSender;
  createTemplateRenderer(): TemplateRenderer;
};
```

The application can build a workflow against these contracts:

```ts
const sendWelcomeNotification = async (
  factory: NotificationFactory,
  input: WelcomeInput,
) => {
  const renderer = factory.createTemplateRenderer();
  const email = factory.createEmailSender();
  const body = renderer.render('welcome', input);

  await email.send({ to: input.email, body });
};
```

The workflow does not import a provider SDK or decide which concrete objects go together.

## Product interfaces

Each product has an application-facing contract:

```ts
type EmailSender = {
  send(input: { to: string; body: string }): Promise<void>;
};

type SmsSender = {
  send(input: { phone: string; body: string }): Promise<void>;
};

type TemplateRenderer = {
  render(template: string, data: Record<string, unknown>): string;
};
```

Concrete products implement those interfaces for one family:

```ts
const acmeEmailSender: EmailSender = {
  send: (input) => acmeClient.email.send(input),
};

const acmeSmsSender: SmsSender = {
  send: (input) => acmeClient.sms.send(input),
};

const acmeTemplates: TemplateRenderer = {
  render: (template, data) => acmeClient.templates.render(template, data),
};
```

The factory groups those products:

```ts
const createAcmeNotificationFactory = (): NotificationFactory => ({
  createEmailSender: () => acmeEmailSender,
  createSmsSender: () => acmeSmsSender,
  createTemplateRenderer: () => acmeTemplates,
});
```

The composition root selects the family once:

```ts
const notificationFactory = createAcmeNotificationFactory();
const notifications = createNotificationService(notificationFactory);
```

## Family compatibility

The strongest reason to use Abstract Factory is preventing incompatible products from being mixed:

```text
AcmeEmail + AcmeTemplate       ✓ compatible
AcmeEmail + OtherTemplate      ? may use different placeholders or rules
```

Without a family boundary, each feature may independently choose providers and accidentally combine different assumptions about authentication, message formats, locales, or lifecycle behavior.

```ts
const factory = environment === 'test'
  ? createFakeNotificationFactory()
  : createAcmeNotificationFactory();
```

The feature receives a coherent family. Replacing the family does not require changing every consumer.

## A UI example

The classic GoF example uses widgets for different operating systems:

```ts
type Button = { render(): string };
type Dialog = { render(): string };

type WidgetFactory = {
  createButton(): Button;
  createDialog(): Dialog;
};

const createWebWidgetFactory = (): WidgetFactory => ({
  createButton: () => ({ render: () => '<button>Save</button>' }),
  createDialog: () => ({ render: () => '<dialog />' }),
});

const createTerminalWidgetFactory = (): WidgetFactory => ({
  createButton: () => ({ render: () => '[ Save ]' }),
  createDialog: () => ({ render: () => '--- dialog ---' }),
});
```

The screen or renderer depends on `WidgetFactory`, not on web or terminal widgets. The factory expresses a platform boundary while the product interfaces express capability boundaries.

## Abstract Factory versus Factory Method

Factory Method delegates the creation of one product, often through an overridable method:

```ts
type Parser = { parse(input: string): Document };

const createParser = (format: 'json' | 'xml'): Parser => {
  if (format === 'json') return createJsonParser();
  return createXmlParser();
};
```

Abstract Factory creates several related products:

```ts
type DocumentFactory = {
  createParser(): Parser;
  createSerializer(): Serializer;
  createValidator(): Validator;
};
```

Use Factory Method when one creation decision varies. Use Abstract Factory when multiple creation decisions must remain coordinated.

## Abstract Factory versus Builder

A Builder assembles one complex object step by step. An Abstract Factory selects a family of products:

```text
Builder        → construct one configured object
AbstractFactory → create compatible object types
```

They can work together. A factory may create a family-specific builder, or a builder may receive an abstract factory for its dependencies.

## Dependency inversion

The application layer should own the product contracts where appropriate, while infrastructure provides concrete factories:

```text
application
  NotificationFactory
  EmailSender / SmsSender / TemplateRenderer

infrastructure
  AcmeNotificationFactory
  FakeNotificationFactory
```

The factory is a dependency-injection boundary, not a place to hide business rules. It can choose implementations, configure clients, and enforce family compatibility. It should not decide whether a user is eligible for a promotion or whether an order may be canceled.

## Configuration and environment selection

Select the factory at the composition root:

```ts
const createNotificationFactory = (config: Config): NotificationFactory => {
  if (config.provider === 'acme') return createAcmeNotificationFactory(config);
  if (config.provider === 'fake') return createFakeNotificationFactory();

  throw new Error(`Unsupported notification provider: ${config.provider}`);
};
```

Avoid checking environment variables inside every product or feature. Centralized selection makes supported families visible and makes tests deterministic.

For runtime tenant-specific selection, keep the lookup explicit and cache factories safely. A tenant's factory may carry credentials, quotas, or region-specific clients, so its lifecycle and isolation need to be defined.

## Adding a new product

Adding a new product to the factory interface affects every concrete factory:

```ts
type NotificationFactory = {
  createEmailSender(): EmailSender;
  createSmsSender(): SmsSender;
  createPushSender(): PushSender;
};
```

This is the main tradeoff of Abstract Factory. Adding a new family is easy: implement one new factory and its products. Adding a new product type is broader: every family must decide how to implement it.

If product types change more often than families, an Abstract Factory may create too much coordination. Consider smaller capability factories or direct dependency injection.

## Lifecycle and resource ownership

Factories may return new objects, shared objects, or scoped objects. Make ownership explicit:

```ts
type NotificationFactory = {
  createEmailSender(): EmailSender;
  close?(): Promise<void>;
};
```

Shared SDK clients can reuse connections and pools. Per-request products may carry context or authorization. Do not create a new network client for every product call unless the client is intentionally lightweight.

If a family has resources that must be closed, let the composition boundary own the factory lifecycle. Product consumers should not close a shared client they did not create.

## Testing Abstract Factories

Test consumers against a fake family:

```ts
it('sends a rendered welcome message through the selected family', async () => {
  const email = { send: vi.fn().mockResolvedValue(undefined) };
  const factory: NotificationFactory = {
    createEmailSender: () => email,
    createSmsSender: () => ({ send: vi.fn() }),
    createTemplateRenderer: () => ({
      render: vi.fn().mockReturnValue('Welcome!'),
    }),
  };

  await sendWelcomeNotification(factory, input);

  expect(email.send).toHaveBeenCalledWith({ to: input.email, body: 'Welcome!' });
});
```

Also test each concrete factory's compatibility assumptions, configuration selection, unsupported providers, resource cleanup, and product lifecycle. Contract tests can verify that every family satisfies the same application-facing behavior.

## Common mistakes

### A factory that creates unrelated objects

If the products do not share a meaningful family or compatibility rule, a simple factory or dependency injection is clearer.

### Leaking concrete types

Returning provider SDK types from the abstract factory spreads infrastructure concerns through the application. Define contracts in application language.

### One giant factory

A factory with dozens of unrelated products becomes a service locator. Split families by bounded context or capability.

### Hidden business policy

Choosing an implementation is infrastructure configuration. Eligibility, authorization, and state transitions belong in domain or application services.

### Ignoring the interface evolution cost

Adding a product changes every factory. Keep the product set cohesive and consider smaller factories when extension frequency is high.

### Creating resources without ownership

Document whether products are shared, scoped, or disposable. Ambiguous lifecycle behavior causes connection leaks and accidental shutdowns.

## A practical checklist

Before introducing Abstract Factory, ask:

- Which products form a genuinely compatible family?
- What incompatibility or portability problem does the family boundary prevent?
- Does the application need several products from the same family?
- Should the factory be selected once at composition time or per tenant/request?
- Who owns clients, connections, and cleanup?
- Will new families be added more often than new product types?
- Would smaller capability factories or direct dependency injection be simpler?
- Can every family be tested against the same application-facing contracts?

## Final thoughts

Abstract Factory protects an application from mixing incompatible implementations. It is most valuable when several products vary together—platform widgets, provider integrations, persistence adapters, or environment-specific services.

Keep the factory focused on family creation and lifecycle, keep contracts free of vendor types, and select the family at a visible composition boundary. When the family is small or the products evolve independently, prefer the simpler factory or direct dependency injection.
