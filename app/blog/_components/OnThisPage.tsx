'use client';

import { useEffect, useState } from 'react';
import { getHeadingId } from '@/lib/content/heading-id';
import type { BlogPost } from '@/lib/content';
import { ArticleShare } from './ArticleShare';

export const OnThisPage = ({ headings }: Pick<BlogPost, 'headings'>) => {
  const ids = headings.map(getHeadingId);
  const [activeId, setActiveId] = useState(ids[0] ?? '');

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -70% 0px', threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <aside className="hidden w-full lg:sticky lg:top-28 lg:self-start lg:block">
      <p className="mt-3 font-mono text-sm font-semibold text-muted">ON THIS PAGE</p>
      <ol className="mt-8 space-y-5 font-mono text-base font-medium leading-6 text-muted-strong">
        {headings.map((heading, index) => {
          const id = ids[index];
          const active = id === activeId;
          return (
            <li key={id}>
              <a
                className={`transition-colors hover:text-primary ${active ? 'text-primary' : ''}`}
                aria-current={active ? 'location' : undefined}
                href={`#${id}`}
                onClick={() => setActiveId(id)}
              >
                {index + 1}. {heading}
              </a>
            </li>
          );
        })}
      </ol>
      <ArticleShare />
    </aside>
  );
};
