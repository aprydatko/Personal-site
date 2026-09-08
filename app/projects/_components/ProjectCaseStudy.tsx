import { Container } from '@/app/components/layout/Container';
import type { Project } from '@/lib/content';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProjectCaseStudyHeader } from './ProjectCaseStudyHeader';
import { ProjectCaseStudySections } from './ProjectCaseStudySections';

type ProjectCaseStudyProps = { project: Project };

export const ProjectCaseStudy = ({ project }: ProjectCaseStudyProps) => {
  const projectImage = project.heroImage ?? '/sass-platform.png';

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
          <ProjectCaseStudyHeader project={project} projectImage={projectImage} />
          <ProjectCaseStudySections project={project} projectImage={projectImage} />
        </article>
      </Container>
    </main>
  );
};
