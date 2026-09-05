import { Container } from '@/app/components/Container';
import { Button } from '@/app/components/ui/button';
import { CodeWindow } from '@/components/CodeWindow';
import { MoveRight } from 'lucide-react';
import { FeaturedProjects } from './components/FeaturedProjects';
import { LatestArticles } from './components/LatestArticles';
import { Pattern } from './components/Pattern';

const codeLines = [
  'export default function Home() {',
  '  return (',
  '    <main className="max-w-2xl mx-auto py-24">',
  '      <h1 className="text-5xl font-semibold">',
  '        Building apps that solve',
  '        real problems.',
  '      </h1>',
  '      <p className="text-gray-400">',
  '        Fullstack developer focused on',
  '        performance, scalability and',
  '        great user experience.',
  '      </p>',
  '    </main>',
  '  );',
  '}',
];

export default function Home() {
  return (
    <main id="main-content" className="overflow-clip" tabIndex={-1}>
      <Container className="relative">
        <section
          id="hero"
          className="overflow-clip flex flex-col items-start lg:flex-row border-b border-border-subtle gap-[clamp(2rem,2.5rem,3.5rem)] py-[clamp(2rem,7vh,8rem)]"
        >
          <Pattern className="w-50 h-50 sm:h-72 md:w-125 top-5 right-5 2xl:top-[clamp(2rem,7vh,7rem)] 2xl:right-12 opacity-50" />
          <div className="relative z-10 flex w-full flex-col items-start gap-[clamp(0.75rem,3vh,3rem)] lg:flex-[11_1_0%]">
            <p className="font-mono text-sm tracking-[0.03em] text-muted sm:text-lg">
              Fullstack Developer
            </p>
            <h1 className="max-w-2xl font-mono font-medium leading-16 sm:leading-18 tracking-tight text-[clamp(1.5rem,9vw,3.5rem)]">
              I build
              <br />
              digital products
              <br />
              end to end<span className="text-primary">.</span>
            </h1>
            <p className="max-w-md font-sans text-md font-medium leading-10 tracking-wide text-muted md:text-lg">
              Crafting scalable web applications with clean code and thoughtful design.
            </p>
            <Button
              href="#projects"
              className="mt-3 inline-flex w-auto items-center gap-5 border border-transparent bg-foreground px-5 py-4 font-mono text-base text-background transition-colors hover:bg-muted-strong sm:gap-9 sm:px-7 sm:py-5 sm:text-lg"
            >
              View my work{' '}
              <MoveRight
                data-icon="move-right"
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Button>
            <div className="mt-5 2xl:mt-3">
              <p className="font-mono text-sm uppercase tracking-widest text-muted">
                Tech stack
              </p>
              <p className="mt-5 2xl:mt-3 max-w-2xl 2xl:max-w-xl font-mono font-medium text-sm md:text-md leading-11 tracking-wide text-muted">
                Next.js　/　TypeScript　/　React　/　Node.js　/　PostgreSQL Redis　/　Docker　/　AWS
              </p>
            </div>
          </div>
          <div className="relative w-full min-w-0 self-stretch lg:flex-[9_1_0%]">
            <CodeWindow
              lines={codeLines}
              className="relative w-full max-w-none 2xl:top-14 2xl:right-10 lg:max-w-150"
            />
            <div className="hidden 2xl:absolute bottom-0 -right-0 flex w-20 flex-col items-end gap-3 font-mono text-base text-muted/30 2xl:flex">
              <span className="whitespace-nowrap">SCROLL</span>
              <svg
                className="relative left-2 h-24 w-8 text-muted/30"
                viewBox="0 0 32 96"
                fill="none"
                aria-hidden="true"
              >
                <path d="M16 0V86M9 79L16 86L23 79" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </section>
      </Container>
      <FeaturedProjects />
      <LatestArticles />
    </main>
  );
}
