import { MarkdownArticle } from '@/app/components/content/MarkdownArticle';
import { Container } from '@/app/components/layout/Container';
import { Button } from '@/app/components/ui/button';
import type { Project } from '@/lib/content';
import {
  ArrowLeft,
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
import Image from 'next/image';
import Link from 'next/link';

type ProjectCaseStudyProps = { project: Project };
type ProjectImageProps = Pick<Project, 'title'> & { src: string; priority?: boolean };

const ProjectImage = ({ title, src, priority = false }: ProjectImageProps) => (
  <div className="relative h-full w-full overflow-hidden">
    <Image
      src={src}
      alt={`${title} interface`}
      fill
      priority={priority}
      sizes="(min-width: 1024px) 54vw, 100vw"
      className="object-cover object-top"
    />
  </div>
);

const SectionHeading = ({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) => (
  <div>
    <p className="font-mono text-xs text-muted">{number}</p>
    <h2 className="mt-2 font-mono text-[22px] font-medium tracking-tight">{title}</h2>
    <p className="mt-3 max-w-xs text-sm leading-6.5 tracking-wide text-muted font-medium">
      {description}
    </p>
  </div>
);

const ProjectHero = ({ project, projectImage }: { project: Project; projectImage: string }) => (
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
        {project.intro && (
          <p className="mt-7 max-w-md text-sm leading-7.5 sm:text-base">{project.intro}</p>
        )}
      </div>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button href="#overview" className="px-5 py-5 gap-4 text-sm">
          Visit live site <ExternalLink size={16} data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </div>
    <div className="max-w-3xl relative aspect-[1.75] overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_12px_24px_rgb(0_0_0_/_8%)]">
      <ProjectImage title={project.title} src={projectImage} priority />
    </div>
  </header>
);

const ProjectFacts = ({ project }: ProjectCaseStudyProps) => {
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

const ProjectOverviewMedia = ({
  project,
  projectImage,
}: {
  project: Project;
  projectImage: string;
}) => (
  <div className="grid min-h-72 gap-4 sm:grid-cols-[1.55fr_.95fr]">
    <div className="relative min-h-72 overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_10px_20px_rgb(0_0_0_/_8%)]">
      <ProjectImage title={project.title} src={projectImage} />
    </div>
    <div className="grid gap-4 sm:grid-rows-2">
      {['overview detail', 'analytics detail'].map((alt) => (
        <div
          className="relative min-h-32 overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_10px_20px_rgb(0_0_0_/_8%)]"
          key={alt}
        >
          <ProjectImage title={`${project.title} ${alt}`} src={projectImage} />
          <span className="absolute inset-0 bg-black/35" aria-hidden="true" />
        </div>
      ))}
    </div>
  </div>
);

const ProjectOverview = ({ project, projectImage }: { project: Project; projectImage: string }) => (
  <section
    id="overview"
    className="grid gap-10 border-b border-border-subtle py-16 lg:grid-cols-[minmax(13rem,.53fr)_minmax(0,1.35fr)]"
  >
    <div>
      <SectionHeading number="01" title="Overview" description={project.description} />
      {project.features.length > 0 && (
        <ul className="mt-8 flex flex-col gap-3 text-sm text-muted font-medium">
          {project.features.map((feature) => (
            <li className="flex gap-3" key={feature}>
              <Check className="mt-1 size-4 shrink-0 text-foreground" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      )}
    </div>
    <ProjectOverviewMedia project={project} projectImage={projectImage} />
  </section>
);

const stackIcons = [Boxes, Code2, Atom, Server, Database, Layers, Wind, ContainerIcon];

const ProjectStack = ({ stack }: Pick<Project, 'stack'>) => (
  <section
    id="technical-details"
    className="grid items-center gap-8 border-b border-border-subtle py-14 lg:grid-cols-[minmax(5rem,.25fr)_minmax(0,1.35fr)]"
  >
    <SectionHeading
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

const ProjectNarrative = ({ html }: Pick<Project, 'html'>) => (
  <section className="grid gap-8 border-b border-border-subtle py-14 lg:grid-cols-[minmax(13rem,1fr)_minmax(0,1.35fr)]">
    <SectionHeading
      number="04"
      title="Story"
      description="The constraints, decisions, and outcome behind the project."
    />
    <MarkdownArticle html={html} numbered />
  </section>
);

const featureIcons = [BarChart3, Database, ShieldCheck, Zap];
const ProjectKeyFeatures = ({ keyFeatures }: Pick<Project, 'keyFeatures'>) => (
  <section className="grid gap-8 border-b border-border-subtle py-14 lg:grid-cols-[minmax(13rem,.35fr)_minmax(0,1.35fr)]">
    <SectionHeading
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
            <h3 className="mt-5 font-mono text-sm font-medium">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          </li>
        );
      })}
    </ul>
  </section>
);

const ProjectContactCta = () => (
  <aside className="mt-12 flex flex-col justify-between gap-6 rounded-lg border border-border-subtle bg-surface px-7 py-6 sm:flex-row sm:items-center">
    <div>
      <h2 className="font-mono text-lg font-medium tracking-tight">Have a project in mind?</h2>
      <p className="mt-1 text-sm text-muted">Let’s build something great together.</p>
    </div>
    <Button href="/contact" className="w-fit px-5 py-3.5 text-xs max-sm:w-full">
      Start a project <ExternalLink data-icon="inline-end" aria-hidden="true" />
    </Button>
  </aside>
);

export const ProjectCaseStudy = ({ project }: ProjectCaseStudyProps) => {
  const projectImage = project.heroImage ?? '/web-site.png';
  return (
    <main id="main-content" tabIndex={-1}>
      <Container className="py-4 sm:py-5 lg:py-12">
        <Link
          href="/projects"
          className="inline-flex items-center gap-5 font-mono text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to projects
        </Link>
        <article className="mt-10 sm:mt-14">
          <ProjectHero project={project} projectImage={projectImage} />
          <ProjectFacts project={project} />
          <ProjectOverview project={project} projectImage={projectImage} />
          <ProjectStack stack={project.stack} />
          <ProjectKeyFeatures keyFeatures={project.keyFeatures} />
          <ProjectNarrative html={project.html} />
          <ProjectContactCta />
        </article>
      </Container>
    </main>
  );
};
