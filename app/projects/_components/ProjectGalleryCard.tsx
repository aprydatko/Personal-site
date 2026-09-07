import type { Project } from '@/lib/content';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const ProjectGalleryCard = ({ project }: { project: Project }) => (
  <article className="grid grid-cols-[minmax(18rem,.93fr)_minmax(20rem,1.25fr)_1.5rem] items-start gap-[clamp(2rem,3vw,4.5rem)] border-b border-border-subtle py-[clamp(2rem,4vw,5rem)] max-sm:grid-cols-[minmax(0,1fr)_1.1rem] max-sm:gap-[1.2rem] max-sm:py-[1.65rem]">
    <div
      className="relative min-h-[clamp(10.5rem,19vw,16rem)] overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_12px_28px_rgb(0_0_0_/_8%)]"
      aria-hidden="true"
    >
      <Image
        src={project.heroImage ?? '/web-site.png'}
        alt=""
        fill
        sizes="(min-width: 640px) 35vw, 90vw"
        className="object-cover object-top"
      />
    </div>
    <div className="flex min-h-[clamp(10.5rem,19vw,16rem)] flex-col self-stretch py-4 max-sm:col-start-1 max-sm:min-h-0">
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
      className="mt-16 text-foreground transition-colors hover:text-primary max-sm:col-start-2 max-sm:row-start-1 max-sm:mt-0"
      href={`/projects/${project.slug}`}
      aria-label={`View ${project.title} case study`}
    >
      <ArrowUpRight className="size-8" aria-hidden="true" />
    </Link>
  </article>
);
