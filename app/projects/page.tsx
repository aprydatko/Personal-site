import { Container } from '@/app/components/layout/Container';
import { Pattern } from '@/app/components/sections/Pattern';
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
        <Pattern className="w-50 h-50 sm:h-50 md:w-100 top-5 right-5 2xl:top-[clamp(2rem,7vh,7rem)] 2xl:right-0 opacity-50" />
        <section className="relative py-[clamp(2rem,9vh,8rem)] pb-[clamp(2.5rem,6vw,4rem)]">
          <p className="m-0 font-mono text-sm font-semibold leading-tight tracking-normal">
            / PROJECTS
          </p>
          <h1 className="my-7 mb-5 font-mono font-semibold tracking-tight text-[clamp(1.5rem,9vw,3.5rem)]">
            Projects<span className="text-primary opacity-60">.</span>
          </h1>
          <p className="m-0 font-mono text-[clamp(0.85rem,1.6vw,1rem)] font-medium leading-7 tracking-tight text-muted">
            Selected works that I’ve built from idea to production.
            <br className="hidden sm:block" />
            Each project solves a real problem.
          </p>
        </section>
        <ProjectsGallery projects={projects} />
      </Container>
    </main>
  );
}
