import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/app/lib/utils';

type ButtonProps = (
  ButtonHTMLAttributes<HTMLButtonElement> | AnchorHTMLAttributes<HTMLAnchorElement>
) & { children: ReactNode; href?: string; variant?: 'default' | 'outline' | 'ghost' };
const variants = {
  default: 'bg-primary text-white hover:brightness-110 dark:text-background',
  outline: 'border border-border text-foreground hover:bg-surface',
  ghost: 'text-foreground hover:bg-surface',
};
export const Button = ({
  className,
  variant = 'default',
  children,
  href,
  ...props
}: ButtonProps) => {
  const classes = cn(
    'group min-h-12 disabled:pointer-events-none disabled:opacity-50 inline-flex items-center justify-center gap-4 rounded-md px-7 py-4 font-sans text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-focus',
    variants[variant],
    className,
  );
  if (href)
    return (
      <Link className={classes} href={href} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
};
