---
title: "Structural and Architectural Patterns: Repository"
description: A practical guide to the Repository pattern, how to isolate persistence behind a domain-friendly interface, and when it improves application architecture.
date: "2026-09-11"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Repository pattern provides a collection-like interface for accessing domain objects while hiding persistence details such as SQL, HTTP calls, an ORM, or a document database.

The application asks for domain data:

```ts
const user = await users.findById(userId);
```

It does not need to know whether the data came from PostgreSQL, a cache, a remote service, or an in-memory test double.

The repository owns the translation between the application's model and the storage mechanism. A service or use case owns the workflow and business decisions.

## The problem a Repository solves

Without a boundary, persistence details spread through application code:

```ts
const createWelcomeMessage = async (userId: string) => {
  const row = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!row[0]) throw new Error('User not found');

  return `Welcome, ${row[0].display_name}`;
};
```

This function now knows the database schema, query builder, row shape, and not-found behavior. Every use case that needs a user may repeat those details.

A repository moves persistence-specific code behind a small boundary:

```ts
type User = {
  id: string;
  displayName: string;
  email: string;
};

type UserRepository = {
  findById: (id: string) => Promise<User | null>;
};

const createWelcomeMessage = async (
  userId: string,
  users: UserRepository,
) => {
  const user = await users.findById(userId);

  if (!user) throw new Error('User not found');

  return `Welcome, ${user.displayName}`;
};
```

The use case depends on a domain-friendly capability rather than a particular database.

## Repository as a boundary

A repository usually has two responsibilities:

- Translate application queries into persistence operations.
- Translate persistence records into domain or application objects.

```ts
const createUserRepository = (database: Database): UserRepository => ({
  async findById(id) {
    const row = await database.user.findUnique({ where: { id } });

    if (!row) return null;

    return {
      id: row.id,
      displayName: row.display_name,
      email: row.email,
    };
  },
});
```

The mapping matters. A database row may use `snake_case`, nullable columns, generated fields, or storage-specific types. The rest of the application should not need to carry those details.

## Repository interfaces should follow use cases

Avoid creating a generic interface with every possible database operation:

```ts
type GenericRepository<T> = {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(value: T): Promise<T>;
  update(id: string, value: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
};
```

This can look reusable, but it often exposes operations that a particular domain does not need. It can also force unrelated entities into the same shape.

Prefer an interface based on the capability a workflow actually requires:

```ts
type ActiveUserRepository = {
  findActiveByEmail: (email: string) => Promise<User | null>;
};
```

Small interfaces are easier to implement, test, and replace. This follows the spirit of the [Interface Segregation Principle: Depend on Focused Contracts](/blog/interface-segregation-principle).

## Repositories and domain objects

A repository can return plain application data:

```ts
type Order = {
  id: string;
  status: 'draft' | 'submitted' | 'paid';
  total: number;
};
```

Or it can return a domain object with behavior:

```ts
class Order {
  constructor(
    readonly id: string,
    private status: 'draft' | 'submitted' | 'paid',
    readonly total: number,
  ) {}

  submit() {
    if (this.status !== 'draft') {
      throw new Error('Only draft orders can be submitted');
    }

    this.status = 'submitted';
  }
}
```

Choose based on the domain. A repository should not invent rich entities when the application only needs data. It should also not flatten important invariants into mutable records if the domain has meaningful behavior that must be protected.

## Query methods should express intent

Name repository methods after the question the application needs answered:

```ts
type OrderRepository = {
  findPendingByCustomer: (customerId: string) => Promise<Order[]>;
  findByPaymentReference: (reference: string) => Promise<Order | null>;
};
```

This is usually clearer than exposing a generic query builder to every caller:

```ts
// Application code should not need to know persistence syntax.
orders.where({ customerId, status: 'pending' });
```

The repository method can use a database query today and a different implementation tomorrow while preserving the application-facing question.

Do not make names misleading. A method called `findPendingByCustomer` should enforce the pending condition rather than return all orders and rely on each caller to filter them.

## Repositories and transactions

Repositories often participate in transactions, but they should not silently create a new transaction for every method call when a use case needs several operations to succeed or fail together.

One approach is to pass a transaction-scoped repository:

```ts
type OrderRepositories = {
  orders: OrderRepository;
  payments: PaymentRepository;
};

const createCheckout = async (
  input: CheckoutInput,
  repositories: OrderRepositories,
  transaction: Transaction,
) => {
  await transaction.run(async (context) => {
    const scoped = createRepositories(context);
    await scoped.orders.markPaid(input.orderId);
    await scoped.payments.record(input.payment);
  });
};
```

The exact API depends on the database and framework. The architectural point is ownership: the use case decides the transaction boundary when the business operation spans multiple persistence changes.

## Repositories and caching

A repository may read through a cache, but caching is an additional policy:

```ts
const createCachedUserRepository = (
  source: UserRepository,
  cache: UserCache,
): UserRepository => ({
  async findById(id) {
    const cached = await cache.get(id);
    if (cached) return cached;

    const user = await source.findById(id);
    if (user) await cache.set(id, user);
    return user;
  },
});
```

If the repository hides caching, document freshness, invalidation, and consistency behavior. A caller may assume `findById` reflects a recent write when it actually returns stale data.

For small in-process caches, a closure can keep cache state private. See [Memoization](/blog/memoization) for cache keys and lifetime, and [Lazy Initialization](/blog/lazy-initialization) for deferred resource setup.

## Repositories and external APIs

The pattern is not limited to databases. An external API can be wrapped in a repository-like boundary:

```ts
type ShippingRepository = {
  findQuote: (input: ShippingInput) => Promise<ShippingQuote>;
};

const createShippingRepository = (client: CarrierClient): ShippingRepository => ({
  async findQuote(input) {
    const response = await client.getQuote({
      postal_code: input.postalCode,
      weight_grams: input.weightGrams,
    });

    return {
      provider: response.carrier,
      amount: response.price,
      deliveryDays: response.delivery_days,
    };
  },
});
```

This boundary translates a vendor contract into the application's vocabulary. It can also own retries, rate limits, authentication, and response validation when those concerns belong to the integration.

Do not call every API client a repository. Use the name when the abstraction represents access to a collection or source of application data. An integration client may be a clearer name when the boundary primarily represents a remote service protocol.

## Testing with a repository

The main benefit for tests is that a use case can receive a small fake:

```ts
const users: UserRepository = {
  findById: async () => ({
    id: 'user-1',
    displayName: 'Ada',
    email: 'ada@example.com',
  }),
};

const message = await createWelcomeMessage('user-1', users);

expect(message).toBe('Welcome, Ada');
```

This test does not need a database, migration, network connection, or ORM. It tests the use-case decision independently.

The concrete repository should have its own integration tests against a realistic persistence environment. A fake proves how the use case responds to the repository contract; it does not prove that SQL, mapping, constraints, or indexes are correct.

## Repository versus Active Record

Repository and Active Record place persistence behavior in different locations.

With Active Record, a domain object commonly knows how to load and save itself:

```ts
const user = await User.findById(id);
await user.save();
```

With Repository, persistence is handled by a separate object:

```ts
const user = await users.findById(id);
await users.save(user);
```

Active Record can be productive for CRUD-heavy applications and frameworks that are built around it. Repository can be useful when domain logic should stay independent from persistence, when multiple data sources exist, or when testing and replacement boundaries matter.

Neither pattern is universally superior. Adding a repository over an ORM that already provides a clear domain-friendly API may only duplicate abstractions.

## Repository versus Data Access Object

A Data Access Object usually focuses on persistence mechanics: queries, rows, connections, and storage operations. A Repository usually speaks in domain or application concepts.

```ts
// DAO: storage-oriented
userTable.findByEmail(email);

// Repository: application-oriented
users.findActiveByEmail(email);
```

The names are not always used consistently, and the same class can have both responsibilities in a small application. The useful distinction is to identify which layer owns storage details and which layer owns domain-facing queries and mapping.

## Common mistakes

### A repository that mirrors the ORM

If every repository method simply forwards a generic ORM call, the abstraction may not be protecting anything. Add a repository where it creates a meaningful boundary, not as a mandatory wrapper around every table.

### Business rules inside persistence code

A repository should translate and retrieve data. Decisions such as whether an order may be cancelled or whether a discount applies usually belong in a domain service or use case.

Some query-specific rules do belong in repository methods—for example, `findActiveByEmail`—but keep workflow and policy separate from storage mechanics.

### Returning storage records directly

Leaking ORM entities, database rows, or API response objects forces the rest of the application to depend on external shapes. Map at the boundary when the distinction matters.

### One giant repository

A `DataRepository` with users, orders, reports, files, and settings becomes a service locator for persistence. Split repositories around cohesive capabilities and use cases.

### Hiding transaction and consistency behavior

Callers need to know whether reads are cached, whether writes are immediately visible, and whether multiple operations share a transaction. An abstraction should hide implementation details, not important operational guarantees.

### Over-mocking integration behavior

If every test uses only an in-memory fake, query bugs and mapping mistakes can reach production. Keep focused unit tests and a useful set of integration tests for the concrete repository.

## A practical repository checklist

Before introducing a Repository, ask:

- Is persistence detail spreading into domain or application workflows?
- What application-facing question does this repository answer?
- Is the interface focused on a real capability rather than generic CRUD?
- Where are record-to-domain mappings performed?
- Who owns transactions, caching, retries, and consistency guarantees?
- Can the use case be tested with a small fake?
- Are concrete repository queries covered by integration tests?
- Would the abstraction still be useful if the persistence technology stayed the same?

## Final thoughts

The Repository pattern creates a boundary between application behavior and persistence. A good repository speaks the language of the use case, maps storage details at the edge, and leaves workflow decisions to the layer that owns them.

Use repositories where they reduce coupling and clarify ownership. Keep contracts small, make transaction and freshness behavior visible, test fakes and real implementations for their respective responsibilities, and avoid creating a repository merely to rename an ORM call.
