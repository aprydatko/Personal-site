---
title: "Server Components vs Client Components: How I Decide"
description: A practical mental model for choosing the right Server and Client Component boundaries in the Next.js App Router.
date: "2026-09-08"
category: Architecture
readingTime: 7 min read
featured: true
published: true
---

One of the most common questions when working with the Next.js App Router is:

> **Should this component be a Server Component or a Client Component?**

At first, I was adding `"use client"` too often. It solved the immediate problem, but it also made too much of the application run on the client.

The mental model I use now is simple:

> **Start with a Server Component. Move to the client only when the browser actually needs to do something interactive.**

Next.js uses Server Components by default in the App Router. Client Components are introduced when you add the `"use client"` directive.

## When I Use Server Components

I prefer Server Components for fetching data, reading from a database, accessing secrets or server-only APIs, rendering mostly static content, and composing layouts and pages.

```tsx
export default async function ProductsPage() {
  const products = await getProducts();

  return <ProductList products={products} />;
}
```

This component can fetch data directly on the server. I do not need `useEffect()` or `useState()` just to load the initial data.

Server Components can use `async/await` directly, and database or backend logic can stay on the server instead of being exposed to the browser.

## When I Use Client Components

I switch to a Client Component when I need browser-side interaction.

Typical examples include:

```text
useState
useEffect
onClick
onChange
usePathname
useRouter
localStorage
window
document
```

For example:

```tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}
```

The state changes in the browser, so this naturally belongs on the client. Client-side hooks such as `usePathname()` and `useSearchParams()` also require a Client Component.

## The Mistake I Try to Avoid

Imagine a page with one interactive button:

```tsx
"use client";

export default function ProductPage() {
  // huge page...
}
```

Adding `"use client"` to the entire page creates a much larger client boundary than necessary.

Instead, I keep the page on the server and extract only the interactive part:

```tsx
export default async function ProductPage() {
  const product = await getProduct();

  return (
    <>
      <ProductInfo product={product} />
      <AddToCartButton productId={product.id} />
    </>
  );
}
```

```tsx
"use client";

export function AddToCartButton({ productId }: { productId: string }) {
  return <button onClick={() => addToCart(productId)}>Add to cart</button>;
}
```

The structure becomes:

```text
ProductPage          Server
│
├── ProductInfo      Server
│
└── AddToCartButton  Client
```

## I Think in Boundaries

Instead of asking whether an entire page is server or client, I ask where the server-client boundary should be.

```text
Product Page
│
├── Product details        Server
├── Reviews                Server
├── Recommended products   Server
├── Quantity selector      Client
├── Add to cart            Client
└── Favorite button        Client
```

Most of the page can stay server-rendered. Only the interactive pieces need client-side JavaScript.

## Server Components Can Render Client Components

A Server Component can import and render a Client Component:

```tsx
import { Search } from "./Search";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <Search />
      <ProductList products={products} />
    </>
  );
}
```

The parent stays on the server while `Search` handles browser interaction. Server and Client Components are complementary, not competing approaches.

## My Decision Checklist

When I create a component, I ask:

* Does it need state or browser interaction? If yes, it is probably a Client Component.
* Does it need browser APIs such as `window`, `document`, `localStorage`, or `navigator`? Then it needs the client.
* Does it mainly fetch and display data? Keep it as a Server Component.
* Does it contain only one small interactive part? Keep the parent on the server and extract that part.

For an admin dashboard, the structure might look like this:

```text
DashboardPage                 Server
│
├── DashboardHeader           Server
├── RevenueStats              Server
├── OrdersTable               Server
├── DateRangePicker           Client
└── ExportButton              Client
```

The server handles database queries, data transformation, and initial rendering. The client handles clicks, state, and browser interaction.

## My Rule of Thumb

```text
Start Server
     ↓
Does the component require interaction?
     │
  ┌──┴──┐
  NO    YES
  │      │
Server  Client
```

I do not add `"use client"` because a component might eventually need it. I add it when there is a concrete reason.

## Final Thoughts

Server Components and Client Components are not about choosing one over the other. A good Next.js application usually uses both.

```text
Server Components → data, backend access, rendering, structure
Client Components → interaction, state, events, browser APIs
```

My rule is:

> **Keep as much as possible on the server, and move only the interactive boundary to the client.**

Once I started thinking in boundaries rather than entire pages, deciding between Server and Client Components became much easier.
