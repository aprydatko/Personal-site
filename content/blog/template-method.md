---
title: "Core Patterns: Template Method"
description: A practical guide to the Template Method pattern, how to keep a workflow fixed while allowing selected steps to vary, and when composition is a better alternative.
date: "2026-09-10"
category: Architecture
readingTime: 6 min read
featured: false
published: true
---

The Template Method pattern defines the overall structure of an algorithm in one place while allowing subclasses or supplied functions to customize selected steps.

The invariant workflow belongs to the template. The variable steps become extension points. This is useful when several processes follow the same sequence but differ in a few well-defined operations.

For example, importing users and importing products may both validate input, transform records, persist results, and report completion. The order is stable, but validation and mapping rules vary.

## The basic shape

A class-based Template Method usually has a public method that defines the sequence and protected methods that subclasses can override:

```ts
abstract class DataImporter<TRecord, TEntity> {
  async import(records: TRecord[]) {
    const validRecords = records.filter((record) => this.isValid(record));
    const entities = validRecords.map((record) => this.transform(record));

    await this.save(entities);
    return entities.length;
  }

  protected abstract isValid(record: TRecord): boolean;
  protected abstract transform(record: TRecord): TEntity;
  protected abstract save(entities: TEntity[]): Promise<void>;
}
```

The `import` method is the template method. It owns the workflow order. Concrete importers provide the steps:

```ts
class UserImporter extends DataImporter<UserRow, User> {
  protected isValid(row: UserRow) {
    return row.email.includes('@');
  }

  protected transform(row: UserRow) {
    return { email: row.email.toLowerCase() };
  }

  protected save(users: User[]) {
    return userRepository.saveMany(users);
  }
}
```

Callers use the stable operation:

```ts
const imported = await new UserImporter().import(rows);
```

They do not need to coordinate validation, transformation, and persistence themselves.

## Fixed steps and extension points

A useful template makes the invariant steps obvious and keeps extension points narrow.

```ts
abstract class ReportExporter<T> {
  async export(input: T) {
    const data = await this.load(input);
    const normalized = this.normalize(data);
    const output = this.serialize(normalized);

    await this.write(output);
    return output;
  }

  protected abstract load(input: T): Promise<ReportData>;

  protected normalize(data: ReportData) {
    return data.rows.filter((row) => !row.hidden);
  }

  protected abstract serialize(data: ReportRow[]): Uint8Array;
  protected abstract write(output: Uint8Array): Promise<void>;
}
```

The template can provide default behavior for steps that are stable. Subclasses override only the parts that truly vary.

Avoid exposing every internal step as an override. Each extension point becomes part of the inheritance contract and makes future changes more difficult.

## Hooks

A hook is an optional extension point that does nothing by default:

```ts
abstract class ImportWorkflow<T> {
  async run(input: T) {
    await this.before(input);
    const result = await this.process(input);
    await this.after(result);
    return result;
  }

  protected before(_input: T): Promise<void> {
    return Promise.resolve();
  }

  protected abstract process(input: T): Promise<ImportResult>;

  protected after(_result: ImportResult): Promise<void> {
    return Promise.resolve();
  }
}
```

Hooks can be useful for optional logging, metrics, or notifications. Keep their semantics clear. A hook that is required for correctness should probably be an abstract step or an explicit dependency, not an optional override that can be forgotten.

## Template Method with functions

The pattern does not require inheritance. A function can define the workflow and receive variable steps as dependencies:

```ts
type ImportSteps<TRecord, TEntity> = {
  isValid(record: TRecord): boolean;
  transform(record: TRecord): TEntity;
  save(entities: TEntity[]): Promise<void>;
};

const createImporter = <TRecord, TEntity>(steps: ImportSteps<TRecord, TEntity>) => ({
  async import(records: TRecord[]) {
    const valid = records.filter(steps.isValid);
    const entities = valid.map(steps.transform);

    await steps.save(entities);
    return entities.length;
  },
});
```

This functional form keeps the algorithm template while using [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection) instead of subclassing.

It is often easier to test and compose because each variable step is visible in the factory call:

```ts
const importer = createImporter({
  isValid: isValidUserRow,
  transform: mapUserRow,
  save: (users) => userRepository.saveMany(users),
});
```

## Template Method versus Strategy

Both patterns separate stable workflow from variable behavior, but they organize the relationship differently.

Template Method keeps the overall algorithm in a base class and customizes selected steps through inheritance or injected functions. The workflow is usually fixed by the template.

Strategy represents one interchangeable algorithm or policy and passes it into a workflow. The caller can often choose or replace the strategy at runtime.

```ts
// Template-style: the process owns the order of steps.
await importer.import(rows);

// Strategy-style: the workflow receives a selectable policy.
const total = calculateTotal(order, taxStrategy);
```

Use Template Method when several implementations share a strong, stable sequence. Use Strategy when one policy varies independently or when you need to combine several independent choices.

## Template Method versus composition

Composition is usually more flexible than inheritance because it avoids coupling a variation to a base class. A pipeline of functions can express a template directly:

```ts
const runImport = async <TRecord, TEntity>(
  records: TRecord[],
  steps: ImportSteps<TRecord, TEntity>,
) => {
  const valid = records.filter(steps.isValid);
  const entities = valid.map(steps.transform);

  await steps.save(entities);
  return entities;
};
```

Composition is especially attractive when steps vary independently, need different dependencies, or should be reused in multiple sequences. Inheritance can be clearer when the algorithm is naturally a family of related workflows and the extension points are stable.

## Template Method in frontend applications

Frontend features can share a workflow without sharing a class hierarchy. A form submission template can define common state transitions:

```ts
type SubmitSteps<TInput, TResult> = {
  validate(input: TInput): Promise<void> | void;
  submit(input: TInput): Promise<TResult>;
  onSuccess(result: TResult): void;
};

const createSubmitHandler = <TInput, TResult>(steps: SubmitSteps<TInput, TResult>) =>
  async (input: TInput) => {
    await steps.validate(input);
    const result = await steps.submit(input);
    steps.onSuccess(result);
    return result;
  };
```

Every form can keep the same high-level sequence while supplying feature-specific validation, API calls, and success behavior. A hook or custom function can provide the same structure without creating a base component.

Do not use a Template Method to force unrelated screens into one lifecycle. Shared sequence is a meaningful boundary only when the steps genuinely belong to the same workflow.

## Failure behavior and invariants

The template owns important invariants such as ordering, cleanup, and failure handling:

```ts
abstract class TransactionalWorkflow<TInput, TResult> {
  async run(input: TInput) {
    const transaction = await this.begin();

    try {
      const result = await this.execute(input, transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  protected abstract begin(): Promise<Transaction>;
  protected abstract execute(input: TInput, transaction: Transaction): Promise<TResult>;
}
```

Subclasses can customize the operation while the template protects the commit and rollback sequence. If a subclass can bypass the invariant by overriding the whole public method, the boundary is too weak. Keep the template method final by convention or use a functional factory where the sequence is not replaceable.

## Testing Template Methods

Test the shared sequence independently from each concrete variation:

```ts
it('validates before saving transformed records', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const importer = createImporter({
    isValid: (row: UserRow) => row.email.includes('@'),
    transform: (row: UserRow) => ({ email: row.email }),
    save,
  });

  await importer.import([
    { email: 'valid@example.com' },
    { email: 'invalid' },
  ]);

  expect(save).toHaveBeenCalledWith([
    { email: 'valid@example.com' },
  ]);
});
```

Also test each important implementation of the extension points. A test of the template proves ordering and coordination; it does not prove that every concrete mapper or persistence adapter is correct.

## Common mistakes

### An unstable base class

If the base class changes often because every subclass needs different steps, the template is not a stable abstraction. Prefer composition or separate workflows.

### Too many protected methods

Every override point increases coupling to the base class's internal sequence. Expose only steps that are meaningful variations.

### Subclasses overriding the template

If implementations need to replace the main algorithm, the pattern is no longer protecting a common workflow. Make the invariant sequence explicit or choose a different abstraction.

### Optional hooks for required work

A default no-op hook can make a required action silently disappear. Required behavior should be represented by an abstract method or an explicit dependency.

### Inheritance for unrelated workflows

Two workflows may both have methods named `run`, `load`, and `save` without sharing a real conceptual relationship. Similar method names are not enough reason for a common base class.

### Overengineering simple pipelines

A few function calls may communicate a sequence more clearly than a hierarchy of abstract classes. Start with direct code and extract a template when repetition and stable variation become clear.

## A practical checklist

Before introducing Template Method, ask:

- Do several workflows share the same meaningful sequence?
- Which steps are truly invariant?
- Which steps vary independently and need extension points?
- Is the template stable enough to be a contract?
- Would injected functions or composition be simpler than inheritance?
- How are failures, cleanup, and transaction boundaries protected?
- Can the shared sequence and concrete steps be tested separately?

Name the template after the workflow it controls: `import`, `export`, `run`, `submit`, or `process`. Name extension points after the specific step they represent instead of using vague hooks such as `doStep1`.

## How Template Method connects to other design ideas

Template Method is a structured form of [Composition: Build Behavior by Combining Small Parts](/blog/composition): a stable workflow coordinates smaller variable steps.

Its function-based form uses [Dependency Injection: Make Dependencies Explicit](/blog/dependency-injection), while independent policies can be represented with the [Strategy pattern](/blog/strategy).

The template often acts as a [Facade](/blog/facade) for a repeated workflow, hiding lower-level coordination behind one operation.

When subclasses become difficult to manage, the [Open/Closed Principle: Extend Without Rewriting](/blog/open-closed-principle) may be better served by composition and small contracts than by a growing inheritance hierarchy.

## Final thoughts

The Template Method pattern keeps a workflow's important sequence in one place while allowing selected steps to vary. It is valuable when the sequence is stable, the extension points are clear, and the implementations are genuinely related.

Use inheritance when it expresses a strong and durable relationship; otherwise, pass functions or strategies into a workflow. A good template protects invariants without making every future variation depend on a fragile base class.
