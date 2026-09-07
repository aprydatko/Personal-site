import type { BlogPost } from '@/lib/content';
import { MoveLeft, MoveRight } from 'lucide-react';
import Link from 'next/link';

type ArticleLink = Pick<BlogPost, 'slug' | 'title'>;

type ArticlePaginationProps = {
  previous?: ArticleLink;
  next?: ArticleLink;
};

const dotIndexes = Array.from({ length: 9 }, (_, index) => index);

const ArticleGridIcon = () => (
  <span className="grid grid-cols-3 gap-[3px]" aria-hidden="true">
    {dotIndexes.map((index) => (
      <i className="size-[3px] rounded-[1px] bg-current" key={index} />
    ))}
  </span>
);

const ArticleLinkCard = ({
  article,
  direction,
}: {
  article?: ArticleLink;
  direction: 'previous' | 'next';
}) => {
  if (!article) return <div />;

  const isPrevious = direction === 'previous';
  const Icon = isPrevious ? MoveLeft : MoveRight;

  return (
    <Link
      className={`group flex items-center gap-6 font-mono text-muted transition-colors hover:text-foreground ${isPrevious ? '' : 'justify-end text-right'}`}
      href={`/blog/${article.slug}`}
    >
      {isPrevious && (
        <Icon className="size-4 shrink-0 transition-transform group-hover:-translate-x-1" />
      )}
      <span className="max-w-44">
        <span className="block text-[10px] leading-4 text-muted">
          {isPrevious ? 'Previous article' : 'Next article'}
        </span>
        <span className="mt-1 block text-[14px] font-medium leading-5 tracking-wider text-foreground">
          {article.title}
        </span>
      </span>
      {!isPrevious && (
        <Icon className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
      )}
    </Link>
  );
};

export const ArticlePagination = ({ previous, next }: ArticlePaginationProps) => (
  <nav
    className="mt-10 max-w-7xl mx-auto grid grid-cols-1 items-center gap-7 border-t border-border-subtle py-8 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4"
    aria-label="Article navigation"
  >
    <ArticleLinkCard article={previous} direction="previous" />
    <Link
      className="group flex flex-col items-center gap-2 font-mono font-medium text-[12px] text-muted transition-colors hover:text-foreground sm:order-none"
      href="/blog"
    >
      <span className="transition-transform group-hover:scale-110">
        <ArticleGridIcon />
      </span>
      <span>All articles</span>
    </Link>
    <ArticleLinkCard article={next} direction="next" />
  </nav>
);
