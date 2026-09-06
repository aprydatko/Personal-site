'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProjectCta } from '@/app/components/ProjectCta';
import type { Project } from '@/lib/content/markdown';

type Category = string;
type SortOrder = 'newest' | 'featured';

const temporaryVisual =
  'relative min-h-[clamp(10.5rem,19vw,16rem)] overflow-hidden rounded-[0.45rem] border border-border bg-[radial-gradient(circle_at_70%_20%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_42%),linear-gradient(135deg,var(--surface-raised),var(--surface))]';

type ProjectsGalleryProps = { projects: Project[] };

export const ProjectsGallery = ({ projects }: ProjectsGalleryProps) => {
  const categories = ['All', ...new Set(projects.map((project) => project.category))];
  const [category, setCategory] = useState<Category>('All');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const visibleProjects = useMemo(() => {
    const filtered =
      category === 'All' ? projects : projects.filter((project) => project.category === category);
    return sortOrder === 'newest'
      ? filtered
      : [...filtered].toSorted((first, second) => Number(second.featured) - Number(first.featured));
  }, [category, projects, sortOrder]);
  return (
    <section className="pb-[clamp(3rem,7vw,7rem)]" aria-label="Project directory">
      <div className="flex items-center justify-between gap-6 border-b border-border-subtle max-sm:block max-sm:border-b-0">
        <Tabs
          value={category}
          onValueChange={(value) => setCategory(value as Category)}
          className="min-w-0 flex-1  overflow-visible max-sm:-mx-4 max-sm:border-b max-sm:border-border-subtle max-sm:px-4"
        >
          <TabsList className="flex-wrap gap-x-[clamp(1.2rem,4vw,4rem)] gap-y-0 max-sm:gap-x-6">
            {categories.map((item) => (
              <TabsTrigger key={item} value={item}>
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-none items-center gap-[0.45rem] font-mono text-sm text-foreground max-sm:mt-[0.6rem] max-sm:justify-between max-sm:rounded-[0.35rem] max-sm:border max-sm:border-border max-sm:p-[0.7rem_1rem] max-sm:text-[0.75rem]">
          Sort by:
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
            <SelectTrigger aria-label="Sort projects">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        {visibleProjects.map((project) => (
          <article
            className="grid grid-cols-[minmax(18rem,.93fr)_minmax(20rem,1.25fr)_1.5rem] items-start gap-[clamp(2rem,3vw,4.5rem)] border-b border-border-subtle py-[clamp(2rem,4vw,9rem)] max-sm:grid-cols-[minmax(0,1fr)_1.1rem] max-sm:gap-[1.2rem] max-sm:py-[1.65rem]"
            key={project.slug}
          >
            <div className={temporaryVisual} aria-hidden="true" />
            <div className="flex py-4 min-h-[clamp(10.5rem,19vw,16rem)] flex-col self-stretch max-sm:col-start-1 max-sm:min-h-0">
              <p className="m-0 font-mono text-sm font-semibold uppercase tracking-[0.06em] text-primary">
                {project.label}
              </p>
              <h2 className="m-[1.15rem_0_0] font-mono text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-none tracking-tight">
                {project.title}
              </h2>
              <p className="mt-7 max-w-sm text-md font-medium leading-7 tracking-wide text-muted max-sm:my-[0.85rem] max-sm:text-[0.76rem]">
                {project.description}
              </p>
              <ul className="mt-auto flex list-none flex-wrap gap-x-[1.15rem] gap-y-[0.45rem] p-0 pt-6 font-mono text-[0.62rem] font-medium leading-[1.4] text-muted max-sm:mt-0 max-sm:gap-x-3 max-sm:pt-0 max-sm:text-[0.57rem]">
                {project.stack.map((item) => (
                  <li
                    className="after:ml-[1.1rem] after:content-['•'] last:after:hidden max-sm:after:ml-3"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              className="mt-16 text-foreground max-sm:col-start-2 max-sm:row-start-1 max-sm:mt-0"
              href={`/projects/${project.slug}`}
              aria-label={`View ${project.title} case study`}
            >
              <ArrowUpRight className="size-8" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
      <ProjectCta />
    </section>
  );
};
