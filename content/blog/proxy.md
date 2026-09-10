---
title: "Core Patterns: Proxy"
description: A practical guide to the Proxy pattern, how it controls access to another object, and when lazy loading, caching, protection, or JavaScript Proxy objects are useful.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Proxy pattern provides a stand-in for another object and controls access to the underlying implementation.

The proxy usually preserves the same interface as the real object, so callers can use it without knowing whether they are talking to the original or the stand-in. The proxy can delay creation, check permissions, cache results, limit access, add observability, or represent a remote resource.

The key idea is controlled access. A proxy is not primarily about changing one interface into another; it decides how and when an existing interface can be used.

## The basic shape

Start with a shared contract:

```ts
type Image = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

type ImageLoader = {
  load(path: string): Promise<Image>;
};
```

The real loader reads from storage:

```ts
const imageLoader: ImageLoader = {
  async load(path) {
    return readLargeImageFromDisk(path);
  },
};
```

A lazy proxy can defer the expensive work until a caller actually asks for an image:

```ts
const withCache = (loader: ImageLoader): ImageLoader => {
  const images = new Map<string, Promise<Image>>();

  return {
    load(path) {
      const existing = images.get(path);
      if (existing) return existing;

      const loading = loader.load(path);
      images.set(path, loading);
      return loading;
    },
  };
};
```

The proxy has the same `ImageLoader` interface. The caller does not need to know whether caching is enabled.

## Common kinds of Proxy

The pattern appears in several forms:

- A virtual proxy delays expensive object creation.
- A protection proxy checks permissions before access.
- A caching proxy reuses previous results.
- A remote proxy represents an object in another process or service.
- A smart reference tracks usage, lifetime, or resource cleanup.
- A logging proxy observes calls without changing the core implementation.

These forms share a structure but not always the same tradeoffs. A lazy proxy changes timing, a cache changes consistency, and a protection proxy changes authorization behavior. Name and document the behavior that matters.

## Virtual proxies and lazy loading

A virtual proxy is useful when the real object is expensive to construct or load.

```ts
type Report = {
  export(format: 'csv' | 'pdf'): Promise<Uint8Array>;
};

const createLazyReport = (
  loadReport: () => Promise<Report>,
): Report => {
  let report: Promise<Report> | undefined;

  const getReport = () => (report ??= loadReport());

  return {
    export(format) {
      return getReport().then((loaded) => loaded.export(format));
    },
  };
};
```

The report is not loaded during construction. The promise is cached so concurrent calls share the same initialization rather than starting multiple loads.

Lazy loading is not automatically faster. It moves cost from startup to first use and may make the first operation slower. Use it when many resources are optional or expensive and the delayed work fits the user experience.

## Caching proxies

A caching proxy stores results from the real subject:

```ts
type ProductCatalog = {
  findById(id: string): Promise<Product | null>;
};

const withProductCache = (
  catalog: ProductCatalog,
): ProductCatalog => {
  const cache = new Map<string, Promise<Product | null>>();

  return {
    findById(id) {
      const cached = cache.get(id);
      if (cached) return cached;

      const result = catalog.findById(id);
      cache.set(id, result);
      return result;
    },
  };
};
```

Before using a cache proxy, define:

- How long entries remain valid.
- How updates invalidate entries.
- Whether `null` results are cached.
- What happens when the underlying request fails.
- Whether cached data may be stale.
- Whether cache keys include tenant or permission context.

Caching is a behavior change, not a transparent implementation detail. A proxy should not return protected or user-specific data from an incorrectly shared cache.

## Protection proxies

A protection proxy checks whether a caller may use the real object:

```ts
type DocumentStore = {
  read(documentId: string, userId: string): Promise<Document>;
  delete(documentId: string, userId: string): Promise<void>;
};

const withReadOnlyAccess = (
  store: DocumentStore,
  permissions: PermissionChecker,
): DocumentStore => ({
  async read(documentId, userId) {
    await permissions.require(userId, 'document.read');
    return store.read(documentId, userId);
  },

  async delete() {
    throw new ForbiddenError('Delete is not available through this access level');
  },
});
```

Protection proxies can be useful at application boundaries, but security must be enforced at the authoritative server or resource boundary. A client-side proxy is a convenience and an organization tool, not a replacement for server-side authorization.

## Remote proxies

A remote proxy gives a local-looking interface to a remote operation:

```ts
type UserRepository = {
  findById(id: string): Promise<User | null>;
};

const createRemoteUserRepository = (
  client: HttpClient,
): UserRepository => ({
  async findById(id) {
    const response = await client.get(`/users/${id}`);
    return response.status === 404 ? null : mapUser(response.data);
  },
});
```

The interface is convenient, but the network is still present. Callers need to understand latency, failures, retries, cancellation, and consistency. A proxy should not make a remote call look like a cheap in-memory property access when that would encourage poor usage.

Remote proxies are often combined with an [Adapter pattern](/blog/adapter): the adapter translates an HTTP or SDK contract, while the proxy may add caching, access control, or lazy behavior.

## JavaScript's native `Proxy`

JavaScript also has a built-in `Proxy` object that intercepts operations such as property access and assignment.

```ts
const settings = new Proxy(
  { theme: 'light' },
  {
    get(target, property) {
      console.log(`Reading ${String(property)}`);
      return Reflect.get(target, property);
    },
    set(target, property, value) {
      if (property === 'theme' && value !== 'light' && value !== 'dark') {
        throw new Error('Unsupported theme');
      }

      return Reflect.set(target, property, value);
    },
  },
);
```

The native API can be useful for validation, tracking, reactive systems, and virtualized objects. It is also easy to make behavior surprising. Property reads can trigger work, errors can occur during ordinary assignment, and type inference may not communicate the runtime behavior well.

Use `Reflect` to preserve ordinary object semantics where possible, and keep traps small and predictable. If a regular method such as `setTheme()` is clearer, prefer the explicit method.

## Proxy versus Decorator

Proxy and Decorator often have the same implementation shape: one object wraps another and preserves an interface.

Their intent is different:

```ts
// Decorator: adds metrics to every request.
const measuredClient = withMetrics(client, metrics);

// Proxy: controls whether and when the client can be used.
const authorizedClient = withAuthorization(client, permissions);
```

A Decorator generally adds a responsibility to an object. A Proxy stands in for the object and controls access, identity, creation, or representation. The same wrapper can arguably serve both roles; describe the behavior rather than relying only on the name.

## Proxy versus Adapter and Facade

An Adapter changes an interface so an existing client can use it. A Facade exposes a simpler API over several subsystem operations. A Proxy usually preserves the interface and controls access to one underlying subject.

```ts
// Adapter: provider API becomes application API.
const payments: PaymentGateway = createStripeAdapter(stripeClient);

// Facade: several services become one feature workflow.
const checkout = createCheckoutFacade(dependencies);

// Proxy: the same payment gateway gains caching, logging, or permission checks.
const protectedPayments = withPermission(payments, permissions);
```

These patterns can be composed, but each layer should have a clear reason to exist.

## Identity and lifecycle

Some clients rely on object identity. If a proxy creates a new wrapper every time a function is called, equality checks, subscriptions, or resource cleanup can behave unexpectedly.

```ts
const cachedProxy = withCache(client);

cachedProxy === withCache(client); // false: two independent caches
```

Create the proxy at the intended lifetime boundary and reuse it when the wrapped resource should be shared. If the proxy owns timers, listeners, sockets, or cache entries, give it an explicit cleanup path.

```ts
type DisposableProxy<T> = T & { dispose(): void };
```

Do not let a long-lived proxy retain short-lived requests, components, or user objects through callbacks.

## Testing Proxies

Test the behavior the proxy adds and verify that it delegates correctly:

```ts
it('loads a product only once', async () => {
  const load = vi.fn().mockResolvedValue({ id: 'product-1' });
  const proxy = withProductCache({ findById: load });

  await Promise.all([
    proxy.findById('product-1'),
    proxy.findById('product-1'),
  ]);

  expect(load).toHaveBeenCalledTimes(1);
});
```

Also test failures and invalidation. A common bug is caching a rejected promise permanently or returning stale data after an update.

For protection proxies, test both allowed and denied access. For lazy proxies, test that construction does not happen before first use and that concurrent first calls share initialization when intended.

## Common mistakes

### Hiding expensive work

A proxy can make a network request or database query look like a simple method call. Document latency and failure behavior so callers do not assume the operation is cheap.

### Incorrect cache scope

Caching by `id` alone can leak data across users or tenants. Include every dimension that affects the result, or keep the cache scoped to the appropriate owner.

### Caching errors forever

If the first request fails and its rejected promise is stored, every later request may fail without retrying. Decide whether failures should be removed, briefly cached, or represented by a circuit breaker.

### Overusing JavaScript `Proxy`

Native traps can make ordinary code unpredictable and harder to type. Prefer explicit methods when the behavior is important enough to be visible.

### Confusing proxy with security

A proxy around a client does not make an untrusted system secure. Enforce permissions where the protected resource is actually controlled.

### Wrapping without a purpose

If the proxy neither controls access nor adds a meaningful behavior, the extra object only makes the call path harder to understand. Keep direct access direct.

## A practical checklist

Before introducing a Proxy, ask:

- What access, creation, or representation behavior needs to be controlled?
- Should the proxy preserve the original interface?
- Is the operation lazy, cached, remote, protected, or observable?
- What are the latency, consistency, error, and lifecycle implications?
- Is the proxy scoped correctly for users, requests, and tests?
- Does the proxy need invalidation or disposal?
- Would a direct method, decorator, adapter, or facade be clearer?

Name proxies after the behavior they add: `withCache`, `createLazyClient`, `withPermission`, or `createRemoteRepository`. Clear names make non-obvious behavior discoverable.

## How Proxy connects to other design ideas

Proxies often use the [Decorator pattern](/blog/decorator) to add cross-cutting behavior while preserving an interface.

They can be created through a [Factory](/blog/factory) so scope, configuration, and lifecycle are assembled in one place. A [Singleton](/blog/singleton) may own a shared proxy, but the cache and authorization scope must be deliberate.

Remote proxies and provider boundaries often rely on the [Adapter pattern](/blog/adapter) to translate external contracts into application-facing ones.

Keeping a proxy behind a [Module](/blog/module) gives callers a small public API while hiding cache, lazy-loading, and access-control details.

## Final thoughts

The Proxy pattern is useful when access to a resource needs rules around it. Delay expensive work, cache safe results, enforce permissions, observe calls, or represent a remote object while preserving a familiar contract.

Make the hidden costs visible, define lifetime and invalidation behavior, and avoid turning ordinary property access into surprising work. A good proxy controls complexity at the boundary without making the system mysterious.
