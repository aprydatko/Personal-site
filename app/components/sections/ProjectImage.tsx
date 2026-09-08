import { cn } from '@/app/lib/utils';
import type { ProjectPreview } from '@/app/content/site';
import Image from 'next/image';

type ProjectImageProps = {
  variant: ProjectPreview;
  alt: string;
  className?: string;
  sizes?: string;
};

const projectImageSources: Record<ProjectPreview, string> = {
  planora: '/sass-platform.png',
};

export const ProjectImage = ({
  variant,
  alt,
  className,
  sizes = '(min-width: 1536px) 331px, (min-width: 1280px) 21vw, (min-width: 1024px) 25vw, (min-width: 768px) 26vw, 82vw',
}: ProjectImageProps) => (
  <Image
    fill
    src={projectImageSources[variant]}
    alt={alt}
    sizes={sizes}
    className={cn('rounded-[5px] object-cover object-top', className)}
  />
);
