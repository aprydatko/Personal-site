import { ProjectCaseStudy } from '@/app/projects/_components/ProjectCaseStudy';
import { getProject, getProjects } from '@/lib/content';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type ProjectPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = async () => (await getProjects()).map(({ slug }) => ({ slug }));
export const generateMetadata = async ({ params }: ProjectPageProps): Promise<Metadata> => {
  const project = await getProject((await params).slug);
  return project
    ? { title: `${project.title} — Arthur Prydatko`, description: project.description }
    : {};
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  return <ProjectCaseStudy project={project} />;
}
