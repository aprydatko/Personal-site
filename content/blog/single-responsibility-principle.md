---
title: "Single Responsibility Principle: One Reason to Change"
description: A practical guide to the Single Responsibility Principle with a TypeScript user registration example.
date: "2026-09-09"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Single Responsibility Principle, or SRP, is often summarized as:

> A class should have one reason to change.

That definition is short, but it is easy to misinterpret. SRP does not mean that every class should contain only one method, or that every small operation needs its own file. It means that the behavior in a class should belong to one area of responsibility and be driven by one kind of change.

If a class validates input, hashes passwords, writes to a database, sends emails, and records analytics, it has several unrelated reasons to change. That is a signal that the class is carrying too much knowledge.

## A class with too many responsibilities

Consider a user registration service that does everything itself:

```ts
type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
};

class UserRegistrationService {
  async register(input: RegisterUserInput): Promise<User> {
    if (!input.email.includes('@')) {
      throw new Error('Invalid email');
    }

    if (input.password.length < 8) {
      throw new Error('Password is too short');
    }

    const hashedPassword = `hashed_${input.password}`;
    const user = {
      id: Date.now(),
      name: input.name,
      email: input.email,
      password: hashedPassword,
    };

    console.log('Saving to database:', user);
    console.log(`Sending welcome email to ${user.email}`);
    console.log('Tracking event:', 'user_registered', { userId: user.id });

    return user;
  }
}
```

This code may work, but the class has at least five responsibilities:

- validating registration data;
- hashing a password;
- creating and storing a user;
- sending a welcome email;
- tracking an analytics event.

Each responsibility can change independently. A new password policy changes validation. Moving from one database to another changes persistence. Replacing the email provider changes notifications. None of those changes should require editing the same large class.

## Splitting responsibilities by reason to change

The first step is to give each concern a focused abstraction. The implementations below are intentionally small, but they represent boundaries where real applications can substitute different policies or infrastructure.

```ts
type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
};

class UserValidator {
  validate(input: RegisterUserInput): void {
    if (!input.email.includes('@')) {
      throw new Error('Invalid email');
    }

    if (input.password.length < 8) {
      throw new Error('Password is too short');
    }
  }
}

class PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`;
  }
}

class UserRepository {
  async create(data: Omit<User, 'id'>): Promise<User> {
    const user: User = {
      id: Date.now(),
      ...data,
    };

    console.log('Saving to database:', user);
    return user;
  }
}

class EmailService {
  async sendWelcomeEmail(user: User): Promise<void> {
    console.log(`Sending welcome email to ${user.email}`);
  }
}

class AnalyticsService {
  track(event: string, data: unknown): void {
    console.log('Tracking event:', event, data);
  }
}
```

Now each class has a clear purpose. The validator knows registration rules, the hasher knows how to transform passwords, the repository knows how to persist users, and the external services know how to communicate with their respective systems.

## The orchestration class

There is still a useful responsibility left: coordinating the registration workflow. SRP does not require eliminating every class that calls other classes. Orchestration is a responsibility of its own.

```ts
class UserRegistrationService {
  constructor(
    private readonly validator: UserValidator,
    private readonly passwordHasher: PasswordHasher,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly analytics: AnalyticsService,
  ) {}

  async register(input: RegisterUserInput): Promise<User> {
    this.validator.validate(input);

    const password = await this.passwordHasher.hash(input.password);
    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      password,
    });

    await this.emailService.sendWelcomeEmail(user);
    this.analytics.track('user_registered', { userId: user.id });

    return user;
  }
}
```

The service has one reason to change: the registration workflow. It decides the order of operations, but it does not know the details of email delivery, password hashing, analytics, or database storage.

The dependencies can be assembled at the application boundary:

```ts
const userRegistrationService = new UserRegistrationService(
  new UserValidator(),
  new PasswordHasher(),
  new UserRepository(),
  new EmailService(),
  new AnalyticsService(),
);

const user = await userRegistrationService.register({
  name: 'Arthur',
  email: 'arthur@example.com',
  password: '12345678',
});

console.log('Registered user:', user);
```

## Why this design is easier to maintain

### Changes stay local

If the password policy changes, the validator is the natural place to edit. If the application adopts Argon2, only the hashing implementation needs to change. If analytics moves from console logging to a third-party platform, the registration workflow can remain untouched.

### Tests become focused

The validator can be tested with simple input/output cases. The repository can be tested against persistence behavior. The registration service can use test doubles to verify that it calls its collaborators in the correct order.

This also makes failures easier to understand. A failed validation test points to validation rules, rather than to a method that also performs database writes and network calls.

### Dependencies are explicit

The constructor shows everything required to register a user. That makes the class easier to reason about and prevents hidden dependencies from accumulating inside the method.

## SRP does not mean “make everything smaller”

Over-applying SRP can produce a codebase filled with tiny classes that add indirection without creating a meaningful boundary. The goal is not maximum fragmentation. The goal is to keep responsibilities cohesive.

A practical question is:

> Would this part of the class change because of the same requirement as the rest of the class?

If the answer is no, the class may contain multiple responsibilities. If the answer is yes, keeping the behavior together may be the simpler design.

## Final thoughts

The Single Responsibility Principle is a tool for managing change. It encourages us to group code by the reason it changes, not simply by the nouns in the domain.

In the registration example, the result is not just more classes. It is a clearer system:

```text
Input
  ↓
Validate
  ↓
Hash password
  ↓
Persist user
  ↓
Send email and track event
```

When each part has a focused responsibility, the code is easier to test, replace, and evolve. That is the real value of SRP: changes have a smaller blast radius.
