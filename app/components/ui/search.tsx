import { Search as SearchIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from './button';
import { Input } from './input';

type SearchProps = ComponentProps<typeof Input>;

export const Search = ({ className, ...props }: SearchProps) => (
  <div className="flex items-center gap-2">
    <Input
      type="search"
      className={cn(
        'h-10 min-w-0 flex-1 border-border bg-transparent text-xs focus-visible:outline-none',
        className,
      )}
      {...props}
    />
    <Button type="button" variant="ghost" className="size-10 shrink-0 p-0" aria-label="Search">
      <SearchIcon className="size-4" aria-hidden="true" />
    </Button>
  </div>
);
