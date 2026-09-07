import { cn } from '@/app/lib/utils';
import { ArrowRight } from 'lucide-react';

type HomeSectionHeadingProps = {
  number: string;
  title: string;
  actionLabel: string;
  actionTitle: string;
  className?: string;
};

export const HomeSectionHeading = ({
  number,
  title,
  actionLabel,
  actionTitle,
  className,
}: HomeSectionHeadingProps) => (
  <div className={cn('flex items-center justify-between gap-6', className)}>
    <div className="flex min-w-0 items-center gap-5 sm:gap-24">
      <span className="shrink-0 font-mono text-sm text-dark-accent sm:text-lg">{number}</span>
      <h2 className="whitespace-nowrap font-mono text-2xl font-medium tracking-tight sm:text-3xl">
        {title}
      </h2>
    </div>
    <span
      className="hidden shrink-0 cursor-not-allowed items-center gap-4 font-mono text-md font-medium opacity-60 sm:flex"
      aria-disabled="true"
      title={actionTitle}
    >
      {actionLabel}
      <ArrowRight className="text-dark-accent" strokeWidth={1.5} aria-hidden="true" />
    </span>
  </div>
);
