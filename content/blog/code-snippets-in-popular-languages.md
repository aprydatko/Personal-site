---
title: Code snippets in popular languages
description: A visual reference for writing highlighted, copyable code examples in Markdown posts.
date: "2024-06-10"
category: Tools
readingTime: 5 min read
featured: true
---

Every fenced code block in this post is rendered with the reusable code window. The language after the opening fence controls its label and syntax colors.

## HTML

```html
<article class="card">
  <h2>Build something useful</h2>
  <p>Clear markup keeps interfaces accessible.</p>
  <a href="/contact">Start a project</a>
</article>
```

## CSS

```css
.card {
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
}

.card:hover {
  border-color: var(--primary);
}
```

## JavaScript

```js
const formatPrice = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);

console.log(formatPrice(249.9));
```

## React and TypeScript

```tsx
type StatusBadgeProps = {
  status: 'draft' | 'published';
};

export const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span className={status === 'published' ? 'text-green-500' : 'text-muted'}>
    {status}
  </span>
);
```

## Python

```python
from dataclasses import dataclass

@dataclass
class Project:
    name: str
    published: bool = False

print(Project(name="Portfolio", published=True))
```

## SQL

```sql
SELECT title, published_at
FROM blog_posts
WHERE published = true
ORDER BY published_at DESC
LIMIT 5;
```

## JSON

```json
{
  "name": "personal-site",
  "framework": "Next.js",
  "content": ["Markdown", "remark", "remark-html"]
}
```

## Bash

```bash
pnpm install
pnpm dev
pnpm build
```
