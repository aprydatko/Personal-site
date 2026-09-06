'use client';

import { Button } from '@/app/components/ui/button';
import { Search } from '@/app/components/ui/search';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { blogArticles, blogCategories, type BlogCategory } from '@/app/content/blog';
import { ArrowDown, MoveRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArticlePreview } from './ArticlePreview';

export const BlogIndex = () => {
  const [category, setCategory] = useState<BlogCategory>('All');
  const [query, setQuery] = useState('');
  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return blogArticles.filter(
      (article) =>
        (category === 'All' || article.category === category) &&
        `${article.title} ${article.description}`.toLowerCase().includes(normalizedQuery)
    );
  }, [category, query]);

  return (
    <section className="pb-[clamp(3rem,7vw,7rem)]">
      <div className="flex items-end justify-between border-b border-border-subtle">
        <Tabs
          value={category}
          onValueChange={(value) => setCategory(value as BlogCategory)}
          className="min-w-0 overflow-visible"
        >
          <TabsList className="flex-wrap gap-x-[clamp(1.2rem,4vw,4rem)] gap-y-0">
            {blogCategories.map((item) => (
              <TabsTrigger key={item} value={item} className="py-5 text-xs sm:text-sm">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mb-3 ml-4 w-full max-w-60 shrink-0">
          <Search
            aria-label="Search articles"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search articles"
            className="border-border bg-transparent"
          />
        </div>
      </div>
      <div className="mt-10">
        {visibleArticles.map((article) => (
          <article
            key={article.title}
            className="grid gap-5 border-b border-border-subtle py-[clamp(2rem,4vw,3rem)] first:pt-4 sm:grid-cols-[10rem_1fr_auto] sm:items-start sm:gap-[clamp(2rem,5vw,3rem)] sm:py-[clamp(2rem,4vw,3rem)] lg:grid-cols-[minmax(10rem,0.62fr)_minmax(19rem,1.25fr)_7rem]"
          >
            <ArticlePreview />
            <div className="py-[clamp(0.5rem,3vw,1rem)]">
              <p className="m-0 font-mono text-sm font-semibold tracking-normal">
                {article.date} <span className="mx-2 text-muted">•</span> {article.category}
              </p>
              <h2 className="mt-4 max-w-md font-mono text-[clamp(1.2rem,2vw,1.65rem)] font-medium leading-normal tracking-wide">
                <Link
                  href="/blog/how-i-structure-fullstack-projects"
                  className="transition-colors hover:text-primary"
                >
                  {article.title}
                </Link>
              </h2>
              <p
                className="mt-4.5 max-w-md text-md font-medium leading-relaxed
               text-muted"
              >
                {article.description}
              </p>
            </div>
            <div className="mt-18 flex items-center justify-end gap-16 whitespace-nowrap font-mono text-sm text-muted">
              <span>{article.readingTime}</span>
              <MoveRight
                className="shrink-0 !h-5 !w-5 stroke-[1.75] text-foreground"
                aria-hidden="true"
              />
            </div>
          </article>
        ))}
        {visibleArticles.length === 0 && (
          <p className="py-16 text-center font-mono text-sm text-muted">
            No articles match your search.
          </p>
        )}
      </div>
      {visibleArticles.length > 0 && (
        <Button variant="outline" className="mx-auto mt-8 flex w-fit px-6 py-3">
          Load more articles{' '}
          <ArrowDown data-icon="inline-end" className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </section>
  );
};
