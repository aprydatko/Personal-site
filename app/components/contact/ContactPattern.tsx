import { cn } from '@/app/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

type ContactPatternProps = ComponentPropsWithoutRef<'svg'>;

export const ContactPattern = ({ className, ...props }: ContactPatternProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 720 120"
    fill="none"
    className={cn('pointer-events-none absolute text-border', className)}
    {...props}
  >
    <path d="M10 16H320V60H710" stroke="currentColor" strokeWidth="2" />
    <rect x="5" y="11" width="10" height="10" fill="var(--foreground)" />
    <rect x="705" y="55" width="10" height="10" fill="var(--primary)" />
  </svg>
);
