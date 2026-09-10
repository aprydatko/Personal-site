---
title: "Core Patterns: Command"
description: A practical guide to the Command pattern, how to represent actions as objects or functions, and when it helps with queues, undo, retries, and auditability.
date: "2026-09-10"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Command pattern turns an action into a value that can be passed around, stored, queued, retried, logged, or undone.

Instead of calling a receiver directly and losing the context of what happened, a caller creates a command that describes the operation. An invoker decides when and how to execute it, while the receiver contains the actual behavior.

Commands are useful when an action needs a lifecycle beyond one immediate function call. They can support undo and redo, background queues, retries, audit logs, permission checks, batching, and delayed execution.

## The basic shape

A traditional Command has an `execute` method:

```ts
type Command = {
  execute(): Promise<void>;
};

type CreateUserCommandDependencies = {
  users: UserRepository;
  input: CreateUserInput;
};

const createUserCommand = ({
  users,
  input,
}: CreateUserCommandDependencies): Command => ({
  execute() {
    return users.create(input).then(() => undefined);
  },
});
```

The command captures the operation and its inputs. Another object can decide when to execute it:

```ts
const command = createUserCommand({ users, input });
await command.execute();
```

For a simple action, the command can be a function:

```ts
type Command<T> = () => Promise<T>;

const command: Command<User> = () => users.create(input);
```

The pattern is about treating an action as a value, not about requiring a class.

## Command, receiver, and invoker

The pattern traditionally separates three roles:

- The command describes an action and stores its inputs.
- The receiver knows how to perform the actual work.
- The invoker triggers commands and may manage their lifecycle.

```ts
class TextEditor {
  private value = '';

  insert(text: string) {
    this.value += text;
  }

  getValue() {
    return this.value;
  }
}

const insertText = (editor: TextEditor, text: string): Command => ({
  execute() {
    editor.insert(text);
  },
});

const run = (command: Command) => command.execute();
```

The editor is the receiver. `insertText` creates a command. `run` is the invoker. Keeping these roles separate means the invoker does not need to know how editing works.

## Commands and undo

Undo is one of the clearest reasons to represent actions explicitly. A command can store enough information to reverse its work:

```ts
type ReversibleCommand = {
  execute(): void;
  undo(): void;
};

const insertText = (
  editor: TextEditor,
  text: string,
): ReversibleCommand => ({
  execute() {
    editor.insert(text);
  },
  undo() {
    editor.removeLast(text.length);
  },
});
```

An undo manager can maintain history:

```ts
class History {
  private commands: ReversibleCommand[] = [];

  execute(command: ReversibleCommand) {
    command.execute();
    this.commands.push(command);
  }

  undo() {
    const command = this.commands.pop();
    command?.undo();
  }
}
```

Undo is not always the exact opposite of execute. A database update may need the previous value, an external API may not support reversal, and sending an email cannot truly be unsent. Capture the information required for a meaningful compensating action, and do not promise undo where the side effect cannot be reversed.

## Commands and queues

A command can be placed on a queue instead of being executed immediately:

```ts
type Job = {
  id: string;
  type: 'send-welcome-email' | 'rebuild-search-index';
  payload: Record<string, string>;
};

const job: Job = {
  id: 'job-1',
  type: 'send-welcome-email',
  payload: { userId: 'user-1' },
};

await queue.publish(job);
```

The queue worker becomes the invoker. It loads the command data, selects a handler, and executes it later:

```ts
const handlers = {
  'send-welcome-email': sendWelcomeEmail,
  'rebuild-search-index': rebuildSearchIndex,
};

const processJob = async (job: Job) => {
  const handler = handlers[job.type];
  await handler(job.payload);
};
```

Persisted commands should contain stable data rather than closures or live object references. A function command works in memory; a durable job needs a serializable schema, versioning, idempotency, and a failure policy.

## Commands and retries

An invoker can retry a command when a failure is transient:

```ts
const executeWithRetry = async (
  command: Command,
  attempts: number,
) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await command.execute();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};
```

Retrying requires more than a loop. The command must be safe to repeat or use an idempotency key. A command that charges a card or creates an account can duplicate work if the first attempt succeeded but its response was lost.

Keep retry policy at the invoker or integration boundary, where the system can distinguish transient from permanent errors.

## Commands in frontend applications

UI actions can be represented as commands when they need a shared lifecycle:

```ts
type AppCommand = {
  label: string;
  execute(): Promise<void>;
};

const saveProfileCommand: AppCommand = {
  label: 'Save profile',
  async execute() {
    await profileApi.save(formState);
  },
};
```

A command palette can display and invoke commands without knowing their implementation:

```tsx
function CommandItem({ command }: { command: AppCommand }) {
  return (
    <button type="button" onClick={() => void command.execute()}>
      {command.label}
    </button>
  );
}
```

This works well for menus, keyboard shortcuts, toolbars, and context actions. If the action is only one button handler with no reuse, history, or lifecycle, a direct callback is usually clearer.

## Commands and authorization

An invoker can check whether a command is allowed before executing it:

```ts
const executeAuthorized = async (
  command: AppCommand,
  user: User,
  permissions: PermissionChecker,
) => {
  if (!permissions.can(user, command.permission)) {
    throw new ForbiddenError();
  }

  return command.execute();
};
```

Authorization should be enforced again at the authoritative server or domain boundary. A UI command can hide unavailable actions and improve the user experience, but it is not a security boundary by itself.

## Commands and audit logs

A command can provide a natural audit record:

```ts
type AuditEntry = {
  command: string;
  actorId: string;
  createdAt: string;
  input: Record<string, unknown>;
};
```

Before executing `changeUserRole`, the invoker can record who requested it, which target was affected, and what input was supplied. Be careful not to log secrets, tokens, passwords, or sensitive data merely because the command carries them.

For durable audit requirements, persist an intentional audit event rather than assuming an in-memory command history is enough.

## Macro commands and transactions

Commands can be combined into a larger command:

```ts
const sequence = (commands: Command[]): Command => ({
  async execute() {
    for (const command of commands) {
      await command.execute();
    }
  },
});
```

This is useful for a macro action such as “publish article,” which may validate content, update status, and notify subscribers.

However, sequencing commands does not automatically make them transactional. If the third command fails, the first two may already have completed. Add explicit compensation, use a real transaction where available, or model the workflow as a process with resumable state.

## Command versus event

A command expresses intent: “please do this.” An event expresses a fact: “this happened.”

```ts
// Command: one owner should perform an operation.
await orderService.cancel(orderId);

// Event: independent consumers may react to a completed fact.
events.publish('order.cancelled', { orderId, reason });
```

Commands usually have one responsible handler and may return a result or error. Events may have multiple subscribers and often represent completed work. Confusing the two can create unclear ownership and accidental fan-out.

## Command versus Strategy

A Strategy represents an algorithm or policy that can be selected for use. A Command represents an action that can be invoked, queued, or recorded.

```ts
// Strategy: choose how shipping is calculated.
const quote = await shippingStrategy.calculate(input);

// Command: represent the action of placing an order.
await placeOrderCommand.execute();
```

A command may use a strategy internally. For example, a `PlaceOrderCommand` can receive a pricing strategy while it captures the intent to place the order.

## Testing commands

Test a command's behavior with focused fakes:

```ts
it('creates a user with the captured input', async () => {
  const users = { create: vi.fn().mockResolvedValue({ id: 'user-1' }) };
  const command = createUserCommand({
    users,
    input: { email: 'person@example.com' },
  });

  await command.execute();

  expect(users.create).toHaveBeenCalledWith({
    email: 'person@example.com',
  });
});
```

For command queues, test serialization, handler selection, retries, duplicate delivery, and failure recovery. For reversible commands, test that `execute` followed by `undo` restores the intended state—not necessarily the exact object identity.

## Common mistakes

### Wrapping every function in a command class

If an operation is immediate, has no lifecycle, and is not passed around, a normal function is usually better. Use Command when the action needs to be represented independently of its execution.

### Commands with hidden mutable references

A command that captures a mutable form object may execute with different values later than the caller intended. Capture a snapshot of the required input when creating the command.

### Assuming all commands are retryable

Retries can duplicate side effects. Define idempotency and retry behavior per command rather than applying one generic policy to every action.

### Confusing command history with audit history

An in-memory undo stack is not a durable compliance record. Audit logs need persistence, privacy controls, retention rules, and reliable write behavior.

### Making commands too broad

A command named `processEverything` is difficult to authorize, retry, undo, or reason about. Prefer commands with one clear action and a stable input contract.

## A practical checklist

Before introducing Command, ask:

- Does this action need to be delayed, queued, retried, logged, or undone?
- Should the action be represented independently from the code that invokes it?
- What data must be captured as an immutable snapshot?
- Is there one clear receiver or handler?
- Is execution idempotent, compensatable, or transactional?
- What should happen on failure or duplicate delivery?
- Would a plain function or direct method call be clearer?

Name commands after actions: `PlaceOrder`, `ExportReport`, `ChangeUserRole`, or `SendWelcomeEmail`. A clear command name makes intent visible at the point where it is created and executed.

## How Command connects to other design ideas

Commands are often created inside a [Module](/blog/module) and assembled with [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection), so receivers and policies are provided rather than looked up globally.

They can use a [Strategy](/blog/strategy) for interchangeable business rules, a [Factory](/blog/factory) for creation, or a [Proxy](/blog/proxy) for retries and access control around execution.

Commands become especially powerful with [Observer / Pub-Sub](/blog/observer-pub-sub): a completed command can publish an event, while the command itself remains an explicit request with one owner.

## Final thoughts

The Command pattern gives an action a lifecycle. Once an operation can be represented as data or a small object, it can be queued, retried, logged, authorized, composed, or undone with much less coupling.

Do not turn every callback into a command. Use the pattern when execution needs to be managed separately from the action's definition, and make idempotency, failure, and ownership part of the design.
