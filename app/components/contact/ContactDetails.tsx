import { cn } from '@/app/lib/utils';
import { Clock3, Mail, MapPin, type LucideIcon } from 'lucide-react';

export type ContactDetail = {
  label: string;
  icon: LucideIcon;
};

const defaultContactDetails: ContactDetail[] = [
  { label: 'Sumy, Ukraine', icon: MapPin },
  { label: 'hello@ap-site.dev', icon: Mail },
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
    className={cn('flex flex-col gap-6 font-mono text-md font-semibold text-foreground', className)}
  >
    {items.map(({ label, icon: Icon }) => (
      <li key={label} className="flex items-center gap-7">
        <Icon className="size-5.5" aria-hidden="true" />
        {label}
      </li>
    ))}
  </ul>
);
