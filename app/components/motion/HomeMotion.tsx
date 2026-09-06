'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';

type HomeMotionProps = { children: ReactNode };

export const HomeMotion = ({ children }: HomeMotionProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let context: { revert: () => void } | undefined;

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, triggerModule]) => {
      if (cancelled) return;

      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      context = gsap.context(() => {
        const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        heroTimeline
          .from('[data-home-reveal]', { autoAlpha: 0, y: 22, duration: 0.72, stagger: 0.1 })
          .from('[data-home-code-window]', { autoAlpha: 0, x: 32, scale: 0.97, duration: 0.9 }, 0.18)
          .to('[data-home-scroll-cue]', { y: 7, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 0.9);

        gsap.to('[data-home-pattern]', {
          y: -38,
          ease: 'none',
          scrollTrigger: { trigger: '[data-home-hero]', start: 'top top', end: 'bottom top', scrub: 0.6 },
        });

        gsap.utils.toArray<HTMLElement>('[data-home-section]').forEach((section) => {
          gsap.from(section, {
            autoAlpha: 0,
            y: 40,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: section, start: 'top 82%', once: true },
          });
        });

      }, root);
    });

    return () => {
      cancelled = true;
      context?.revert();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
};
