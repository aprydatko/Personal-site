---
title: "Backend and distributed-system patterns: Producer / Consumer"
description: A practical guide to the Producer / Consumer pattern, how queues decouple workloads, and how to design acknowledgment, backpressure, retries, and scaling.
date: "2026-09-13"
category: Backend
readingTime: 8 min read
featured: false
published: true
---

The Producer / Consumer pattern separates code that creates work from code that processes it.

```text
producer → queue or log → consumer
```

The producer does not need to know when or where the consumer runs. The queue absorbs bursts, enables independent scaling, and provides a boundary for retries and failure handling.

This separation is useful for email delivery, image processing, webhooks, indexing, analytics, and any task that does not need to complete inside the initiating request.

## The basic flow

A producer publishes a durable message:

```ts
type ImageUploaded = {
  id: string;
  imageId: string;
  objectKey: string;
  occurredAt: string;
};

const publishImageUploaded = async (
  image: Image,
  events: { publish(event: ImageUploaded): Promise<void> },
) => events.publish({
  id: crypto.randomUUID(),
  imageId: image.id,
  objectKey: image.objectKey,
  occurredAt: new Date().toISOString(),
});
```

The consumer owns processing:

```ts
const consumeImageUploaded = async (event: ImageUploaded) => {
  const thumbnail = await imageProcessor.createThumbnail(event.objectKey);
  await thumbnails.save({ imageId: event.imageId, objectKey: thumbnail.key });
};
```

The producer should publish an event or command that has a clear owner. Include a stable message ID, schema version, causation or correlation ID, and the data needed to process safely without making consumers depend on producer internals.

## Queue versus log

A work queue usually delivers a message to one competing consumer and removes or hides it after acknowledgment. A log retains records and lets multiple consumer groups read independently:

| Model | Typical behavior | Good fit |
| --- | --- | --- |
| Work queue | One worker owns each task | Jobs, emails, image processing |
| Append-only log | Consumers track their own position | Events, projections, analytics |
| Pub/sub topic | Many subscribers receive the event | Notifications, integrations |

Choose based on delivery, replay, ordering, and ownership needs. Do not call every broker primitive a queue if consumers need independent replay positions.

## Acknowledgment

Acknowledgment tells the broker whether the consumer accepts responsibility for a message:

```text
receive → process → commit effect → acknowledge
```

Acknowledging before the effect commits risks data loss:

```text
receive → acknowledge → process → crash → effect missing
```

Acknowledging after the effect commits can produce duplicate processing if the consumer crashes before the acknowledgment. That is why at-least-once delivery and idempotent consumers are the practical default.

```ts
const handleMessage = async (message: Message) => {
  await processOnce(message);
  await broker.ack(message);
};
```

The broker's visibility timeout or lease should exceed normal processing time, with an extension mechanism for long tasks. A lease that expires while work is still running can cause concurrent duplicate consumers.

## Idempotent consumers

Consumers should tolerate redelivery:

```ts
const processOnce = async (event: ImageUploaded) => {
  const inserted = await processedEvents.insertIfAbsent({
    eventId: event.id,
    processedAt: new Date(),
  });
  if (!inserted) return;

  await createThumbnailAndRecord(event);
};
```

The processed marker and business effect should share a transaction where possible. If they live in different systems, use an inbox, idempotency key, unique business constraint, or reconciliation process. A marker written first can cause a crash to skip an effect that never completed.

## Backpressure

If producers publish faster than consumers can process, backlog grows:

```text
production rate > processing rate → queue age increases → latency increases
```

Backpressure keeps the system from accepting work without bound. Options include:

- reject or defer new work;
- cap queue depth or bytes;
- slow producers with rate limits;
- reduce consumer concurrency when dependencies are overloaded;
- drop or coalesce optional work;
- prioritize critical messages.

Returning success while placing unlimited work into a queue only moves overload into delayed failure. Define the maximum acceptable age and what the producer should do when the budget is exhausted.

## Consumer concurrency

More consumers do not always increase throughput. The bottleneck may be a database connection pool, downstream API, CPU, or ordering requirement.

```ts
const worker = async () => {
  while (!shutdownRequested()) {
    const message = await broker.receive({ visibilityTimeoutMs: 30_000 });
    if (!message) continue;

    try {
      await handleMessage(message);
    } catch (error) {
      await handleFailure(message, error);
    }
  }
};
```

Bound concurrency with a worker pool or semaphore. Scale from queue age and processing latency, not only message count. A short queue of expensive jobs can represent more work than a long queue of cheap ones.

## Ordering and partitioning

Many brokers preserve ordering only within a partition, key, or queue. If events for one account must be processed in order, use the account ID as the partition key:

```text
account-1 → partition 0: A → B → C
account-2 → partition 1: X → Y
```

Ordering reduces parallelism. Decide whether the domain requires strict order, per-entity order, or only eventual convergence. Consumers should reject or defer stale events using versions rather than assuming delivery order across the entire system.

## Retries and dead letters

Classify failures before retrying:

```ts
const handleFailure = async (message: Message, error: unknown) => {
  if (isTransient(error) && message.attempt < 5) {
    await broker.retry(message, { delayMs: backoff(message.attempt) });
    return;
  }

  await broker.deadLetter(message, { reason: classify(error) });
};
```

Retry transient dependency failures with bounded exponential backoff and jitter. Do not retry malformed messages forever. A dead-letter queue is a holding area for investigation and replay, not a place where failures disappear.

Be careful with visibility timeout and retries: the original lease must be released or extended correctly. A slow message can otherwise be processed by multiple workers while its retry is also scheduled.

## Poison messages

A poison message fails every time because its schema, data, or business state is invalid. It can block an ordered partition or consume all worker capacity.

Protect the pipeline with attempt limits, dead-letter routing, per-message timeouts, and metrics. Preserve the original payload, message ID, error classification, and relevant headers for diagnosis. Replay only after the cause is fixed, and make replay idempotent.

## Transactional publishing

If a producer changes local state and publishes a message, two independent writes create a dual-write gap:

```text
database commits → process crashes → message never published
```

Use an outbox record in the same local transaction:

```text
business state + outbox message → one commit
outbox publisher → broker → consumer
```

The publisher may publish an outbox row more than once, so message IDs and consumer idempotency are required. Mark an outbox row published only after the broker confirms acceptance.

## Schema evolution

Messages outlive the process that produced them. Version event schemas and keep consumers tolerant of fields they do not need:

```ts
type OrderPlaced = {
  type: 'order.placed';
  version: 2;
  orderId: string;
  customerId: string;
  totalInCents: number;
};
```

Prefer additive changes, explicit units, and compatibility tests. A consumer should fail clearly on an unsupported version rather than interpreting new data as old data. Retained logs and dead letters require a migration or replay plan.

## Observability

Track the whole handoff:

- publish success and failure rate;
- queue depth, oldest message age, and throughput;
- processing latency and active concurrency;
- acknowledgment, retry, and dead-letter counts;
- duplicate delivery and idempotency hits;
- per-partition lag and hot-key skew;
- dependency failures and consumer shutdowns.

Propagate correlation and causation IDs so an initiating request can be connected to asynchronous work. Log message IDs, not full sensitive payloads.

## Graceful shutdown

Consumers should stop receiving new work, finish or safely release in-flight messages, and then exit:

```text
stop intake → finish within deadline → acknowledge completed work
            ↘ release / retry unfinished work
```

Set a shutdown deadline. If work cannot finish safely, let the broker redeliver it rather than acknowledging it prematurely. Make handlers cancellation-aware when operations can be stopped without partial effects.

## Testing Producer / Consumer systems

Test publishing and handling independently, then test the delivery contract:

```ts
it('reprocesses a duplicate without repeating the business effect', async () => {
  await consumeImageUploaded(event);
  await consumeImageUploaded(event);

  expect(thumbnails.save).toHaveBeenCalledOnce();
});
```

Also test retries, poison messages, dead letters, out-of-order events, visibility expiry, consumer crashes, broker outages, backpressure, schema versions, and graceful shutdown. Load tests should measure queue age and downstream saturation, not just producer throughput.

## Common mistakes

### Acknowledging before processing

This can lose work on a crash. Acknowledge after the effect is durable or use a documented transactional broker feature.

### Assuming exactly-once delivery

At-least-once delivery means duplicates are expected. Make effects idempotent.

### Unbounded queues

Queue depth can hide overload until users experience extreme delay. Bound backlog and define producer behavior when capacity is exhausted.

### Retrying everything

Invalid messages and permanent business failures waste capacity and delay healthy work. Classify errors and dead-letter non-retryable messages.

### Ignoring ordering scope

Global ordering is expensive and often unnecessary. State whether order is required globally, per tenant, or per entity.

### Publishing with a dual write

A database commit and broker publish can diverge. Use an outbox or equivalent recovery mechanism.

## A practical checklist

Before introducing Producer / Consumer, ask:

- What work should be asynchronous, and what does the producer promise after publish?
- Is a queue, log, or pub/sub topic the right delivery model?
- When is a message acknowledged, and what happens after a crash?
- Are consumers idempotent under duplicate delivery?
- How are retries, backoff, poison messages, and dead letters handled?
- What are the queue, age, concurrency, and downstream capacity limits?
- Which ordering and partitioning guarantees does the domain require?
- How are database changes and published messages made reliable together?
- Can operators observe lag, retries, duplicates, and stuck work?

## Final thoughts

Producer / Consumer decouples creation from processing and gives a system room to absorb bursts, scale workers, and isolate failures. The queue is not a magic buffer: its acknowledgment, durability, ordering, retry, and capacity rules define the real behavior.

Start with a clear message contract, idempotent consumers, bounded backlog, and observable lag. Add partitioning, priority, batching, and replay when the workload demands them, while keeping overload and recovery behavior explicit.
