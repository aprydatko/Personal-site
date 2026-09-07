import { cn } from '@/app/lib/utils';
import { Clock3, Mail, MapPin, type LucideIcon } from 'lucide-react';

export type ContactDetail = {
  label: string;
  icon: LucideIcon;
};

const defaultContactDetails: ContactDetail[] = [
  { label: 'Sumy, Ukraine', icon: MapPin },
  { label: 'artyrpridatko@gmail.com', icon: Mail },
  { label: 'Available for new projects', icon: Clock3 },
];

type ContactDetailsProps = {
  items?: ContactDetail[];
  className?: string;
};

export const ContactDetails = ({
  items = defaultContactDetails,
  className,
}: ContactDetailsProps) => (
  <ul
    className={cn('flex flex-col gap-6 font-mono text-sm font-medium text-foreground', className)}
  >
    {items.map(({ label, icon: Icon }) => (
      <li key={label} className="flex items-center gap-4">
        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {label.includes('@') ? (
          <a className="break-all hover:text-primary" href={`mailto:${label}`}>
            {label}
          </a>
        ) : (
          label
        )}
      </li>
    ))}
  </ul>
);
