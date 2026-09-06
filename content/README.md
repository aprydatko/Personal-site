# Site content

Create a blog post in `content/blog/<slug>.md` or a project in `content/projects/<slug>.md`.
The filename becomes the URL: `content/blog/my-post.md` becomes `/blog/my-post`.

## Blog frontmatter

```md
---
title: Your post title
description: A short description used on the listing and for SEO.
date: "2026-09-06"
category: Architecture
readingTime: 5 min read
featured: true
published: true
---
```

## Project frontmatter

```md
---
title: Project name
description: A short project summary.
date: "2026-09-06"
category: Web Apps
label: Web App
stack: [Next.js, TypeScript]
featured: true
published: true
---
```

`published: false` keeps a Markdown file out of the site while you are drafting it.

## Code windows

Use normal fenced Markdown code blocks. They are automatically syntax-highlighted and receive a copy button:

````md
```tsx
export const Greeting = () => <h1>Hello</h1>;
```
````

Common language tags include `html`, `css`, `js`, `jsx`, `ts`, `tsx`, `json`, `bash`, `sql`, and `python`.
