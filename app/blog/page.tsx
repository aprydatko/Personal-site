import { BlogIndex } from './_components/BlogIndex';
import { Container } from '@/app/components/layout/Container';
import { PageIntro } from '@/app/components/layout/PageIntro';
import { getBlogPosts } from '@/lib/content';

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <main id="main-content" tabIndex={-1}>
      <Container className="relative">
        <PageIntro
          eyebrow="BLOG"
          title={
            <>
              Thoughts on code,
              <br />
              product and everything
              <br />
              in between<span className="text-primary">.</span>
            </>
          }
          description={
            <>
              Articles, tutorials and notes about fullstack development, architecture, performance
              and building better products.
            </>
          }
        />
        <BlogIndex posts={posts} />
      </Container>
    </main>
  );
}
