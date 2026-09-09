---
title: "Open/Closed Principle: Extend Without Rewriting"
description: A practical TypeScript example of adding payment providers without changing checkout logic.
date: "2026-09-09"
category: Architecture
readingTime: 5 min read
featured: false
published: true
---

The Open/Closed Principle, or OCP, says:

> Software entities should be open for extension but closed for modification.

In plain language, we should be able to add new behavior without repeatedly editing stable, working code. This is especially useful when a system supports multiple integrations, such as payment providers, notification channels, storage engines, or shipping services.

## The problem with conditional payment logic

A first version of checkout might decide how to pay with a growing list of conditions:

```ts
type PaymentMethod = 'stripe' | 'paypal' | 'apple-pay';

const checkout = async (method: PaymentMethod, amount: number) => {
  if (method === 'stripe') {
    console.log(`Pay ${amount} via Stripe`);
  } else if (method === 'paypal') {
    console.log(`Pay ${amount} via PayPal`);
  } else {
    console.log(`Pay ${amount} via Apple Pay`);
  }
};
```

Every new provider requires modifying `checkout`. Over time, this method becomes a central list of provider details. It becomes harder to test, and a change for one provider can accidentally affect the others.

## Define an extension point

Instead of teaching checkout about every provider, define the behavior it needs:

```ts
type PaymentProvider = {
  pay: (amount: number) => Promise<void>;
};
```

Each provider implements that contract in its own class:

```ts
class StripePayment implements PaymentProvider {
  async pay(amount: number): Promise<void> {
    console.log(`Pay ${amount} via Stripe`);
  }
}

class PayPalPayment implements PaymentProvider {
  async pay(amount: number): Promise<void> {
    console.log(`Pay ${amount} via PayPal`);
  }
}

class ApplePayPayment implements PaymentProvider {
  async pay(amount: number): Promise<void> {
    console.log(`Pay ${amount} via Apple Pay`);
  }
}

class GooglePayPayment implements PaymentProvider {
  async pay(amount: number): Promise<void> {
    console.log(`Pay ${amount} via Google Pay`);
  }
}
```

The checkout service depends on the contract, not on a specific provider:

```ts
class PaymentService {
  constructor(private readonly provider: PaymentProvider) {}

  async checkout(amount: number): Promise<void> {
    await this.provider.pay(amount);
  }
}
```

This class does not need to know whether payment goes through Stripe, PayPal, Apple Pay, or Google Pay. Its responsibility is to run checkout using the provider it receives.

## Adding a provider without changing checkout

The application can select a provider at its composition boundary:

```ts
const providers: PaymentProvider[] = [
  new StripePayment(),
  new PayPalPayment(),
  new ApplePayPayment(),
  new GooglePayPayment(),
];

for (const provider of providers) {
  await new PaymentService(provider).checkout(100);
}
```

If the business adds Bank Transfer later, we add one implementation:

```ts
class BankTransferPayment implements PaymentProvider {
  async pay(amount: number): Promise<void> {
    console.log(`Pay ${amount} via bank transfer`);
  }
}
```

`PaymentService` remains unchanged. That is OCP in practice: the system is extended with a new implementation instead of modified in every place that performs checkout.

## Why this design helps

### Smaller changes

Provider-specific code stays in the provider. The checkout workflow does not accumulate integration details.

### Easier tests

The service can receive a fake provider and test its behavior without calling a real payment API:

```ts
const fakeProvider: PaymentProvider = {
  pay: async (amount) => console.log(`Test payment: ${amount}`),
};

await new PaymentService(fakeProvider).checkout(100);
```

### Lower regression risk

Adding one provider does not require editing a large conditional branch. Existing providers continue to use the same stable checkout path.

## OCP is not a rule against all modification

OCP does not mean that code must never change. Requirements evolve, and abstractions sometimes need to be improved. The principle is most valuable when the same kind of extension happens repeatedly.

Do not create an interface for every class just to follow a slogan. Look for a real variation point: multiple payment providers, several file formats, different shipping strategies, or interchangeable notification services.

## Final thoughts

The Open/Closed Principle helps keep stable business workflows independent from changing details. In this example, checkout only knows that a provider can pay. New providers can be added around that boundary without rewriting the checkout logic.

```text
PaymentService
      ↓
PaymentProvider contract
   ↙   ↓    ↓    ↘
Stripe PayPal Apple Google
```

When you expect a system to grow through new implementations, design a clear extension point early. A small, well-chosen abstraction can keep future changes local and predictable...
