---
title: "Backend and distributed-system patterns: Write-Through / Write-Behind Cache"
description: A practical guide to Write-Through and Write-Behind caching, their consistency and durability tradeoffs, and how to handle ordering, failure, and replay.
date: "2026-09-13"
category: Backend
readingTime: 8 min read
featured: false
published: true
---

Write-Through and Write-Behind are cache-writing strategies that change where an application sends writes and when the primary store is updated.

```text
Write-Through:  application → cache → database → success
Write-Behind:   application → cache → success
                               ↘ queue → database
```

Write-Through waits for the cache and source of truth to be updated before acknowledging the write. Write-Behind, also called Write-Back, acknowledges after the cache accepts the value and persists to the source asynchronously.

Both can reduce application complexity compared with manually updating several stores, but they move important consistency and failure decisions into the cache boundary.

## Write-Through

With Write-Through, the cache is part of the synchronous write path:

```ts
const saveProduct = async (
  product: Product,
  cache: { set<T>(key: string, value: T): Promise<void> },
  products: { save(product: Product): Promise<void> },
) => {
  await products.save(product);
  await cache.set(`product:${product.id}`, product);
  return product;
};
```

The ordering can be reversed depending on the cache product and consistency model, but the success contract must be clear: a successful call means both systems have accepted the value, or the cache is explicitly a derived replica that can be rebuilt.

Write-Through is a good fit when:

- reads are frequent immediately after writes;
- the cache contains complete, durable representations;
- the caller needs a strong write acknowledgment;
- synchronous write latency is acceptable;
- cache and source updates can be coordinated safely.

The main cost is write latency and a two-system failure window.

## Write-Through failure modes

Suppose the database commits and the cache write fails. The database is current, but the next read misses or serves an older entry. This is usually recoverable if the read path loads from the database and invalidation or repair is monitored.

If the cache updates first and the database fails, the cache may expose data that was never committed. Avoid this unless the cache supports a transaction or durable write-through contract that owns the source update.

```text
database succeeds → cache fails → stale/missing cache, source is correct
cache succeeds    → database fails → cache may contain uncommitted data
```

Prefer database-first plus invalidate or a provider-managed transactional write-through path. Never report success merely because one side accepted the value when the API promises durable persistence.

## Write-Behind

Write-Behind acknowledges after the cache accepts a value and defers persistence:

```ts
const saveViewPreferences = async (
  userId: string,
  preferences: Preferences,
  cache: { set<T>(key: string, value: T): Promise<void> },
  changes: { publish(event: PreferenceChanged): Promise<void> },
) => {
  const event = {
    userId,
    preferences,
    changeId: crypto.randomUUID(),
  };

  await cache.set(`preferences:${userId}`, preferences);
  await changes.publish(event);
  return preferences;
};
```

In a real system, publishing the persistence event must be durable. An in-memory callback after `cache.set` can disappear on process crash, leaving a value that exists only in the cache. Use a durable queue, cache change stream, or an outbox that is written atomically with the authoritative state needed to recover the event.

Write-Behind can improve latency and absorb bursts, but the cache becomes a temporary system of record. That is a much stronger operational responsibility than ordinary read caching.

## When Write-Behind is appropriate

Use it only when the business contract tolerates delayed persistence and the cache can be recovered:

- high-volume counters or activity aggregation;
- telemetry and metrics batching;
- ephemeral user preferences;
- write-heavy workloads where eventual consistency is acceptable;
- workloads that can be replayed from durable events.

Avoid it for payments, account balances, inventory, authorization, or any write whose loss or reordering creates unacceptable business impact.

## Ordering and concurrency

Two updates for the same key can arrive out of order:

```text
update A: price = 10, version = 4
update B: price = 12, version = 5
persist B
persist A  ← stale overwrite
```

Include a monotonic version, sequence number, or server timestamp and reject stale persistence events:

```ts
const persistIfNewer = async (event: ProductChanged, store: ProductStore) => {
  const current = await store.version(event.productId);
  if (current >= event.version) return;

  await store.save(event.product, { version: event.version });
};
```

A timestamp is not always enough across machines because clocks can drift. Prefer a database version, partition sequence, or broker ordering guarantee for a given key. Partition asynchronous work by entity identity when per-key ordering matters.

## Coalescing and batching

Write-Behind can combine multiple updates before persistence:

```text
cache writes:     A → B → C
durable write:              C
```

Coalescing reduces database load but discards intermediate states. That is safe for “latest profile settings” and unsafe for “each financial transaction.” Define whether the domain needs every event, the final state, or an aggregate such as a sum.

Batching also requires a maximum delay and maximum batch size. A batch that waits forever for more events is a hidden data-loss and latency problem.

## Durability and recovery

For Write-Behind, define the complete lifecycle:

```text
accept → durable buffer → consume → persist → acknowledge
                         ↘ retry → dead letter → replay
```

The durable buffer should support retries, visibility timeouts, dead-letter handling, and replay. Persisting an event is usually idempotent: the same `changeId` can be processed twice without duplicating the business effect.

If the cache fails, decide whether writes reject, fall back to the database, or enter another durable path. If the database fails, apply backpressure before the cache fills with unpersisted data. Monitor the oldest unpersisted change, not only queue length.

## Read-your-writes

After a Write-Behind response, another request may read from a different instance or from the database and see the old value. Options include:

- route the user to the same cache scope briefly;
- return the accepted version and require reads to meet it;
- read from the cache until persistence catches up;
- expose a `pending` or `lastPersistedVersion` status;
- use Write-Through for flows that need immediate durability.

Do not promise read-your-writes consistency if the request can move between instances and the source store is updated asynchronously.

## Write-Through versus Cache-Aside

Cache-Aside makes the application explicitly populate and invalidate the cache. Write-Through makes cache population part of the write path:

```text
Cache-Aside:  write database → invalidate cache
Write-Through: write through cache abstraction → database + cache
```

Cache-Aside is often simpler when only a few reads are hot or the source store must remain clearly authoritative. Write-Through can keep hot entries warm after updates, but it adds cache availability and consistency concerns to every write.

## Observability

Measure the strategy as a consistency pipeline:

```text
cache write latency
cache write failures
pending persistence age
queue depth and retry count
database persistence latency
version conflicts
dead-letter count
```

For Write-Through, alert on partial success and divergence between cache and source. For Write-Behind, alert on persistence lag, oldest pending event, cache evictions before persistence, and replay failures.

Expose versions and timestamps in internal diagnostics. A dashboard that shows only cache hit rate can look healthy while durable writes are silently falling behind.

## Testing

Test each stage with fakes and controlled failures:

```ts
it('does not acknowledge a write-through update when persistence fails', async () => {
  const products = { save: vi.fn().mockRejectedValue(new Error('database unavailable')) };
  const cache = { set: vi.fn() };

  await expect(saveProduct(product, cache, products)).rejects.toThrow('database unavailable');
  expect(cache.set).not.toHaveBeenCalled();
});
```

For Write-Behind, test crash recovery, duplicate events, out-of-order versions, queue retries, dead letters, coalescing, bounded lag, and cache eviction before persistence. Integration tests should verify the actual durability and acknowledgment semantics of the queue or cache provider.

## Common mistakes

### Treating cache acceptance as durable success

This is the defining risk of Write-Behind. If the buffer is not durable and replayable, accepted writes can disappear.

### No ordering rule

Asynchronous persistence can overwrite newer state with an older event. Use versions, partitioning, or an explicit last-write-wins policy.

### No backpressure

A fast cache can accept more unpersisted work than the database can process. Bound pending data and surface overload before memory or storage is exhausted.

### Coalescing events that must be retained

Latest-state updates can be coalesced; transactions, audit events, and counters often cannot. Model the required history explicitly.

### Ignoring cache eviction

If the only copy of a pending Write-Behind value is evicted, persistence may never happen. Track pending durability separately from cache presence.

### Assuming all readers see the cache

Other services, reports, and background jobs may read the source database. Define their freshness and read-your-writes expectations.

## A practical checklist

Before choosing Write-Through or Write-Behind, ask:

- Is the cache a derived copy or a temporary system of record?
- What does a successful write acknowledgment guarantee?
- Is eventual consistency acceptable for this domain?
- What happens if cache, database, process, or queue fails at each step?
- How are ordering, duplicate delivery, and idempotency handled?
- Can pending writes be replayed after eviction or restart?
- What are the maximum lag, batch delay, and backlog limits?
- Do readers need read-your-writes behavior?
- Can divergence, lag, version conflicts, and dead letters be observed?

## Final thoughts

Write-Through keeps cache and persistence on the synchronous path; Write-Behind trades immediate durability for lower latency and better burst absorption. The trade is not merely performance—it is a change in the meaning of “write succeeded.”

Use Write-Through when hot data should be updated with a durable write and the added latency is acceptable. Use Write-Behind only with durable buffering, explicit ordering, idempotent persistence, bounded lag, and a recovery plan. If those guarantees are difficult to explain, Cache-Aside or a direct database write is probably the safer design.
