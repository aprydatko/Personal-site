import { projects, type Project } from '@/app/content/site';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '../layout/Container';
import { HomeSectionHeading } from './HomeSectionHeading';
import { MobileSlider } from './MobileSlider';
import { ProjectImage } from './ProjectImage';

const ProjectPreview = ({ project }: { project: Project }) => (
  <div
    className={`relative aspect-[1.42] overflow-hidden rounded-[10px] border border-black/80 bg-[#15151d] px-[5.5%] pt-[5.5%] shadow-[0_12px_28px_rgb(15_15_22_/_14%),inset_0_1px_0_rgb(255_255_255_/_10%)] ${project.preview === 'nexora' ? 'bg-[radial-gradient(circle_at_30%_110%,#444_0,#111_42%,#050505_100%)]' : project.preview === 'velox' ? 'bg-[linear-gradient(135deg,#24252a,#111217_48%,#24252a)]' : ''}`}
  >
    <div className="relative h-full w-full overflow-hidden rounded-t-[5px] bg-white shadow-[0_0_0_1px_rgb(255_255_255_/_12%)]">
      <ProjectImage
        variant={project.preview}
        alt={`${project.name} interface preview`}
        className="rounded-t-[5px]"
      />
    </div>
  </div>
);

const ProjectCard = ({ project }: { project: Project }) => (
  <article className="flex h-full flex-col overflow-hidden">
    <div>
      <ProjectPreview project={project} />
    </div>
    <div className="flex flex-col gap-2 pt-5 md:pt-9">
      <p className="font-mono text-md tracking-wide text-dark-accent">{project.kind}</p>
      <h3 className="pt-1 font-mono text-xl font-medium leading-none tracking-tight md:text-2xl">
        {project.name}
      </h3>
      <p className="max-w-xs pt-2 font-sans text-sm font-semibold leading-6 text-muted-strong md:pt-3 md:leading-7">
        {project.description}
      </p>
    </div>
    <div className="mt-auto flex items-center justify-between gap-4 pt-6 font-mono text-xs leading-5 text-muted md:pt-12">
      <span className="max-w-[85%]">{project.stack}</span>
      <ArrowUpRight
        className="relative -left-2 top-1 shrink-0"
        strokeWidth={1}
        aria-hidden="true"
      />
    </div>
  </article>
);

export const FeaturedProjects = () => (
  <section id="projects" data-home-section>
    <Container>
      <div className="overflow-hidden border-b border-border-subtle py-12 sm:py-20 lg:py-20">
        <HomeSectionHeading
          number="01"
          title="Featured projects"
          actionLabel="See all projects"
          actionTitle="More projects coming soon"
          className="mb-8 sm:mb-12"
        />
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
      </div>
    </Container>
  </section>
);
