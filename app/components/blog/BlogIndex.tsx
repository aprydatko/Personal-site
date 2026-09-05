'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { blogArticles, blogCategories, type BlogCategory } from '@/app/content/blog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ArticlePreview } from './ArticlePreview';

export const BlogIndex = () => {
  const [category, setCategory] = useState<BlogCategory>('All');
  const [query, setQuery] = useState('');
  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return blogArticles.filter((article) => (category === 'All' || article.category === category) && `${article.title} ${article.description}`.toLowerCase().includes(normalizedQuery));
  }, [category, query]);

  return (
    <section className="pb-14">
      <div className="flex flex-col gap-6 border-b border-border-subtle sm:flex-row sm:items-end sm:justify-between">
        <div role="group" aria-label="Blog categories" className="flex max-w-full items-center gap-5 overflow-x-auto pb-3 font-sans text-xs text-muted sm:gap-8 sm:text-sm">
          {blogCategories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className="shrink-0 border-b-2 border-transparent pb-2 font-medium transition-colors aria-pressed:border-foreground aria-pressed:text-foreground hover:text-foreground">{item}</button>)}
        </div>
        <label className="relative mb-3 block w-10 shrink-0 md:w-50"><span className="sr-only">Search articles</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles" className="h-10 w-10 border-transparent bg-surface pl-9 pr-3 text-xs focus:w-50 focus-visible:border-border md:w-full md:focus:w-60" /></label>
      </div>
      <div className="mt-5">
        {visibleArticles.map((article) => <article key={article.title} className="grid gap-5 border-b border-border-subtle py-6 first:pt-4 sm:grid-cols-[11.5rem_1fr_auto] sm:items-center sm:gap-9 sm:py-7 lg:grid-cols-[15rem_1fr_7rem]">
          <ArticlePreview preview={article.preview} />
          <div><p className="font-mono text-[10px] text-muted">{article.date} <span className="mx-2">•</span> {article.category}</p><h2 className="mt-3 max-w-xl font-mono text-lg font-medium leading-7 tracking-tight sm:text-xl sm:leading-8">{article.title}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted">{article.description}</p></div>
          <div className="flex items-center justify-between gap-4 font-mono text-xs text-muted sm:flex-col sm:items-end sm:gap-6"><span>{article.readingTime}</span><ArrowRight className="size-4 text-foreground" aria-hidden="true" /></div>
        </article>)}
        {visibleArticles.length === 0 && <p className="py-16 text-center font-mono text-sm text-muted">No articles match your search.</p>}
      </div>
      {visibleArticles.length > 0 && <Button variant="outline" className="mx-auto mt-8 flex w-fit px-6 py-3">Load more articles <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>}
    </section>
  );
};
