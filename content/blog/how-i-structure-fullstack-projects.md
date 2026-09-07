---
title: How I structure Fullstack projects in 2024
description: A practical approach to building scalable fullstack applications with Next.js, Node.js, and PostgreSQL.
date: '2024-05-12'
category: Architecture
readingTime: 8 min read
featured: true
heroCodeFileName: project-structure.ts
heroCode: |-
  /apps
  ├── /web                Next.js App Router
  └── /api                Node.js (Fastify)

  /packages
  ├── /config             Shared configs
  ├── /db                 Prisma schema & migrations
  ├── /ui                 Shared UI components
  └── /utils              Shared utils and helpers

  /infra
  ├── /docker             Dockerfiles
  └── /scripts            DevOps & automation

  README.md
---

## The big picture

Over the years, I’ve tried many ways to structure fullstack projects. Some were too complicated, others didn’t scale well. This is the approach that works best for me in 2024.

> Simplicity at the start.<br>
> **Flexibility as you grow.**

## Project structure

I use a monorepo with pnpm and Turborepo. It keeps everything in one place, makes sharing code easy, and improves DX.

```bash
pnpm create turbo@latest my-app
```

The structure above is my default blueprint for most projects.

## Database layer

I use PostgreSQL with Prisma ORM. It provides type safety, great migrations, and an excellent developer experience.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Keep your schema simple and your relations explicit.
