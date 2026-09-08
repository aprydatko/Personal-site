import type { BlogPost } from '@/lib/content';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { parseDate } from '@/lib/date';

export const BlogArticleRow = ({ article }: { article: BlogPost }) => (
  <article className="group relative grid gap-4 border-b border-border-subtle py-8 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:gap-8">
    <time dateTime={article.date} className="font-mono text-xs leading-6 text-muted">
      {parseDate(article.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })}
    </time>
    <div>
      <h2 className="text-xl font-semibold leading-snug sm:text-2xl">
        <Link
          href={`/blog/${article.slug}`}
          className="after:absolute after:inset-0 group-hover:text-primary"
        >
          {article.title}
        </Link>
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{article.description}</p>
      <p className="mt-4 font-mono text-xs text-primary">
        {article.category} <span className="mx-2 text-muted">/</span>{' '}
        <span className="text-muted">{article.readingTime}</span>
      </p>
    </div>
    <ArrowUpRight
      aria-hidden="true"
      className="hidden size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 sm:block"
    />
  </article>
);
