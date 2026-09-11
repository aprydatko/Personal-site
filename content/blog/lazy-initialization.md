---
title: "Lazy Initialization"
description: How to defer expensive setup until a value is needed, with patterns for caching, asynchronous resources, concurrency, and cleanup.
date: "2026-09-11"
category: Functional Programming
readingTime: 7 min read
featured: false
published: true
---

Lazy initialization means delaying the creation or setup of a resource until the first time it is actually needed.

Instead of doing work when a module, service, or object is constructed, lazy initialization stores enough information to create the resource later:

```ts
const createLazyValue = <T>(factory: () => T) => {
  let initialized = false;
  let value: T;

  return () => {
    if (!initialized) {
      value = factory();
      initialized = true;
    }

    return value;
  };
};

const getConfiguration = createLazyValue(() => loadConfiguration());

// loadConfiguration runs only here, on first use
const configuration = getConfiguration();
```

The factory runs once. Later calls return the same value.

Lazy initialization is useful when setup is expensive, optional, dependent on runtime context, or unnecessary for some execution paths. It also introduces state and lifetime concerns, so it should be used deliberately.

## Eager versus lazy setup

Eager initialization creates a resource immediately:

```ts
const client = createApiClient(config);
```

Lazy initialization defers creation:

```ts
const getClient = createLazyValue(() => createApiClient(config));
```

Eager setup is often better when:

- The resource is always needed.
- Failure should happen during startup.
- The setup is cheap.
- Readiness must be guaranteed before serving requests.

Lazy setup is often better when:

- Only some routes or features use the resource.
- Initialization is expensive.
- The resource depends on request-specific or environment-specific data.
- Startup latency or memory usage matters.

Do not make initialization lazy just because a factory can be written. The delayed failure and extra state may be worse than paying the setup cost at a known startup boundary.

## A lazy singleton

A module can use a closure to create one shared instance on demand:

```ts
const createDatabaseProvider = (config: DatabaseConfig) => {
  let database: Database | undefined;

  return {
    get() {
      if (!database) {
        database = connectToDatabase(config);
      }

      return database;
    },
  };
};
```

The provider owns the initialization state, and callers do not need to know whether the database is already connected.

This is a form of [Closure for Encapsulation](/blog/closure-for-encapsulation): the resource is private, while the provider exposes a controlled operation.

Singleton behavior should be scoped intentionally. A process-wide singleton may be appropriate for a connection pool, but it can be problematic in tests, serverless environments, multi-tenant applications, or code that needs different configurations.

## Lazy initialization with a class

The same pattern can be represented with a private field:

```ts
class ReportService {
  #renderer: ReportRenderer | undefined;

  constructor(private readonly config: ReportConfig) {}

  private getRenderer() {
    if (!this.#renderer) {
      this.#renderer = createReportRenderer(this.config);
    }

    return this.#renderer;
  }

  render(report: Report) {
    return this.getRenderer().render(report);
  }
}
```

Use a closure or a class based on the surrounding design. The important property is that the resource is created at the first operation that requires it, not that one syntax is always preferred.

## Lazy values and falsy results

Do not use the value itself to determine whether initialization has happened when valid results can be falsy:

```ts
const getValue = () => {
  let value: number | undefined;

  return () => {
    if (value === undefined) value = calculateValue();
    return value;
  };
};
```

This works only if `undefined` cannot be a valid initialized result. A separate flag is safer when `undefined`, `null`, `false`, `0`, or an empty string can be returned legitimately:

```ts
const createLazyBoolean = (factory: () => boolean) => {
  let initialized = false;
  let value = false;

  return () => {
    if (!initialized) {
      value = factory();
      initialized = true;
    }

    return value;
  };
};
```

## Asynchronous lazy initialization

For asynchronous setup, cache the promise so concurrent callers share the same initialization:

```ts
const createLazyClient = (config: ClientConfig) => {
  let clientPromise: Promise<ApiClient> | undefined;

  return () => {
    if (!clientPromise) {
      clientPromise = createApiClient(config);
    }

    return clientPromise;
  };
};

const getClient = createLazyClient(config);

const [first, second] = await Promise.all([
  getClient(),
  getClient(),
]);

// first and second share the same initialized client
```

Without caching the promise, two callers can observe an uninitialized state and start duplicate setup work.

## Failed initialization

Decide what should happen if initialization fails. With the previous pattern, a rejected promise remains cached, so every later call receives the same failure.

That behavior can be correct when the failure is permanent or startup should remain failed. If retrying makes sense, clear the promise after rejection:

```ts
const createRetryableLazyClient = (config: ClientConfig) => {
  let clientPromise: Promise<ApiClient> | undefined;

  return () => {
    if (!clientPromise) {
      clientPromise = createApiClient(config).catch((error) => {
        clientPromise = undefined;
        throw error;
      });
    }

    return clientPromise;
  };
};
```

Retries should have limits, backoff, and clear error reporting when the underlying resource is remote or expensive. Lazy initialization should not become an unbounded retry loop hidden inside a getter.

## Concurrency and initialization state

In JavaScript, synchronous initialization cannot be interrupted between statements, but asynchronous initialization can be observed by multiple callers. The cached promise acts as the shared “initializing” state.

For more complex resources, model the states explicitly:

```ts
type ResourceState<T> =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<T> }
  | { status: 'ready'; value: T }
  | { status: 'failed'; error: unknown };
```

An explicit state model is useful when the API needs status reporting, retry controls, cancellation, or reset behavior. A boolean and a value are enough only when the lifecycle is simple.

## Lazy initialization and resource cleanup

Deferring creation does not define cleanup. A lazily opened resource still needs a clear owner:

```ts
const createLazyFile = (path: string) => {
  let file: FileHandle | undefined;

  return {
    async get() {
      file ??= await openFile(path);
      return file;
    },
    async close() {
      if (file) {
        await file.close();
        file = undefined;
      }
    },
  };
};
```

The `close` operation makes lifetime visible and allows the resource to be initialized again later if that is intended. For connections, files, subscriptions, and locks, document who calls `close` and what happens to in-flight operations.

## Lazy initialization and dependency injection

A lazy factory can receive dependencies without creating the resource immediately:

```ts
const createLazySearchIndex = (
  loader: () => Promise<SearchIndex>,
) => {
  let index: Promise<SearchIndex> | undefined;

  return async () => {
    index ??= loader();
    return index;
  };
};
```

Tests can provide a loader that returns a small in-memory index. Production code can provide a loader that opens the real index. This keeps setup at the composition boundary, in line with [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection).

## Lazy initialization in frontend applications

Frontend applications often load optional code or data only when a feature is used:

```ts
const loadEditor = (() => {
  let modulePromise: Promise<typeof import('./editor')> | undefined;

  return () => {
    modulePromise ??= import('./editor');
    return modulePromise;
  };
})();
```

The first editor interaction starts the dynamic import; later interactions reuse the same promise.

Lazy loading can improve initial load time, but it moves work to the first interaction. Show loading states, handle failures, and preload when user intent makes the next interaction predictable.

## Lazy initialization versus memoization

These ideas overlap but solve different problems.

Lazy initialization delays creation until the first use and commonly keeps one resource:

```ts
const getClient = createLazyClient(config);
```

Memoization caches results for multiple inputs:

```ts
const getUser = createMemoized((id: string) => loadUser(id));
```

A lazy initializer answers “when should this one resource be created?” Memoization answers “how can repeated inputs reuse previous results?” A lazy initializer can use memoization internally, and a memoized function can itself be initialized lazily, but the lifecycle questions remain different. See [Memoization](/blog/memoization) for cache-specific concerns.

## Common mistakes

### Deferring required validation

Lazy creation should not hide invalid configuration until an unrelated request happens. Validate static configuration eagerly, then defer only the expensive resource setup.

### Recreating the resource accidentally

If initialization is stored in a local variable inside the getter, it will run on every call:

```ts
const getClient = () => createApiClient(config); // not lazy caching
```

Keep the state in the closure, object, or class instance that owns the lifecycle.

### Duplicating async initialization

Caching only the resolved value is too late for concurrent callers. Cache the promise as soon as setup starts.

### Hiding slow first-use latency

Lazy initialization shifts cost rather than removing it. Measure startup and first-use latency, show appropriate loading behavior, and preload when the resource is likely to be needed soon.

### Forgetting cleanup and reset

Long-lived lazy resources can retain connections, memory, or event listeners. Provide cleanup or reset behavior when the resource's lifetime is not the entire process.

### Using lazy initialization as a global-state shortcut

A global lazy singleton can be convenient, but it makes tests, configuration, and ownership harder to reason about. Prefer a scoped provider when different consumers need independent lifetimes or settings.

## Testing lazy initialization

Test that setup is deferred, performed once, and retried or retained according to the intended policy:

```ts
it('initializes only on first use', () => {
  let calls = 0;
  const getValue = createLazyValue(() => {
    calls += 1;
    return 'ready';
  });

  expect(calls).toBe(0);
  expect(getValue()).toBe('ready');
  expect(getValue()).toBe('ready');
  expect(calls).toBe(1);
});
```

For asynchronous resources, test concurrent callers, rejected initialization, retries, cleanup, and cancellation where applicable. Fake the loader or client so the test observes lifecycle behavior without opening real resources.

## A practical checklist

Before introducing lazy initialization, ask:

- Is setup expensive or genuinely optional?
- Should configuration be validated eagerly even if resource creation is deferred?
- Is the resource created once, per scope, or per request?
- What happens when two callers initialize it concurrently?
- What happens if setup fails?
- Is the first-use latency acceptable, or should the resource be preloaded?
- Who owns cleanup, reset, and cancellation?
- Would eager initialization make failure and readiness easier to understand?

## Final thoughts

Lazy initialization delays work until it has a reason to exist. It can reduce startup cost, avoid unused resources, and bind setup to the context that actually needs it.

Use it with an explicit lifecycle: cache the initialization state, handle concurrent callers, decide what failures mean, make first-use latency visible, and provide cleanup when needed. The best lazy initializer is not merely deferred—it is predictable about when work starts, who owns the result, and what happens next.
