---
title: "Classical GoF patterns: Memento"
description: A practical guide to the Memento pattern, how to capture and restore object state without exposing internals, and how to design reliable undo, redo, and recovery history.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Memento pattern captures an object’s state so it can be restored later without exposing the object’s internal representation.

```text
Originator → create memento → caretaker stores snapshot
Originator ← restore memento ← caretaker selects snapshot
```

The originator owns the meaning of its state. The caretaker stores, orders, or expires snapshots but should not need to inspect or modify their internals.

Memento is useful for undo/redo, draft recovery, transaction checkpoints, workflow compensation, and temporary state restoration.

## The basic shape

An editor can create an opaque snapshot:

```ts
type EditorMemento = {
  readonly state: unknown;
};

type Editor = {
  type(text: string): void;
  save(): EditorMemento;
  restore(memento: EditorMemento): void;
  content(): string;
};
```

The editor controls how state is captured and restored:

```ts
const createEditor = (): Editor => {
  let text = '';

  return {
    type(value) {
      text += value;
    },
    save() {
      return { state: text };
    },
    restore(memento) {
      if (typeof memento.state !== 'string') {
        throw new Error('Invalid editor memento');
      }
      text = memento.state;
    },
    content: () => text,
  };
};
```

The caretaker can hold the snapshot without knowing that the state is a string:

```ts
const history: EditorMemento[] = [];
history.push(editor.save());
editor.type('hello');
editor.restore(history.pop()!);
```

## Encapsulation

The central benefit is state ownership. A caretaker should not reach into an originator’s private fields to create a snapshot:

```ts
// caretaker should not do this
history.push({ text: editor.text, selection: editor.selection });
```

That would couple history to the editor’s representation. If the editor later stores a rope, token tree, or compressed document model, the caretaker must change. Let the originator define a stable snapshot capability.

In languages with stronger access controls, a memento can expose a narrow read interface to the caretaker while the originator receives a privileged internal representation. In TypeScript, use module boundaries, opaque types, and runtime validation rather than relying only on structural typing.

## Undo and redo

Undo and redo usually use two stacks:

```ts
class History<T> {
  private readonly past: T[] = [];
  private readonly future: T[] = [];

  push(snapshot: T) {
    this.past.push(snapshot);
    this.future.length = 0;
  }

  undo(current: T): T | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(current);
    return previous;
  }

  redo(current: T): T | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    return next;
  }
}
```

When a new edit occurs after undo, the redo branch is normally cleared. That is a history policy, so keep it in the caretaker or history abstraction rather than hiding it inside unrelated editor logic.

## Snapshot timing

Choose whether to snapshot before or after a change:

```text
before edit → apply edit → snapshot history contains state to restore
```

Snapshotting before every keystroke may consume too much memory. Snapshot at meaningful command boundaries, such as after a paste, formatting action, or completed form operation. For collaborative or autosaving editors, a change log or operational transform may be more appropriate than full snapshots.

## Deep copies and shared state

A memento must remain stable after it is created. Do not store references to mutable state that the originator will later change:

```ts
type BoardState = {
  cells: string[][];
};

const saveBoard = (state: BoardState): BoardState => ({
  cells: state.cells.map((row) => [...row]),
});
```

Copy nested mutable structures or use immutable persistent data. A shallow copy of the outer object is not enough if rows, maps, or child objects remain shared.

For large state, structural sharing can reduce cost. Immutable trees can let snapshots reuse unchanged branches, while a mutable originator may need copy-on-write or a domain-specific serialization format.

## Memento versus Command

Command records an operation; Memento records state:

```text
Command  → “insert these characters at this position”
Memento  → “the editor looked like this”
```

Command-based undo can use less memory and support semantic merging, but it must implement reliable inverse operations. Memento restoration is simpler and more robust for complex state, at the cost of snapshot size and potentially weaker intent history.

The two patterns can work together: a command can save a memento before execution and restore it if execution fails.

## Memento versus Event Sourcing

Event Sourcing stores an append-only sequence of domain events and rebuilds state by replaying them. Memento stores a point-in-time snapshot:

```text
Memento       → restore one captured state
Event Sourcing → reconstruct state from a durable event history
```

An event-sourced system may use snapshots as performance checkpoints, but a UI undo stack and a durable audit history have different requirements. Do not turn every temporary snapshot into a permanent event log without defining retention, schema evolution, privacy, and replay behavior.

## Persistence and recovery

Snapshots used for crash recovery need a durable format and version:

```ts
type DraftMemento = {
  schemaVersion: 2;
  savedAt: string;
  state: SerializedDraft;
};
```

Validate snapshots before restoring them. A snapshot may outlive the code version that created it, so support migrations or reject unsupported versions clearly. Persist sensitive state with appropriate encryption, access control, retention, and deletion policies.

Do not confuse a user-facing undo snapshot with a durable backup. Undo can discard history; recovery data may need retention and integrity guarantees.

## Partial state and external resources

A memento should capture the state required to restore the originator, not arbitrary external resources:

```text
capture: draft fields, cursor position, selected IDs
exclude: open socket, active timer, database connection, in-flight request
```

On restore, recreate or rebind external resources through their owning boundary. If restoring state requires validation against current external data, make that reconciliation explicit. A snapshot from yesterday may refer to a deleted record or a changed permission.

## Memory limits

History needs a bounded policy:

```ts
const MAX_SNAPSHOTS = 100;

const pushSnapshot = <T>(history: T[], snapshot: T) => {
  history.push(snapshot);
  if (history.length > MAX_SNAPSHOTS) history.shift();
};
```

For large documents, consider compression, periodic full snapshots plus deltas, structural sharing, or a memory budget rather than a fixed count. Measure snapshot size, creation time, restore time, and garbage-collection pressure.

## Concurrent changes

Snapshots need a concurrency policy. In a collaborative editor or multi-tab application, a local snapshot may restore over newer remote changes.

Possible approaches include:

- attach a version and reject stale restoration;
- restore only local fields;
- merge through a domain-specific conflict resolver;
- serialize edits through one owner;
- use a collaborative data structure instead of whole-state restore.

Never assume restoring a snapshot is safe merely because the object is local. State can be changed by timers, subscriptions, background synchronization, or other actors.

## Testing Memento

Test round-trip behavior and independence:

```ts
it('restores the editor to a saved state', () => {
  const editor = createEditor();
  editor.type('before');
  const snapshot = editor.save();
  editor.type(' after');

  editor.restore(snapshot);

  expect(editor.content()).toBe('before');
});
```

Also test nested mutable state, invalid snapshots, schema migration, undo/redo branch clearing, history limits, memory behavior, concurrent version conflicts, external-resource rebinding, and restoration after a process restart when snapshots are durable.

## Common mistakes

### Sharing mutable snapshot state

If later edits mutate data inside a saved snapshot, undo restores the wrong state. Copy or structurally share immutable data safely.

### Exposing originator internals

The caretaker should not know how state is represented. Keep snapshot creation and restoration owned by the originator.

### Unbounded history

Full snapshots can consume memory quickly. Define count, byte, age, or compression limits.

### Restoring stale state blindly

A snapshot may conflict with newer external or collaborative changes. Use versions, merge rules, or an explicit stale-state error.

### Treating snapshots as events

A snapshot says what state was captured, not why it changed. Use Command or Event Sourcing when intent and audit history are required.

### Restoring resources instead of state

Connections, locks, and in-flight operations cannot usually be cloned meaningfully. Recreate them through their lifecycle owners.

## A practical checklist

Before introducing Memento, ask:

- What state must be restorable, and who owns its meaning?
- Should history capture full snapshots, deltas, commands, or events?
- Are snapshots deep, immutable, or structurally shared?
- What happens when a snapshot is invalid, stale, or from an older schema?
- How are undo and redo branches managed?
- What are the memory, retention, privacy, and encryption limits?
- Which external resources must be rebound rather than restored?
- Can concurrent changes conflict with restoration?

## Final thoughts

Memento provides safe state restoration without making a caretaker depend on an originator’s internals. It is a strong fit for undo/redo and checkpoints when a complete state snapshot is easier to trust than a reversible operation.

Keep snapshots stable, bounded, versioned when they persist, and explicit about concurrency and external resources. When history needs intent, auditability, or efficient replay, consider Command, Event Sourcing, or a domain-specific change log instead.
