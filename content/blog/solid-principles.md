---
title: "SOLID Principles: A Practical Guide to Maintainable Code"
description: An approachable overview of the five SOLID principles and how they help code remain flexible as a project grows.
date: "2026-09-09"
category: Architecture
readingTime: 6 min read
featured: true
published: true
---

SOLID is a group of five object-oriented design principles that help developers build code that is easier to understand, test, and change.

The principles are not strict laws or a checklist that every class must satisfy. They are useful design guidelines for managing dependencies, responsibilities, and change as an application grows.

The name SOLID comes from the first letter of each principle:

| Letter | Principle | Main idea |
| --- | --- | --- |
| S | Single Responsibility | A module should have one reason to change. |
| O | Open/Closed | Extend behavior without changing stable code. |
| L | Liskov Substitution | Subtypes should honor the contracts of their base types. |
| I | Interface Segregation | Clients should not depend on methods they do not use. |
| D | Dependency Inversion | Business logic should depend on abstractions, not details. |

## S — Single Responsibility Principle

The Single Responsibility Principle says that a class or module should have one reason to change.

For example, a user registration service should coordinate registration, but it should not also validate input, hash passwords, write to a database, send emails, and track analytics itself. Those concerns can change independently and should have focused homes.

Read the full article: [Single Responsibility Principle: One Reason to Change](/blog/single-responsibility-principle).

The benefit is a smaller blast radius. A change to password hashing should not require editing the registration workflow or email logic.

## O — Open/Closed Principle

The Open/Closed Principle says that software should be open for extension but closed for modification.

A payment service can depend on a `PaymentProvider` contract instead of containing a growing list of conditions for Stripe, PayPal, Apple Pay, and Google Pay. Adding a new provider then means adding a new implementation rather than rewriting checkout logic.

Read the full article: [Open/Closed Principle: Extend Without Rewriting](/blog/open-closed-principle).

OCP is especially useful around integrations and strategies that are expected to grow over time.

## L — Liskov Substitution Principle

The Liskov Substitution Principle says that objects of a subtype should be replaceable with objects of the base type without breaking the program.

If a flight trainer accepts a `Bird`, every bird passed to it must support the behavior promised by that abstraction. A sparrow and an eagle can fly, but a penguin should not inherit from a `FlyingBird` type only to throw an error from `fly()`.

Read the full article: [Liskov Substitution Principle: Make Subtypes Trustworthy](/blog/liskov-substitution-principle).

When a subtype needs special checks, throws for normal parent behavior, or provides meaningless implementations, the abstraction may be wrong. Model the capability the caller actually needs.

## I — Interface Segregation Principle

The Interface Segregation Principle says that clients should not be forced to depend on interfaces they do not use.

Instead of requiring every office device to print, scan, and fax, define focused contracts:

```ts
interface Printable {
  print(): void;
}

interface Scannable {
  scan(): void;
}

interface Faxable {
  fax(): void;
}
```

A laser printer can implement `Printable`, while a multifunction printer can implement all three. Each client depends only on the capability it needs.

Read the full article: [Interface Segregation Principle: Keep Contracts Focused](/blog/interface-segregation-principle).

Small interfaces make dependencies clearer and prevent classes from implementing placeholder methods for unsupported behavior.

## D — Dependency Inversion Principle

The Dependency Inversion Principle says that high-level modules should not depend directly on low-level modules. Both should depend on abstractions.

An order service should not construct a SendGrid client inside its business logic. It can depend on an `EmailSender` interface and receive either a SendGrid or AWS SES implementation through its constructor:

```ts
interface EmailSender {
  send(email: string, message: string): Promise<void>;
}

class OrderService {
  constructor(private readonly emailSender: EmailSender) {}
}
```

Read the full article: [Dependency Inversion Principle: Depend on Abstractions](/blog/dependency-inversion-principle).

This separation keeps business rules independent from infrastructure and makes tests easier to run with fake implementations.

## How the principles work together

SOLID principles reinforce one another:

```text
Focused responsibilities
          ↓
Small interfaces and abstractions
          ↓
Replaceable implementations
          ↓
Flexible, testable business logic
```

SRP helps identify separate responsibilities. ISP keeps the contracts for those responsibilities small. DIP lets higher-level code depend on those contracts. OCP makes it possible to add implementations without constantly changing existing workflows. LSP ensures those implementations can safely be substituted.

Together, they create boundaries that make change easier to manage.

## SOLID is not an excuse for overengineering

Using SOLID does not mean creating an interface, class, or abstraction for every function. Too many layers can make a small application harder to follow.

Introduce a boundary when there is a real reason for variation: an external provider, a changing policy, multiple implementations, or a dependency that should be replaced in tests. Keep straightforward code straightforward.

## A practical checklist

When reviewing a design, ask:

- Does this module have more than one unrelated reason to change?
- Can new behavior be added without editing stable workflow code?
- Can a subtype keep the promises of its parent type?
- Are clients depending on methods they do not need?
- Does business logic know too much about infrastructure details?

The answers will not always require a refactor. They simply highlight where a boundary may improve the design.

## Final thoughts

SOLID is best understood as a way to make change safer. The principles encourage focused responsibilities, honest contracts, replaceable details, and business logic that is protected from infrastructure.

Start with the problem in front of you. Apply the smallest principle that makes the design clearer, and let the codebase grow its abstractions when real variation appears...
