---
title: "Dependency Inversion Principle: Depend on Abstractions"
description: A practical TypeScript guide to the Dependency Inversion Principle using order creation and interchangeable email providers.
date: "2026-09-09"
category: Architecture
readingTime: 5 min read
featured: false
published: true
---

The Dependency Inversion Principle, or DIP, says:

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

It also says that abstractions should not depend on details. Details should depend on abstractions.

In practice, business logic should not be tightly coupled to a specific database, email provider, payment API, or framework. Instead, it should depend on a small contract that describes what it needs.

## The direct dependency problem

Suppose an order service creates an order and sends an email through SendGrid directly:

```ts
class SendGridEmailSender {
  async send(email: string, message: string): Promise<void> {
    console.log(`SendGrid → ${email}: ${message}`);
  }
}

class OrderService {
  private readonly emailSender = new SendGridEmailSender();

  async createOrder(email: string, productId: string): Promise<void> {
    console.log(`Creating order for ${productId}`);
    await this.emailSender.send(email, 'Your order was created');
  }
}
```

`OrderService` is a high-level module: it contains business behavior. `SendGridEmailSender` is a low-level detail: it knows how to communicate with a particular provider.

Because the order service creates the concrete sender itself, changing email providers requires modifying the business logic. Testing also becomes harder because every test is tied to SendGrid.

## Introduce an abstraction

Define the capability the order service needs:

```ts
interface EmailSender {
  send(email: string, message: string): Promise<void>;
}
```

The provider implementations depend on that contract:

```ts
class SendGridEmailSender implements EmailSender {
  async send(email: string, message: string): Promise<void> {
    console.log(`SendGrid → ${email}: ${message}`);
  }
}

class AwsSesEmailSender implements EmailSender {
  async send(email: string, message: string): Promise<void> {
    console.log(`AWS SES → ${email}: ${message}`);
  }
}
```

Now `OrderService` receives the abstraction instead of constructing a provider:

```ts
class OrderService {
  constructor(private readonly emailSender: EmailSender) {}

  async createOrder(email: string, productId: string): Promise<void> {
    console.log(`Creating order for ${productId}`);
    await this.emailSender.send(email, 'Your order was created');
  }
}
```

The order service knows that it can send an order notification. It does not know which company delivers the message or how that delivery works.

## Choose the implementation at the application boundary

The concrete provider can be selected when the application is assembled:

```ts
const sendGridOrderService = new OrderService(new SendGridEmailSender());
const awsSesOrderService = new OrderService(new AwsSesEmailSender());

await sendGridOrderService.createOrder('arthur@example.com', 'product-123');
await awsSesOrderService.createOrder('mary@example.com', 'product-456');
```

This is dependency injection: the dependency is supplied from outside instead of being created inside the business class.

## Testing becomes simpler

Tests can provide a small fake implementation without making a real network request:

```ts
const sentMessages: string[] = [];
const fakeEmailSender: EmailSender = {
  send: async (email, message) => {
    sentMessages.push(`${email}: ${message}`);
  },
};

const orderService = new OrderService(fakeEmailSender);
await orderService.createOrder('test@example.com', 'product-123');

console.log(sentMessages);
```

The test focuses on order behavior. It does not need SendGrid credentials, AWS configuration, or an active email service.

## Why DIP helps

### Business logic stays stable

Changing from SendGrid to AWS SES does not require rewriting `OrderService`.

### Infrastructure can evolve independently

Email providers, databases, queues, and external APIs can be replaced behind their contracts.

### Dependencies become visible

The constructor clearly communicates what the service needs to work.

### Systems become easier to test

Fakes and in-memory implementations can be injected for tests and local development.

## DIP does not mean adding interfaces everywhere

An abstraction is useful when a dependency can vary, is external, is expensive to run, or needs to be replaced in tests. A simple, stable value object may not need an interface at all.

The goal is not to hide every implementation. The goal is to protect important business rules from details that are likely to change.

## A practical design question

Ask:

> If this external tool or provider changed tomorrow, would I need to edit my business logic?

If the answer is yes, introduce a focused abstraction at the boundary and inject the implementation.

## Final thoughts

The Dependency Inversion Principle creates a healthy direction for dependencies:

```text
OrderService
      ↓
EmailSender abstraction
   ↙          ↘
SendGrid     AWS SES
```

The order service owns the business decision to send a notification. The infrastructure owns the technical details of delivery. Keeping those concerns separate makes the system easier to change, test, and maintain...
