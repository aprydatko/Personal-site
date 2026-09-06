---
title: How I structure fullstack projects
description: A practical approach to building scalable applications with Next.js, Node.js, and PostgreSQL.
date: "2024-05-12"
category: Architecture
readingTime: 8 min read
featured: true
---

## The big picture

I start with a small, clear boundary between the web application, API, and database. That makes it easy to ship early without making future changes painful.

> Simplicity at the start. Flexibility as you grow.

## Project structure

Use a structure that makes ownership obvious:

```text
apps/
  web/        # Next.js application
  api/        # API service
packages/
  db/         # database schema and queries
  ui/         # reusable interface components
```

## Key takeaway

Choose conventions your team can understand in a minute. You can introduce more layers when the product gives you a concrete reason to do so.
