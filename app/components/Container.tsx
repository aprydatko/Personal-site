import { cn } from '@/app/lib/utils';
import type { HTMLAttributes } from 'react';

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'default' | 'wide' | 'full';
};

const sizes = {
  default: 'max-w-7xl',
  wide: 'max-w-9xl',
  full: 'max-w-none',
};

export const Container = ({ className, size = 'wide', ...props }: ContainerProps) => (
  <div className={cn('mx-auto w-full px-6 lg:px-12', sizes[size], className)} {...props} />
);
