import { Code2, FileText, Mail, UserRound } from 'lucide-react';
import Link from 'next/link';
import { Container } from './components/layout/Container';
import { NotFoundCard } from './components/NotFoundCard';

const destinations = [
  {
    href: '/#articles',
    icon: FileText,
    label: 'Blog',
    description: 'Thoughts, tutorials and articles.',
  },
  {
    href: '/#projects',
    icon: Code2,
    label: 'Projects',
    description: "Things I've built and shipped.",
  },
  {
    href: '/#about',
    icon: UserRound,
    label: 'About',
    description: 'More about me and what I do.',
  },
  {
    href: '/#contact',
    icon: Mail,
    label: 'Contact',
    description: 'Get in touch or say hello.',
  },
];

export default function NotFound() {
  return (
    <main id="main-content" className="overflow-clip" tabIndex={-1}>
      <Container>
        <section className="not-found-hero relative isolate flex min-h-[34rem] flex-col items-center justify-center overflow-hidden py-20 text-center sm:min-h-[39rem] sm:py-24">
          <div className="absolute inset-x-[7%] top-8 bottom-8 -z-10 opacity-70 [background-image:radial-gradient(circle,color-mix(in_srgb,var(--muted)_24%,transparent)_1px,transparent_1.2px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] max-sm:[background-size:20px_20px]" aria-hidden="true" />
          <p className="font-mono text-[clamp(7rem,25vw,13rem)] font-light leading-none tracking-[-0.12em] text-foreground sm:tracking-[-0.15em]">
            4<span className="text-primary">0</span>4
          </p>
          <h1 className="mt-8 font-mono text-[clamp(1.45rem,3vw,2rem)] font-medium tracking-tight">
            Page not found<span className="text-primary">.</span>
          </h1>
          <p className="mt-6 max-w-md font-mono text-xs leading-6 text-muted sm:text-sm">
            Looks like you&apos;ve followed a broken link
            <br />
            or the page has been moved.
          </p>
          <Link
            href="/"
            className="group mt-8 inline-flex items-center gap-8 bg-foreground px-5 py-4 font-mono text-xs text-background transition-colors hover:bg-muted-strong focus-visible:outline-2 focus-visible:outline-focus sm:mt-9 sm:px-6 sm:py-4 sm:text-sm"
          >
            Back to homepage
            <span className="text-base transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
              →
            </span>
          </Link>
        </section>

        <div className="relative h-16 border-t border-border-subtle before:absolute before:-top-px before:left-0 before:w-[27%] before:border-t before:border-border-subtle before:content-[''] max-sm:before:w-[22%]" aria-hidden="true">
          <span className="absolute -top-1 left-0 size-2 bg-foreground" />
          <span className="absolute -top-px left-[27%] h-8 w-px bg-border-subtle" />
          <span className="absolute top-8 left-[27%] right-[3%] border-t border-border-subtle" />
          <span className="absolute top-[calc(2rem-3px)] right-[3%] size-1.5 bg-primary" />
        </div>

        <section className="pb-20 pt-7 sm:pb-28 sm:pt-8" aria-labelledby="not-found-links-title">
          <h2 id="not-found-links-title" className="font-mono text-sm font-medium tracking-tight sm:text-base">
            Maybe you were looking for
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {destinations.map((destination) => (
              <NotFoundCard key={destination.label} {...destination} />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
