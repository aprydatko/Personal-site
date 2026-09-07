import { Input as InputPrimitive } from '@base-ui/react/input';
import type { ComponentProps } from 'react';
import { cn } from '@/app/lib/utils';

export const Input = ({ className, type, ...props }: ComponentProps<'input'>) => (
  <InputPrimitive
    type={type}
    data-slot="input"
    className={cn(
      'w-full min-w-0 rounded-md border border-border bg-background px-4 py-3 font-sans text-base text-foreground outline-none placeholder:text-muted focus-visible:border-focus focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
);
