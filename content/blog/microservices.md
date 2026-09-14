---
title: "Microservices: Distributed Boundaries with a Real Cost"
description: A practical guide to microservices, including service boundaries, communication, data ownership, consistency, observability, deployment, and when not to use them.
date: "2026-09-14"
category: Architecture
readingTime: 9 min read
featured: false
published: true
---

Microservices architecture splits an application into independently deployable services, each owning a focused business capability and communicating through explicit network contracts.

The important word is independently. A system is not meaningfully microservices-based merely because it has several processes or repositories. A service should be able to evolve, deploy, scale, and fail with a useful degree of autonomy.

```text
Catalog service ── API / events ── Orders service ── API / events ── Fulfillment service
```

Microservices can improve team autonomy, scaling, and fault isolation. They also introduce network failures, distributed data, operational overhead, and more complicated consistency. The architecture is valuable when those trade-offs solve real problems.

## Why teams choose microservices

A single application may eventually encounter different kinds of pressure:

- One capability needs to scale much more than the others.
- A team needs to deploy one area independently.
- A component requires stronger security or availability isolation.
- Different capabilities have genuinely different technology or runtime needs.
- The organization has multiple teams that need clear ownership.

Microservices can address these pressures by giving a service its own deployable lifecycle:

```text
One large deployment                    Independent services
┌─────────────────────┐                 ┌────────┐ ┌────────┐
│ catalog + orders +  │                 │catalog │ │orders  │
│ payments + shipping │                 │deploy  │ │deploy  │
└─────────────────────┘                 └────────┘ └────────┘
```

But the benefit is not free. Each service needs deployment automation, logging, metrics, alerting, security controls, ownership, and a strategy for compatibility. A service boundary turns a function call into a distributed interaction.

## Start with business capabilities

Service boundaries should follow business capabilities or bounded contexts, not technical layers:

```text
Good candidates: catalog, orders, payments, fulfillment
Risky candidates: controllers, database, validation, email-utils
```

The [Domain-Driven Design](/blog/domain-driven-design) approach is useful here. Ask which concepts and rules belong together, which team owns them, and which vocabulary applies within the boundary.

A service should own a meaningful capability end to end. The orders service might own order state, order invariants, and order workflows. It should not require every small decision to synchronously call six other services, or its autonomy is mostly an illusion.

## A service owns its data

Each service should be the authoritative owner of its business data:

```text
Orders service     → orders and order_lines
Payments service   → payment attempts and authorizations
Catalog service    → listings and product descriptions
```

Other services should use an API or consume an event rather than writing directly to another service's database.

```ts
// Orders asks Payments for a capability.
const authorization = await payments.authorize({
  orderId,
  amount,
  currency,
});
```

Direct database access creates a distributed monolith: services can deploy separately, but their schemas and release timing remain tightly coupled. It also makes it unclear which service is allowed to enforce a rule.

Separate databases are often useful for ownership, but they do not automatically create a good boundary. Start by defining data ownership and contracts. Storage isolation should reinforce the boundary rather than substitute for it.

## Synchronous communication

An HTTP or RPC call is appropriate when a caller needs an immediate answer:

```text
Checkout API → Orders.authorizeOrder()
                   ↓
              Payment result
```

The caller must handle ordinary distributed-system failures:

- The service may be unavailable.
- The request may time out even though the operation succeeded.
- A retry may duplicate the operation.
- The response may be slow because of downstream dependencies.

Use timeouts and explicit retry policies. Make state-changing operations idempotent where retries are possible:

```ts
type AuthorizePaymentInput = {
  idempotencyKey: string;
  orderId: string;
  amount: number;
};
```

The payment service can return the original result when it receives the same key again. A retry policy without idempotency can turn a temporary network problem into a duplicate charge.

## Asynchronous communication

Events allow a service to publish a fact without requiring every consumer to be available immediately:

```text
Orders commits order
      ↓
OrderConfirmed event
      ├── Fulfillment creates shipment
      ├── Notifications sends confirmation
      └── Analytics records conversion
```

An event should describe something that happened:

```ts
type OrderConfirmed = {
  type: 'order.confirmed';
  eventId: string;
  orderId: string;
  occurredAt: string;
};
```

Consumers need to tolerate duplicate delivery and, depending on the broker, out-of-order delivery. Store processed event IDs or make handlers naturally idempotent.

An outbox pattern can connect a database transaction to event publication:

```text
transaction:
  update order
  insert outbox event

worker:
  read unpublished event
  publish it
  mark it published
```

This avoids the failure window where the order commits but the process crashes before publishing the event. It does not provide exactly-once behavior; consumers still need safe retry handling.

## Distributed transactions and sagas

In a monolith, one database transaction can often update several tables atomically. Across services, a transaction cannot simply span every database.

Suppose checkout requires inventory reservation, payment authorization, and order confirmation:

```text
Create order → reserve stock → authorize payment → confirm order
                  │                  │
              failure             failure
                  ↓                  ↓
             release stock      cancel order / release stock
```

A saga coordinates a multi-step business process through local transactions and compensating actions. It can be orchestrated by one workflow service or choreographed through events.

Compensation is not a time machine. A refund may be required after a payment, and a stock release may take time. The business must define intermediate states such as `pending_payment` or `awaiting_fulfillment` and explain them to users.

Do not split a workflow across services until its consistency requirements are understood. If several pieces must always change together, they may belong in one service or one [Modular Monolith](/blog/modular-monolith) module.

## Version APIs and events

Independent deployment requires compatibility. A producer may deploy before all consumers have upgraded.

Prefer additive changes:

```ts
type OrderConfirmedV2 = {
  type: 'order.confirmed';
  orderId: string;
  occurredAt: string;
  customerId?: string;
};
```

Adding an optional field is usually safer than renaming or removing one. For breaking changes, support both versions during migration, publish a new event type, or use explicit content negotiation.

Contracts should be tested. Consumer-driven contract tests can verify that a provider still satisfies the fields and behaviors a consumer relies on. Schema validation helps, but a valid shape does not guarantee correct business semantics.

## Resilience patterns

Every remote dependency needs a failure policy. Useful patterns include:

- Timeouts so a slow dependency does not consume all request capacity.
- Retries only for transient failures, with backoff and a bounded attempt count.
- Circuit breakers to stop repeatedly calling an unhealthy dependency.
- Bulkheads to prevent one dependency from exhausting all worker capacity.
- Fallbacks or degraded modes when the business can accept them.
- Idempotency keys for safely retrying commands.

For example, a product search service might temporarily show a cached result, while a payment authorization should fail clearly rather than silently pretending it succeeded.

Resilience must match business meaning. A retry is not automatically safe, and a fallback is not automatically honest.

## Observability is part of the architecture

When a request crosses process boundaries, local logs are not enough. A production system needs a way to follow one business operation through its services.

```text
trace-id: 7f3a
API → orders → payments → event broker → fulfillment
```

Use correlation or trace IDs across HTTP calls and messages. Record structured events with service name, operation, entity ID, outcome, and duration. Monitor both technical health and business signals:

- Request latency and error rate.
- Queue depth and event age.
- Retry and dead-letter counts.
- Payment authorization success rate.
- Time from order confirmation to shipment creation.

Distributed tracing helps locate a slow hop, but it does not replace domain-level metrics. A service can be healthy while the business workflow is stuck in a pending state.

## Deployment and ownership

Independent services need independent operational ownership. A service is not complete when its code is deployed; it also needs:

```text
source → build → test → deploy → observe → recover
```

Define who owns the service, how it is released, what alerts mean, how it is rolled back, and how its data is backed up or migrated.

Automated deployment matters because manual coordination recreates the release coupling microservices were meant to reduce. Teams should be able to deploy a compatible change without scheduling the entire system's release.

## Security between services

Network boundaries are security boundaries. Do not assume that an internal network is trusted.

Services should authenticate callers, authorize operations, protect sensitive data in transit, and use least-privilege credentials for databases and brokers. Propagate user identity carefully: a service should distinguish the end user from the service account making the request.

Audit important business actions at the service that owns the rule. A gateway log can show that a request arrived, but only the payments service can reliably record that an authorization was approved or declined.

## Testing microservices

Use several layers of testing:

```text
unit tests              → domain rules and local policies
integration tests       → database and provider adapters
contract tests          → API and event compatibility
workflow tests          → multi-service business scenarios
production checks       → health, metrics, and safe delivery
```

Do not rely only on end-to-end tests. They are valuable but slow and often difficult to diagnose. Contract tests let a service verify its assumptions without starting every consumer.

Test failure paths deliberately: timeouts, duplicate messages, partial completion, expired credentials, unavailable databases, and incompatible versions. In a distributed system, those are normal states rather than exotic edge cases.

## Microservices and a Modular Monolith

A Modular Monolith and microservices can use similar domain boundaries. The difference is primarily the deployment and process boundary:

```text
Modular Monolith → in-process calls, one deployment, shared runtime
Microservices    → network calls, independent deployments, separate runtimes
```

Starting with a Modular Monolith is often a strong choice when the domain and boundaries are still being learned. It keeps local development and transactions simpler while encouraging ownership and explicit APIs. A well-factored module can later be extracted if independent scaling or deployment becomes necessary.

The extraction path is not automatic. Before moving a module out, identify its public contracts, database dependencies, event behavior, consistency expectations, and operational requirements. The [Hexagonal Architecture](/blog/hexagonal-architecture) approach can help keep infrastructure behind ports while the boundary is still in one process.

## Common failure modes

### Services split by technical layer

Separate “API,” “database,” and “business logic” services produce network hops without independent business ownership. Split around capabilities instead.

### Shared database tables

Multiple services writing the same tables creates hidden coupling, unclear invariants, and coordinated migrations. Assign one authoritative owner.

### Distributed monolith

If every request synchronously calls every service and all releases must happen together, the system has the cost of distribution without much autonomy. Reduce synchronous dependencies or reconsider the boundary.

### Chatty communication

Many small calls for one screen or workflow increase latency and failure probability. Design APIs around meaningful use cases or provide read projections for consumer needs.

### Events without ownership

If no service owns the meaning of an event or consumers cannot handle duplicates, asynchronous communication becomes an unreliable source of hidden behavior. Define schemas, ownership, and recovery.

### No platform support

Service teams cannot be expected to reinvent deployment, tracing, secrets, alerts, and local development independently. Shared platform capabilities are part of the cost model.

### Splitting too early

Unclear domain boundaries become expensive to change once they are network boundaries. Learn the model inside a modular application before distributing it when possible.

## A practical checklist

Before creating a service, ask:

- What business capability does it own?
- Which rules and data are authoritative inside it?
- Can it be deployed and operated independently?
- Which interactions require immediate responses?
- Which facts can be handled asynchronously?
- How will retries and duplicate commands be handled?
- What happens when a downstream service is unavailable?
- How will transactions and partial failures be recovered?
- Are APIs and events versioned and contract-tested?
- Can operators trace a business operation across services?
- Would a Modular Monolith solve the current problem with less risk?

If these questions do not have clear answers, the boundary probably needs more discovery before it becomes a service.

## Final thoughts

Microservices are a way to buy independent deployment, scaling, ownership, and failure isolation by accepting distributed-systems complexity.

Start with business capabilities and explicit data ownership. Keep APIs meaningful, make commands idempotent, treat events as durable contracts, and design for partial failure from the beginning. Invest in observability and automated delivery as part of the architecture, not as follow-up work.

When the domain is still changing or the organization is small, a well-structured Modular Monolith may be the more responsible choice. Extract services when the need for autonomy is clear and the boundary is strong enough to survive the network between them.
