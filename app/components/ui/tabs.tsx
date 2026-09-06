'use client';

import { cn } from '@/app/lib/utils';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn('inline-flex items-stretch', className)} {...props} />
);

export const TabsTrigger = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      'relative flex-none border-0 bg-transparent pt-0 pb-8 font-mono text-sm font-medium text-muted outline-none transition-colors after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus data-[state=active]:text-foreground data-[state=active]:after:opacity-100',
      className
    )}
    {...props}
  />
);
