import { ArticlePreview } from './ArticlePreview';
import type { BlogPost } from '@/lib/content';
import { MoveRight } from 'lucide-react';
import Link from 'next/link';

export const BlogArticleRow = ({ article }: { article: BlogPost }) => (
  <article className="grid gap-5 border-b border-border-subtle py-[clamp(2rem,4vw,3rem)] first:pt-4 sm:grid-cols-[10rem_1fr_auto] sm:items-start sm:gap-[clamp(2rem,5vw,3rem)] sm:py-[clamp(2rem,4vw,3rem)] lg:grid-cols-[minmax(10rem,0.62fr)_minmax(19rem,1.25fr)_7rem]"><ArticlePreview /><div className="py-[clamp(0.5rem,3vw,1rem)]"><p className="m-0 font-mono text-sm font-semibold tracking-normal">{article.date} <span className="mx-2 text-muted">•</span> {article.category}</p><h2 className="mt-4 max-w-md font-mono text-[clamp(1.2rem,2vw,1.65rem)] font-medium leading-normal tracking-wide"><Link href={`/blog/${article.slug}`} className="transition-colors hover:text-primary">{article.title}</Link></h2><p className="mt-4.5 max-w-md text-md font-medium leading-relaxed text-muted">{article.description}</p></div><div className="mt-18 flex items-center justify-end gap-16 whitespace-nowrap font-mono text-sm text-muted"><span>{article.readingTime}</span><MoveRight className="shrink-0 !h-5 !w-5 stroke-[1.75] text-foreground" aria-hidden="true" /></div></article>
);
