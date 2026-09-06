import { MarkdownArticle } from '@/app/components/content/MarkdownArticle';
import { Container } from '@/app/components/Container';
import { getBlogPost, getBlogPosts } from '@/lib/content/markdown';
import { ArrowLeft, Copy, Link2, Share2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = async () => (await getBlogPosts()).map(({ slug }) => ({ slug }));

export const generateMetadata = async ({ params }: BlogPostPageProps): Promise<Metadata> => {
  const post = await getBlogPost((await params).slug);
  return post ? { title: `${post.title} — Arthur Prydatko`, description: post.description } : {};
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();

  return (
    <main id="main-content" tabIndex={-1}>
      <Container className="py-8 sm:py-12">
        <Link href="/blog" className="inline-flex items-center gap-3 font-mono text-xs text-muted transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to blog
        </Link>
        <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,43rem)_12rem] lg:justify-between">
          <article>
            <p className="font-mono text-xs text-muted">{post.date} <span className="mx-2">•</span> {post.readingTime} <span className="mx-2">•</span> {post.category}</p>
            <h1 className="mt-5 max-w-3xl font-mono text-[clamp(2.2rem,5vw,4rem)] font-medium leading-[1.13] tracking-tight">{post.title}<span className="text-primary">.</span></h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-muted sm:text-base">{post.description}</p>
            <div className="mt-10 rounded-md bg-code-background px-6 py-5 font-mono text-sm leading-7 text-code-foreground shadow-sm sm:px-8">
              <div className="mb-5 flex gap-2"><i className="size-2.5 rounded-full bg-red-400" /><i className="size-2.5 rounded-full bg-amber-300" /><i className="size-2.5 rounded-full bg-green-400" /></div>
              <span className="text-violet-300">{post.slug}.md</span><br /><span className="text-code-line">Written in Markdown, rendered with remark.</span>
            </div>
            <div className="mt-10 border-t border-border-subtle pt-8"><MarkdownArticle html={post.html} numbered /></div>
          </article>
          <aside className="hidden lg:block">
            <p className="font-mono text-[10px] text-muted">ON THIS PAGE</p>
            <ol className="mt-5 space-y-2 font-mono text-xs text-muted">
              {post.headings.map((heading, index) => <li key={heading}><a className="hover:text-primary" href={`#${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}>{index + 1}. {heading}</a></li>)}
            </ol>
            <div className="mt-10 rounded-lg border border-border-subtle p-5 font-mono text-xs text-muted"><p className="text-[10px]">SHARE</p><div className="mt-4 space-y-4"><span className="flex items-center gap-3"><Share2 className="size-3.5 text-foreground" /> Twitter</span><span className="flex items-center gap-3"><Link2 className="size-3.5 text-foreground" /> Copy link</span><span className="flex items-center gap-3"><Copy className="size-3.5 text-foreground" /> Share article</span></div></div>
          </aside>
        </div>
      </Container>
    </main>
  );
}
