import { Container } from '@/app/components/layout/Container';
import { Button } from '@/app/components/ui/button';
import { CodeWindow } from '@/app/components/content/CodeWindow';
import { HomeMotion } from '@/app/components/motion/HomeMotion';
import { MoveRight } from 'lucide-react';
import { FeaturedProjects } from './components/sections/FeaturedProjects';
import { LatestArticles } from './components/sections/LatestArticles';
import { InteractivePattern } from './components/motion/InteractivePattern';

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
      <HomeMotion>
        <Container className="relative">
          <section id="hero" data-home-hero className="home-hero">
            <div className="relative z-10 min-w-0">
              <p
                data-home-reveal
                className="mb-7 font-mono text-xs uppercase tracking-wider text-primary"
              >
                Arthur Prydatko / Fullstack Developer
              </p>
              <h1 data-home-reveal className="display-title">
                I build digital
                <br className="hidden xl:block" /> products end to end
                <span className="text-primary">.</span>
              </h1>
              <p
                data-home-reveal
                className="mt-7 max-w-md text-base leading-8 text-muted sm:text-lg"
              >
                Crafting scalable web applications with clean code and thoughtful design.
              </p>
              <div data-home-reveal className="mt-8 flex flex-wrap items-center gap-6">
                <Button href="#projects">
                  View my work <MoveRight className="size-5" aria-hidden="true" />
                </Button>
                <a
                  href="/contact"
                  className="text-sm font-medium underline decoration-border underline-offset-8 hover:text-primary"
                >
                  Let’s talk
                </a>
              </div>
              <div data-home-reveal className="mt-10 max-w-lg border-t border-border-subtle pt-5">
                <p className="font-mono text-xs leading-7 text-muted">
                  Next.js / TypeScript / React / Node.js
                  <br />
                  PostgreSQL / Redis / Docker / AWS
                </p>
              </div>
            </div>
            <div className="relative min-w-0 py-6 lg:py-12">
              <InteractivePattern
                data-home-pattern
                className="-top-5 right-0 h-full w-full text-primary opacity-35"
              />
              <div data-home-code-window className="relative">
                <CodeWindow
                  lines={codeLines}
                  language="tsx"
                  fileName="portfolio.tsx"
                  className="w-full"
                />
              </div>
              <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
                <span>Thoughtful interfaces. Solid foundations.</span>
                <span className="size-2 bg-primary" />
              </div>
            </div>
          </section>
        </Container>
        <FeaturedProjects />
        <LatestArticles />
      </HomeMotion>
    </main>
  );
}
