---
title: "Backend and distributed-system patterns: Bulkhead"
description: A practical guide to the Bulkhead pattern, how resource isolation limits blast radius, and how to design bounded concurrency for resilient services.
date: "2026-09-13"
category: Backend
readingTime: 7 min read
featured: false
published: true
---

The Bulkhead pattern isolates resources so one overloaded or failing workload cannot consume all of a service's capacity.

The name comes from ship compartments: a leak in one section should not sink the whole vessel. In software, a bulkhead can be a connection pool, worker pool, queue, semaphore, process, deployment, or rate limit dedicated to one dependency or workload.

```text
shared capacity:
requests → [ search + payments + reports ] → one exhausted pool

isolated capacity:
search   → [pool A]
payments → [pool B]
reports  → [pool C]
```

The goal is containment. A bulkhead does not increase total capacity or make slow work fast; it ensures important work retains capacity when another workload misbehaves.

## The problem it solves

Without isolation, a slow dependency can create queue buildup:

```text
slow downstream → requests wait → workers stay occupied → queue grows
                → healthy work waits → timeouts cascade
```

This is resource exhaustion. Even if the failing dependency is only used by a recommendation widget, it can consume every request slot, connection, thread, or event-loop opportunity needed by checkout and authentication.

A bulkhead gives each workload a budget and a defined rejection behavior.

## Semaphore bulkheads

A semaphore limits how many operations can run concurrently:

```ts
type Permit = { release(): void };
type Semaphore = {
  acquire(): Promise<Permit | null>;
};

const withBulkhead =
  <T>(semaphore: Semaphore, operation: () => Promise<T>) =>
  async (): Promise<T> => {
    const permit = await semaphore.acquire();
    if (!permit) throw new Error('bulkhead_full');

    try {
      return await operation();
    } finally {
      permit.release();
    }
  };
```

Release the permit in `finally`. A missing release gradually reduces capacity until the bulkhead appears permanently full.

Decide whether `acquire` waits or rejects immediately. Waiting can smooth short bursts but increases latency and memory use. Immediate rejection preserves latency and protects the caller, but requires a fallback or a clear unavailable response.

## Partitioning by dependency

Create separate budgets for dependencies with different reliability or importance:

```ts
const searchRequest = withBulkhead(searchSemaphore, () => searchClient.query(input));
const paymentRequest = withBulkhead(paymentSemaphore, () => paymentClient.authorize(input));
```

Search saturation should not consume payment capacity. The limits should reflect the dependency's own concurrency limits, the cost of an operation, and the business criticality of the feature.

Partitioning can also be useful by tenant, API key, endpoint, or workload class. A noisy tenant should not starve other tenants, and background exports should not compete directly with interactive requests.

## Queue-based bulkheads

For asynchronous work, a dedicated queue and worker pool form a natural bulkhead:

```text
interactive events → queue A → workers A
report generation   → queue B → workers B
webhooks            → queue C → workers C
```

Each queue can have its own concurrency, retry policy, visibility timeout, and dead-letter destination. Queue depth and age are more useful signals than worker count alone.

Do not let an unbounded queue become a hidden bulkhead. Bound the queue, define what happens when it is full, and make overload visible. Options include rejecting new work, dropping low-priority work, coalescing duplicates, or asking the producer to retry later.

## Process and deployment bulkheads

The strongest isolation usually comes from separate processes or deployments:

```text
web API      → deployment A → resources A
image worker → deployment B → resources B
scheduled ETL→ deployment C → resources C
```

Separate deployments can have independent CPU and memory limits, autoscaling, release schedules, and failure domains. They cost more to operate, so use them when the blast radius or scaling profile justifies the boundary.

Separate connection pools can provide useful isolation inside one process, but they still share process memory, CPU, and event-loop capacity. Do not describe a pool partition as complete isolation.

## Capacity and fairness

Bulkhead limits are a capacity policy, not arbitrary magic numbers. Start with the downstream's concurrency limit and measure:

- active operations and queue wait time;
- success, timeout, and rejection rates;
- dependency latency under load;
- CPU, memory, connection, and file-descriptor usage;
- work completion age and backlog size.

Reserve capacity for critical traffic. A weighted or priority-aware limiter can allocate more permits to interactive checkout than to optional personalization, while still preventing either class from becoming unbounded.

Be careful with fairness. Strict per-tenant limits protect isolation but may leave capacity idle when one tenant is quiet. A shared pool with per-tenant caps can preserve utilization while preventing starvation.

## Bulkhead and Circuit Breaker

These patterns address different failure modes:

```text
Bulkhead       limits how much work may be in flight.
Circuit Breaker stops calling a dependency known to be failing.
Timeout        bounds how long one operation may occupy resources.
Retry          repeats a limited set of transient failures.
```

A resilient dependency call often combines them:

```ts
const loadProfile = () => profileBreaker.execute(() =>
  withBulkhead(profileSemaphore, () =>
    withTimeout(profileClient.get(userId), 500),
  )(),
);
```

The exact order should be deliberate. Admission control should usually happen before expensive work. A circuit should reject known-bad calls before acquiring scarce downstream capacity. Keep retries bounded and ensure permits are held only for the actual attempt or for the logical operation according to the capacity model.

Avoid multiplying budgets across nested layers. A request limit, client limit, pool limit, and queue limit can make the true behavior difficult to predict. Document the effective concurrency and queueing behavior for each important path.

## Overload behavior

When a bulkhead is full, the system needs a product and protocol decision:

```ts
const getRecommendationsOrFallback = async (userId: string) => {
  try {
    return await loadRecommendations(userId);
  } catch (error) {
    if (isBulkheadFull(error)) return { items: [], degraded: true };
    throw error;
  }
};
```

Valid responses include a stale cache, a reduced result, a queued job, a `429 Too Many Requests`, or a `503 Service Unavailable` with a retry hint. Never silently drop required work such as a payment or security decision.

For internal callers, return a typed overload error with the resource name and retryability. For public callers, avoid leaking infrastructure topology; expose a stable contract and a correlation ID for support.

## Distributed-system considerations

In a multi-instance service, an in-memory semaphore limits each instance, not the whole fleet. That is often desirable because it avoids a coordination dependency. If a global limit is required, use a durable distributed limiter and account for its latency, clock behavior, and failure mode.

Autoscaling does not automatically preserve a global bulkhead. Adding instances may multiply downstream concurrency and overload the dependency. Include fleet size in the capacity calculation, or enforce a downstream-aware limit at a shared boundary.

Bulkheads do not guarantee fairness across processes. A load balancer may send disproportionate traffic to one instance, so observe per-instance saturation and use appropriate balancing or queue partitioning.

## Testing bulkheads

Test admission and release behavior with controlled operations:

```ts
it('rejects work after the concurrency limit is reached', async () => {
  const operation = createDeferred<void>();
  const run = withBulkhead(createSemaphore(1), () => operation.promise);

  const first = run();
  await expect(run()).rejects.toThrow('bulkhead_full');

  operation.resolve();
  await first;
  await expect(run()).resolves.toBeUndefined();
});
```

Also test cancellation, timeout cleanup, queue limits, fair scheduling, priority behavior, and process shutdown. Load tests should verify that an overloaded workload leaves protected workloads within their latency and error budgets.

## Common mistakes

### Unbounded waiting

A semaphore with an infinite wait queue only moves the failure from active workers to memory and latency. Bound waiting time and queue size.

### Permits not released

Always release in `finally`, including timeout, cancellation, and error paths.

### Assuming in-memory means fleet-wide

Per-process limits are not global limits. State the scope of every limiter.

### Equal capacity for unequal work

A cheap read and an expensive report do not necessarily deserve the same concurrency budget. Allocate based on cost and importance.

### Isolating the wrong resource

Separate request slots while sharing one exhausted database pool may not contain the actual bottleneck. Trace the complete resource path.

### Protecting optional work at the expense of critical work

Fallbacks and admission priorities should reflect business importance, not just implementation convenience.

## A practical checklist

Before adding a Bulkhead, ask:

- Which resource is being protected: workers, connections, queue depth, CPU, or downstream concurrency?
- What workload or dependency deserves its own budget?
- Is the limit per request, process, tenant, region, or fleet?
- Should callers wait, reject, degrade, or queue when the budget is full?
- Are queue length and wait time bounded?
- Are permits released on success, failure, timeout, cancellation, and shutdown?
- How does this interact with retries, timeouts, and circuit breakers?
- Can operators see saturation, rejection, queue age, and protected-workload health?

## Final thoughts

Bulkheads turn shared capacity into explicit failure domains. Give important work its own bounded resources, decide how overload is surfaced, and measure the boundary that actually becomes exhausted.

Combine bulkheads with timeouts, carefully bounded retries, and circuit breakers when appropriate. The result is not infinite resilience; it is a system whose failures stay smaller, more predictable, and easier to recover from.
