---
title: "Core Patterns: Factory"
description: A practical guide to the Factory pattern, how it centralizes object creation, and when it improves flexibility without adding unnecessary abstraction.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Factory pattern moves object creation behind a function or module with a clear purpose.

Instead of making every caller know which concrete class to instantiate, which configuration it needs, or which setup steps must happen first, a factory owns that decision. Callers ask for the capability they need and receive a correctly configured object.

Factories are useful when creation involves branching, validation, defaults, dependencies, or lifecycle rules. They are less useful when they only wrap a constructor without adding a meaningful boundary.

## The problem factories solve

Direct construction is often perfectly clear:

```ts
const emailSender = new SmtpEmailSender({
  host: process.env.SMTP_HOST,
  port: 587,
});
```

The problem appears when many callers need to know the same construction details. Configuration can become duplicated, different callers can create inconsistent instances, and application code becomes coupled to a concrete implementation.

A factory centralizes the decision:

```ts
export const createEmailSender = (config: EmailConfig): EmailSender => {
  if (config.provider === 'smtp') {
    return new SmtpEmailSender(config);
  }

  if (config.provider === 'console') {
    return new ConsoleEmailSender();
  }

  throw new Error(`Unsupported email provider: ${config.provider}`);
};
```

The caller depends on `EmailSender`, not on the provider-specific classes or their setup rules.

## A factory is a creation boundary

A good factory has a clear responsibility: decide how a thing is created and return a usable instance.

It may handle:

- Selecting an implementation.
- Applying defaults.
- Validating configuration.
- Constructing dependent objects.
- Registering lifecycle or cleanup behavior.
- Returning a safe test or development implementation.

It should not quietly become the place where unrelated business behavior happens. A factory creates an object; the object or a separate service should perform the work that object represents.

## Simple factory functions

In TypeScript, a factory function is often enough. It does not need a class called `Factory` or a framework container.

```ts
type Logger = {
  info(message: string): void;
  error(message: string, error?: unknown): void;
};

type LoggerOptions = {
  environment: 'development' | 'production';
};

export const createLogger = ({ environment }: LoggerOptions): Logger => {
  if (environment === 'development') {
    return {
      info: console.log,
      error: console.error,
    };
  }

  return new JsonLogger();
};
```

The rest of the application can use the small `Logger` contract. It does not need to branch on the environment every time it writes a message.

## Factories with shared dependencies

A factory can assemble an object from the dependencies it needs. This makes construction explicit while keeping the result convenient to use.

```ts
type CreateOrderServiceDependencies = {
  repository: OrderRepository;
  clock: () => Date;
  idGenerator: () => string;
};

export const createOrderService = ({
  repository,
  clock,
  idGenerator,
}: CreateOrderServiceDependencies): OrderService => ({
  async create(input) {
    const order = {
      id: idGenerator(),
      customerId: input.customerId,
      createdAt: clock(),
      lines: input.lines,
    };

    await repository.save(order);
    return order;
  },
});
```

The factory receives volatile details such as time, identifiers, and persistence. The service stays easy to test because tests can provide deterministic dependencies.

This is closely related to [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection): the factory is one place where dependencies are assembled, while the created service receives what it needs through its boundary.

## Choosing between implementations

The most recognizable use of a factory is selecting one implementation from several compatible options.

```ts
type PaymentGateway = {
  charge(input: ChargeInput): Promise<ChargeResult>;
};

type PaymentConfig =
  | { provider: 'stripe'; client: StripeClient }
  | { provider: 'adyen'; client: AdyenClient };

export const createPaymentGateway = (
  config: PaymentConfig,
): PaymentGateway => {
  switch (config.provider) {
    case 'stripe':
      return new StripePaymentGateway(config.client);
    case 'adyen':
      return new AdyenPaymentGateway(config.client);
  }
};
```

The discriminated union makes unsupported configuration harder to represent. Adding a provider requires changing the factory, which gives the compiler and code review a visible place to catch the new case.

The rest of the application can remain unchanged as long as each gateway honors the same contract.

## Factories and domain objects

Factories are especially useful when creating a valid domain object requires more than assigning fields.

```ts
type UserProps = {
  id: string;
  email: string;
  createdAt: Date;
};

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: { id: string; email: string; now: Date }) {
    const email = input.email.trim().toLowerCase();

    if (!email.includes('@')) {
      throw new Error('A valid email is required');
    }

    return new User({
      id: input.id,
      email,
      createdAt: input.now,
    });
  }

  getEmail() {
    return this.props.email;
  }
}
```

Here `User.create` is a factory method. The constructor is private, so callers cannot bypass the validation and create an invalid `User` directly.

This is different from a factory that selects between implementations. Both centralize creation, but a domain factory primarily protects invariants, while an implementation factory primarily hides a construction choice.

## Factories in frontend applications

Frontend code can use factories to create feature configuration, view models, adapters, or testable clients.

```ts
type ProductCardModel = {
  title: string;
  priceLabel: string;
  imageAlt: string;
};

export const createProductCardModel = (
  product: Product,
  formatPrice: (amount: number) => string,
): ProductCardModel => ({
  title: product.name,
  priceLabel: formatPrice(product.price),
  imageAlt: `${product.name} product image`,
});
```

The component can receive a ready-to-render model instead of repeating formatting and fallback rules. The factory keeps presentation preparation close to the feature while leaving the component focused on rendering.

Factories can also create API clients for different environments:

```ts
export const createApiClient = (baseUrl: string): ApiClient => {
  const request = async <T>(path: string, options?: RequestInit) => {
    const response = await fetch(`${baseUrl}${path}`, options);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<T>;
  };

  return { request };
};
```

The client owns the repeated request behavior, while callers provide endpoint-specific paths and types.

## Common mistakes

### A factory that only renames `new`

If a function only returns `new ReportFormatter(options)` and there is no decision, validation, or lifecycle benefit, it may be unnecessary indirection. Use a factory when it creates a useful boundary.

### A factory with too many responsibilities

A factory that reads environment variables, creates half the application, performs database migrations, and starts background jobs is difficult to understand and test. Split creation into focused factories and keep application startup orchestration at the composition root.

### Returning incompatible objects

An implementation factory should return objects that genuinely honor the same contract. If callers need provider-specific conditionals after creation, the abstraction may be too weak or the implementations may not belong behind one factory.

### Hidden global state

A factory that silently returns a singleton can create surprising shared state. Make lifetime explicit in the name or API, such as `createClient` for a new instance and `getSharedClient` for a deliberate singleton.

### Configuration that is impossible to validate

Avoid accepting a vague `Record<string, unknown>` when the factory has meaningful configuration rules. Use a typed options object or a discriminated union so invalid combinations are visible early.

## Factory versus related patterns

These patterns overlap, but they solve different problems:

| Pattern | Main question it answers |
| --- | --- |
| Factory function | How should this object be created? |
| Factory method | How can this type create a valid instance? |
| Abstract Factory | How can related objects be created as a compatible family? |
| Builder | How can a complex object be assembled step by step? |
| Dependency Injection | Who supplies the dependencies? |
| Service locator | Where can dependencies be looked up? |

You do not need to use the most formal name for every creation helper. Choose the smallest pattern that makes the creation decision clear.

## A practical checklist

When deciding whether to introduce a factory, ask:

- Are construction details duplicated across callers?
- Does creation involve choosing among implementations?
- Are defaults, validation, or setup rules easy to bypass?
- Should callers depend on a capability rather than a concrete class?
- Does the created object need explicit dependencies or lifetime?
- Will the factory make tests or environment-specific setup simpler?
- Is the factory still focused on creation rather than application behavior?

If construction is simple and stable, direct construction is often the clearest choice. If creation is a meaningful decision or boundary, give that decision a named home.

## How the Factory pattern connects to other design ideas

A factory often acts as the [Composition](/blog/composition) point where concrete pieces are assembled into a usable feature.

It supports the [Dependency Inversion Principle: Depend on Abstractions](/blog/dependency-inversion-principle) by returning an abstraction while hiding concrete implementations behind a creation boundary.

Factories also work naturally with the [Module pattern](/blog/module). A module can expose a small `create...` function while keeping configuration, helper functions, and implementation details private.

When a factory creates a domain object only after validating its rules, it helps apply the [Single Responsibility Principle: One Reason to Change](/blog/single-responsibility-principle): object creation and validity rules stay together instead of being scattered across callers.

## Final thoughts

The Factory pattern is about giving object creation an owner. Centralize decisions that would otherwise be duplicated, protect invariants that callers should not bypass, and return stable capabilities instead of leaking concrete implementation details.

Keep the factory small and honest. When creation is straightforward, a constructor is enough. When creation carries meaningful policy, a focused factory can make the rest of the system easier to read, test, and change.
