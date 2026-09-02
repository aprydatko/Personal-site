import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Container } from './Container';

type Article = {
  date: string;
  title: string;
  description: string;
  readingTime: string;
  href: string;
};

const articles: Article[] = [
  {
    date: 'May 12, 2024',
    title: 'How I structure Fullstack projects in 2024',
    description:
      'My approach to scalable project architecture with Next.js, Node.js and PostgreSQL.',
    readingTime: '5 min read',
    href: '#article-fullstack-projects',
  },
  {
    date: 'Apr 28, 2024',
    title: '10 practices for writing better TypeScript',
    description: 'Simple rules that make your code safer, cleaner and easier to maintain.',
    readingTime: '6 min read',
    href: '#article-typescript-practices',
  },
  {
    date: 'Apr 10, 2024',
    title: 'Optimizing Next.js applications',
    description: 'Performance tips that actually make a difference.',
    readingTime: '4 min read',
    href: '#article-nextjs-performance',
  },
];

const ArticleRow = ({ article }: { article: Article }) => (
  <Link
    href={article.href}
    className="group grid grid-cols-[1fr_auto] gap-x-4 gap-y-5 border-b border-border-subtle py-7 transition-colors last:border-b-0 hover:bg-surface-raised/35 sm:gap-x-8 sm:py-9 lg:grid-cols-[1fr_2.15fr_2.15fr_auto] lg:items-start lg:gap-8 xl:grid-cols-[1.2fr_2.15fr_2.15fr_7.5rem] xl:gap-12"
  >
    <time
      dateTime={article.date}
      className="self-center font-mono text-sm font-medium leading-6 text-muted lg:self-start lg:pt-5 2xl:pl-6"
    >
      {article.date}
    </time>
    <h3 className="col-span-2 max-w-md font-mono text-xl font-medium leading-7 tracking-tight sm:text-[22px] sm:leading-9 lg:col-span-1 lg:max-w-xs">
      {article.title}
    </h3>
    <p className="col-span-2 max-w-lg font-mono text-sm font-semibold leading-6 text-muted-strong sm:leading-7 lg:col-span-1 lg:max-w-xs">
      {article.description}
    </p>
    <span className="col-start-2 row-start-1 self-center font-mono text-sm font-medium leading-6 text-muted text-right lg:col-auto lg:row-auto lg:self-start lg:pt-5 2xl:pr-6">
      {article.readingTime}
    </span>
  </Link>
);

export const LatestArticles = () => (
  <section id="articles" className="overflow-hidden py-12 sm:py-16 lg:py-20">
    <Container>
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-5 sm:gap-24">
          <span className="shrink-0 font-mono text-sm text-muted sm:text-lg">02</span>
          <h2 className="whitespace-nowrap font-mono text-2xl font-medium tracking-tight sm:text-3xl">
            Latest articles
          </h2>
        </div>
        <Link
          href="#articles"
          className="hidden shrink-0 items-center gap-4 font-mono text-md font-medium transition-opacity hover:opacity-60 sm:flex sm:text-md"
        >
          Read all articles <ArrowRight strokeWidth={1.5} />
        </Link>
      </div>
      <div className="mt-7 px-0 sm:mt-3 md:px-6 lg:px-12 xl:px-16 2xl:px-24">
        {articles.map((article) => (
          <ArticleRow key={article.title} article={article} />
        ))}
      </div>
    </Container>
  </section>
);
