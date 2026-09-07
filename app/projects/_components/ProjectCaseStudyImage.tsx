import Image from 'next/image';

type ProjectCaseStudyImageProps = {
  alt: string;
  src: string;
  eager?: boolean;
};

export const ProjectCaseStudyImage = ({ alt, src, eager = false }: ProjectCaseStudyImageProps) => (
  <div className="relative h-full w-full overflow-hidden">
    <Image
      src={src}
      alt={`${alt} interface`}
      fill
      loading={eager ? 'eager' : 'lazy'}
      sizes="(min-width: 1024px) 54vw, 100vw"
      className="object-cover object-top"
    />
  </div>
);
