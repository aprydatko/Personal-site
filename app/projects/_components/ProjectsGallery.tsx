'use client';

import { ProjectCta } from '@/app/components/sections/ProjectCta';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import type { Project } from '@/lib/content';
import { useMemo, useState } from 'react';
import { ProjectGalleryCard } from './ProjectGalleryCard';

type SortOrder = 'newest' | 'featured';
type ProjectsGalleryProps = { projects: Project[] };

export const ProjectsGallery = ({ projects }: ProjectsGalleryProps) => {
  const categories = ['All', ...new Set(projects.map((project) => project.category))];
  const [category, setCategory] = useState('All');
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
          onValueChange={setCategory}
          className="min-w-0 flex-1 overflow-visible max-sm:-mx-4 max-sm:border-b max-sm:border-border-subtle max-sm:px-4"
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
          <ProjectGalleryCard key={project.slug} project={project} />
        ))}
      </div>
      <ProjectCta />
    </section>
  );
};
