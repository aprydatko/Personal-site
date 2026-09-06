import { Container } from '@/app/components/layout/Container';
import { MarkdownArticle } from '@/app/components/content/MarkdownArticle';
import type { BlogPost } from '@/lib/content';
import { ArrowLeft, Copy, Link2, Share2 } from 'lucide-react';
import Link from 'next/link';

const headingHref = (heading: string) => `#${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

const BlogPostHeader = ({ post }: { post: BlogPost }) => <>
  <p className="font-mono text-xs text-muted">{post.date} <span className="mx-2">•</span> {post.readingTime} <span className="mx-2">•</span> {post.category}</p>
  <h1 className="mt-5 max-w-3xl font-mono text-[clamp(2.2rem,5vw,4rem)] font-medium leading-[1.13] tracking-tight">{post.title}<span className="text-primary">.</span></h1>
  <p className="mt-6 max-w-xl text-sm leading-7 text-muted sm:text-base">{post.description}</p>
</>;

const BlogPostAside = ({ headings }: Pick<BlogPost, 'headings'>) => (
  <aside className="hidden lg:block"><p className="font-mono text-[10px] text-muted">ON THIS PAGE</p><ol className="mt-5 space-y-2 font-mono text-xs text-muted">{headings.map((heading, index) => <li key={heading}><a className="hover:text-primary" href={headingHref(heading)}>{index + 1}. {heading}</a></li>)}</ol><div className="mt-10 rounded-lg border border-border-subtle p-5 font-mono text-xs text-muted"><p className="text-[10px]">SHARE</p><div className="mt-4 space-y-4"><span className="flex items-center gap-3"><Share2 className="size-3.5 text-foreground" /> Twitter</span><span className="flex items-center gap-3"><Link2 className="size-3.5 text-foreground" /> Copy link</span><span className="flex items-center gap-3"><Copy className="size-3.5 text-foreground" /> Share article</span></div></div></aside>
);

export const BlogPostDetail = ({ post }: { post: BlogPost }) => (
  <main id="main-content" tabIndex={-1}><Container className="py-8 sm:py-12"><Link href="/blog" className="inline-flex items-center gap-3 font-mono text-xs text-muted transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to blog</Link><div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,43rem)_12rem] lg:justify-between"><article><BlogPostHeader post={post} /><div className="mt-10 border-t border-border-subtle pt-8"><MarkdownArticle html={post.html} numbered /></div></article><BlogPostAside headings={post.headings} /></div></Container></main>
);
