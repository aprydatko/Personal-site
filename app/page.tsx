import { Container } from '@/app/components/Container';
import { Button } from '@/app/components/ui/button';
import { CodeWindow } from '@/components/CodeWindow';
import { ArrowDown, MoveRight } from 'lucide-react';
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
    <main>
      <Container className="relative flex flex-col items-start gap-8 2xl:gap-16 overflow-hidden py-10 sm:py-20 lg:flex-row">
        <div className="relative z-10 w-full lg:flex-[11_1_0%]">
          <p className="font-mono text-lg tracking-[0.03em] text-muted">Fullstack Developer</p>
          <h1 className="mt-8 max-w-2xl font-mono text-4xl font-medium leading-16 sm:leading-21 tracking-tight sm:text-6xl">
            I build
            <br />
            digital products
            <br />
            end to end<span className="text-primary">.</span>
          </h1>
          <p className="mt-5 max-w-md font-mono text-lg leading-10 text-muted tracking-wide">
            Crafting scalable web applications with clean code and thoughtful design.
          </p>
          <Button
            href="#projects"
            className="w-full sm:w-auto mt-12 inline-flex items-center gap-9 bg-foreground px-7 py-5 font-mono text-lg text-background"
          >
            View my work{' '}
            <MoveRight
              data-icon="move-right"
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Button>
          <div className="mt-16">
            <p className="font-mono text-sm uppercase tracking-widest text-muted">Tech stack</p>
            <p className="mt-3 max-w-3xl 2xl:max-w-xl font-mono text-md leading-11 tracking-wide text-muted">
              Next.js　/　TypeScript　/　React　/　Node.js　/　PostgreSQL Redis　/　Docker　/　AWS
            </p>
          </div>
        </div>
        <div className="relative w-full min-w-0 self-stretch lg:flex-[9_1_0%]">
          <Pattern className="right-0 -top-14 -z-0 h-72 w-125 opacity-50" />
          <CodeWindow
            lines={codeLines}
            className="relative w-full max-w-none 2xl:top-5 2xl:right-27 lg:max-w-150"
          />
          <div className="hidden 2xl:absolute -bottom-16 -right-2 flex-col items-center gap-3 font-mono text-base text-muted 2xl:flex">
            <span>SCROLL</span>
            <span className="relative h-24 w-8">
              <span className="absolute left-1/2 top-3 h-20 w-px -translate-x-1/2 bg-muted/60" />
              <ArrowDown
                strokeWidth={1.25}
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </Container>
    </main>
  );
}
