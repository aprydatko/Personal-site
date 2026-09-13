---
title: "Classical GoF patterns: Composite"
description: A practical guide to the Composite pattern, how to treat individual objects and compositions uniformly, and how to design recursive trees without leaking traversal details.
date: "2026-09-13"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

The Composite pattern composes objects into tree structures and lets clients treat individual objects and groups of objects through the same interface.

```text
Document
├── Heading
├── Paragraph
└── Section
    ├── Paragraph
    └── Image
```

The key idea is a shared component contract. A leaf performs work directly; a composite delegates that work to its children.

```text
Component
├── Leaf      → performs the operation
└── Composite → forwards the operation to children
```

## The problem it solves

Without Composite, callers need separate code for one item and a group:

```ts
if (item.kind === 'file') {
  await download(item);
} else {
  for (const child of item.children) await download(child);
}
```

That conditional spreads whenever the system adds another operation. A shared component interface moves the recursion into the tree:

```ts
type FileSystemNode = {
  size(): number;
  print(indent?: string): string;
};
```

Now a caller can use either a file or directory:

```ts
const totalSize = (node: FileSystemNode) => node.size();
```

The caller depends on capability, not on whether the node is a leaf or a container.

## Leaves and composites

A leaf has no children:

```ts
const createFile = (name: string, bytes: number): FileSystemNode => ({
  size: () => bytes,
  print: (indent = '') => `${indent}${name} (${bytes} bytes)`,
});
```

A composite contains components and delegates recursively:

```ts
const createDirectory = (
  name: string,
  children: FileSystemNode[],
): FileSystemNode => ({
  size: () => children.reduce((total, child) => total + child.size(), 0),
  print: (indent = '') => [
    `${indent}${name}/`,
    ...children.map((child) => child.print(`${indent}  `)),
  ].join('\n'),
});
```

The same `size()` and `print()` operations work at any level of the tree.

## Transparent versus safe interfaces

There are two common interface styles.

### Transparent Composite

The component interface exposes child management methods:

```ts
type Component = {
  render(): string;
  add(child: Component): void;
  remove(child: Component): void;
};
```

Leaves must implement `add` and `remove`, often by throwing or doing nothing. This gives clients one fully uniform interface, but it permits invalid operations at runtime.

### Safe Composite

Only the composite exposes child management:

```ts
type Node = { render(): string };
type ContainerNode = Node & {
  add(child: Node): void;
  remove(child: Node): void;
};
```

This better reflects the domain and prevents callers from adding children to a leaf. The tradeoff is that callers need to know when they require container-specific behavior. Prefer the safe form when invalid operations should be impossible or clearly rejected.

## Tree operations

A composite can implement aggregate operations recursively:

```ts
type MenuItem = {
  label: string;
  isVisible(): boolean;
  render(): string;
};

const createMenu = (
  label: string,
  items: MenuItem[],
): MenuItem => ({
  label,
  isVisible: () => items.some((item) => item.isVisible()),
  render: () => [
    `<section aria-label="${label}">`,
    ...items.filter((item) => item.isVisible()).map((item) => item.render()),
    '</section>',
  ].join('\n'),
});
```

Be precise about empty composites. Should an empty menu be hidden, render an empty container, or be invalid? That is a domain rule, not a consequence of the pattern.

## Composite in application design

Composite is useful beyond UI trees:

- organization structures and nested teams;
- file and folder hierarchies;
- permission groups;
- nested product bundles;
- expression trees and query filters;
- document and scene graphs;
- workflow steps and grouped tasks;
- geographical regions and subregions.

The pattern fits when operations naturally apply to both one node and a group of nodes, and the hierarchy is meaningful to the domain.

## Expression trees

An expression tree can treat a literal and a compound expression uniformly:

```ts
type Expression = { evaluate(input: Record<string, number>): number };

const value = (amount: number): Expression => ({
  evaluate: () => amount,
});

const add = (left: Expression, right: Expression): Expression => ({
  evaluate: (input) => left.evaluate(input) + right.evaluate(input),
});

const total = add(value(10), add(value(5), value(2)));
```

A consumer evaluates the root without knowing how deeply nested the expression is. Other operations—formatting, optimization, validation, or compilation—can traverse the same tree through a Visitor or a dedicated operation.

## Traversal and Visitor

When operations multiply, putting every operation on the component interface can make it large. A Visitor separates operations from the tree structure:

```ts
type NodeVisitor<T> = {
  visitFile(file: FileNode): T;
  visitDirectory(directory: DirectoryNode): T;
};

type TreeNode = {
  accept<T>(visitor: NodeVisitor<T>): T;
};
```

Composite organizes the structure; Visitor organizes operations over that structure. Use Visitor when the node types are stable and new operations are frequent. Use direct component methods when the operations are few and fundamental to every node.

## Mutation and ownership

Mutable composites need clear child ownership:

```ts
class Folder {
  private readonly children: FileSystemNode[] = [];

  add(child: FileSystemNode) {
    this.children.push(child);
    return this;
  }

  remove(child: FileSystemNode) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
  }
}
```

Decide whether a child can have one parent, multiple parents, or no parent tracking. If the structure is a true tree, reject cycles and duplicate ownership. If shared subtrees are allowed, the structure is a graph and recursive operations need cycle detection or memoization.

Immutable composites can return new parents when adding or removing children:

```ts
const withChild = (node: FolderNode, child: TreeNode): FolderNode => ({
  ...node,
  children: [...node.children, child],
});
```

Immutable trees are easier to share, cache, and reason about in concurrent code, but updates allocate along the changed path.

## Caching aggregate values

Recursive calculations can become expensive when the tree is large or operations repeat:

```ts
type SizedNode = {
  size(): number;
  version(): number;
};
```

Cache aggregate values only with a reliable invalidation or versioning strategy. A stale directory size, permission result, or total price can be worse than a slower calculation. For immutable trees, structural sharing and version-based memoization make cache correctness easier.

## Composite versus Decorator

Both patterns wrap objects, but their intent differs:

```text
Composite  → contains multiple components and delegates recursively
Decorator  → wraps one component and adds behavior around it
```

A decorated leaf can live inside a composite. For example, a cached file node can be a child of a directory. Keep the collection responsibility in Composite and the cross-cutting behavior in Decorator.

## Composite versus Chain of Responsibility

Composite represents a hierarchy where an operation may apply across many children. Chain of Responsibility represents an ordered sequence where one handler usually accepts a request:

```text
Composite → tree / many children / recursive aggregation
Chain     → ordered handlers / delegation / one owner
```

Do not use a Composite when the real requirement is first-match routing, and do not use a chain when every nested child should contribute to an aggregate result.

## Validation and cycles

Recursive structures need boundary validation:

```ts
const addChild = (parent: Node, child: Node, ancestors: Set<Node>) => {
  if (parent === child || ancestors.has(child)) {
    throw new Error('Composite would create a cycle');
  }
  parent.children.push(child);
};
```

A child reference can create a cycle accidentally through mutation, especially when nodes are reused. If the domain permits graphs, replace tree assumptions with explicit graph traversal and a visited set.

## Testing Composite structures

Test leaves, composites, nesting, and empty behavior:

```ts
it('aggregates size recursively', () => {
  const tree = createDirectory('root', [
    createFile('a.txt', 10),
    createDirectory('nested', [createFile('b.txt', 5)]),
  ]);

  expect(tree.size()).toBe(15);
});
```

Also test child ordering, add/remove behavior, cycle rejection, shared references, immutable updates, visibility rules, deep nesting, and failure propagation. Property-based tests can verify that aggregate operations equal the equivalent operation over all leaves.

## Common mistakes

### Forcing one interface onto incompatible nodes

If a leaf cannot meaningfully support a method, a transparent interface may be hiding a bad abstraction. Prefer a safe interface or split capabilities.

### Accidental cycles

Mutation can turn a tree into a cyclic graph and cause infinite recursion. Enforce ownership or track visited nodes.

### Hidden complexity

Recursive rendering, permission checks, or remote calls can become expensive across a large tree. Set depth, timeout, and resource budgets where needed.

### Stale aggregate caches

Cached totals and permissions require reliable invalidation or immutable versioning. Otherwise the composite returns plausible but incorrect results.

### Composite for a flat list

If elements do not contain meaningful nested groups and no recursive operation exists, a collection is simpler and more explicit.

### Unclear ownership

Decide who can add, remove, move, or delete children. Ambiguous ownership leads to duplicate parents, memory leaks, and authorization bugs.

## A practical checklist

Before introducing Composite, ask:

- Is the domain naturally hierarchical?
- Should leaves and groups support the same core operations?
- Which operations are recursive or aggregate?
- Are child management methods safe on every component type?
- Is the structure a tree or a graph, and can cycles occur?
- Who owns and mutates child relationships?
- Do aggregate values need caching or versioning?
- Would a flat collection, Visitor, Decorator, or Chain of Responsibility be clearer?

## Final thoughts

Composite lets clients work with one object and a nested group through the same meaningful interface. It is strongest when the hierarchy is part of the domain and operations naturally recurse or aggregate.

Keep leaf and container responsibilities honest, define ownership and cycle rules, and make expensive recursive work observable. When the structure is only a flat list or the operations are not uniform, choose a simpler model.
