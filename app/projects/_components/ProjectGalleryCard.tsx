import type { Project } from '@/lib/content';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const ProjectGalleryCard = ({ project }: { project: Project }) => (
  <article className="group relative grid grid-cols-[minmax(0,.93fr)_minmax(0,1.25fr)_1.5rem] items-start gap-[clamp(2rem,3vw,4.5rem)] border-b border-border-subtle py-[clamp(2rem,4vw,5rem)] max-md:grid-cols-[minmax(0,1fr)_1.1rem] max-md:gap-[1.2rem] max-md:py-[1.65rem]">
    <div
      className="relative min-h-[clamp(10.5rem,19vw,16rem)] overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_12px_28px_rgb(0_0_0_/_8%)]"
      aria-hidden="true"
    >
      <Image
        src={project.heroImage ?? '/sass-platform.png'}
        alt=""
        fill
        sizes="(min-width: 640px) 35vw, 90vw"
        className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.025]"
      />
    </div>
    <div className="flex min-h-[clamp(10.5rem,19vw,16rem)] flex-col self-stretch py-4 max-md:col-start-1 max-md:min-h-0">
      <p className="m-0 font-mono text-sm font-semibold uppercase tracking-[0.06em] text-primary">
        {project.label}
      </p>
      <h2 className="m-[1.15rem_0_0] font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-none tracking-tight">
        {project.title}
      </h2>
      <p className="mt-7 max-w-sm text-md font-medium leading-7 tracking-wide text-muted max-md:my-[0.85rem] max-md:text-sm">
        {project.description}
      </p>
      <ul className="mt-auto flex list-none flex-wrap gap-x-[1.15rem] gap-y-[0.45rem] p-0 pt-6 font-mono text-xs font-medium leading-[1.4] text-muted max-md:mt-0 max-md:gap-x-3 max-md:pt-0 max-md:text-xs">
        {project.stack.map((item) => (
          <li
            className="after:ml-[1.1rem] after:content-['•'] last:after:hidden max-md:after:ml-3"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
    <Link
      className="after:absolute after:inset-0 mt-16 text-foreground transition-colors hover:text-primary max-md:col-start-2 max-md:row-start-1 max-md:mt-0"
      href={`/projects/${project.slug}`}
      aria-label={`View ${project.title} case study`}
    >
      <ArrowUpRight className="size-8" aria-hidden="true" />
    </Link>
  </article>
);
