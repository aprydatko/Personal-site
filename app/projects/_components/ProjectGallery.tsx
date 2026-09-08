'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type ProjectGalleryProps = {
  title: string;
  images: string[];
};

export const ProjectGallery = ({ title, images }: ProjectGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const previousIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) {
      previousIndexRef.current = null;
      return;
    }
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowRight')
        setActiveIndex((index) => (index === null ? 0 : (index + 1) % images.length));
      if (event.key === 'ArrowLeft')
        setActiveIndex((index) =>
          index === null ? 0 : (index - 1 + images.length) % images.length,
        );
    };
    window.addEventListener('keydown', onKeyDown);

    let context: { revert: () => void } | undefined;
    void import('gsap').then(({ gsap }) => {
      context = gsap.context(() => {
        const isOpening = previousIndexRef.current === null;
        if (isOpening) {
          gsap.fromTo(
            overlayRef.current,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.5, ease: 'power2.out' },
          );
        }
        gsap.fromTo(
          imageRef.current,
          isOpening
            ? { scale: 0.94, y: 14, autoAlpha: 0, filter: 'blur(8px)' }
            : { autoAlpha: 0.35, filter: 'blur(3px)' },
          {
            scale: 1,
            y: 0,
            autoAlpha: 1,
            filter: 'blur(0px)',
            duration: isOpening ? 0.7 : 0.35,
            delay: isOpening ? 0.04 : 0,
            ease: 'power3.out',
          },
        );
      });
    });
    previousIndexRef.current = activeIndex;

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
      context?.revert();
    };
  }, [activeIndex, images.length]);

  const galleryImages = images.length > 0 ? images : ['/sass-platform.png'];

  return (
    <>
      <div className="grid min-h-72 gap-4 sm:grid-cols-[1.55fr_.95fr]">
        <button
          type="button"
          aria-label={`Open ${title} image 1`}
          onClick={() => setActiveIndex(0)}
          className="group relative min-h-72 overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_10px_20px_rgb(0_0_0_/_8%)]"
        >
          <Image
            src={galleryImages[0]}
            alt={`${title} interface 1`}
            fill
            sizes="(min-width: 1024px) 54vw, 100vw"
            className="object-cover object-top transition duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
        </button>
        <div className="grid gap-4 sm:grid-rows-2">
          {galleryImages.slice(1, 3).map((src, index) => (
            <button
              type="button"
              aria-label={`Open ${title} image ${index + 2}`}
              onClick={() => setActiveIndex(index + 1)}
              className="group relative min-h-32 overflow-hidden rounded-lg border border-border-subtle bg-code-background shadow-[0_10px_20px_rgb(0_0_0_/_8%)]"
              key={src}
            >
              <Image
                src={src}
                alt={`${title} interface ${index + 2}`}
                fill
                sizes="(min-width: 1024px) 30vw, 100vw"
                className="object-cover object-top transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
            </button>
          ))}
        </div>
      </div>

      {activeIndex !== null ? (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm sm:p-10"
          onClick={() => setActiveIndex(null)}
        >
          <button
            type="button"
            aria-label="Close image viewer"
            onClick={() => setActiveIndex(null)}
            className="absolute right-5 top-5 z-10 rounded-full border border-white/20 bg-black/30 p-3 text-white transition hover:bg-white/15"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex((index) =>
                index === null ? 0 : (index - 1 + galleryImages.length) % galleryImages.length,
              );
            }}
            className="absolute left-5 top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 p-0 text-white transition hover:bg-white/15 sm:flex"
          >
            <ChevronLeft size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex((index) => (index === null ? 0 : (index + 1) % galleryImages.length));
            }}
            className="absolute right-5 top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 p-0 text-white transition hover:bg-white/15 sm:flex"
          >
            <ChevronRight size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <div
            ref={imageRef}
            className="relative h-[min(82vh,900px)] w-[min(92vw,1280px)] will-change-transform"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={galleryImages[activeIndex]}
              alt={`${title} enlarged interface ${activeIndex + 1}`}
              fill
              sizes="92vw"
              className="object-contain"
            />
          </div>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-xs text-white/65">
            {activeIndex + 1} / {galleryImages.length} · ESC to close
          </p>
        </div>
      ) : null}
    </>
  );
};
