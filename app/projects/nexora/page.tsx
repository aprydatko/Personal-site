import { Button } from '@/app/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleDot,
  Database,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import {
  NexoraDashboard,
  NexoraInsightBoard,
  NexoraListBoard,
  NexoraMapBoard,
} from './_components/NexoraDashboards';

export const metadata = {
  title: 'Nexora — Arthur Prydatko',
  description: 'A full case study for the Nexora analytics platform.',
};

const projectFacts = [
  ['Role', 'Fullstack Developer'],
  ['Duration', 'Jan 2024 – Apr 2024'],
  ['Team', '4 developers'],
  ['Client', 'Nexora Inc.'],
  ['Services', 'Web App, Dashboard, API'],
];
const technologies = [
  ['N', 'Next.js'],
  ['TS', 'TypeScript'],
  ['⚛', 'React'],
  ['JS', 'Node.js'],
  ['◌', 'PostgreSQL'],
  ['▱', 'Redis'],
  ['≈', 'Tailwind CSS'],
  ['⌘', 'Docker'],
];
const features: [LucideIcon, string, string][] = [
  [BarChart3, 'Advanced analytics', 'Powerful analytics engine with custom metrics and filters.'],
  [
    Database,
    'Data integrations',
    'Connect multiple data sources with our simple integration system.',
  ],
  [ShieldCheck, 'Permissions', 'Granular access control and team management for organizations.'],
  [Zap, 'Performance', 'Built for speed with SSR, caching and optimized queries.'],
];

const SectionTitle = ({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description?: string;
}) => (
  <div>
    <span className="font-mono text-[0.62rem] font-semibold text-muted">{number}</span>
    <h2 className="my-[0.55rem] font-mono text-base font-medium tracking-[-0.04em]">{title}</h2>
    {description && <p className="m-0 font-sans text-[0.64rem] font-medium leading-[1.75] text-muted">{description}</p>}
  </div>
);

export default function NexoraProjectPage() {
  return (
    <main id="main-content" className="overflow-hidden" tabIndex={-1}>
      <div className="mx-auto w-[min(100%_-_3rem,1120px)] pb-24 pt-8">
        <Link className="inline-flex items-center gap-[0.55rem] font-mono text-[0.68rem] font-semibold text-muted" href="/projects">
          <ArrowLeft aria-hidden="true" /> Back to projects
        </Link>
        <section className="grid grid-cols-[0.86fr_1.14fr] items-center gap-[clamp(2rem,5vw,5.5rem)] py-[clamp(3rem,8vw,6.5rem)] max-[700px]:flex max-[700px]:flex-col max-[700px]:items-stretch">
          <div>
            <p className="font-mono text-[0.62rem] font-semibold text-muted">WEB APPLICATION</p>
            <h1 className="my-7 font-mono text-[clamp(2.8rem,5vw,4.6rem)] font-medium leading-none tracking-[-0.08em]">Nexora</h1>
            <h2 className="font-sans text-[0.82rem] font-semibold leading-[1.6]">AI-powered analytics platform for business intelligence.</h2>
            <p className="my-6 max-w-sm font-sans text-[0.72rem] font-medium leading-[1.7] text-muted">
              Nexora helps companies unify their data and turn it into clear insights. Real-time
              dashboards, smart reports and beautiful data visualizations.
            </p>
            <div className="flex flex-wrap gap-[0.35rem]">
              <Button href="https://example.com" target="_blank">
                Visit live site <ArrowUpRight data-icon="inline-end" />
              </Button>
              <Button href="https://github.com" target="_blank" variant="ghost">
                View source code <CircleDot data-icon="inline-end" />
              </Button>
            </div>
          </div>
          <NexoraDashboard />
        </section>
        <dl className="grid grid-cols-5 border-y border-border-subtle py-5 max-sm:grid-cols-2">
          {projectFacts.map(([label, value]) => (
            <div className="border-r border-border-subtle px-4 first:pl-0 last:border-0" key={label}>
              <dt className="font-mono text-[0.52rem] font-medium uppercase text-muted">{label}</dt>
              <dd className="mt-2 font-sans text-[0.62rem] font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <section className="grid grid-cols-[190px_1fr] gap-12 border-b border-border-subtle py-11 max-[700px]:grid-cols-1">
          <SectionTitle
            number="01"
            title="Overview"
            description="Nexora is a comprehensive analytics platform that makes it easy to connect with their data sources, analyze key metrics and share insights across teams."
          />
          <ul className="m-0 list-none p-0">
            {[
              'Real-time data synchronization',
              'Interactive dashboards',
              'Custom reports builder',
              'Role-based access control',
            ].map((item) => (
              <li className="my-3 flex items-center gap-2 font-sans text-[0.62rem] font-medium" key={item}>
                <Check className="size-3 text-muted-strong" />
                {item}
              </li>
            ))}
          </ul>
          <div className="col-start-2 row-span-2 grid grid-cols-[1.55fr_0.8fr] gap-3 max-[700px]:col-auto max-[700px]:row-auto">
            <NexoraInsightBoard />
            <div>
              <NexoraListBoard />
              <NexoraMapBoard />
            </div>
          </div>
        </section>
        <section className="grid grid-cols-[190px_1fr] items-center gap-12 border-b border-border-subtle py-11 max-[700px]:grid-cols-1">
          <SectionTitle
            number="02"
            title="Tech stack"
            description="Technologies and tools used to build this project."
          />
          <div className="grid grid-cols-8 gap-2 max-sm:grid-cols-4">
            {technologies.map(([mark, name]) => (
              <div className="relative grid min-w-0 place-items-center gap-2 text-center" key={name}>
                <b className="grid size-[1.35rem] place-items-center rounded-full border border-muted font-mono text-[0.48rem]">{mark}</b>
                <span className="font-sans text-[0.52rem]">{name}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="grid grid-cols-[190px_1fr] gap-12 border-b border-border-subtle py-11 max-[700px]:grid-cols-1">
          <SectionTitle number="03" title="Key features" />
          <div className="grid grid-cols-4 gap-6 max-sm:grid-cols-2">
            {features.map(([FeatureIcon, title, description]) => (
              <article key={title}>
                <FeatureIcon className="size-5 text-muted-strong" />
                <h3 className="my-3 font-sans text-[0.67rem] font-semibold">{title}</h3>
                <p className="m-0 font-sans text-[0.6rem] font-medium leading-[1.7] text-muted">{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="grid grid-cols-[190px_1fr_1fr] gap-12 border-b border-border-subtle py-11 max-[700px]:grid-cols-1">
          <SectionTitle
            number="04"
            title="The challenge"
            description="Businesses had many disconnected tools and manual reports. Nexora was built to solve that."
          />
          <ol className="m-0 list-none p-0">
            {[
              [
                '01',
                'Disconnected data',
                'Data was scattered across multiple platforms and spreadsheets.',
              ],
              ['02', 'Manual reporting', 'Teams spent hours preparing reports every week.'],
              ['03', 'No real-time insights', 'Decisions were made with outdated information.'],
            ].map(([number, title, text]) => (
              <li className="grid min-h-16 grid-cols-[2rem_1fr] gap-3" key={number}>
                <b className="grid size-6 place-items-center rounded border border-border font-mono text-[0.55rem] font-medium text-muted">{number}</b>
                <div>
                  <h3 className="mt-0 font-sans text-[0.67rem] font-semibold">{title}</h3>
                  <p className="m-0 font-sans text-[0.6rem] font-medium leading-[1.7] text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <aside className="relative min-h-40 rounded bg-surface-raised/70 p-5">
            <h3 className="mt-0 font-sans text-[0.67rem] font-semibold">The solution</h3>
            <p className="font-sans text-[0.6rem] leading-[1.7] text-muted">Nexora unifies data, automates reporting and delivers live insights in one place.</p>
            <i className="absolute inset-x-4 bottom-4 h-12 border-b border-muted bg-[linear-gradient(135deg,transparent_20%,var(--muted)_20.5%_21%,transparent_21.5%_45%,var(--muted)_45.5%_46%,transparent_46.5%_67%,var(--muted)_67.5%_68%,transparent_68.5%)] [clip-path:polygon(0_100%,12%_79%,24%_62%,36%_70%,48%_38%,60%_47%,72%_25%,84%_40%,100%_0,100%_100%)]" />
          </aside>
        </section>
      </div>
    </main>
  );
}
