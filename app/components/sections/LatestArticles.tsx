import { getBlogPosts } from '@/lib/content';
import { Container } from '../layout/Container';
import { HomeSectionHeading } from './HomeSectionHeading';
import { BlogArticleRow } from '@/app/blog/_components/BlogArticleRow';

export const LatestArticles = async () => {
  const articles = (await getBlogPosts()).slice(0, 3);
  return (
    <section
      id="articles"
      data-home-section
      className="section-space border-t border-border-subtle"
    >
      <Container>
        <HomeSectionHeading
          number="02"
          title="Latest articles"
          actionLabel="Read all articles"
          href="/blog"
        />
        <div className="mt-8">
          {articles.map((article) => (
            <BlogArticleRow key={article.slug} article={article} />
          ))}
        </div>
      </Container>
    </section>
  );
};
