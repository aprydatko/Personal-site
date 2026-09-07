import { Container } from '@/app/components/layout/Container';
import { PageIntro } from '@/app/components/layout/PageIntro';
import { getProjects } from '@/lib/content';
import { ProjectsGallery } from './_components/ProjectsGallery';

export const metadata = {
  title: 'Projects — Arthur Prydatko',
  description: 'Selected web products built from idea to production.',
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <main id="main-content" className="overflow-hidden" tabIndex={-1}>
      <Container className="relative">
        <PageIntro
          eyebrow="PROJECTS"
          title={
            <>
              Projects<span className="text-primary opacity-60">.</span>
            </>
          }
          description={
            <>
              Selected works that I’ve built from idea to production.
              <br className="hidden sm:block" />
              Each project solves a real problem.
            </>
          }
        />
        <ProjectsGallery projects={projects} />
      </Container>
    </main>
  );
}
