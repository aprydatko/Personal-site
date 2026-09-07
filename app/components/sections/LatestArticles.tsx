import { articles, type Article } from '@/app/content/site';
import { Container } from '../layout/Container';
import { HomeSectionHeading } from './HomeSectionHeading';

const ArticleRow = ({ article }: { article: Article }) => (
  <article className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-5 border-b border-border-subtle py-7 last:border-b-0 sm:gap-x-8 sm:py-9 lg:grid-cols-[1fr_2.15fr_2.15fr_auto] lg:items-start lg:gap-8 xl:grid-cols-[1.2fr_2.15fr_2.15fr_7.5rem] xl:gap-12">
    <time
      dateTime={article.publishedAt}
      className="self-center font-mono text-sm font-medium leading-6 text-muted lg:self-start lg:pt-5 2xl:pl-6"
    >
      {article.displayDate}
    </time>
    <h3 className="col-span-2 max-w-md font-mono text-xl font-medium leading-7 tracking-tight sm:text-[22px] sm:leading-9 lg:col-span-1 lg:max-w-xs">
      {article.title}
    </h3>
    <p className="col-span-2 max-w-lg font-sans text-sm font-semibold leading-6 text-muted-strong sm:leading-7 lg:col-span-1 lg:max-w-xs">
      {article.description}
    </p>
    <span className="col-start-2 row-start-1 self-center font-mono text-sm font-medium leading-6 text-muted text-right lg:col-auto lg:row-auto lg:self-start lg:pt-5 2xl:pr-6">
      {article.readingTime}
    </span>
  </article>
);

export const LatestArticles = () => (
  <section id="articles" data-home-section className="overflow-hidden py-12 sm:py-16 lg:py-20">
    <Container>
      <HomeSectionHeading
        number="02"
        title="Latest articles"
        actionLabel="Read all articles"
        actionTitle="More articles coming soon"
      />
      <div className="mt-7 px-0 sm:mt-3 md:px-6 lg:px-12 xl:px-16 2xl:px-24">
        {articles.map((article) => (
          <ArticleRow key={article.title} article={article} />
        ))}
      </div>
    </Container>
  </section>
);
