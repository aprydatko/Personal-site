import { MarkdownArticle } from '@/app/components/content/MarkdownArticle';
import { Container } from '@/app/components/Container';
import { getProject, getProjects } from '@/lib/content/markdown';
import { ArrowLeft, ArrowUpRight, Check, Code2 } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type ProjectPageProps = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = async () => (await getProjects()).map(({ slug }) => ({ slug }));
export const generateMetadata = async ({ params }: ProjectPageProps): Promise<Metadata> => {
  const project = await getProject((await params).slug);
  return project ? { title: `${project.title} — Arthur Prydatko`, description: project.description } : {};
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  const projectImage = project.heroImage ?? '/web-site.png';
  const facts = [['Role', project.role], ['Duration', project.duration], ['Team', project.team], ['Client', project.client], ['Services', project.services]];

  return <main id="main-content" tabIndex={-1}><Container className="py-8 sm:py-12">
    <Link href="/projects" className="inline-flex items-center gap-3 font-mono text-xs text-muted transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to projects</Link>
    <article className="mt-10">
      <div className="grid items-center gap-10 lg:grid-cols-[.78fr_1.22fr] lg:gap-16">
        <div><p className="font-mono text-xs uppercase tracking-wider text-muted">{project.label}</p><h1 className="mt-6 font-mono text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-none tracking-tight">{project.title}</h1><p className="mt-5 max-w-md text-sm leading-7 text-muted">{project.description}</p><div className="mt-8 flex flex-wrap gap-5 font-mono text-xs"><a className="inline-flex items-center gap-2 rounded bg-foreground px-4 py-3 text-background" href="#overview">Visit live site <ArrowUpRight className="size-3.5" /></a><a className="inline-flex items-center gap-2 px-2 py-3 hover:text-primary" href="#tech-stack">View source code <Code2 className="size-3.5" /></a></div></div>
        <div className="relative aspect-[1.58] overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_20px_35px_rgb(0_0_0_/_12%)]"><Image src={projectImage} alt={`${project.title} product interface`} fill priority className="object-cover object-top" sizes="(min-width: 1024px) 54vw, 100vw" /></div>
      </div>
      <dl className="mt-12 grid gap-5 border-y border-border-subtle py-6 text-xs sm:grid-cols-2 lg:grid-cols-5">{facts.map(([label, value]) => value && <div key={label} className="border-border-subtle lg:border-r lg:pr-4"><dt className="font-mono text-[10px] uppercase text-muted">{label}</dt><dd className="mt-2 font-medium">{value}</dd></div>)}</dl>
      <section id="overview" className="grid gap-10 border-b border-border-subtle py-14 lg:grid-cols-[.65fr_1.35fr]"><div><p className="font-mono text-xs text-muted">01</p><h2 className="mt-3 font-mono text-xl">Overview</h2><p className="mt-4 text-sm leading-7 text-muted">{project.description}</p>{project.features.length > 0 && <ul className="mt-7 space-y-3 text-sm text-muted">{project.features.map((feature) => <li className="flex gap-3" key={feature}><Check className="mt-1 size-4 shrink-0 text-foreground" />{feature}</li>)}</ul>}</div><div className="relative min-h-72 overflow-hidden rounded-lg border border-border-subtle bg-surface"><Image src={projectImage} alt="" fill className="object-cover object-top" sizes="(min-width: 1024px) 60vw, 100vw" /></div></section>
      <section id="tech-stack" className="grid gap-8 border-b border-border-subtle py-14 lg:grid-cols-[.65fr_1.35fr]"><div><p className="font-mono text-xs text-muted">02</p><h2 className="mt-3 font-mono text-xl">Tech stack</h2><p className="mt-4 text-sm leading-7 text-muted">Technologies and tools used to build this project.</p></div><ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{project.stack.map((item) => <li className="rounded-md border border-border-subtle bg-surface px-4 py-5 font-mono text-xs" key={item}>{item}</li>)}</ul></section>
      <section className="py-14"><MarkdownArticle html={project.html} numbered /></section>
      <div className="flex flex-col justify-between gap-6 rounded-lg bg-surface px-7 py-6 sm:flex-row sm:items-center"><div><p className="font-mono text-lg">Have a project in mind?</p><p className="mt-1 text-sm text-muted">Let’s build something great together.</p></div><Link href="/contact" className="inline-flex w-fit items-center gap-3 rounded bg-foreground px-5 py-3 font-mono text-xs text-background">Start a project <ArrowUpRight className="size-3.5" /></Link></div>
    </article>
  </Container></main>;
}
