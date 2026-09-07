import { Search as SearchIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/app/lib/utils';
import { Input } from './input';

type SearchProps = ComponentProps<typeof Input>;

export const Search = ({ className, ...props }: SearchProps) => (
  <div className="relative">
    <Input
      type="search"
      className={cn(
        'h-12 min-w-0 w-full border-border bg-transparent pr-12 text-base focus-visible:outline-none',
        className,
      )}
      {...props}
    />
    <SearchIcon
      className="pointer-events-none absolute right-4 top-4 size-4 text-muted"
      aria-hidden="true"
    />
  </div>
);
