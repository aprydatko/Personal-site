import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/app/lib/utils';

export const Accordion = ({ className, ...props }: AccordionPrimitive.Root.Props) => (
  <AccordionPrimitive.Root data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props} />
);

export const AccordionItem = ({ className, ...props }: AccordionPrimitive.Item.Props) => (
  <AccordionPrimitive.Item data-slot="accordion-item" className={cn('border-b border-border-subtle', className)} {...props} />
);

export const AccordionTrigger = ({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      className={cn(
        'group/accordion-trigger flex flex-1 items-center justify-between gap-6 py-6 text-left font-mono text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:text-primary disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <Plus data-slot="accordion-trigger-icon" className="size-4 shrink-0 group-aria-expanded/accordion-trigger:hidden" aria-hidden="true" />
      <Minus data-slot="accordion-trigger-icon" className="hidden size-4 shrink-0 group-aria-expanded/accordion-trigger:block" aria-hidden="true" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);

export const AccordionContent = ({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) => (
  <AccordionPrimitive.Panel data-slot="accordion-content" className="overflow-hidden" {...props}>
    <div
      className={cn(
        'h-(--accordion-panel-height) pb-6 font-sans text-sm leading-6 text-muted data-ending-style:h-0 data-starting-style:h-0',
        className,
      )}
    >
      {children}
    </div>
  </AccordionPrimitive.Panel>
);
