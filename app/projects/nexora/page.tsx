import { Button } from '@/app/components/ui/button';
import { ArrowLeft, ArrowUpRight, BarChart3, Check, CircleDot, Database, ShieldCheck, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { NexoraDashboard, NexoraInsightBoard, NexoraListBoard, NexoraMapBoard } from './_components/NexoraDashboards';

export const metadata = { title: 'Nexora — Arthur Prydatko', description: 'A full case study for the Nexora analytics platform.' };

const projectFacts = [['Role', 'Fullstack Developer'], ['Duration', 'Jan 2024 – Apr 2024'], ['Team', '4 developers'], ['Client', 'Nexora Inc.'], ['Services', 'Web App, Dashboard, API']];
const technologies = [['N', 'Next.js'], ['TS', 'TypeScript'], ['⚛', 'React'], ['JS', 'Node.js'], ['◌', 'PostgreSQL'], ['▱', 'Redis'], ['≈', 'Tailwind CSS'], ['⌘', 'Docker']];
const features: [LucideIcon, string, string][] = [[BarChart3, 'Advanced analytics', 'Powerful analytics engine with custom metrics and filters.'], [Database, 'Data integrations', 'Connect multiple data sources with our simple integration system.'], [ShieldCheck, 'Permissions', 'Granular access control and team management for organizations.'], [Zap, 'Performance', 'Built for speed with SSR, caching and optimized queries.']];

const SectionTitle = ({ number, title, description }: { number: string; title: string; description?: string }) => <div className="case-section-title"><span>{number}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>;

export default function NexoraProjectPage() {
  return <main id="main-content" className="case-study" tabIndex={-1}>
    <div className="case-wrap">
      <Link className="back-projects" href="/projects"><ArrowLeft aria-hidden="true" /> Back to projects</Link>
      <section className="case-hero"><div className="case-hero-copy"><p>WEB APPLICATION</p><h1>Nexora</h1><h2>AI-powered analytics platform for business intelligence.</h2><p>Nexora helps companies unify their data and turn it into clear insights. Real-time dashboards, smart reports and beautiful data visualizations.</p><div><Button href="https://example.com" target="_blank">Visit live site <ArrowUpRight data-icon="inline-end" /></Button><Button href="https://github.com" target="_blank" variant="ghost">View source code <CircleDot data-icon="inline-end" /></Button></div></div><NexoraDashboard /></section>
      <dl className="case-facts">{projectFacts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <section className="case-overview"><SectionTitle number="01" title="Overview" description="Nexora is a comprehensive analytics platform that makes it easy to connect with their data sources, analyze key metrics and share insights across teams." /><ul>{['Real-time data synchronization', 'Interactive dashboards', 'Custom reports builder', 'Role-based access control'].map((item) => <li key={item}><Check />{item}</li>)}</ul><div className="case-screens"><NexoraInsightBoard /><div><NexoraListBoard /><NexoraMapBoard /></div></div></section>
      <section className="case-stack"><SectionTitle number="02" title="Tech stack" description="Technologies and tools used to build this project." /><div className="tech-list">{technologies.map(([mark, name]) => <div key={name}><b>{mark}</b><span>{name}</span></div>)}</div></section>
      <section className="case-features"><SectionTitle number="03" title="Key features" /><div>{features.map(([FeatureIcon, title, description]) => <article key={title}><FeatureIcon /><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section className="case-challenge"><SectionTitle number="04" title="The challenge" description="Businesses had many disconnected tools and manual reports. Nexora was built to solve that." /><ol>{[['01', 'Disconnected data', 'Data was scattered across multiple platforms and spreadsheets.'], ['02', 'Manual reporting', 'Teams spent hours preparing reports every week.'], ['03', 'No real-time insights', 'Decisions were made with outdated information.']].map(([number, title, text]) => <li key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol><aside><h3>The solution</h3><p>Nexora unifies data, automates reporting and delivers live insights in one place.</p><i className="solution-line" /></aside></section>
    </div>
  </main>;
}
