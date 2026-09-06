import { BlogPostDetail } from '@/app/blog/_components/BlogPostDetail';
import { getBlogPost, getBlogPosts } from '@/lib/content';
import type { Metadata } from 'next';
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
  return <BlogPostDetail post={post} />;
}
