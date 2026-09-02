import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Container } from './Container';
import { MobileSlider } from './MobileSlider';
import { ProjectImage, type ProjectImageVariant } from './ProjectImage';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

type Project = {
  kind: string;
  name: string;
  description: string;
  stack: string;
  preview: ProjectImageVariant;
};

const projects: Project[] = [
  {
    kind: 'SaaS Platform',
    name: 'Planora',
    description: 'Project management platform for distributed teams.',
    stack: 'Next.js, TypeScript, Tailwind, PostgreSQL',
    preview: 'planora',
  },
  {
    kind: 'Web Application',
    name: 'Nexora',
    description: 'AI-powered analytics platform for business intelligence.',
    stack: 'Next.js, TypeScript, PostgreSQL, Redis',
    preview: 'nexora',
  },
  {
    kind: 'E-commerce',
    name: 'Velox Store',
    description: 'Modern e-commerce built for speed and conversion.',
    stack: 'Next.js, Stripe, Tailwind, PostgreSQL',
    preview: 'velox',
  },
];

const ProjectPreview = ({ variant }: { variant: Project['preview'] }) => (
  <div
    className={`relative aspect-[1.62] overflow-hidden rounded-[10px] border border-border bg-surface-raised p-3.5 shadow-[inset_0_0_0_4px_rgb(255_255_255_/_55%)] ${variant === 'nexora' ? 'bg-[radial-gradient(circle_at_30%_110%,#444_0,#111_42%,#050505_100%)]' : variant === 'velox' ? 'bg-[linear-gradient(135deg,#c6c7c7,#ececec_48%,#c4c5c5)]' : ''}`}
    aria-hidden="true"
  >
    <ProjectImage variant={variant} />
  </div>
);

const ProjectCard = ({ project }: { project: Project }) => (
  <Card className="group flex h-full flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none">
    <CardContent className="p-0">
      <ProjectPreview variant={project.preview} />
    </CardContent>
    <CardHeader className="px-0 pb-0 pt-5 md:pt-7">
      <CardDescription className="font-mono text-sm tracking-wide text-muted">
        {project.kind}
      </CardDescription>
      <CardTitle className="pt-1 text-xl md:text-2xl">{project.name}</CardTitle>
      <p className="max-w-xs pt-2 font-mono text-sm leading-6 text-muted-strong md:pt-3 md:leading-7">
        {project.description}
      </p>
    </CardHeader>
    <CardFooter className="mt-auto justify-between gap-4 px-0 pb-0 pt-6 font-mono text-xs leading-5 text-muted md:pt-10">
      <span className="max-w-[85%]">{project.stack}</span>
      <ArrowUpRight className="shrink-0" strokeWidth={1.5} />
    </CardFooter>
  </Card>
);

export const FeaturedProjects = () => (
  <section id="projects" className="overflow-hidden py-12 sm:py-20 lg:py-22">
    <Container>
      <div className="mb-8 flex items-center justify-between gap-4 sm:mb-12">
        <div className="flex min-w-0 flex-nowrap items-center gap-5 sm:gap-24">
          <span className="shrink-0 font-mono text-sm text-muted sm:text-lg">01</span>
          <h2 className="whitespace-nowrap font-mono text-2xl font-medium tracking-tight sm:text-3xl">
            Featured projects
          </h2>
        </div>
        <Link
          href="#projects"
          className="hidden items-center gap-4 font-mono font-medium text-md transition-opacity hover:opacity-60 sm:flex"
        >
          See all projects <ArrowRight strokeWidth={1.5} />
        </Link>
      </div>
      <div className="hidden grid-cols-3 gap-8 md:grid xl:gap-16 xl:px-24">
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </div>
      <MobileSlider>
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </MobileSlider>
    </Container>
  </section>
);
