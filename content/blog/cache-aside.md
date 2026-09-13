---
title: "Backend and distributed-system patterns: Cache-Aside"
description: A practical guide to Cache-Aside, how applications load and invalidate cached data, and how to handle staleness, stampedes, and distributed consistency.
date: "2026-09-13"
category: Backend
readingTime: 7 min read
featured: false
published: true
---

Cache-Aside, also called lazy loading, keeps the cache outside the primary data store and makes the application responsible for reading, populating, and invalidating cached values.

The application checks the cache first. On a miss, it reads the source of truth, stores the result, and returns it:

```text
request → cache hit ───────────────→ response
       ↘ cache miss → database → cache → response
```

The database remains authoritative. The cache is a disposable, derived copy that improves latency and reduces repeated load for data that is expensive or frequent to read.

## The read path

A cache-aside read should make the hit and miss behavior explicit:

```ts
type Product = { id: string; name: string; price: number };
type ProductCache = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options: { ttlSeconds: number }): Promise<void>;
};

const getProduct = async (
  id: string,
  cache: ProductCache,
  products: { findById(id: string): Promise<Product | null> },
) => {
  const key = `product:${id}`;
  const cached = await cache.get<Product>(key);
  if (cached) return cached;

  const product = await products.findById(id);
  if (!product) return null;

  await cache.set(key, product, { ttlSeconds: 300 });
  return product;
};
```

Keep cache serialization and key construction at the infrastructure boundary. The application should depend on a small cache contract, not on provider-specific commands or data formats.

## Cache keys

Keys are part of the data contract. Include the bounded context, entity identity, and any dimensions that change the result:

```text
catalog:product:v2:product-42
catalog:search:v1:en:shoes:page-1
profile:summary:v3:user-17
```

Use a stable naming convention and version keys when the serialized shape changes. Normalize inputs before constructing keys, including case, whitespace, locale, and pagination defaults. Never let untrusted user input create unbounded key dimensions without validation.

## The write path

The most common cache-aside write strategy updates the source of truth first, then invalidates the cached value:

```ts
const updateProduct = async (
  input: { id: string; name: string; price: number },
  products: { update(input: typeof input): Promise<Product> },
  cache: ProductCache,
) => {
  const product = await products.update(input);
  await cache.delete(`product:${product.id}`);
  return product;
};
```

The next read repopulates the cache from the database. This avoids placing an uncommitted or partially updated value in the cache.

If invalidation fails after the database commit, the old value may remain until its TTL expires. Use short enough TTLs for the consistency requirement, retry invalidation where safe, and monitor invalidation failures. For critical freshness, publish an invalidation event through a durable outbox rather than relying only on an in-process callback.

## Update versus invalidate

Updating the cache after a write can reduce the next-read miss:

```ts
await products.update(input);
await cache.set(`product:${input.id}`, input, { ttlSeconds: 300 });
```

But this is safe only when the value is complete, normalized, and the cache write cannot overwrite a newer value. Invalidation is usually simpler and less vulnerable to write ordering. Choose update when the new representation is already available and the read model is straightforward; choose invalidate when the value is derived, shared by many queries, or difficult to reconstruct correctly.

## TTL and staleness

Time-to-live is a safety net, not a complete invalidation strategy. It bounds how long a forgotten or failed invalidation can serve stale data.

Choose TTL from the feature's freshness contract:

- A product description may tolerate minutes of staleness.
- A dashboard may tolerate a short delay and use a “last updated” timestamp.
- Authorization, balances, and inventory availability may require a source-of-truth read.

Make stale behavior visible. A cached response can include metadata such as `cachedAt`, `expiresAt`, or a source version so the caller and observability system can distinguish fresh data from a degraded or stale fallback.

## Cache stampede

When a popular key expires, many requests can miss at once and overload the database. This is a cache stampede, or thundering herd.

Common protections include:

- Single-flight loading: share one in-flight load per key.
- Jittered TTLs: prevent many related keys expiring together.
- Stale-while-revalidate: serve a recent value while refreshing asynchronously.
- Warm-up: populate predictable hot keys before traffic arrives.
- Backpressure: bound concurrent cache-miss loads.

Single-flight must be scoped correctly. An in-memory promise deduplicates requests on one process only. A fleet-wide lock can coordinate instances but introduces lock expiry, ownership, and failure concerns. A short lock timeout and a safe fallback are preferable to waiting indefinitely.

## Negative caching

Not-found results can also be cached:

```ts
const missing = await cache.get<boolean>(`product-missing:${id}`);
if (missing) return null;

const product = await products.findById(id);
if (!product) {
  await cache.set(`product-missing:${id}`, true, { ttlSeconds: 30 });
  return null;
}
```

Use a short TTL. Otherwise a newly created record can remain invisible until the negative entry expires. Negative caching is especially useful for repeated requests for invalid or probing identifiers, but it must not become an oracle for sensitive resource existence.

## Distributed caches

A remote cache such as Redis is shared across application instances, but it is still a network dependency. Add timeouts and decide what happens when the cache is unavailable:

```ts
const readThroughCache = async <T>(
  key: string,
  cache: { get<T>(key: string): Promise<T | null> },
  load: () => Promise<T>,
) => {
  try {
    const cached = await withTimeout(cache.get<T>(key), 100);
    if (cached !== null) return cached;
  } catch (error) {
    logger.warn('cache.read_failed', { key, error });
  }

  return load();
};
```

For many read caches, bypassing the cache on failure is safer than failing the feature entirely, provided the database can absorb the extra load. A cache outage can become a database outage, so pair bypass behavior with database protection: connection limits, request budgets, circuit breakers, and degraded responses.

## Consistency and versioning

Cache-aside is eventually consistent whenever invalidation or population is asynchronous. Concurrent writes can create this sequence:

```text
write A commits → invalidation A delayed
write B commits → cache populated with B
invalidation A arrives → cache deleted
```

Deletion is safe but causes an avoidable miss. More dangerous is an older asynchronous cache update arriving after a newer one. Include a source version or updated timestamp and reject writes that would move the cache backward.

For read-your-writes behavior, return the updated representation directly, bypass the cache for the writer briefly, or attach a version that reads must meet. Do not assume a successful database write means every cache read is immediately current.

## What should not be cached

Avoid caching data when the consistency, privacy, or invalidation cost exceeds the benefit. Be cautious with:

- permission decisions that can change quickly;
- personalized data under shared keys;
- secrets, tokens, or sensitive personal information;
- results with unbounded input dimensions;
- writes whose side effects must be observed immediately.

If personalized data is cached, include the correct tenant and user scope in the key and define eviction, encryption, and retention behavior. A cache is still a data store from a security perspective.

## Testing Cache-Aside

Test the read path with controlled cache and source fakes:

```ts
it('loads from the database and populates the cache on a miss', async () => {
  const cache = createFakeCache();
  const products = { findById: vi.fn().mockResolvedValue(product) };

  await expect(getProduct('product-42', cache, products)).resolves.toEqual(product);
  expect(products.findById).toHaveBeenCalledWith('product-42');
  expect(await cache.get('product:product-42')).toEqual(product);
});
```

Also test cache hits without a database call, missing values, expired values, serialization failures, cache outages, invalidation after writes, concurrent misses, key version changes, and stale fallback behavior. Integration tests should verify TTLs, eviction, permissions, and the behavior of the actual cache provider.

## Common mistakes

### Treating the cache as the source of truth

Cache entries can disappear, be stale, or be corrupted. Keep authoritative writes in the primary store.

### No invalidation plan

Adding a cache without deciding when values become invalid creates correctness bugs. Document the write paths, TTL, and acceptable staleness.

### Caching every query

Low-hit-rate or highly variable queries can add serialization, memory, and invalidation cost without reducing load. Measure hit rate and value.

### Unbounded keys

Search terms, filters, and user-controlled identifiers can exhaust memory. Normalize, limit, and evict deliberately.

### Cache outage becomes database outage

If every request bypasses a failed cache, the source of truth may be overwhelmed. Add capacity protection and a degraded mode.

### Ignoring privacy boundaries

A missing tenant or user dimension in a key can serve one user's data to another. Treat key design as a security-sensitive decision.

## A practical checklist

Before adding Cache-Aside, ask:

- What is the authoritative source and what freshness can callers tolerate?
- What is the stable, versioned cache key?
- Which writes invalidate or update this value?
- What happens if invalidation fails or the cache is unavailable?
- Could hot-key expiry create a stampede?
- Are TTL, size, eviction, and negative-cache policies explicit?
- Are tenant, user, locale, and authorization boundaries represented in the key?
- Do retries, single-flight loading, and fallbacks have bounded resource usage?
- Can hit rate, latency, staleness, errors, and invalidation failures be observed?

## Final thoughts

Cache-Aside is a simple and flexible way to accelerate reads while keeping the primary data store authoritative. The application owns the cache miss, population, and invalidation decisions, so those decisions need to be explicit.

Start with a narrow cacheable read, a versioned key, a bounded TTL, and a clear failure mode. Add stampede protection and asynchronous invalidation only when traffic and freshness requirements justify the added machinery.
