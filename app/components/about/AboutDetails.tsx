import Link from 'next/link';
import { ArrowRight, Atom, CodeXml, Gauge, Gem, Layers3, Rocket, Waves } from 'lucide-react';

const technologies = [
  { label: 'React', mark: Atom, className: 'text-cyan-500' },
  { label: 'Next.js', mark: 'N', className: 'bg-foreground text-background' },
  { label: 'TypeScript', mark: 'TS', className: 'bg-blue-600 text-white' },
  { label: 'Node.js', mark: 'JS', className: 'border-2 border-green-600 text-green-600' },
  { label: 'PostgreSQL', mark: Layers3, className: 'text-sky-700' },
  { label: 'Tailwind CSS', mark: Waves, className: 'text-cyan-500' },
];

const focusAreas = [
  { title: 'Fullstack Development', description: 'Building end-to-end applications with modern technologies and best practices.', icon: CodeXml },
  { title: 'Clean Code', description: 'Writing maintainable, scalable and testable code that stands the test of time.', icon: Gem },
  { title: 'User Experience', description: 'Creating intuitive interfaces that provide great user experience.', icon: Rocket },
  { title: 'Performance', description: 'Optimizing applications for speed, accessibility and SEO.', icon: Gauge },
];

export const AboutDetails = () => (
  <section className="py-14 lg:py-20">
    <h2 className="font-mono text-xl font-medium">My stack</h2>
    <ul className="mt-8 grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-6">
      {technologies.map(({ label, mark: Mark, className }) => (
        <li key={label} className="flex flex-col items-center gap-3 text-center font-mono text-xs text-muted">
          {typeof Mark === 'string' ? <span className={`flex size-10 items-center justify-center rounded-md font-sans text-base font-semibold ${className}`}>{Mark}</span> : <Mark className={`size-10 ${className}`} aria-hidden="true" />}
          {label}
        </li>
      ))}
    </ul>
    <div className="mt-16 grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-18">
      <article className="lg:border-r lg:border-border-subtle lg:pr-18">
        <h2 className="font-mono text-xl font-medium">My story</h2>
        <div className="mt-6 flex flex-col gap-6 text-sm leading-7 text-muted">
          <p>My journey in development started back in 2018 when I built my first website. Since then, I&apos;ve been constantly learning and building, from small scripts to complex full-stack applications.</p>
          <p>I care about performance, scalability and developer experience. I love writing clean, maintainable code and creating smooth user interfaces.</p>
          <p>When I&apos;m not coding, you can find me running, reading or exploring new technologies.</p>
        </div>
        <Link href="/contact" className="mt-8 inline-flex items-center gap-5 border-b-2 border-primary pb-2 font-mono text-sm font-medium text-foreground transition-colors hover:text-primary">
          Let&apos;s connect <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </article>
      <section>
        <h2 className="font-mono text-xl font-medium">What I focus on</h2>
        <ul className="mt-6 flex flex-col">
          {focusAreas.map(({ title, description, icon: Icon }) => (
            <li key={title} className="flex gap-5 border-b border-border-subtle py-5 first:pt-0 last:border-b-0 last:pb-0">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-primary"><Icon className="size-5" aria-hidden="true" /></span>
              <div><h3 className="font-mono text-sm font-medium">{title}</h3><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </section>
);
