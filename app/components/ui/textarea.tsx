import type { ComponentProps } from 'react';
import { cn } from '@/app/lib/utils';

export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    data-slot="textarea"
    className={cn(
      'field-sizing-content min-h-32 w-full resize-y rounded-md border border-border bg-background px-4 py-3 font-sans text-base text-foreground outline-none placeholder:text-muted focus-visible:border-focus disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
);
