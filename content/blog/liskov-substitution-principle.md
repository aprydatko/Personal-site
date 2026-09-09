---
title: "Liskov Substitution Principle: Make Subtypes Trustworthy"
description: A practical TypeScript guide to the Liskov Substitution Principle using birds, inheritance, and reliable abstractions.
date: "2026-09-09"
category: Architecture
readingTime: 5 min read
featured: false
published: true
---

The Liskov Substitution Principle, or LSP, says:

> Objects of a subtype should be replaceable with objects of the base type without changing the correctness of the program.

In simpler terms, if a function accepts a base type, every valid subtype should behave in a way that the function can safely expect.

Inheritance is not only about sharing properties or methods. It also creates a behavioral promise. A subtype must honor the promise made by its parent type.

## A valid substitution

Imagine a system for training birds to fly. The `Bird` abstraction says that every bird used by this system can fly:

```ts
abstract class Bird {
  abstract fly(): void;
}

class Sparrow extends Bird {
  fly(): void {
    console.log('Sparrow is flying');
  }
}

class Eagle extends Bird {
  fly(): void {
    console.log('Eagle is flying high');
  }
}
```

The training service depends only on the abstraction:

```ts
class FlightTrainer {
  train(bird: Bird): void {
    bird.fly();
  }
}
```

Both `Sparrow` and `Eagle` can be substituted for `Bird` without requiring changes to `FlightTrainer`:

```ts
const trainer = new FlightTrainer();

trainer.train(new Sparrow());
trainer.train(new Eagle());
```

The base class makes a clear promise, and both subtypes keep it. The trainer can call `fly()` without checking which specific bird it received.

## A broken abstraction

Now suppose we add a penguin to the same hierarchy:

```ts
class Penguin extends Bird {
  fly(): void {
    throw new Error('Penguins cannot fly');
  }
}
```

The code may compile, but the abstraction is now misleading. `FlightTrainer` accepts any `Bird`, yet training a `Penguin` causes a runtime failure:

```ts
trainer.train(new Penguin());
```

`Penguin` is technically a `Bird`, but it cannot honor the behavior promised by the base class. It violates LSP because replacing another `Bird` with a `Penguin` changes the correctness of the program.

The problem is not that penguins are unusual. The problem is that “bird” and “flying bird” are different concepts, but the model treats them as the same abstraction.

## Model capabilities instead of forcing inheritance

A better design separates birds from the ability to fly:

```ts
type Bird = {
  name: string;
};

type FlyingBird = Bird & {
  fly: () => void;
};

const sparrow: FlyingBird = {
  name: 'Sparrow',
  fly: () => console.log('Sparrow is flying'),
};

const eagle: FlyingBird = {
  name: 'Eagle',
  fly: () => console.log('Eagle is flying high'),
};

const penguin: Bird = {
  name: 'Penguin',
};
```

The trainer now accepts only birds with the capability it needs:

```ts
class FlightTrainer {
  train(bird: FlyingBird): void {
    bird.fly();
  }
}

const trainer = new FlightTrainer();

trainer.train(sparrow);
trainer.train(eagle);
```

The type system prevents a penguin from being passed to `FlightTrainer`. The design describes the real requirement instead of relying on a broad inheritance hierarchy.

## Common signs of an LSP violation

Watch for subtypes that:

- throw errors for methods that the parent type promises will work;
- return meaningless values just to satisfy an interface;
- require callers to check the concrete subtype first;
- weaken validation rules or strengthen required inputs;
- change expected side effects or lifecycle behavior.

If callers need many type checks, the abstraction may be hiding incompatible behaviors.

## A practical design question

Before extending a class or implementing an interface, ask:

> Can every caller that accepts the parent type safely use this new subtype?

If the answer is no, the subtype probably belongs behind a different abstraction. Prefer modeling the capability the caller actually needs, such as `FlyingBird`, `ReadableFile`, or `RefundablePayment`, instead of inheriting from a type that promises too much.

## Final thoughts

The Liskov Substitution Principle is about trust. A base type defines expectations, and every subtype must preserve them.

Sparrows and eagles work with the flight trainer because they both satisfy the same behavioral contract. A penguin exposes the weakness of a broader `Bird` abstraction, leading to a better design based on capabilities.

Good abstractions do not merely make code reusable. They make valid behavior predictable...
