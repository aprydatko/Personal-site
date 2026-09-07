'use client';

import { Button } from '@/app/components/ui/button';
import { Search } from '@/app/components/ui/search';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import type { BlogPost } from '@/lib/content';
import { ArrowDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BlogArticleRow } from './BlogArticleRow';

type BlogIndexProps = { posts: BlogPost[] };

export const BlogIndex = ({ posts }: BlogIndexProps) => {
  const categories = ['All', ...new Set(posts.map((post) => post.category))];
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter(
      (article) =>
        (category === 'All' || article.category === category) &&
        `${article.title} ${article.description}`.toLowerCase().includes(normalizedQuery),
    );
  }, [category, posts, query]);

  return (
    <section className="pb-[clamp(3rem,7vw,7rem)]">
      <div className="flex items-end justify-between border-b border-border-subtle">
        <Tabs value={category} onValueChange={setCategory} className="min-w-0 overflow-visible">
          <TabsList className="flex-wrap gap-x-[clamp(1.2rem,4vw,4rem)] gap-y-0">
            {categories.map((item) => (
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
          <BlogArticleRow key={article.slug} article={article} />
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
