import { Pattern } from '@/app/components/sections/Pattern';
import type { ReactNode } from 'react';

type PageIntroProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
};

export const PageIntro = ({ eyebrow, title, description }: PageIntroProps) => (
  <>
    <Pattern className="right-5 top-5 h-50 w-50 opacity-50 sm:h-50 md:w-100 2xl:right-0 2xl:top-[clamp(2rem,7vh,7rem)]" />
    <section className="relative py-[clamp(2rem,9vh,8rem)] pb-[clamp(2.5rem,6vw,4rem)]">
      <p className="m-0 font-mono text-sm font-semibold leading-tight tracking-normal">
        / {eyebrow}
      </p>
      <h1 className="relative my-7 mb-5 max-w-3xl font-mono text-[clamp(1.5rem,9vw,3.5rem)] font-semibold leading-tight tracking-tight">
        {title}
      </h1>
      <p className="m-0 max-w-xl font-mono text-[clamp(0.85rem,1.6vw,1rem)] font-medium leading-7 tracking-tight text-muted">
        {description}
      </p>
    </section>
  </>
);
