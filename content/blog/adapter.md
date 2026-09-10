---
title: "Core Patterns: Adapter"
description: A practical guide to the Adapter pattern, how it translates incompatible interfaces, and how to isolate external systems from application code.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Adapter pattern makes one interface usable where another interface is expected.

An adapter translates between two contracts without requiring either side to know about the other. It can wrap a third-party SDK, convert a legacy API, map a database record to a domain object, or make a platform capability fit an application-facing interface.

The main benefit is boundary control. Application code can depend on the language and shape it needs while provider-specific details stay at the edge.

## The problem Adapter solves

Suppose the application needs to send an email:

```ts
type EmailSender = {
  send(input: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void>;
};
```

An external provider may expose a very different API:

```ts
await sendGridClient.send({
  personalizations: [{ to: [{ email: input.to }] }],
  from: { email: 'hello@example.com' },
  content: [{ type: 'text/plain', value: input.text }],
  subject: input.subject,
});
```

If every use case constructs this provider payload directly, SendGrid's model spreads throughout the application. Changing providers becomes expensive, and business code needs to understand infrastructure details.

An adapter translates the application contract into the provider contract:

```ts
export const createSendGridEmailSender = (
  client: SendGridClient,
  from: string,
): EmailSender => ({
  async send(input) {
    await client.send({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: from },
      content: [{ type: 'text/plain', value: input.text }],
      subject: input.subject,
    });
  },
});
```

The rest of the application depends on `EmailSender`. Only the adapter knows how the provider expects the request to be shaped.

## Object adapters and function adapters

An adapter can be an object that implements an interface:

```ts
type PaymentGateway = {
  charge(input: ChargeInput): Promise<ChargeResult>;
};

class StripePaymentAdapter implements PaymentGateway {
  constructor(private readonly stripe: StripeClient) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const payment = await this.stripe.paymentIntents.create({
      amount: input.amountInCents,
      currency: input.currency,
      payment_method: input.paymentMethodId,
      confirm: true,
    });

    return {
      id: payment.id,
      status: payment.status === 'succeeded' ? 'succeeded' : 'pending',
    };
  }
}
```

For a small boundary, a function may be enough:

```ts
const createCurrencyFormatter = (
  formatter: Intl.NumberFormat,
) => (amount: number) => formatter.format(amount / 100);
```

The pattern is about translation, not about a particular syntax. Choose the smallest shape that makes the boundary clear.

## Adapters translate meaning, not only names

A weak adapter mechanically renames fields and leaves provider concepts exposed. A useful adapter translates into application language and handles meaningful differences.

```ts
const toPaymentResult = (payment: StripePaymentIntent): ChargeResult => ({
  id: payment.id,
  status: payment.status === 'succeeded' ? 'succeeded' : 'pending',
});
```

The application may not need to know that Stripe has `payment_intents`, `requires_action`, or provider-specific status values. The adapter can map those values to the smaller set of states the application actually supports.

This does not mean hiding important information. If the application needs a special action or failure reason, add it deliberately to the application contract rather than leaking the entire SDK response.

## Wrapping legacy code

Adapters are useful when introducing a new interface around existing code.

```ts
type UserRepository = {
  findById(id: string): Promise<User | null>;
};

type LegacyUserStore = {
  getUser(userId: number, callback: (error: Error | null, row?: UserRow) => void): void;
};

export const createUserRepository = (
  store: LegacyUserStore,
): UserRepository => ({
  findById(id) {
    return new Promise((resolve, reject) => {
      store.getUser(Number(id), (error, row) => {
        if (error) return reject(error);
        resolve(row ? mapUserRow(row) : null);
      });
    });
  },
});
```

The new application code can use promises, string identifiers, and domain users. The legacy callback API is confined to one adapter.

An adapter is often a migration tool: it lets the rest of the system move toward a better contract before the underlying implementation can be replaced.

## Mapping external data into domain data

Adapters can translate inbound data as well as outbound requests.

```ts
type User = {
  id: string;
  displayName: string;
  joinedAt: Date;
};

type UserRecord = {
  user_id: string;
  display_name: string | null;
  created_at: string;
};

const mapUserRecord = (record: UserRecord): User => ({
  id: record.user_id,
  displayName: record.display_name ?? 'Unnamed user',
  joinedAt: new Date(record.created_at),
});
```

The mapping function keeps database naming, nullability, and serialization concerns out of the domain model. If the database schema changes, the adapter is a natural place to update the translation.

Validate external data when trust boundaries require it. A mapping function should not silently convert malformed input into plausible but incorrect domain data.

## Adapters in frontend applications

Frontend applications often need adapters for browser APIs, analytics providers, maps, or design-system components.

```ts
type Analytics = {
  track(name: string, properties?: Record<string, string>): void;
};

type VendorAnalytics = {
  capture(event: string, properties?: Record<string, unknown>): void;
};

export const createAnalyticsAdapter = (
  vendor: VendorAnalytics,
): Analytics => ({
  track(name, properties) {
    vendor.capture(name, properties);
  },
});
```

Components can depend on the small `Analytics` contract instead of importing a vendor SDK. Tests can provide a fake collector, and the application can replace analytics vendors without changing every component.

An adapter can also normalize browser differences:

```ts
type StoragePort = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

export const createStorageAdapter = (
  storage: Storage,
): StoragePort => ({
  get: (key) => storage.getItem(key),
  set: (key, value) => storage.setItem(key, value),
});
```

The feature depends on `StoragePort`, which can be backed by `localStorage`, `sessionStorage`, or an in-memory test implementation.

## Adapter versus Facade

An Adapter changes one interface into another so an existing client can use it. A Facade provides a simpler interface over a subsystem, usually without pretending to implement an existing contract.

```ts
// Adapter: fits a vendor into an application contract.
const emailSender: EmailSender = createSendGridEmailSender(client, from);

// Facade: gives a feature a simpler workflow over several services.
const checkout = createCheckoutFacade({
  inventory,
  payments,
  orders,
});
```

The same object can sometimes be both. The distinction is useful when deciding what the public contract should communicate.

## Adapter versus Decorator

A Decorator preserves an interface while adding behavior such as logging, caching, retries, or authorization. An Adapter changes the representation or contract so two incompatible sides can work together.

```ts
const loggedEmailSender: EmailSender = {
  async send(input) {
    logger.info('Sending email', { to: input.to });
    await emailSender.send(input);
  },
};
```

This wrapper has the same `EmailSender` interface and adds logging, so it is a decorator. The SendGrid wrapper is an adapter because it translates between different APIs.

## Errors and boundary behavior

External systems often have error models that do not fit application behavior. An adapter is a good place to translate known errors:

```ts
const toPaymentError = (error: unknown): PaymentError => {
  if (error instanceof StripeCardError) {
    return new PaymentError('payment_declined', error.message);
  }

  return new PaymentError('provider_unavailable', 'Payment service unavailable');
};
```

Do not erase information that callers need for retry, user messaging, or observability. Define an application error contract that preserves the distinctions that matter and hides provider details that do not.

The adapter should also define timeout, retry, idempotency, and cancellation behavior when those concerns belong to the integration boundary. Keep policy explicit; do not let an SDK's defaults become accidental application behavior.

## Testing adapters

Adapters deserve focused tests because they are translation boundaries. Test that application input becomes the correct provider request and that provider output becomes the correct application result.

```ts
it('maps a successful provider response', async () => {
  const client = {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_1',
        status: 'succeeded',
      }),
    },
  };

  const gateway = new StripePaymentAdapter(client);
  const result = await gateway.charge(input);

  expect(result).toEqual({ id: 'pi_1', status: 'succeeded' });
});
```

Keep these tests close to the adapter. Higher-level business tests can use a fake application-facing contract instead of repeating provider payload details.

## Common mistakes

### Leaking the vendor type

If `EmailSender.send` accepts a `SendGridMailData` object, the adapter has not created a meaningful boundary. Define the contract in application language.

### Adding business policy accidentally

An adapter may normalize data and translate errors, but it should not decide unrelated business rules. Keep discount eligibility, authorization policy, and order state transitions in the appropriate domain or application module.

### A two-way translation with no clear owner

When mapping is complex in both directions, define separate inbound and outbound adapters or a dedicated anti-corruption layer. One giant adapter can become a second domain model with unclear ownership.

### Ignoring semantic differences

Two APIs may use the same field name with different units, timezone assumptions, or meanings. Document and test conversions such as cents versus dollars, UTC versus local time, and inclusive versus exclusive limits.

### Testing only that the SDK was called

An adapter can call the correct SDK method with an incorrect payload. Assert the meaningful translated request and result, not only that some method was invoked.

## A practical checklist

When creating an adapter, ask:

- Which application-facing contract should the code depend on?
- What external or legacy interface needs translation?
- Which field, unit, error, and lifecycle differences matter?
- Is the adapter translating or taking on unrelated business policy?
- Can the external dependency be replaced with a fake in higher-level tests?
- Are inbound and outbound mappings tested separately?
- Is the adapter located at the system boundary?

Keep adapters thin, named after the boundary they translate, and easy to replace. A good adapter should make the rest of the code less aware of the external system over time.

## How Adapter connects to other design ideas

Adapters are a practical application of the [Dependency Inversion Principle: Depend on Abstractions](/blog/dependency-inversion-principle). Application code depends on its own contract while infrastructure implements that contract around an external system.

They often live behind a [Module](/blog/module) boundary and are assembled with a [Factory](/blog/factory). The factory can create a provider-specific adapter while the module exports only the application-facing capability.

Adapters also support [Separation of Concerns: Keep Each Part Focused](/blog/separation-of-concerns) by keeping translation, domain behavior, and external communication in distinct places.

When several adapters are combined into one workflow, [Composition: Build Behavior by Combining Small Parts](/blog/composition) makes those relationships explicit at the application boundary.

## Final thoughts

The Adapter pattern protects your application from interfaces it does not control. Translate external types, errors, units, and lifecycle rules at the boundary, then let the rest of the system use a smaller and more meaningful contract.

Use adapters when incompatibility is real, not as a wrapper around every function. A thin, well-tested adapter can make replacing a vendor, modernizing a legacy API, or supporting multiple environments much less disruptive.
