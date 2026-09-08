import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: 'default' | 'success' | 'error' | 'info';
};

const variants = {
  default: 'border-border bg-surface text-foreground',
  success: 'border-success/30 bg-success-surface text-success',
  error: 'border-danger/30 bg-danger-surface text-danger',
  info: 'border-info/30 bg-info-surface text-info',
};

export const Alert = ({ className, variant = 'default', children, ...props }: AlertProps) => (
  <div
    role="alert"
    className={cn('rounded-md border px-4 py-3 text-sm leading-6', variants[variant], className)}
    {...props}
  >
    {children}
  </div>
);
