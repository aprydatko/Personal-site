import { cn } from '@/app/lib/utils';
import type { CSSProperties, HTMLAttributes } from 'react';

type PatternProps = HTMLAttributes<HTMLDivElement> & {
  dotSize?: number;
  gap?: number;
  color?: string;
};

export const Pattern = ({
  className,
  dotSize = 1,
  gap = 30,
  color = 'var(--muted)',
  style,
  ...props
}: PatternProps) => (
  <div
    aria-hidden="true"
    className={cn('pointer-events-none absolute', className)}
    style={
      {
        backgroundImage: `radial-gradient(${color} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${gap}px ${gap}px`,
        ...style,
      } as CSSProperties
    }
    {...props}
  />
);
