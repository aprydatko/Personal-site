import { BlogPostDetail } from '@/app/blog/_components/BlogPostDetail';
import { getBlogPost, getBlogPosts } from '@/lib/content';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = async () =>
  (await getBlogPosts()).map(({ slug }) => ({ slug }));
export const generateMetadata = async ({ params }: BlogPostPageProps): Promise<Metadata> => {
  const post = await getBlogPost((await params).slug);
  if (!post) return {};

  const title = `${post.title} — Arthur Prydatko`;

  return {
    title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title,
      description: post.description,
      url: `/blog/${post.slug}`,
      siteName: 'Arthur Prydatko Portfolio',
      publishedTime: post.date,
      authors: ['Arthur Prydatko'],
    },
    twitter: {
      card: 'summary',
      title,
      description: post.description,
    },
  };
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPost(slug), getBlogPosts()]);
  if (!post) notFound();
  const postIndex = posts.findIndex((item) => item.slug === post.slug);
  const previousPost = posts[postIndex + 1];
  const nextPost = posts[postIndex - 1];

  return <BlogPostDetail post={post} previousPost={previousPost} nextPost={nextPost} />;
}
