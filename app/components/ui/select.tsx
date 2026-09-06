'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/app/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = ({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn('inline-flex items-center gap-3 border-0 bg-transparent font-inherit text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus', className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild><ChevronDown className="size-4" aria-hidden="true" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);

export const SelectContent = ({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content className={cn('z-50 min-w-32 overflow-hidden rounded-md border border-border bg-background p-1 font-mono text-sm text-foreground shadow-lg', className)} {...props}>
      <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

export const SelectItem = ({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item className={cn('relative flex cursor-default select-none items-center rounded-sm py-2 pl-8 pr-3 outline-none focus:bg-surface hover:bg-surface', className)} {...props}>
    <span className="absolute left-2 flex size-4 items-center justify-center"><SelectPrimitive.ItemIndicator><Check className="size-3.5" aria-hidden="true" /></SelectPrimitive.ItemIndicator></span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);
