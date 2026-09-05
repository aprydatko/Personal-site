import { MoveRight } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type NotFoundCardProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
};

export const NotFoundCard = ({ href, icon: Icon, label, description }: NotFoundCardProps) => (
  <Link
    href={href}
    className="group flex min-h-52 flex-col border border-border-subtle bg-background p-5 transition-[background-color,border-color,transform] duration-200 hover:-translate-y-1 hover:border-muted hover:bg-surface-raised focus-visible:-translate-y-1 sm:min-h-56 sm:p-6"
  >
    <Icon className="size-6 stroke-[1.25] text-foreground" aria-hidden="true" />
    <span className="mt-7 font-mono text-sm font-medium text-foreground sm:mt-8">{label}</span>
    <span className="mt-3 max-w-[15rem] font-mono text-xs leading-6 text-muted">{description}</span>
    <MoveRight
      className="mt-auto size-5 stroke-[1.25] text-foreground transition-transform duration-200 group-hover:translate-x-1"
      aria-hidden="true"
    />
  </Link>
);
