---
title: Writing better TypeScript
description: Small habits that keep TypeScript code understandable as an application grows.
date: "2024-04-28"
category: Backend
readingTime: 6 min read
---

## Prefer precise boundaries

Use explicit types at the boundaries of your application: API inputs, environment variables, and database results. Inside a well-defined module, let inference do the repetitive work.

## Model invalid states away

When a state should not be possible, make it difficult to represent in the type system. A small discriminated union is often clearer than several optional fields.

## Keep types close to the domain

Types should describe the language of the product, not implementation details that happen to exist today.
