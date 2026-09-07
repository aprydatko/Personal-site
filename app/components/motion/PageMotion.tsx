'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export const PageMotion = ({ children }: { children: ReactNode }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    let media: ReturnType<(typeof import('gsap'))['gsap']['matchMedia']> | undefined;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);
        media = gsap.matchMedia();
        media.add(
          '(prefers-reduced-motion: no-preference)',
          () => {
            if (pathname !== '/') {
              const intro = root.querySelector('h1');
              if (intro)
                gsap.from(intro, {
                  y: 24,
                  opacity: 0,
                  duration: 0.7,
                  ease: 'power3.out',
                  clearProps: 'all',
                });
              root.querySelectorAll('main section, main article').forEach((section) => {
                if (section.parentElement?.closest('section, article')) return;
                gsap.from(section, {
                  y: 22,
                  duration: 0.7,
                  ease: 'power3.out',
                  clearProps: 'transform',
                  scrollTrigger: { trigger: section, start: 'top 92%', once: true },
                });
              });
            }
            if (progressRef.current)
              gsap.fromTo(
                progressRef.current,
                { scaleX: 0 },
                {
                  scaleX: 1,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: root,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 0.2,
                  },
                },
              );
          },
          root,
        );
      })
      .catch(() => {
        /* Content stays visible if motion cannot load. */
      });
    return () => {
      disposed = true;
      media?.revert();
    };
  }, [pathname]);
  return (
    <div ref={rootRef} className="flex flex-1 flex-col">
      <div
        ref={progressRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-50 h-0.5 w-full origin-left scale-x-0 bg-primary"
      />
      {children}
    </div>
  );
};
