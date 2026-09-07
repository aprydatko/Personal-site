import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

type ButtonProps = (
  ButtonHTMLAttributes<HTMLButtonElement> | AnchorHTMLAttributes<HTMLAnchorElement>
) & { children: ReactNode; href?: string; variant?: 'default' | 'outline' | 'ghost' };
const variants = {
  default: 'bg-foreground text-background hover:bg-muted-strong',
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
    'group inline-flex items-center justify-center gap-4 rounded-md px-7 py-4 font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus',
    variants[variant],
    className,
  );
  if (href)
    return (
      <a className={classes} href={href} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
};
