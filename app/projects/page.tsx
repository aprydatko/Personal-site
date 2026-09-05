import { Container } from '@/app/components/Container';
import { ProjectsGallery } from './_components/ProjectsGallery';

export const metadata = {
  title: 'Projects — Arthur Prydatko',
  description: 'Selected web products built from idea to production.',
};

export default function ProjectsPage() {
  return (
    <main id="main-content" className="projects-page" tabIndex={-1}>
      <Container className="relative">
        <div className="projects-dots" aria-hidden="true" />
        <section className="projects-intro">
          <p className="projects-eyebrow">/ PROJECTS</p>
          <h1>Projects<span>.</span></h1>
          <p className="projects-lede">
            Selected works that I’ve built from idea to production.<br className="hidden sm:block" />
            Each project solves a real problem.
          </p>
        </section>
        <ProjectsGallery />
      </Container>
    </main>
  );
}
