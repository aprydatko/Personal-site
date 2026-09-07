import { AuthorBadge } from '@/app/components/content/AuthorBadge';
import { BlogHeroCodeWindow } from '@/app/components/content/BlogHeroCodeWindow';
import { MarkdownArticle } from '@/app/components/content/MarkdownArticle';
import { Container } from '@/app/components/layout/Container';
import type { BlogPost } from '@/lib/content';
import { getHeadingId } from '@/lib/content/heading-id';
import { parseDate } from '@/lib/date';
import { ArticlePagination } from './ArticlePagination';
import { ArrowLeft, LinkIcon } from 'lucide-react';
import Link from 'next/link';

const TwitterIcon = () => (
  <svg
    aria-hidden="true"
    className="size-5 shrink-0 text-foreground"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M23.1 5.2c-.8.4-1.6.6-2.5.7.9-.5 1.6-1.3 1.9-2.3-.8.5-1.8.9-2.8 1.1A4.4 4.4 0 0 0 12.1 8c0 .3 0 .7.1 1A12.5 12.5 0 0 1 3.1 4.4a4.4 4.4 0 0 0 1.4 5.9c-.7 0-1.4-.2-2-.5v.1c0 2.1 1.5 3.9 3.5 4.3-.4.1-.8.2-1.2.2-.3 0-.6 0-.8-.1a4.4 4.4 0 0 0 4.1 3 8.9 8.9 0 0 1-5.5 1.9c-.4 0-.7 0-1.1-.1A12.5 12.5 0 0 0 8.2 21c8.1 0 12.5-6.7 12.5-12.5v-.6c.9-.6 1.7-1.3 2.4-2.2Z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg
    aria-hidden="true"
    className="size-5 shrink-0 text-foreground"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M5.2 3.5A2.2 2.2 0 1 1 5.2 8a2.2 2.2 0 0 1 0-4.5ZM3.3 9.7h3.8V21H3.3V9.7Zm6.2 0h3.6v1.5h.1c.5-.9 1.7-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.8V21h-3.8v-5.2c0-1.2 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V21H9.5V9.7Z" />
  </svg>
);

const BlogPostHeader = ({ post }: { post: BlogPost }) => (
  <>
    <p className="font-mono text-sm text-muted tracking-wide">
      {parseDate(post.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })}{' '}
      <span className="mx-2">•</span> {post.readingTime} <span className="mx-2">•</span>{' '}
      {post.category}
    </p>
    <h1 className="mt-5 max-w-4xl font-mono text-[clamp(2.2rem,5vw,3.2rem)] font-medium leading-17 tracking-tight">
      {post.title}
      <span className="text-primary opacity-60">.</span>
    </h1>
    <p className="mt-5 max-w-xl font-semibold text-sm leading-8 tracking-wider text-muted sm:text-base">
      {post.description}
    </p>
    <AuthorBadge />
  </>
);

const BlogPostAside = ({ headings }: Pick<BlogPost, 'headings'>) => (
  <aside className="hidden w-full lg:sticky lg:top-8 lg:self-start lg:block">
    <p className="mt-3 font-mono text-sm font-semibold text-muted">ON THIS PAGE</p>
    <ol className="mt-8 space-y-5 font-mono text-base font-medium leading-none text-muted-strong">
      {headings.map((heading, index) => (
        <li key={heading}>
          <a className="transition-colors hover:text-primary" href={`#${getHeadingId(heading)}`}>
            {index + 1}. {heading}
          </a>
        </li>
      ))}
    </ol>
    <div className="mt-12 max-w-70 rounded-xl border border-border p-6 font-mono text-base text-muted">
      <p className="mt-0.5 text-xs font-medium tracking-wide">SHARE</p>
      <div className="mt-6 space-y-6">
        <span className="flex font-semibold text-[14px] items-center gap-5">
          <TwitterIcon /> Twitter
        </span>
        <span className="flex font-semibold text-[14px] items-center gap-5">
          <LinkedInIcon /> LinkedIn
        </span>
        <span className="flex font-semibold text-[14px] items-center gap-5">
          <LinkIcon className="size-5 text-foreground" /> Copy link
        </span>
      </div>
    </div>
  </aside>
);

type BlogPostDetailProps = {
  post: BlogPost;
  previousPost?: BlogPost;
  nextPost?: BlogPost;
};

export const BlogPostDetail = ({ post, previousPost, nextPost }: BlogPostDetailProps) => (
  <main id="main-content" tabIndex={-1}>
    <Container className="py-8 sm:py-10">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 font-mono font-medium text-sm text-muted tracking-tight transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to blog
      </Link>
      <div className="mt-13 grid gap-14 lg:grid-cols-[minmax(0,53rem)_21rem] lg:justify-between">
        <article>
          <BlogPostHeader post={post} />
          {post.heroCode && (
            <div className="mt-10">
              <BlogHeroCodeWindow
                code={post.heroCode}
                fileName={post.heroCodeFileName ?? 'project-structure.ts'}
              />
            </div>
          )}
          <div className="max-w-3xl mt-10 border-t border-border-subtle pt-8 px-12 sm:px-22">
            <MarkdownArticle html={post.html} numbered />
          </div>
        </article>
        <BlogPostAside headings={post.headings} />
      </div>
      <ArticlePagination previous={previousPost} next={nextPost} />
    </Container>
  </main>
);
