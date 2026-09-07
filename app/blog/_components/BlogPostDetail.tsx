import { AuthorBadge } from '@/app/components/content/AuthorBadge';
import { BlogHeroCodeWindow } from '@/app/components/content/BlogHeroCodeWindow';
import { MarkdownArticle } from '@/app/components/content/MarkdownArticle';
import { Container } from '@/app/components/layout/Container';
import type { BlogPost } from '@/lib/content';
import { getHeadingId } from '@/lib/content/heading-id';
import { parseDate } from '@/lib/date';
import { ArticlePagination } from './ArticlePagination';
import { ArticleShare } from './ArticleShare';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
    <h1 className="mt-5 max-w-4xl font-sans text-[clamp(2.2rem,5vw,3.2rem)] font-medium leading-tight tracking-tight">
      {post.title}
      <span className="text-primary opacity-60">.</span>
    </h1>
    <p className="mt-5 max-w-xl font-semibold text-sm leading-8 tracking-normal text-muted sm:text-base">
      {post.description}
    </p>
    <AuthorBadge />
  </>
);

const BlogPostAside = ({ headings }: Pick<BlogPost, 'headings'>) => (
  <aside className="hidden w-full lg:sticky lg:top-28 lg:self-start lg:block">
    <p className="mt-3 font-mono text-sm font-semibold text-muted">ON THIS PAGE</p>
    <ol className="mt-8 space-y-5 font-mono text-base font-medium leading-6 text-muted-strong">
      {headings.map((heading, index) => (
        <li key={heading}>
          <a className="transition-colors hover:text-primary" href={`#${getHeadingId(heading)}`}>
            {index + 1}. {heading}
          </a>
        </li>
      ))}
    </ol>
    <ArticleShare />
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
      <div className="mt-13 grid gap-14 lg:grid-cols-[minmax(0,1fr)_16rem] lg:justify-between">
        <article className="min-w-0">
          <BlogPostHeader post={post} />
          {post.heroCode && (
            <div className="mt-10">
              <BlogHeroCodeWindow
                code={post.heroCode}
                fileName={post.heroCodeFileName ?? 'project-structure.ts'}
              />
            </div>
          )}
          <div className="max-w-3xl mt-10 border-t border-border-subtle pt-8 px-0 sm:px-4">
            <MarkdownArticle html={post.html} numbered />
          </div>
        </article>
        <BlogPostAside headings={post.headings} />
      </div>
      <ArticlePagination previous={previousPost} next={nextPost} />
    </Container>
  </main>
);
