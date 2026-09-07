import { MarkdownArticle } from '@/app/components/content/MarkdownArticle';
import { Button } from '@/app/components/ui/button';
import type { Project } from '@/lib/content';
import {
  Atom,
  BarChart3,
  Boxes,
  Check,
  Code2,
  Container as ContainerIcon,
  Database,
  ExternalLink,
  Layers,
  Server,
  ShieldCheck,
  Wind,
  Zap,
} from 'lucide-react';
import { ProjectCaseStudyImage } from './ProjectCaseStudyImage';
import { ProjectSectionHeading } from './ProjectSectionHeading';

type ProjectCaseStudySectionsProps = {
  project: Project;
  projectImage: string;
};

const ProjectOverviewMedia = ({ project, projectImage }: ProjectCaseStudySectionsProps) => (
  <div className="grid min-h-72 gap-4 sm:grid-cols-[1.55fr_.95fr]">
    <div className="relative min-h-72 overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_10px_20px_rgb(0_0_0_/_8%)]">
      <ProjectCaseStudyImage alt={project.title} src={projectImage} />
    </div>
    <div className="grid gap-4 sm:grid-rows-2">
      {['overview detail', 'analytics detail'].map((detail) => (
        <div
          className="relative min-h-32 overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_10px_20px_rgb(0_0_0_/_8%)]"
          key={detail}
        >
          <ProjectCaseStudyImage alt={`${project.title} ${detail}`} src={projectImage} />
          <span className="absolute inset-0 bg-black/35" aria-hidden="true" />
        </div>
      ))}
    </div>
  </div>
);

const ProjectOverview = (props: ProjectCaseStudySectionsProps) => (
  <section
    id="overview"
    className="grid gap-10 border-b border-border-subtle py-16 lg:grid-cols-[minmax(13rem,.53fr)_minmax(0,1.35fr)]"
  >
    <div>
      <ProjectSectionHeading number="01" title="Overview" description={props.project.description} />
      {props.project.features.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3 text-sm font-medium text-muted">
          {props.project.features.map((feature) => (
            <li className="flex gap-3" key={feature}>
              <Check className="mt-1 size-4 shrink-0 text-foreground" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
    <ProjectOverviewMedia {...props} />
  </section>
);

const stackIcons = [Boxes, Code2, Atom, Server, Database, Layers, Wind, ContainerIcon];

const ProjectStack = ({ stack }: Pick<Project, 'stack'>) => (
  <section
    id="technical-details"
    className="grid items-center gap-8 border-b border-border-subtle py-14 lg:grid-cols-[minmax(5rem,.25fr)_minmax(0,1.35fr)]"
  >
    <ProjectSectionHeading
      number="02"
      title="Tech stack"
      description="Technologies and tools used to build this project."
    />
    <ul className="flex flex-wrap items-start gap-y-8 lg:flex-nowrap lg:gap-0">
      {stack.map((item, index) => {
        const Icon = stackIcons[index % stackIcons.length];

        return (
          <li
            className="flex min-w-[7rem] flex-1 items-center gap-5 lg:min-w-0 lg:justify-center lg:border-r lg:border-border-subtle lg:px-5 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
            key={item}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <Icon size={30} strokeWidth={1.35} className="text-muted" aria-hidden="true" />
              <span className="font-mono text-xs font-medium text-foreground">{item}</span>
            </div>
          </li>
        );
      })}
    </ul>
  </section>
);

const featureIcons = [BarChart3, Database, ShieldCheck, Zap];

const ProjectKeyFeatures = ({ keyFeatures }: Pick<Project, 'keyFeatures'>) => (
  <section className="grid gap-8 border-b border-border-subtle py-14 lg:grid-cols-[minmax(13rem,.35fr)_minmax(0,1.35fr)]">
    <ProjectSectionHeading
      number="03"
      title="Key features"
      description="The details that make the product useful in practice."
    />
    <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {keyFeatures.map((feature, index) => {
        const [title, description] = feature.split('|');
        const Icon = featureIcons[index % featureIcons.length];

        return (
          <li key={feature}>
            <Icon size={25} strokeWidth={1.35} className="text-muted" aria-hidden="true" />
            <h3 className="mt-5 font-sans text-sm font-medium">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          </li>
        );
      })}
    </ul>
  </section>
);

const ProjectNarrative = ({ html }: Pick<Project, 'html'>) => (
  <section className="grid gap-8 border-b border-border-subtle py-14 lg:grid-cols-[minmax(13rem,1fr)_minmax(0,1.35fr)]">
    <ProjectSectionHeading
      number="04"
      title="Story"
      description="The constraints, decisions, and outcome behind the project."
    />
    <MarkdownArticle html={html} numbered />
  </section>
);

const ProjectContactCta = () => (
  <aside className="mt-12 flex flex-col justify-between gap-6 rounded-lg border border-border-subtle bg-surface px-7 py-6 sm:flex-row sm:items-center">
    <div>
      <h2 className="font-sans text-lg font-medium tracking-tight">Have a project in mind?</h2>
      <p className="mt-1 text-sm text-muted">Let’s build something great together.</p>
    </div>
    <Button href="/contact" className="w-fit px-5 py-3.5 text-xs max-sm:w-full">
      Start a project <ExternalLink data-icon="inline-end" aria-hidden="true" />
    </Button>
  </aside>
);

export const ProjectCaseStudySections = ({
  project,
  projectImage,
}: ProjectCaseStudySectionsProps) => (
  <>
    <ProjectOverview project={project} projectImage={projectImage} />
    <ProjectStack stack={project.stack} />
    <ProjectKeyFeatures keyFeatures={project.keyFeatures} />
    <ProjectNarrative html={project.html} />
    <ProjectContactCta />
  </>
);
