import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion';
import { ArrowLeft, ArrowRight, AtSign, Copy, Grid2X2, Link2, Share2 } from 'lucide-react';
import Link from 'next/link';

const sections = [
  'The big picture',
  'Project structure',
  'Database layer',
  'API layer',
  'Frontend layer',
  'Shared packages',
  'Environment & deployment',
  'Key takeaways',
];

const CodeBlock = ({ children, label }: { children: React.ReactNode; label?: string }) => (
  <div className="relative overflow-hidden rounded-md bg-surface p-4 font-mono text-xs leading-6 text-muted">
    {label && <span className="mb-2 block text-[9px] text-muted">{label}</span>}
    <Copy className="absolute right-4 top-4 size-3.5 text-muted" aria-hidden="true" />
    {children}
  </div>
);

const OutlineLinks = () => (
  <ol className="flex flex-col gap-2 font-sans text-xs text-foreground">
    {sections.map((section, index) => (
      <li key={section}>
        <a href={`#section-${index + 1}`} className="transition-colors hover:text-primary">
          {index + 1}. {section}
        </a>
      </li>
    ))}
  </ol>
);

const ProjectStructure = () => (
  <div className="overflow-x-auto rounded-lg bg-code-background p-5 text-code-foreground shadow-sm sm:p-7">
    <div className="mb-5 flex items-center justify-between">
      <div className="flex gap-2">
        <i className="size-2 rounded-full bg-red-400" />
        <i className="size-2 rounded-full bg-amber-300" />
        <i className="size-2 rounded-full bg-green-400" />
      </div>
      <span className="font-mono text-[10px] text-code-line">project-structure.ts</span>
    </div>
    <pre className="font-mono text-xs leading-6 sm:text-sm sm:leading-7">
      <span className="text-violet-300">/apps</span>
      {`\n`}├─ <span className="text-violet-300">/web</span>{' '}
      <span className="ml-10 text-code-foreground">Next.js App Router</span>
      {`\n`}└─ <span className="text-violet-300">/api</span>{' '}
      <span className="ml-10 text-code-foreground">Node.js (Fastify)</span>
      {`\n\n`}
      <span className="text-violet-300">/packages</span>
      {`\n`}├─ <span className="text-violet-300">/config</span>{' '}
      <span className="ml-6 text-code-foreground">Shared configs</span>
      {`\n`}├─ <span className="text-violet-300">/db</span>{' '}
      <span className="ml-10 text-code-foreground">Prisma schema & migrations</span>
      {`\n`}├─ <span className="text-violet-300">/ui</span>{' '}
      <span className="ml-10 text-code-foreground">Shared UI components</span>
      {`\n`}└─ <span className="text-violet-300">/utils</span>{' '}
      <span className="ml-6 text-code-foreground">Shared utils and helpers</span>
      {`\n\n`}
      <span className="text-violet-300">/infra</span>
      {`\n`}├─ <span className="text-violet-300">/docker</span>{' '}
      <span className="ml-6 text-code-foreground">Dockerfiles</span>
      {`\n`}└─ <span className="text-violet-300">/scripts</span>{' '}
      <span className="ml-5 text-code-foreground">DevOps & automation</span>
      {`\n\n`}README.md
    </pre>
  </div>
);

const ArticleSection = ({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) => (
  <section
    id={`section-${index}`}
    className="scroll-mt-10 grid gap-3 sm:grid-cols-[2rem_1fr] sm:gap-5"
  >
    <span className="font-mono text-sm text-muted">{String(index).padStart(2, '0')}</span>
    <div>
      <h2 className="font-mono text-base font-medium sm:text-lg">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-muted">{children}</div>
    </div>
  </section>
);

export const FullstackArticle = () => (
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
    <Link
      href="/blog"
      className="mt-8 inline-flex items-center gap-3 font-sans text-xs text-muted transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to blog
    </Link>
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,42rem)_13rem] lg:justify-between lg:gap-18">
      <article>
        <p className="font-mono text-xs text-muted">
          May 12, 2024 <span className="mx-2">•</span> 8 min read <span className="mx-2">•</span>{' '}
          Architecture
        </p>
        <h1 className="mt-5 font-mono text-[clamp(2.2rem,3vw,2.7rem)] font-medium leading-[1.22] tracking-tight">
          How I structure Fullstack
          <br className="hidden sm:block" /> projects in 2024<span className="text-primary">.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
          A practical approach to building scalable fullstack applications with Next.js, Node.js,
          and PostgreSQL.
        </p>
        <div className="mt-7 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-raised font-mono text-sm font-semibold text-primary">
            AP
          </span>
          <div>
            <p className="font-mono text-xs font-medium">Arthur Prydatko</p>
            <p className="mt-1 text-xs text-muted">Fullstack Developer</p>
          </div>
        </div>
        <div className="mt-7 border-y border-border-subtle lg:hidden">
          <Accordion>
            <AccordionItem value="outline">
              <AccordionTrigger className="py-5 text-xs text-muted">ON THIS PAGE</AccordionTrigger>
              <AccordionContent>
                <OutlineLinks />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="mt-8">
          <ProjectStructure />
        </div>
        <div className="mt-7 flex flex-col gap-10">
          <ArticleSection index={1} title="The big picture">
            <p>
              Over the years, I&apos;ve tried many ways to structure fullstack projects. Some were
              too complicated, others didn&apos;t scale well. This is the approach that works best
              for me in 2024.
            </p>
            <blockquote className="mt-5 border-l-2 border-primary bg-surface px-5 py-3 font-mono text-xs leading-6 text-foreground">
              Simplicity at the start.
              <br />
              Flexibility as you grow.
            </blockquote>
          </ArticleSection>
          <ArticleSection index={2} title="Project structure">
            <p>
              I use a monorepo with pnpm and Turborepo. It keeps everything in one place, makes
              sharing code easy, and improves DX.
            </p>
            <div className="mt-4">
              <CodeBlock>pnpm create turbo@latest my-app</CodeBlock>
            </div>
            <p className="mt-4">The structure above is my default blueprint for most projects.</p>
          </ArticleSection>
          <ArticleSection index={3} title="Database layer">
            <p>
              I use PostgreSQL with Prisma ORM. It provides type safety, great migrations, and an
              excellent developer experience.
            </p>
            <div className="mt-4">
              <CodeBlock label="schema.prisma">
                <span className="text-violet-500">datasource</span> db {'{'}
                {`\n`} provider = <span className="text-emerald-600">&quot;postgresql&quot;</span>
                {`\n`} url = env(<span className="text-emerald-600">&quot;DATABASE_URL&quot;</span>)
                {`\n`}
                {'}'}
              </CodeBlock>
            </div>
            <p className="mt-4">Keep your schema simple and your relations explicit.</p>
          </ArticleSection>
        </div>
      </article>
      <aside className="hidden pt-3 lg:block">
        <p className="font-mono text-[10px] text-muted">ON THIS PAGE</p>
        <div className="mt-5">
          <OutlineLinks />
        </div>
        <div className="mt-10 rounded-lg border border-border-subtle p-5">
          <p className="font-mono text-[10px] text-muted">SHARE</p>
          <div className="mt-4 flex flex-col gap-4 text-xs text-muted">
            <span className="flex items-center gap-3">
              <Share2 className="size-3.5 text-foreground" />
              Twitter
            </span>
            <span className="flex items-center gap-3">
              <AtSign className="size-3.5 text-foreground" />
              LinkedIn
            </span>
            <span className="flex items-center gap-3">
              <Link2 className="size-3.5 text-foreground" />
              Copy link
            </span>
          </div>
        </div>
      </aside>
    </div>
    <nav
      aria-label="Article navigation"
      className="mt-16 grid grid-cols-[1fr_auto_1fr] items-center border-t border-border-subtle py-8 font-mono text-xs"
    >
      <Link
        href="/blog"
        className="flex items-center gap-3 text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Previous article
      </Link>
      <Link
        href="/blog"
        className="flex flex-col items-center gap-1 text-muted transition-colors hover:text-foreground"
      >
        <Grid2X2 className="size-4" />
        All articles
      </Link>
      <Link
        href="/blog"
        className="flex items-center justify-end gap-3 text-right text-muted transition-colors hover:text-foreground"
      >
        Next article
        <ArrowRight className="size-4" />
      </Link>
    </nav>
  </div>
);
