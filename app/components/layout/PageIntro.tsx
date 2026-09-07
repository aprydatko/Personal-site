import { Pattern } from '@/app/components/sections/Pattern';
import type { ReactNode } from 'react';

type PageIntroProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
};

export const PageIntro = ({ eyebrow, title, description }: PageIntroProps) => (
  <>
    <Pattern
      className={`page-pattern ${eyebrow === 'PROJECTS' ? 'pattern-grid' : 'pattern-notes'} right-5 top-5 h-50 w-50 opacity-50 sm:h-50 md:w-100 2xl:right-0 2xl:top-[clamp(2rem,7vh,7rem)]`}
    />
    <section className="relative py-[clamp(2rem,9vh,8rem)] pb-[clamp(2.5rem,6vw,4rem)]">
      <p className="m-0 font-mono text-sm font-medium leading-tight tracking-widest text-primary">
        / {eyebrow}
      </p>
      <h1 className="page-title relative my-7 mb-5 max-w-4xl">{title}</h1>
      <p className="m-0 max-w-xl text-base leading-8 text-muted">{description}</p>
    </section>
  </>
);
