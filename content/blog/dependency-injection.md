---
title: "Dependency Injection: Make Dependencies Explicit"
description: A practical guide to Dependency Injection, how it reduces coupling, and how to use it without turning simple code into a framework.
date: "2026-09-09"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

Dependency Injection (DI) is the practice of giving an object or function the dependencies it needs instead of having it create those dependencies itself.

The idea is simple: a piece of application logic should describe what it needs, while another part of the application decides which concrete implementations to provide.

That separation makes dependencies visible, reduces coupling, and makes code easier to test. It also works without a DI framework. Passing a value into a function or a collaborator into a constructor is already dependency injection.

## What is a dependency?

A dependency is anything a piece of code relies on to do its work.

Examples include:

- A repository used to load or save data.
- A clock used to determine the current time.
- A payment gateway used to charge a customer.
- A logger used to record events.
- A random-number generator used to create an identifier.
- A browser API used by a frontend component.

Some dependencies are stable and harmless, such as a pure formatting function. Others are volatile or difficult to control, such as a network client, database connection, or system clock. DI is especially valuable around those boundaries.

## The problem with constructing dependencies internally

Consider an order service that creates its own payment client:

```ts
export class OrderService {
  async placeOrder(input: PlaceOrderInput) {
    const paymentGateway = new StripePaymentGateway(process.env.STRIPE_KEY);
    const order = orderRules.create(input);

    await paymentGateway.charge({
      amount: order.total,
      currency: order.currency,
    });

    return orderRepository.save(order);
  }
}
```

The service now knows that Stripe is the payment provider, how Stripe is configured, and how the repository is obtained. A unit test cannot easily run the order rules without also dealing with configuration and a real or heavily mocked integration.

The service is doing two jobs:

1. Implementing the order workflow.
2. Choosing and constructing its infrastructure.

DI moves the second job to the application boundary.

## Constructor injection

The most common form of DI is constructor injection:

```ts
interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

interface OrderRepository {
  save(order: Order): Promise<Order>;
}

export class OrderService {
  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly orderRepository: OrderRepository,
  ) {}

  async placeOrder(input: PlaceOrderInput) {
    const order = orderRules.create(input);

    await this.paymentGateway.charge({
      amount: order.total,
      currency: order.currency,
    });

    return this.orderRepository.save(order);
  }
}
```

`OrderService` depends on capabilities, not vendor-specific details. The composition root can provide the production implementations:

```ts
const orderService = new OrderService(
  new StripePaymentGateway(stripeClient),
  new PostgresOrderRepository(database),
);
```

The service does not need to change if the application switches to another payment provider or repository implementation.

## Function injection

Classes are not required. A function can receive dependencies directly:

```ts
type CreateGreetingDependencies = {
  clock: () => Date;
  greetingRepository: GreetingRepository;
};

export const createGreeting = ({
  clock,
  greetingRepository,
}: CreateGreetingDependencies) => async (userId: string) => {
  const greeting = {
    userId,
    createdAt: clock(),
    message: 'Welcome back',
  };

  return greetingRepository.save(greeting);
};
```

The clock is injected because time is an external input. Tests can provide a fixed value instead of waiting for the real system clock.

```ts
const fixedClock = () => new Date('2026-01-01T00:00:00.000Z');
```

This often keeps small use cases simpler than introducing a class solely to hold dependencies.

## Dependency Injection and testing

DI does not mean mocking everything. It means making important boundaries replaceable.

A test can provide a small fake implementation:

```ts
const payments: ChargeInput[] = [];

const fakePaymentGateway: PaymentGateway = {
  charge: async (input) => {
    payments.push(input);
    return { id: 'charge-1', status: 'succeeded' };
  },
};

const fakeOrderRepository: OrderRepository = {
  save: async (order) => order,
};

const service = new OrderService(
  fakePaymentGateway,
  fakeOrderRepository,
);
```

The test can now verify the order workflow without making a network request. A fake is often clearer than a large mock because it models the small behavior the use case actually needs.

## Dependency Injection on the frontend

Frontend code can use DI at the feature boundary too. A data-fetching function can be passed into a hook, or a component can receive an action as a prop:

```tsx
type SaveProfile = (profile: ProfileInput) => Promise<void>;

type ProfileFormProps = {
  saveProfile: SaveProfile;
};

export const ProfileForm = ({ saveProfile }: ProfileFormProps) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveProfile(readProfileForm(event.currentTarget));
  };

  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
};
```

The form owns input presentation and submission behavior. It does not need to know whether saving means calling REST, GraphQL, a server action, or an in-memory store. The page or feature container injects that decision.

This is one reason presentational components are often easier to reuse: their dependencies are supplied through props rather than hidden in global clients.

## The composition root

The composition root is the place where an application assembles its concrete dependencies. It is often an entry point, route setup, server bootstrap, or feature container.

```text
Composition root
    ├── StripePaymentGateway
    ├── PostgresOrderRepository
    └── OrderService
```

Keeping construction near the boundary prevents infrastructure decisions from leaking into domain logic. It also gives the application one clear place to configure lifetimes, credentials, and implementations.

DI containers can automate this wiring, but they do not replace good design. A container is useful when an application has many shared dependencies or complex lifetimes. For a small application, explicit construction is usually easier to read and debug.

## Common mistakes

### Injecting everything

Not every value deserves an interface. Inject a dependency when it crosses a meaningful boundary, varies by environment, is difficult to test, or has a reason to be replaced. Keep stable pure logic direct.

### Using service locators

A service locator hides dependencies behind a global lookup:

```ts
const gateway = container.get('PaymentGateway');
```

This may look convenient, but the function's requirements are no longer visible in its signature. Constructor and parameter injection make dependencies easier to discover and validate.

### Interfaces that mirror vendors

An abstraction should describe what the application needs, not reproduce an external SDK. `PaymentGateway.charge()` is a useful application port; an interface with every Stripe option simply moves the coupling behind another name.

### Depending on abstractions that are too broad

A large `ApplicationServices` object passed everywhere is hidden coupling. Prefer narrow dependency objects or focused parameters so each module receives only what it uses.

## A practical checklist

When reviewing a dependency, ask:

- Is this dependency created inside the business logic?
- Does the caller need to know its concrete implementation?
- Would a test benefit from replacing it with a fake or deterministic value?
- Is the contract expressed in application language rather than vendor language?
- Is the dependency narrow enough for this particular use case?
- Is construction happening at the application boundary?

If the answers reveal unnecessary coupling, start with the smallest change: pass the dependency as a parameter, introduce a focused interface, or move construction outward. Avoid adding a container until explicit wiring is genuinely difficult to manage.

## How DI connects to other design ideas

Dependency Injection is a practical way to apply the [Dependency Inversion Principle: Depend on Abstractions](/blog/dependency-inversion-principle). High-level policy can depend on a contract while infrastructure supplies the implementation.

It also supports [Composition: Build Behavior by Combining Small Parts](/blog/composition). The composition root combines focused collaborators into a working feature.

Clear injection boundaries improve [Cohesion and Coupling: The Shape of Maintainable Software](/blog/cohesion-coupling) by keeping modules focused and making their external relationships explicit.

## Final thoughts

Dependency Injection is less about frameworks and more about ownership. Business logic should own the rules of the application; the outer layers should own the details of databases, APIs, libraries, and configuration.

Make dependencies visible, keep contracts small, and assemble concrete implementations at the boundary. The result is code that is easier to test today and easier to change tomorrow.
