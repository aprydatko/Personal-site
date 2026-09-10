---
title: "Core Patterns: Facade"
description: A practical guide to the Facade pattern, how it simplifies complex subsystems, and how to design a focused API without hiding important behavior.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Facade pattern provides a simpler interface over a complex subsystem.

A facade coordinates several objects, APIs, or steps behind a small set of operations that match what a caller actually wants to accomplish. The caller does not need to know which services are involved, in what order they run, or how their individual interfaces fit together.

The facade does not necessarily replace the subsystem. It gives common workflows a clear entry point while leaving lower-level capabilities available when specialized callers need them.

## The problem a Facade solves

Without a facade, a checkout page may need to coordinate inventory, pricing, payment, order storage, and notifications directly:

```ts
const stock = await inventory.reserve(input.items);
const price = await pricing.calculate({ items: input.items });
const payment = await payments.charge({
  customerId: input.customerId,
  amount: price.total,
});

const order = await orders.create({
  customerId: input.customerId,
  items: input.items,
  paymentId: payment.id,
});

await notifications.sendConfirmation(order);
```

This code may be correct, but every caller now needs to understand the subsystem's objects, ordering, error behavior, and data transformations. Another entry point—such as a mobile API or an admin workflow—may duplicate the same coordination with small differences.

A facade gives the workflow a named home:

```ts
export const createCheckoutFacade = (dependencies: CheckoutDependencies) => ({
  async placeOrder(input: PlaceOrderInput) {
    const stock = await dependencies.inventory.reserve(input.items);
    const price = await dependencies.pricing.calculate({ items: input.items });
    const payment = await dependencies.payments.charge({
      customerId: input.customerId,
      amount: price.total,
    });

    const order = await dependencies.orders.create({
      customerId: input.customerId,
      items: input.items,
      paymentId: payment.id,
      reservationId: stock.id,
    });

    await dependencies.notifications.sendConfirmation(order);
    return order;
  },
});
```

The caller can now say what it wants—`checkout.placeOrder(input)`—without coordinating every subsystem itself.

## A facade is about a useful level of abstraction

A facade should speak the language of its caller. `placeOrder` is more useful to a checkout feature than `reserveInventory`, `calculatePrice`, and `createPaymentIntent` exposed as unrelated implementation steps.

Good facade operations often represent:

- A complete user or business workflow.
- A feature-level capability.
- A stable integration boundary.
- A common sequence across multiple services.

The facade should not merely rename every method underneath. If its API exposes all the same low-level objects and steps, it has not reduced the caller's knowledge very much.

## Facades and use cases

An application use case is often a facade over domain objects and infrastructure services. It can coordinate a workflow while keeping business rules in the appropriate domain modules.

```ts
type RegisterUserDependencies = {
  users: UserRepository;
  passwords: PasswordHasher;
  welcomeEmail: EmailSender;
};

export const createRegisterUser = ({
  users,
  passwords,
  welcomeEmail,
}: RegisterUserDependencies) => async (input: RegisterUserInput) => {
  const passwordHash = await passwords.hash(input.password);
  const user = await users.create({
    email: input.email,
    passwordHash,
  });

  await welcomeEmail.send({
    to: user.email,
    subject: 'Welcome',
    text: 'Your account is ready.',
  });

  return user;
};
```

This function is a facade for the registration workflow. It does not need to own password hashing internals, database details, or email-provider payloads. Those concerns remain behind their own contracts.

The facade coordinates. It should not become a place where every lower-level rule is copied.

## Facades in frontend applications

Frontend features often need to combine data loading, transformations, mutations, and UI state. A feature facade can provide a compact interface to the component layer.

```ts
type ProductPageFacade = {
  load(): Promise<ProductPageModel>;
  addToCart(productId: string): Promise<void>;
};

export const createProductPageFacade = ({
  products,
  cart,
  formatPrice,
}: ProductPageDependencies): ProductPageFacade => ({
  async load() {
    const result = await products.list();

    return {
      products: result.map((product) => ({
        id: product.id,
        name: product.name,
        priceLabel: formatPrice(product.price),
      })),
    };
  },

  addToCart(productId) {
    return cart.add(productId, 1);
  },
});
```

The page component receives a view-ready model and a small set of actions. It does not need to know which API client loads products or how the cart persists them.

This can be preferable to passing a large collection of repositories and clients through a component tree. Keep the facade feature-specific so its API remains meaningful.

## Facades for external SDKs

A third-party SDK may expose many capabilities that an application does not want to spread throughout its codebase. A facade can provide an application-specific subset:

```ts
type Maps = {
  geocode(address: string): Promise<Coordinates | null>;
  getRoute(from: Coordinates, to: Coordinates): Promise<RouteSummary>;
};

export const createMapsFacade = (
  provider: MapsProvider,
): Maps => ({
  async geocode(address) {
    const response = await provider.search({ query: address });
    const match = response.results[0];

    return match
      ? { latitude: match.lat, longitude: match.lng }
      : null;
  },

  async getRoute(from, to) {
    const response = await provider.routes.create({
      origin: [from.latitude, from.longitude],
      destination: [to.latitude, to.longitude],
    });

    return {
      distanceMeters: response.distance,
      durationSeconds: response.duration,
    };
  },
});
```

This example is also related to the [Adapter pattern](/blog/adapter), because it translates provider data. The emphasis is different: the facade presents a smaller, easier-to-use subsystem API, while an adapter primarily makes one incompatible contract fit another.

## Facade versus direct access

A facade should not prevent every caller from using the subsystem directly. Some callers genuinely need specialized capabilities that the facade does not expose.

For example, a payments package might offer:

```ts
const checkout = createCheckoutFacade({ payments, orders, inventory });
await checkout.placeOrder(input);

// Specialized administration flow can use the lower-level capability.
await payments.refund({ paymentId, amount });
```

The facade is valuable when it is the default path for common workflows. It becomes harmful if it grows until it must model every possible operation or if lower-level behavior is forced through an unnatural API.

## Error and transaction boundaries

Because a facade coordinates steps, it must make failure behavior clear. If inventory is reserved and payment then fails, should the reservation be released? If the notification fails after the order is saved, should the checkout be considered unsuccessful?

```ts
const reservation = await inventory.reserve(input.items);

try {
  const payment = await payments.charge(input.payment);
  return await orders.create({
    ...input,
    paymentId: payment.id,
    reservationId: reservation.id,
  });
} catch (error) {
  await inventory.release(reservation.id);
  throw error;
}
```

The facade is a good place to coordinate compensation when the workflow owns that responsibility. It should not pretend that several remote operations form one atomic transaction unless the underlying system provides that guarantee.

For longer workflows, use explicit state transitions, idempotency keys, retries, or a durable process manager as needed. A facade should make these policies visible rather than hiding unreliable coordination behind one pleasant method name.

## Facade and dependency injection

A facade can hide subsystem complexity from callers without hiding its own dependencies from the codebase:

```ts
type SearchFacadeDependencies = {
  catalog: Catalog;
  inventory: Inventory;
  ranking: RankingStrategy;
};
```

Injecting dependencies into the facade keeps construction at the application boundary and makes tests focused:

```ts
const search = createSearchFacade({
  catalog: fakeCatalog,
  inventory: fakeInventory,
  ranking: alphabeticalRanking,
});
```

The facade simplifies the caller's interface; it should not turn dependencies into hidden globals. This is [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection) applied to a coordinating boundary.

## Common mistakes

### The god facade

A facade that exposes authentication, billing, reporting, notifications, and user administration is not a focused boundary. Split it by feature or workflow so each facade has a coherent purpose.

### Leaking lower-level types

If a “simple” facade returns provider SDK responses, callers still depend on the subsystem. Map the result to an application-facing type when the provider model is not part of the intended contract.

### Hiding important side effects

A method named `saveDraft` should not silently publish a public event, send an email, and charge a payment. Facades can coordinate multiple steps, but their names and documentation should make meaningful side effects discoverable.

### Duplicating domain rules

Keep domain invariants in domain objects or domain modules. A facade can call those rules and coordinate the result, but copying them into several facades leads to drift.

### Making every class a facade

A class with one small responsibility is not automatically a facade. Use the pattern when the public API intentionally simplifies a group of collaborators or subsystem operations.

## Facade versus related patterns

| Pattern | Main question it answers |
| --- | --- |
| Facade | How can callers use this subsystem through a simpler API? |
| Adapter | How can one incompatible interface fit another? |
| Decorator | How can behavior be added while preserving the same interface? |
| Mediator | How can related objects communicate through a central coordinator? |
| Service layer | Which application workflow coordinates domain and infrastructure operations? |
| Gateway | How can access to an external system be represented behind an application contract? |

The names can overlap in real code. Focus on the intent: a facade simplifies a subsystem, an adapter translates contracts, and a decorator preserves a contract while adding behavior.

## A practical checklist

When designing a facade, ask:

- Which callers currently need to know too many subsystem details?
- What complete capability or workflow do they actually need?
- Is the facade API expressed in caller language?
- Which dependencies and side effects should remain explicit?
- Are lower-level rules kept in their proper modules?
- Does the facade have one cohesive purpose?
- Is failure, compensation, and transaction behavior clear?
- Should specialized callers still access lower-level APIs directly?

Start with one repeated workflow. Extract a facade when it removes duplicated coordination or creates a useful feature boundary, not merely because several objects exist.

## How Facade connects to other design ideas

Facades are often implemented as feature [Modules](/blog/module) with a small public API and private coordination details.

They use [Composition: Build Behavior by Combining Small Parts](/blog/composition) to assemble repositories, strategies, adapters, and domain services into a caller-friendly workflow.

The [Adapter pattern](/blog/adapter) may sit inside a facade to translate an external SDK, while the [Factory pattern](/blog/factory) can create the facade with its concrete dependencies.

Good facades also improve [Cohesion and Coupling: The Shape of Maintainable Software](/blog/cohesion-coupling): the caller has fewer dependencies, while the facade owns a cohesive piece of coordination.

## Final thoughts

The Facade pattern gives a complex subsystem a useful front door. It lets callers work at the level of a feature or workflow instead of knowing every collaborator and setup step underneath.

Keep the facade focused, keep dependencies explicit, and make important side effects and failure behavior visible. A good facade reduces knowledge without reducing clarity.
