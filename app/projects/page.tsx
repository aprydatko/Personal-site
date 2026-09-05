import { Container } from '@/app/components/Container';
import { ProjectsGallery } from './_components/ProjectsGallery';

export const metadata = {
  title: 'Projects — Arthur Prydatko',
  description: 'Selected web products built from idea to production.',
};

export default function ProjectsPage() {
  return (
    <main id="main-content" className="overflow-hidden" tabIndex={-1}>
      <Container className="relative">
        <div className="pointer-events-none absolute right-8 top-8 h-56 w-60 opacity-45 [background-image:radial-gradient(var(--muted)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(135deg,transparent,#000_35%,transparent_85%)]" aria-hidden="true" />
        <section className="relative py-[clamp(3rem,8vw,7rem)] pb-[clamp(2.5rem,6vw,5rem)]">
          <p className="m-0 font-mono text-[0.7rem] font-semibold leading-tight tracking-[0.04em] text-primary">/ PROJECTS</p>
          <h1 className="my-[1.45rem] mb-[1.1rem] font-mono text-[clamp(3rem,7vw,5.1rem)] font-medium leading-[0.95] tracking-[-0.08em]">Projects<span className="text-primary">.</span></h1>
          <p className="m-0 font-mono text-[clamp(0.9rem,1.6vw,1.05rem)] font-medium leading-[1.75] text-muted">
            Selected works that I’ve built from idea to production.<br className="hidden sm:block" />
            Each project solves a real problem.
          </p>
        </section>
        <ProjectsGallery />
      </Container>
    </main>
  );
}
