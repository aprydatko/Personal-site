---
title: "Next.js App Router: The Mental Model I Wish I Had Earlier"
description: The mental model that makes the Next.js App Router easier to understand, from route segments and layouts to Server Components and client boundaries.
date: "2026-09-08"
category: Architecture
readingTime: 8 min read
featured: true
published: true
---

When I first started working with the Next.js App Router, I tried to understand it like the old Pages Router.

That made everything harder.

The App Router is not just a new folder structure. It changes how I think about routing, rendering, data fetching, layouts, and the boundary between server and client code.

The mental model that helped me most is simple:

> **Think of the `app` directory as a tree of UI segments, not just a list of pages.**

## The Folder Structure Is the Route Structure

A basic example:

```text
app/
├── layout.tsx
├── page.tsx
└── dashboard/
    ├── layout.tsx
    ├── page.tsx
    └── settings/
        └── page.tsx
```

This creates `/`, `/dashboard`, and `/dashboard/settings`.

Each folder is a route segment, and `page.tsx` makes that route accessible. Segments can also have their own `layout.tsx`, `loading.tsx`, and `error.tsx` files.

That is more powerful than thinking about routing as simply:

```text
URL → component
```

## Layouts Are Part of the Route Tree

The biggest mental shift for me was understanding that layouts are composed automatically from the folder hierarchy.

```text
app/
├── layout.tsx
└── dashboard/
    ├── layout.tsx
    └── users/
        └── page.tsx
```

The users page is effectively rendered like this:

```tsx
<RootLayout>
  <DashboardLayout>
    <UsersPage />
  </DashboardLayout>
</RootLayout>
```

You do not manually compose these layouts. Next.js does it based on the folder hierarchy.

Layouts are shared between pages in their segment, so navigation can update page content while preserving surrounding UI such as a dashboard sidebar.

## Server First

In the App Router, I use this mental model:

```text
Server by default
↓
Client only when needed
```

A component does not need `"use client"` just because it is a React component. I usually need a Client Component when I need browser-side behavior such as `useState`, `useEffect`, event handlers, `window`, or `localStorage`.

For example, this can stay on the server:

```tsx
export default async function ProductsPage() {
  const products = await getProducts();

  return <ProductList products={products} />;
}
```

But an interactive filter needs a client boundary:

```tsx
"use client";

import { useState } from "react";

export function ProductFilter() {
  const [query, setQuery] = useState("");
  // ...
}
```

This leads to another useful rule:

> **Keep the client boundary as small as possible.**

Instead of making an entire page a Client Component because one button is interactive, extract that interactive part.

## Data Fetching Can Live Close to the Component

With the App Router, server-side data fetching can live close to the UI that needs it:

```tsx
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  return <UserProfile user={user} />;
}
```

This makes pages easier to reason about because the data dependency stays close to the component that uses it.

## Loading and Errors Belong to the Route

The App Router gives route segments special files:

```text
dashboard/
├── loading.tsx
├── error.tsx
└── page.tsx
```

`loading.tsx` provides fallback UI while route content is prepared. `error.tsx` acts as an error boundary for that route segment.

I think about a route as a small package:

```text
Route
├── UI
├── layout
├── loading state
└── error state
```

This keeps related behavior close together.

## Route Groups Are Organizational, Not URLs

Folders wrapped in parentheses organize routes without adding that folder to the URL:

```text
app/
├── (marketing)/
│   ├── about/
│   └── blog/
└── (dashboard)/
    ├── users/
    └── settings/
```

For example, `app/(marketing)/blog/page.tsx` still becomes `/blog`.

Route Groups are useful when different sections need different layouts or organization without changing public URLs.

## The Mental Model I Use Now

Instead of seeing `app/` as a folder containing pages, I see it as an application UI tree:

```text
Route segment
│
├── layout
├── page
├── loading
├── error
│
└── child route segment
```

For components:

```text
Server Component
      │
      ├── fetch data
      ├── access backend resources
      └── render
              │
              ▼
       Client Component
              │
              ├── state
              ├── events
              └── browser APIs
```

Once I started thinking this way, the App Router became much easier to understand.

## Final Thoughts

The biggest mistake I made early was treating the App Router as:

> **Pages Router with different filenames.**

It is better to think of it as a nested application tree where routing, layouts, server rendering, loading states, errors, and client boundaries work together.

My simple rules now are:

```text
Folders define route segments.
Layouts wrap everything below them.
Server Components are the default.
Client Components are interactive islands.
Data fetching stays close to server UI.
Loading and errors belong to route segments.
```

Once that mental model clicks, the App Router starts feeling much less complicated.
