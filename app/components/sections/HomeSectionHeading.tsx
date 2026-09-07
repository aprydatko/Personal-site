import { cn } from '@/app/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

type Props = {
  number: string;
  title: string;
  actionLabel: string;
  href: string;
  className?: string;
};
export const HomeSectionHeading = ({ number, title, actionLabel, href, className }: Props) => (
  <div className={cn('flex flex-wrap items-center justify-between gap-5', className)}>
    <div className="flex items-center gap-4">
      <span className="font-mono text-xs text-primary">{number} /</span>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
    </div>
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-3 text-sm font-medium hover:text-primary"
    >
      {actionLabel}
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </Link>
  </div>
);
