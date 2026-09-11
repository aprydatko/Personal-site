---
title: "Structural and Architectural Patterns: DTO"
description: A practical guide to Data Transfer Objects, how they protect boundaries between layers, and how to validate, map, version, and test data safely.
date: "2026-09-11"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

A Data Transfer Object, or DTO, is a data shape designed to cross a boundary.

That boundary may be an HTTP API, a message queue, a service layer, a database adapter, or a frontend component. A DTO contains the data needed by the receiving boundary without exposing the entire internal object behind it.

```ts
type CreateUserRequest = {
  email: string;
  displayName: string;
};
```

The request DTO says what the API accepts. It does not need to be the same shape as a database row, domain entity, or response object.

That distinction is the main value of DTOs: each boundary can have a deliberate contract instead of sharing one large mutable object everywhere.

## The problem DTOs solve

Passing a persistence record directly to an API can expose fields that were never meant to be public:

```ts
const user = await users.findById(id);
return Response.json(user); // may expose passwordHash, roles, audit fields
```

A response DTO selects and names the public data:

```ts
type UserResponse = {
  id: string;
  email: string;
  displayName: string;
};

const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});
```

The mapping is explicit. Adding a private field to `User` does not automatically add it to the API response.

## DTOs belong to boundaries

Different operations often need different shapes:

```ts
type CreateUserRequest = {
  email: string;
  displayName: string;
  password: string;
};

type UpdateUserRequest = {
  displayName?: string;
};

type UserResponse = {
  id: string;
  email: string;
  displayName: string;
};
```

Do not use one `UserDto` for creation, updates, internal reads, and public responses just because the names are related. Each DTO should represent one boundary contract and its rules.

This prevents accidental behavior such as accepting a client-supplied `id`, allowing a password hash to be returned, or treating omitted and explicitly empty fields as the same thing.

## DTO versus domain entity

A domain entity represents identity, state, and behavior inside the application:

```ts
class User {
  constructor(
    readonly id: string,
    private email: string,
    private displayName: string,
  ) {}

  changeDisplayName(value: string) {
    if (value.trim().length < 2) {
      throw new Error('Display name is too short');
    }

    this.displayName = value.trim();
  }
}
```

A DTO is usually a data-only boundary shape:

```ts
type ChangeDisplayNameRequest = {
  displayName: string;
};
```

The DTO carries input across the boundary. The entity applies the domain rule. Keeping those concerns separate prevents transport concerns from leaking into the domain and prevents domain methods from becoming accidental API contracts.

## DTO versus persistence model

A database record reflects storage concerns:

```ts
type UserRow = {
  user_id: string;
  email_address: string;
  display_name: string;
  password_hash: string;
  created_at: Date;
};
```

An API response reflects consumer concerns:

```ts
type UserResponse = {
  id: string;
  email: string;
  displayName: string;
};
```

The mapping between them is a useful protection:

```ts
const toUserResponse = (row: UserRow): UserResponse => ({
  id: row.user_id,
  email: row.email_address,
  displayName: row.display_name,
});
```

A database rename does not have to become an API breaking change, and an API field can be reorganized without changing the storage schema.

## Validate DTOs at the boundary

TypeScript types disappear at runtime. Data from HTTP requests, queues, and external services must be validated before it becomes trusted application input.

```ts
const parseCreateUserRequest = (input: unknown): CreateUserRequest => {
  if (!input || typeof input !== 'object') {
    throw new Error('Request body must be an object');
  }

  const body = input as Record<string, unknown>;

  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    throw new Error('A valid email is required');
  }

  if (typeof body.displayName !== 'string') {
    throw new Error('Display name is required');
  }

  if (typeof body.password !== 'string' || body.password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }

  return {
    email: body.email.trim().toLowerCase(),
    displayName: body.displayName.trim(),
    password: body.password,
  };
};
```

The parser both validates and normalizes the raw input. A schema library can reduce repetition in a larger application, but the architectural rule is the same: validate at the boundary before calling the service or domain layer.

## Mapping DTOs

Keep mapping functions small and explicit:

```ts
type CreateUserInput = {
  email: string;
  displayName: string;
  password: string;
};

const toCreateUserInput = (dto: CreateUserRequest): CreateUserInput => ({
  email: dto.email.trim().toLowerCase(),
  displayName: dto.displayName.trim(),
  password: dto.password,
});
```

For responses, map only what the consumer needs:

```ts
const toUserSummary = (user: User): UserSummaryDto => ({
  id: user.id,
  displayName: user.displayName,
});
```

Mapping code can look repetitive, but that repetition is often the visible cost of a deliberate boundary. Automatic object spreading is risky when internal fields may be added later:

```ts
// Avoid for public responses.
return { ...user };
```

Explicit selection provides a safer default.

## DTOs and partial updates

An update DTO must distinguish between an omitted field and a field explicitly set to an empty or null value:

```ts
type UpdateProfileRequest = {
  displayName?: string;
  avatarUrl?: string | null;
};
```

Here:

- `displayName` omitted means “leave it unchanged”.
- `avatarUrl: null` may mean “remove the avatar”.
- `avatarUrl` with a string means “replace the avatar”.

Do not blindly spread an update DTO into a persistence update. Normalize the update semantics first:

```ts
const toProfileChanges = (dto: UpdateProfileRequest) => {
  const changes: Partial<Profile> = {};

  if (dto.displayName !== undefined) {
    changes.displayName = dto.displayName.trim();
  }

  if (dto.avatarUrl !== undefined) {
    changes.avatarUrl = dto.avatarUrl;
  }

  return changes;
};
```

The service or domain object can then apply its own rules to those changes.

## DTOs and nested data

Nested DTOs should be designed for the consumer rather than copied from internal relationships:

```ts
type OrderResponse = {
  id: string;
  total: number;
  customer: {
    id: string;
    displayName: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
  }>;
};
```

This may differ from the ORM graph, which could include payment records, audit entries, internal pricing details, or circular references.

Avoid returning a deep object graph simply because the database query loaded it. Large DTOs increase payload size and couple consumers to data they do not need.

## DTOs and versioning

DTOs make versioning explicit:

```ts
type UserResponseV1 = {
  id: string;
  name: string;
};

type UserResponseV2 = {
  id: string;
  displayName: string;
  email: string;
};
```

A versioned mapper can preserve an older contract while the internal model evolves:

```ts
const toUserResponseV1 = (user: User): UserResponseV1 => ({
  id: user.id,
  name: user.displayName,
});
```

Version only when compatibility requires it. Creating `V2` for every small internal change can create unnecessary maintenance. A field can sometimes be added compatibly; removing or changing its meaning usually requires more care.

Document whether fields are optional, nullable, deprecated, or stable. A DTO is a contract with consumers, not only an internal TypeScript alias.

## DTOs and message queues

Messages are DTOs that cross time as well as process boundaries:

```ts
type OrderCreatedMessage = {
  type: 'order.created';
  version: 1;
  eventId: string;
  occurredAt: string;
  orderId: string;
};
```

Include enough metadata for consumers to process and trace the message. Use serialized representations such as ISO strings rather than assuming a JavaScript `Date` survives transport.

Consumers should validate messages independently. A producer's TypeScript type does not protect a consumer from old, malformed, duplicated, or manually published messages.

## DTOs and service layers

A Service Layer often accepts an application input DTO and returns an output DTO:

```ts
type CreateProjectInput = {
  name: string;
  ownerId: string;
};

type ProjectResult = {
  id: string;
  name: string;
};

const createProject = async (
  input: CreateProjectInput,
  projects: ProjectRepository,
): Promise<ProjectResult> => {
  const project = await projects.create(input);

  return {
    id: project.id,
    name: project.name,
  };
};
```

The service should not need to return an HTTP response or expose database rows. The controller or route maps the service result to the transport-specific response.

This connects DTOs to [Service Layer](/blog/service-layer) and [Repository](/blog/repository): DTOs protect the boundaries, services coordinate workflows, and repositories isolate persistence.

## DTOs and security

DTOs are an important security boundary, but they are not a complete authorization system.

Use allowlists for accepted and returned fields. Never rely on a DTO type to hide secrets at runtime. Validate lengths, formats, ranges, and nested values. Apply authorization in the service or domain boundary that knows whether the actor may perform the operation.

Be especially careful with:

- Passwords, tokens, hashes, and encryption keys.
- Internal role or permission fields.
- Billing and audit metadata.
- User-controlled URLs or HTML.
- Fields that could be mass-assigned into persistence models.

An input DTO should describe what a caller may request, not everything the underlying record can contain.

## Testing DTO mappings

Mapping functions deserve focused tests:

```ts
it('does not expose private user fields', () => {
  const response = toUserResponse({
    id: 'user-1',
    email: 'ada@example.com',
    displayName: 'Ada',
    passwordHash: 'secret-hash',
  });

  expect(response).toEqual({
    id: 'user-1',
    email: 'ada@example.com',
    displayName: 'Ada',
  });
  expect(response).not.toHaveProperty('passwordHash');
});
```

Also test invalid input, normalization, omitted versus null fields, backward-compatible versions, nested data, and serialized dates or identifiers.

Integration tests should verify that a real route or message consumer validates and maps the DTO as expected. Unit tests alone cannot prove that framework parsing, serialization, and status handling are wired correctly.

## Common mistakes

### Reusing the persistence model as the response

This leaks storage details and creates accidental public contracts. Define a response DTO and map explicitly.

### One DTO for every direction

Create, update, read, internal, and event payloads often have different requirements. Separate them when their contracts differ.

### Trusting TypeScript at runtime

External data is untrusted after compilation. Validate request bodies, queue messages, and external API responses at their boundaries.

### Using DTOs as domain models

A DTO is data crossing a boundary. It should not become the only place where domain invariants live. Let domain objects or services enforce rules that must hold regardless of transport.

### Mapping with unrestricted spread

Spreading an internal object into a DTO can expose newly added fields without a review of the public contract. Prefer explicit field selection for sensitive or external boundaries.

### Returning too much nested data

Large DTOs increase coupling, payload size, and query cost. Design responses for the consumer's use case.

### Treating a DTO as authorization

Omitting a field from an input type does not stop a malicious caller from sending it. Runtime validation, allowlists, and authorization are still required.

## A practical checklist

Before introducing or changing a DTO, ask:

- Which boundary does this data cross?
- Is the shape for input, output, persistence, messaging, or an internal service call?
- Which fields are allowed, required, optional, nullable, or sensitive?
- Where is runtime validation performed?
- Where is mapping performed, and who owns normalization?
- Does the DTO expose internal storage or domain details unnecessarily?
- Will a change be backward compatible for existing consumers?
- Are mapping, validation, serialization, and authorization tested separately?

## Final thoughts

DTOs make data boundaries explicit. They prevent persistence records, domain entities, transport payloads, and messages from becoming one accidental shared model.

Use focused DTOs, validate them at runtime, map fields deliberately, keep domain rules in the domain layer, and treat external payloads as versioned contracts. A little explicit mapping at the boundary can prevent a large amount of coupling throughout the application.
