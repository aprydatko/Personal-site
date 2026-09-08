import { getProjects } from '@/lib/content';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '../layout/Container';
import { HomeSectionHeading } from './HomeSectionHeading';

export const FeaturedProjects = async () => {
  const projects = (await getProjects()).slice(0, 2);
  return (
    <section id="projects" data-home-section className="section-space">
      <Container>
        <HomeSectionHeading
          number="01"
          title="Featured projects"
          actionLabel="See all projects"
          href="/projects"
        />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="project-card group flex flex-col"
            >
              <div className="relative aspect-[1.6] overflow-hidden rounded-lg border border-border-subtle bg-surface">
                <Image
                  src={project.heroImage ?? '/sass-platform.png'}
                  alt={`${project.title} interface preview`}
                  fill
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.025]"
                />
              </div>
              <div className="mt-6 flex items-center justify-between gap-4">
                <h3 className="text-2xl font-semibold">{project.title}</h3>
                <span className="font-mono text-xs text-primary">{project.label}</span>
              </div>
              <p className="mt-3 mb-5 max-w-md text-muted leading-7">{project.description}</p>
              <div className="mt-auto flex items-center justify-between gap-5 border-b border-border-subtle py-5">
                <span className="font-mono text-xs leading-6 text-muted">
                  {project.stack.join(' / ')}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="shrink-0 text-primary transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                />
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};
