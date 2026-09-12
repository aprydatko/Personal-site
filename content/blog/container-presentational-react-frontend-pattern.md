---
title: "Container / Presentational: A Practical React Frontend Pattern"
description: How to separate React orchestration from UI rendering with Container and Presentational components, including when the pattern helps and when it becomes unnecessary.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

React components are easiest to work with when each one has a clear job. A component that renders a list, fetches data, owns filters, handles errors, tracks loading state, and decides what happens after a click can still work—but it becomes harder to test and change as the feature grows.

The Container / Presentational pattern gives those responsibilities a simple boundary:

```text
data and interaction state → Container → Presentational component → UI
```

The Container coordinates the feature. The Presentational component renders the state it receives and reports user intent through callbacks.

## What the pattern means

A Container is responsible for orchestration. It may:

- Load data from a hook, service, or server-provided prop.
- Own local state such as filters, pagination, and selected items.
- Derive view-ready values from source data.
- Handle actions and translate them into application calls.
- Decide which loading, error, empty, or success state should be shown.

A Presentational component is responsible for rendering. It should receive the values it needs through props and expose events through callbacks:

```tsx
type ProductListViewProps = {
  products: Product[];
  query: string;
  onQueryChange: (query: string) => void;
  onProductSelect: (productId: string) => void;
};

const ProductListView = ({
  products,
  query,
  onQueryChange,
  onProductSelect,
}: ProductListViewProps) => (
  <section aria-label="Products">
    <input
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      placeholder="Search products"
    />
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <button type="button" onClick={() => onProductSelect(product.id)}>
            {product.name}
          </button>
        </li>
      ))}
    </ul>
  </section>
);
```

There is no fetching, filtering policy, router access, or business workflow in this component. That makes its output predictable: given the same props, it renders the same interface.

## The Container owns the workflow

The Container supplies the state and callbacks:

```tsx
'use client';

const ProductList = ({ products }: { products: Product[] }) => {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery),
    );
  }, [products, query]);

  const handleProductSelect = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  return (
    <ProductListView
      products={visibleProducts}
      query={query}
      onQueryChange={setQuery}
      onProductSelect={handleProductSelect}
    />
  );
};
```

The name does not matter as much as the boundary. `ProductList` is the stateful feature component, while `ProductListView` is the reusable rendering component.

## Why this helps in React

### Rendering becomes easier to test

The Presentational component can be tested with fixture data. Tests can focus on visible labels, empty states, accessible names, and whether an event callback is called with the correct value.

The Container can be tested separately for filtering, sorting, loading transitions, and navigation. Those tests do not need to understand every detail of the layout.

### UI changes have a smaller blast radius

Changing a card from a row layout to a grid should not require editing data-fetching logic. Replacing a search input with a command menu should not require rewriting the filtering rule.

The separation is especially useful when the same data needs different presentations—for example, a compact dashboard list and a full-page directory.

### Server and client boundaries stay clearer

In the Next.js App Router, pages are Server Components by default. A page can fetch data on the server and pass serializable data to a small client-side Container:

```tsx
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts();

  return <ProductList products={products} />;
}
```

The page keeps server-only data access on the server. The Container owns only the browser interaction that actually needs client state. This avoids turning an entire page into a Client Component just because one section has a filter.

## Keep business rules below the Container

The Container is a presentation boundary, not a replacement for the domain or application layer. A rule such as “a discontinued product cannot be purchased” should not exist only in a button handler:

```tsx
// Too much business knowledge in the UI
const handleBuy = () => {
  if (product.status === 'discontinued' || product.stock === 0) return;
  addToCart(product);
};
```

The interface may disable the button for a better experience, but the purchase use case must enforce the rule for every caller. Keep that policy in a domain function or application service, and let the Container coordinate the call and display the result.

## Props should describe view needs

Avoid passing a large repository, API client, or entire application context to a Presentational component. Prefer a narrow contract:

```tsx
type CheckoutViewProps = {
  total: string;
  submitting: boolean;
  error?: string;
  onSubmit: () => void;
};
```

This makes the component easier to reuse and prevents infrastructure details from leaking into the UI. It also gives the component a stable API even if the Container later switches from a REST endpoint to a server action.

## Loading, error, and empty states

The Container should normalize asynchronous state before passing it to the View. Avoid contradictory flags such as `loading: true` and `error: 'Request failed'` unless the interface intentionally supports both.

For small features, explicit props are enough:

```tsx
<ProductListView
  status="error"
  products={[]}
  errorMessage="Products could not be loaded."
  onRetry={reload}
/>
```

For larger workflows, a discriminated union makes invalid states harder to represent:

```ts
type ProductListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[] };
```

The Presentational component can then render each state deliberately instead of guessing which flags take priority.

## When not to use it

The pattern is not a requirement for every component. Splitting a five-line component into a Container and a View adds indirection without reducing complexity.

Keep a component together when:

- It has no meaningful state or side effects.
- Its rendering and behavior are tightly coupled and unlikely to grow.
- The extracted View would be used only once and have no useful independent contract.
- The split would require passing a large collection of trivial props.

Use the pattern when a component has multiple responsibilities, when the UI has more than one consumer, or when independent testing and iteration are valuable.

## Container / Presentational versus custom hooks

A custom hook and a Container solve related but different problems. A hook extracts stateful behavior; a Presentational component extracts rendering. They can be combined:

```tsx
const ProductList = () => {
  const model = useProductList();

  return <ProductListView {...model} />;
};
```

The hook can expose view-ready state and commands, while the View remains unaware of how that state is produced. This is useful when several Containers need the same workflow but intentionally render different interfaces.

## A practical checklist

Before splitting a React component, ask:

- Which lines are about rendering, and which are about orchestration?
- Can the UI be described by a small, meaningful props contract?
- Are filtering, validation, or sorting rules reusable and testable independently?
- Does the component need browser-only state, while its data can remain server-fetched?
- Would a second presentation of the same state be useful?
- Is the boundary reducing change and testing cost, or only creating more files?

## Final thoughts

Container / Presentational is a lightweight way to make React responsibilities visible. Containers coordinate state, data, and user intent. Presentational components render accessible interfaces from explicit props.

The goal is not to eliminate logic from components or maximize the number of files. The goal is to place each kind of logic where it can change independently. Start with the boundary that removes the most coupling, keep props focused, and let the complexity of the feature—not a pattern checklist—decide how far to split.
