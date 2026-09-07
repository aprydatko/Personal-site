import { cn } from '@/app/lib/utils';
import type { HTMLAttributes } from 'react';

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'default' | 'wide' | 'full';
};

const sizes = {
  default: 'max-w-7xl',
  wide: 'max-w-[1280px]',
  full: 'max-w-none',
};

export const Container = ({ className, size = 'wide', ...props }: ContainerProps) => (
  <div className={cn('mx-auto w-full px-5 sm:px-8 lg:px-12', sizes[size], className)} {...props} />
);
