---
title: "Backend and distributed-system patterns: Idempotency"
description: A practical guide to idempotency, how to make retries safe, and how to prevent duplicate effects across APIs, queues, and distributed workflows.
date: "2026-09-13"
category: Backend
readingTime: 8 min read
featured: false
published: true
---

An operation is idempotent when applying it more than once has the same intended effect as applying it once.

```text
f(f(state)) = f(state)
```

In distributed systems, duplicate delivery is normal. A client may retry after a timeout, a proxy may replay a request, or a message consumer may crash after completing work but before acknowledging it. Idempotency makes those repetitions safe.

Idempotency does not mean every repeated request returns the same bytes or that every operation has no side effects. It means duplicate attempts do not create duplicate business effects.

## Why duplicates happen

Consider a payment request:

```text
client → service → payment provider charges card
                         ↓
                    response lost
client retries → service → payment provider charges card again
```

The first charge may have succeeded even though the client saw a timeout. Without a stable identity for the intended operation, the service cannot distinguish a retry from a new payment.

The same problem appears with order creation, email delivery, inventory reservation, webhook handling, queue consumption, and scheduled jobs.

## Idempotency keys

An API client can send a key representing one logical operation:

```http
POST /payments
Idempotency-Key: checkout-9f4d2
```

The key must be scoped to the operation and actor. A practical record stores the request fingerprint, status, and result:

```ts
type IdempotencyRecord = {
  key: string;
  scope: string;
  requestHash: string;
  status: 'processing' | 'succeeded' | 'failed';
  response?: { status: number; body: unknown };
  createdAt: Date;
  expiresAt: Date;
};
```

Do not treat a client-generated key as universally unique without a scope. The same key can be valid for two different users, merchants, or endpoints.

## Claiming a key atomically

The first request must claim the key atomically before performing the side effect:

```ts
const startIdempotentOperation = async (
  input: { key: string; scope: string; requestHash: string },
  records: {
    insertIfAbsent(record: IdempotencyRecord): Promise<boolean>;
    find(key: string, scope: string): Promise<IdempotencyRecord | null>;
  },
) => {
  const inserted = await records.insertIfAbsent({
    ...input,
    status: 'processing',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  if (inserted) return { kind: 'owner' as const };

  const existing = await records.find(input.key, input.scope);
  if (!existing) throw new Error('idempotency_record_disappeared');
  if (existing.requestHash !== input.requestHash) {
    throw new Error('idempotency_key_reused_for_different_request');
  }

  return { kind: 'duplicate' as const, existing };
};
```

Use a database unique constraint or an atomic store operation. A read-then-insert sequence has a race:

```text
request A reads: key missing
request B reads: key missing
request A inserts
request B inserts
both perform the effect
```

The idempotency record and the business effect should be coordinated when possible, usually in one database transaction.

## Replaying the result

For a completed duplicate, return the stored result rather than running the operation again:

```ts
const createPayment = async (request: PaymentRequest) => {
  const result = await startIdempotentOperation(toIdempotencyInput(request));
  if (result.kind === 'duplicate') {
    if (result.existing.status === 'processing') {
      throw new ConflictError('operation_in_progress');
    }

    return result.existing.response;
  }

  const payment = await payments.charge(request);
  const response = toPaymentResponse(payment);
  await records.complete(request.idempotencyKey, response);
  return response;
};
```

Returning the original response is often the clearest API contract. If the first attempt returned a success, a retry receives that success. If the first attempt failed permanently, replay the same failure or define a safe retry-after-failure policy.

Do not leave `processing` records forever. Use leases, expiration, reconciliation, or an explicit recovery workflow for crashed owners. A duplicate request can safely retry after a lease expires only if the underlying business operation is also protected from duplicate effects.

## Idempotency and database constraints

Database uniqueness is a strong foundation:

```sql
create unique index payments_merchant_operation_key
on payments (merchant_id, idempotency_key);
```

The unique business key can prevent duplicate rows even if the application crashes between the idempotency check and insert. Prefer enforcing important invariants in the database as well as in application code.

For an order, the operation key may be stored directly on the order record. For a multi-step workflow, a dedicated idempotency table can track the key, request hash, current state, and response metadata.

## Messages and at-least-once delivery

Queue consumers should assume a message may be delivered more than once:

```ts
const consumePaymentCaptured = async (event: PaymentCapturedEvent) => {
  const claimed = await processedEvents.insertIfAbsent({
    eventId: event.id,
    processedAt: new Date(),
  });
  if (!claimed) return;

  await ledger.recordCapture(event.paymentId, event.amount);
};
```

The claim and the side effect should be in one transaction. If the consumer records `eventId` first and crashes before updating the ledger, a retry may be skipped even though the business effect never happened.

```text
unsafe:
mark processed → crash → effect missing → retry skipped

safer:
effect + processed marker → one transaction → acknowledge
```

When the effect and marker live in different systems, use an outbox, inbox, transactional broker feature, or a reconciliation process. No single technique removes every partial-failure window; the important part is making recovery explicit.

## Naturally idempotent operations

Some operations are naturally idempotent:

```ts
await users.update(userId, { marketingOptIn: true });
```

Repeating the same assignment produces the same state. Other operations are not:

```ts
await account.incrementBalance(10); // repeats the increment
await emails.sendWelcomeMessage();   // repeats the side effect
```

Use absolute state-setting commands where the domain allows it. For increments, transfers, sends, and reservations, introduce an operation ID or transaction identity and enforce uniqueness around that identity.

## Request fingerprints

An idempotency key should not be reusable for a different payload. Store a canonical request fingerprint:

```ts
const requestHash = sha256(canonicalJson({
  amount: input.amount,
  currency: input.currency,
  paymentMethodId: input.paymentMethodId,
}));
```

Canonicalization must be deterministic. Define which fields belong to the operation and exclude transport details such as header order. If the same key arrives with a different fingerprint, reject it as a client error rather than silently returning the old result.

Never hash secrets into logs or expose raw idempotency records. Store only the fields needed to validate and replay the operation, with retention and access controls appropriate to the data.

## Scope and retention

Idempotency records need a retention period long enough to cover the retry window and delayed duplicate delivery. The correct duration depends on the API, queue retention, client behavior, and business risk.

```text
key scope: merchant + endpoint + key
retention: at least the maximum expected retry / replay window
cleanup: safe expiration with metrics and auditability
```

If a key expires while a client is still retrying, the operation may run again. Choose expiration based on the actual delivery system, not an arbitrary short TTL. For financial or audit-sensitive effects, retain a durable operation record longer than the transport's retry window.

## Concurrency and in-progress requests

Two identical requests can arrive concurrently. Possible policies include:

- one owns the operation and others wait;
- duplicates receive `409 Conflict` with a retry hint;
- duplicates poll an operation resource;
- duplicates receive the eventual result through a shared promise or job status.

Waiting inside a request can exhaust workers. For long operations, return an operation ID and expose a status endpoint or send a completion event. For short operations, a bounded wait can improve client ergonomics.

## Idempotency across services

An API idempotency key does not automatically make every downstream call idempotent. Propagate a stable operation ID:

```text
client key → order operation ID → payment operation ID → ledger event ID
```

Each service should define its own uniqueness scope and durable record. Do not reuse a single global key without understanding collisions, privacy boundaries, and service-specific retry semantics.

Idempotency is often paired with the outbox pattern: commit the business change and an event record together, then publish the event repeatedly until consumers acknowledge it. Consumers use inbox or processed-event records to make handling safe.

## Testing idempotency

Test retries and crashes, not only sequential duplicate calls:

```ts
it('returns the original result for a repeated key', async () => {
  const charge = vi.fn().mockResolvedValue({ id: 'charge-1' });
  const first = await createPayment({ ...request, charge });
  const second = await createPayment({ ...request, charge });

  expect(second).toEqual(first);
  expect(charge).toHaveBeenCalledOnce();
});
```

Also test concurrent requests, different payloads with the same key, expired keys, process failure after claiming, failure after the side effect, duplicate messages, out-of-order events, and replay of a stored error. Integration tests should verify unique constraints and transaction boundaries.

## Common mistakes

### Read-then-write deduplication

A non-atomic existence check races under concurrent requests. Use a unique constraint or atomic insert.

### Marking success too early

If the marker commits before the business effect, a crash can turn an incomplete operation into a permanently skipped one.

### Keys without scope

The same key can collide across tenants, endpoints, or operations. Define and enforce its scope.

### Reusing a key for new intent

A client must create a new key when it means “perform a new operation.” Reject payload changes under an existing key.

### Permanent processing locks

Crashes happen. Use leases and reconciliation for records stuck in progress.

### Assuming response replay is always possible

Some responses contain temporary URLs, sensitive data, or state that has changed. Store and replay only what the API contract permits, or return a durable operation status instead.

## A practical checklist

Before making an operation idempotent, ask:

- What is the logical operation and what duplicate effect must be prevented?
- Can the operation be changed into an absolute state update?
- Where is the idempotency key generated, scoped, and stored?
- Is claiming atomic under concurrent requests?
- Are the business effect and marker in one transaction or covered by recovery machinery?
- What happens when a duplicate arrives while processing is in progress?
- How are request payload changes detected?
- How long are records retained, and how are stuck operations reconciled?
- Does the operation ID propagate across downstream services and messages?

## Final thoughts

Idempotency turns uncertain delivery into a safe, repeatable operation. Start by naming the logical operation, give it a stable identity, claim that identity atomically, and coordinate the marker with the business effect.

Design for crashes between every meaningful step. With durable records, unique constraints, explicit retry windows, and observable recovery, clients and message brokers can retry without multiplying real-world side effects.
