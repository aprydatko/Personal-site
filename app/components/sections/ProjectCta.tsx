import { Button } from '@/app/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const ProjectCta = () => (
  <aside className="mt-10 flex items-center justify-between gap-8 rounded-[0.7rem] bg-surface-raised/45 px-[clamp(1.5rem,3.5vw,3rem)] py-[clamp(1.25rem,3vw,1.75rem)] max-sm:flex-col max-sm:items-stretch max-sm:gap-5">
    <div>
      <h2 className="m-0 font-sans text-[clamp(1.15rem,2vw,1.45rem)] font-medium tracking-tighter">
        Have a project in mind?
      </h2>
      <p className="m-[0.65rem_0_0] font-mono text-[0.78rem] text-muted max-sm:text-[0.7rem]">
        Let’s build something great together.
      </p>
    </div>
    <Button
      href="/contact"
      className="inline-flex flex-none items-center justify-between gap-10 rounded-[0.45rem] px-8 py-5 text-[0.78rem] transition-transform  max-sm:w-full max-sm:px-5 max-sm:py-4"
    >
      Start a project
      <ArrowRight data-icon="inline-end" className="size-5" aria-hidden="true" />
    </Button>
  </aside>
);
