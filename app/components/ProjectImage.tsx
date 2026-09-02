import { cn } from '@/app/lib/utils';
import Image from 'next/image';

export type ProjectImageVariant = 'planora' | 'nexora' | 'velox';

type ProjectImageProps = {
  variant: ProjectImageVariant;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

const projectImageSources: Record<ProjectImageVariant, string> = {
  planora: '/sass-platform.png',
  nexora: '/web-site.png',
  velox: '/e-commerse.png',
};

export const ProjectImage = ({
  variant,
  alt = '',
  className,
  sizes = '(min-width: 768px) 33vw, 100vw',
  priority = false,
}: ProjectImageProps) => (
  <Image
    fill
    src={projectImageSources[variant]}
    alt={alt}
    sizes={sizes}
    priority={priority}
    className={cn('rounded-[5px] object-cover object-top', className)}
  />
);
