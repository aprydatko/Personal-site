---
title: "Structural and Architectural Patterns: Mapper"
description: A practical guide to the Mapper pattern, how explicit transformations protect architectural boundaries, and how to keep mapping code predictable and testable.
date: "2026-09-11"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Mapper pattern converts data from one representation into another.

A mapper is useful when two parts of an application have different models:

- A database row and a domain entity.
- An HTTP request DTO and a service input.
- A domain object and an API response DTO.
- A third-party API response and an application model.
- An event payload and an internal command.

```ts
const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  displayName: user.displayName,
  email: user.email,
});
```

The mapper creates an explicit boundary. The caller receives the shape it needs without learning the details of the source model.

## The problem a Mapper solves

Passing one model through every layer creates coupling:

```ts
const row = await database.users.findById(id);
return Response.json(row);
```

The API now depends on database column names, private fields, storage types, and relationship loading behavior. A database change can become an accidental API change.

A mapper selects and transforms the public shape:

```ts
type UserRow = {
  user_id: string;
  display_name: string;
  email_address: string;
  password_hash: string;
  created_at: Date;
};

type UserResponse = {
  id: string;
  displayName: string;
  email: string;
};

const userRowToResponse = (row: UserRow): UserResponse => ({
  id: row.user_id,
  displayName: row.display_name,
  email: row.email_address,
});
```

The private `password_hash` and storage-specific names do not cross the API boundary.

## A mapper should have one direction

Avoid a vague `mapUser` function that accepts several unrelated shapes and guesses what to return. Name mappings by direction:

```ts
const userRowToDomain = (row: UserRow): User => ({
  id: row.user_id,
  displayName: row.display_name,
  email: row.email_address,
});

const userToResponse = (user: User): UserResponse => ({
  id: user.id,
  displayName: user.displayName,
  email: user.email,
});

const createRequestToInput = (
  request: CreateUserRequest,
): CreateUserInput => ({
  email: request.email.trim().toLowerCase(),
  displayName: request.displayName.trim(),
});
```

Names such as `rowToDomain`, `domainToResponse`, or `requestToInput` communicate the direction and make the call site easier to understand.

## Mapping is more than renaming fields

A mapper can convert representations, units, and types:

```ts
type ProductRow = {
  id: string;
  price_cents: number;
  available: boolean;
};

type Product = {
  id: string;
  price: number;
  isAvailable: boolean;
};

const productRowToDomain = (row: ProductRow): Product => ({
  id: row.id,
  price: row.price_cents / 100,
  isAvailable: row.available,
});
```

The domain uses currency units while the database stores integer cents. That conversion belongs at the boundary, so the rest of the application does not need to remember the storage convention.

Other common transformations include:

- `snake_case` to `camelCase`.
- Strings to dates or value objects.
- API status codes to domain states.
- Nullable storage fields to explicit application options.
- External enum values to internal enum values.
- Flattened rows to nested domain data.

## Mapper versus DTO

A DTO is the data shape crossing a boundary. A mapper is the transformation that creates one shape from another.

```ts
type UserResponse = {
  id: string;
  displayName: string;
};

const userToResponse = (user: User): UserResponse => ({
  id: user.id,
  displayName: user.displayName,
});
```

`UserResponse` is the DTO. `userToResponse` is the mapper.

They often appear together, but they are not interchangeable. A DTO can be defined without a mapper when the source already has the exact shape; a mapper can transform data that is not a DTO, such as a database row into a domain object.

See [DTO: Boundary-Specific Data Shapes](/blog/dto) for more on designing the contracts themselves.

## Mapper and Repository

A Repository commonly uses mappers to keep persistence models out of the application:

```ts
const createUserRepository = (database: Database): UserRepository => ({
  async findById(id) {
    const row = await database.users.findById(id);
    return row ? userRowToDomain(row) : null;
  },

  async save(user) {
    await database.users.update(user.id, domainToUserRow(user));
  },
});

const domainToUserRow = (user: User): UserRowUpdate => ({
  user_id: user.id,
  display_name: user.displayName,
  email_address: user.email,
});
```

The Repository owns persistence access; the Mapper owns shape conversion. Keeping those concerns separate makes both easier to test and replace.

This is the boundary described in [Repository: Isolate Persistence Details](/blog/repository).

## Mapping to domain objects

If the domain model has invariants, mapping should construct it through a safe boundary:

```ts
class EmailAddress {
  private constructor(readonly value: string) {}

  static create(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized.includes('@')) throw new Error('Invalid email');
    return new EmailAddress(normalized);
  }
}

const userRowToDomain = (row: UserRow): User => ({
  id: row.user_id,
  email: EmailAddress.create(row.email_address),
  displayName: row.display_name,
});
```

The mapper should not silently construct an invalid domain object. If stored data can be corrupt or outdated, decide whether to throw, return a result type, record an error, or perform a migration.

Do not use mapping as a way to bypass domain invariants with unsafe casts:

```ts
// This only silences TypeScript; it does not validate the value.
const user = row as User;
```

## Mapping external API responses

An external service may use names and values that should not spread through the application:

```ts
type CarrierResponse = {
  carrier_code: string;
  delivery_days: number;
  price_cents: number;
};

type ShippingQuote = {
  provider: string;
  deliveryDays: number;
  amount: number;
};

const carrierResponseToQuote = (
  response: CarrierResponse,
): ShippingQuote => ({
  provider: response.carrier_code,
  deliveryDays: response.delivery_days,
  amount: response.price_cents / 100,
});
```

The integration boundary can validate the response, map it into the application's vocabulary, and keep vendor changes localized.

If the external API can omit fields or change versions, validate before mapping. A mapper that assumes a complete response can turn malformed external data into misleading internal state.

## Mapping nested data

Nested mappings should be composed from smaller mapping functions:

```ts
const lineItemToResponse = (item: OrderLineItem): LineItemResponse => ({
  productId: item.productId,
  name: item.name,
  quantity: item.quantity,
});

const orderToResponse = (order: Order): OrderResponse => ({
  id: order.id,
  total: order.total,
  items: order.items.map(lineItemToResponse),
});
```

This keeps the top-level mapper readable and gives nested transformations independent test boundaries.

Avoid mapping an entire object graph by default. Choose relationships based on what the consumer needs, query only what is necessary, and watch for circular references and accidental N+1 queries.

## Mapping input and normalization

Input mapping often includes normalization, but validation should still be explicit:

```ts
type CreateProjectRequest = {
  name: string;
  ownerId: string;
};

type CreateProjectInput = {
  name: string;
  ownerId: string;
};

const createProjectRequestToInput = (
  request: CreateProjectRequest,
): CreateProjectInput => ({
  name: request.name.trim(),
  ownerId: request.ownerId.trim(),
});
```

A mapper should not pretend that a compile-time DTO proves runtime validity. Parse untrusted input before mapping it into a trusted service input.

The service can then apply business rules such as uniqueness, authorization, or ownership. Mapping normalizes representation; it should not become a hidden application workflow.

## Pure mappers are easier to reason about

Prefer mappers that are deterministic and free of I/O:

```ts
const orderToSummary = (order: Order): OrderSummary => ({
  id: order.id,
  total: order.total,
  itemCount: order.items.length,
});
```

A mapper that performs database queries, fetches images, sends events, and changes state is not only a mapper anymore. Move those operations into a service or query workflow, then map the resulting data.

Pure mappers can be reused in unit tests, background jobs, and response adapters without needing a runtime or network connection.

## Mapping and versioning

When a public contract has versions, use version-specific mappers:

```ts
const userToResponseV1 = (user: User): UserResponseV1 => ({
  id: user.id,
  name: user.displayName,
});

const userToResponseV2 = (user: User): UserResponseV2 => ({
  id: user.id,
  displayName: user.displayName,
  email: user.email,
});
```

The internal model can evolve while each public version remains stable. Do not make a single mapper return different shapes based on scattered flags; keep version decisions at the transport boundary.

For message consumers, map each event version into a common internal command when possible:

```ts
const eventV1ToCommand = (event: OrderCreatedV1): ProcessOrderCommand => ({
  orderId: event.order_id,
});
```

This keeps compatibility logic close to the input boundary.

## Mapper and serialization

JavaScript values such as `Date`, `Map`, `BigInt`, and custom classes need deliberate serialization:

```ts
type AuditEventResponse = {
  id: string;
  occurredAt: string;
};

const auditEventToResponse = (event: AuditEvent): AuditEventResponse => ({
  id: event.id,
  occurredAt: event.occurredAt.toISOString(),
});
```

Do not rely on a generic JSON serializer to define your public contract. Decide formats for dates, decimals, identifiers, enums, and nullable values in the mapper or serializer boundary.

## Testing mappers

Mapper tests should focus on field selection, conversion, and edge cases:

```ts
it('maps cents to a domain amount', () => {
  expect(productRowToDomain({
    id: 'product-1',
    price_cents: 1299,
    available: true,
  })).toEqual({
    id: 'product-1',
    price: 12.99,
    isAvailable: true,
  });
});
```

Also test nullability, missing fields, dates, enum changes, nested objects, private-field exclusion, and versioned contracts.

Mapping tests should not require a database or network. If a mapping needs those dependencies, it likely owns more than transformation and should be split.

## Common mistakes

### Mapping with object spread

Spreading can leak fields and makes changes implicit:

```ts
return { ...internalUser };
```

Use explicit selection at external boundaries.

### A mapper that performs business decisions

Choosing whether an order may be cancelled or whether a user is authorized is not a field conversion. Keep those decisions in a service or domain layer.

### A mapper that performs I/O

Loading related data inside a mapper hides query cost and can create N+1 behavior. Load the required data in a repository or service, then map it.

### Silent data loss

Dropping a field can be correct for a public response, but dangerous when mapping between persistence models. Make omissions deliberate and test important fields.

### One universal mapper

A single mapper for database rows, domain entities, request DTOs, and responses usually becomes a conditional conversion hub. Use small directional mappers.

### Trusting source data

Mapping does not validate. Parse and validate untrusted input before converting it into a trusted internal model.

## A practical checklist

Before adding a Mapper, ask:

- Which two representations are being translated?
- Is the direction clear from the name?
- Which fields need renaming, normalization, conversion, or omission?
- Does the mapper preserve domain invariants or delegate construction safely?
- Is it pure, or is it hiding I/O and business workflow?
- Could explicit mapping prevent sensitive or storage-specific fields from leaking?
- Are versioning, serialization, nullability, and edge cases tested?
- Would separate small mappers be clearer than one generic utility?

## Final thoughts

The Mapper pattern keeps model conversions explicit and boundaries honest. It prevents database rows, domain entities, DTOs, and vendor responses from becoming one accidental shared representation.

Use directional, focused, mostly pure mapping functions. Validate before mapping, map only what the destination needs, preserve domain invariants, and test conversions independently. A mapper is small code, but it often carries an important architectural responsibility: deciding exactly what crosses from one part of the system into another.
