---
title: "Core Patterns: Singleton"
description: A practical guide to the Singleton pattern, its legitimate uses, its risks, and how to make shared application state explicit and testable.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Singleton pattern guarantees that a particular resource has one shared instance within a defined scope.

That sounds simple, but “one instance” is only meaningful when the scope is clear. One instance per process, server runtime, browser tab, request, test, or application may all mean different things.

Singletons are useful for resources that are intentionally shared, such as a connection pool, metrics registry, or cache. They are risky when used as a shortcut for passing dependencies. A singleton can hide ownership, make tests influence one another, and turn an ordinary dependency into global state.

## What makes something a Singleton?

A Singleton has two properties:

- Creation is controlled so a second instance is not created unnecessarily.
- Consumers access the shared instance through a stable entry point.

The simplest JavaScript version is a module-level instance:

```ts
class Metrics {
  private counters = new Map<string, number>();

  increment(name: string) {
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }

  get(name: string) {
    return this.counters.get(name) ?? 0;
  }
}

export const metrics = new Metrics();
```

ES modules are evaluated once per module scope, so every importer receives the same exported `metrics` object within that runtime. No special `getInstance()` method is required.

## Singleton is about scope, not a magic class

The classic implementation uses a private constructor and a static accessor:

```ts
export class Configuration {
  private static instance: Configuration | undefined;

  private constructor(readonly apiUrl: string) {}

  static getInstance() {
    return (Configuration.instance ??= new Configuration(
      process.env.API_URL ?? 'http://localhost:3000',
    ));
  }
}
```

This works, but it is often more ceremony than a module export. More importantly, the class does not make the runtime scope obvious. In a server application, separate processes or serverless invocations may each have their own instance. In development, hot reload can recreate modules. In a test runner, module isolation may differ from production.

Before using a Singleton, describe the required scope in plain language: “one client per process” or “one cache per application instance.” That definition is more important than the implementation technique.

## Good uses for shared instances

A Singleton can be appropriate when duplicate instances would waste resources or break coordination, and when sharing is part of the resource's design.

Examples include:

- A database connection pool per application process.
- A metrics or tracing registry.
- A client whose connection management is designed to be shared.
- An in-memory cache with intentionally shared application state.
- A feature-flag client initialized once at the application boundary.

```ts
let client: ApiClient | undefined;

export const getApiClient = (): ApiClient => {
  return (client ??= createApiClient({
    baseUrl: process.env.API_URL ?? '',
  }));
};
```

The lazy accessor avoids creating the client until it is needed. This can be useful when initialization is expensive or when the environment is not available during module evaluation.

The accessor should still have a clear contract. If the client needs cleanup, configuration changes, or different credentials for different callers, a shared singleton may be the wrong abstraction.

## The cost of hidden global state

Consider a service that reaches into a singleton directly:

```ts
export const createOrderService = () => ({
  async placeOrder(input: PlaceOrderInput) {
    await globalPaymentGateway.charge(input);
    return orderRepository.save(input);
  },
});
```

The service's dependencies are invisible in its factory. A reader must inspect the implementation to discover them, and a test must mutate or replace global objects to control behavior.

That creates several problems:

- Tests can leak state into one another.
- Parallel tests can interfere with each other.
- Configuration becomes dependent on initialization order.
- A function looks reusable but depends on ambient process state.
- It becomes difficult to run two differently configured instances together.

The alternative is to keep sharing at the application boundary and inject the result:

```ts
const paymentGateway = getPaymentGateway();
const orderRepository = createOrderRepository(database);

const orderService = createOrderService({
  paymentGateway,
  orderRepository,
});
```

The gateway may still be a shared instance. The important difference is that the service's dependency is explicit.

This is the key distinction: a shared resource is not automatically a hidden dependency. Sharing can be safe when the resource is created at the boundary and passed into the code that uses it.

## Singleton and testing

Singletons with mutable state require deliberate test isolation.

```ts
export const createMemoryCache = () => {
  const values = new Map<string, unknown>();

  return {
    get<T>(key: string) {
      return values.get(key) as T | undefined;
    },
    set(key: string, value: unknown) {
      values.set(key, value);
    },
    clear() {
      values.clear();
    },
  };
};
```

Instead of exporting one mutable cache for every test, create a cache per test and inject it into the code under test. Production can still create one cache at the application boundary if that is the intended lifetime.

If a truly shared singleton must be tested, give it an explicit reset or lifecycle method and call it in test setup. Avoid reaching into private fields or replacing module internals with test-only hacks.

The easiest singleton to test is often the one that is not global to the business logic. Keep the shared instance near the composition root; keep domain and application modules parameterized.

## Singletons in frontend applications

Browsers already have many shared platform resources: `window`, `document`, storage, and service workers. Adding application-level singletons can be useful, but it should not be the default state-management strategy.

For example, a browser API adapter can be created once and reused:

```ts
export const browserStorage: StoragePort = {
  get(key) {
    return window.localStorage.getItem(key);
  },
  set(key, value) {
    window.localStorage.setItem(key, value);
  },
};
```

This adapter has no mutable application state of its own; it simply gives the platform API a small application-facing contract. That is safer than a singleton store that owns unrelated user, cart, modal, and notification state in one global object.

For React applications, context or a feature provider can make lifetime and ownership more visible:

```tsx
const AnalyticsContext = createContext<Analytics | null>(null);

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const analytics = useMemo(() => createAnalytics(), []);

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}
```

The provider controls the instance lifetime, while components receive it through an explicit feature boundary. This allows separate providers in tests, previews, or embedded parts of an application.

## Server-side concerns

Server environments make singleton scope especially important. A module-level value may be shared across requests handled by the same process. That is appropriate for a connection pool, but dangerous for user-specific data.

Never put request-specific or user-specific state into a process-wide singleton unless it is intentionally partitioned and secured. A request context, session, cart, or authorization decision generally belongs to the request or user scope.

```ts
// Safe shape: the request owns its context.
export const createRequestContext = (requestId: string) => ({
  requestId,
  startedAt: new Date(),
});
```

In server-rendered applications, also consider whether a module can be imported in both server and client environments. A singleton that touches browser APIs during server initialization can fail before a component ever renders.

## Common mistakes

### Using a Singleton to avoid dependency injection

If every service imports a global database, logger, or clock directly, the code may be convenient at first but difficult to control. Create the shared resource once, then pass it into the modules that need it.

### Treating all state as application-wide

Shared state is not automatically better state. Keep state at the narrowest useful scope: local component, feature, request, session, or application.

### Assuming one instance across all environments

One module instance per process is not one instance across a cluster, browser tabs, workers, or serverless invocations. If global coordination is required, use an external system such as a database, queue, or distributed cache.

### Making initialization order implicit

A singleton that must be configured before use can fail depending on which module imports it first. Prefer a factory that receives configuration, or an explicit initialization step at the application boundary.

### Returning mutable internals

A singleton with public mutable fields lets every caller change shared state without rules. Expose focused operations or read-only views, just as you would for any [Module pattern](/blog/module).

## Singleton versus related patterns

| Pattern | Main question it answers |
| --- | --- |
| Singleton | Should this resource be shared within a defined scope? |
| Module | Which implementation details should remain private? |
| Factory | How should an instance be created? |
| Dependency Injection | Who supplies this dependency? |
| Repository or cache | What responsibility does the shared resource provide? |

These patterns can be combined. A factory can create one configured client, a module can hide its construction, and dependency injection can pass the resulting client to application services. The combination is often safer than making every service look up a Singleton independently.

## A practical checklist

Before introducing a Singleton, ask:

- What exact scope should the single instance have?
- Would duplicate instances actually be harmful or wasteful?
- Is the resource safe to share across requests, users, or tests?
- Does it contain mutable state?
- Can it be created at the application boundary and injected instead?
- How will it be configured, reset, and disposed of?
- Does the runtime environment support the lifetime I am assuming?
- Would a factory or ordinary module be simpler?

If the main reason is “I do not want to pass this dependency around,” that is usually a sign to use [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection) instead.

## How Singleton connects to other design ideas

Singletons are a specialized form of shared module state. The [Module pattern](/blog/module) can provide the private state and public API, while the Singleton decision determines how many instances exist.

The [Factory pattern](/blog/factory) can control creation and make the singleton's lifetime explicit. A `getSharedClient` function communicates a different contract from a general `createClient` function.

Singletons are safest when assembled at a [Composition](/blog/composition) boundary and passed to consumers through [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection). That keeps sharing intentional without making every module depend on global state.

## Final thoughts

The Singleton pattern is not a license to make every useful object global. It is a lifetime and sharing decision that should be made deliberately.

Use a Singleton for resources that are genuinely safe and valuable to share within a defined scope. Keep user and request state local, make configuration explicit, and prefer injecting shared resources into the code that uses them.

The best Singleton is one whose scope, ownership, lifecycle, and testing strategy are all easy to explain.
