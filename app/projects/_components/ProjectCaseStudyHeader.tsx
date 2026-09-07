import { Button } from '@/app/components/ui/button';
import type { Project } from '@/lib/content';
import { ExternalLink } from 'lucide-react';
import { ProjectCaseStudyImage } from './ProjectCaseStudyImage';

type ProjectCaseStudyHeaderProps = {
  project: Project;
  projectImage: string;
};

const ProjectHero = ({ project, projectImage }: ProjectCaseStudyHeaderProps) => (
  <header className="grid items-start gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-16">
    <div>
      <p className="mt-2 font-mono text-sm uppercase tracking-wide text-muted">{project.label}</p>
      <h1 className="mt-11 font-mono text-[clamp(2.75rem,5vw,4rem)] font-medium leading-16 tracking-wide">
        {project.title}
      </h1>
      <div className="mt-5 max-w-xl text-muted">
        <p className="text-base font-medium leading-7 tracking-tight text-foreground sm:text-lg">
          {project.tagline ?? project.description}
        </p>
        {project.intro ? (
          <p className="mt-7 max-w-md text-sm leading-7.5 sm:text-base">{project.intro}</p>
        ) : null}
      </div>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button href="#overview" className="gap-4 px-5 py-5 text-sm">
          Visit live site <ExternalLink size={16} data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </div>
    <div className="relative aspect-[1.75] max-w-3xl overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_12px_24px_rgb(0_0_0_/_8%)]">
      <ProjectCaseStudyImage alt={project.title} src={projectImage} eager />
    </div>
  </header>
);

const ProjectFacts = ({ project }: Pick<ProjectCaseStudyHeaderProps, 'project'>) => {
  const facts = [
    ['Role', project.role],
    ['Duration', project.duration],
    ['Team', project.team],
    ['Client', project.client],
    ['Services', project.services],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <dl className="mt-18 grid border-y border-border-subtle py-6 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map(([label, value]) => (
        <div
          key={label}
          className="py-3 sm:px-5 sm:first:pl-2 lg:border-r lg:border-border-subtle lg:py-2 lg:last:border-r-0"
        >
          <dt className="font-mono text-sm uppercase tracking-[0.08em] text-muted">{label}</dt>
          <dd className="mt-2 text-sm font-semibold text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const ProjectCaseStudyHeader = (props: ProjectCaseStudyHeaderProps) => (
  <>
    <ProjectHero {...props} />
    <ProjectFacts project={props.project} />
  </>
);
