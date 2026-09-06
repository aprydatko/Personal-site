'use client';

import { cn } from '@/app/lib/utils';
import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react';

type InteractivePatternProps = ComponentPropsWithoutRef<'svg'>;

const columns = 18;
const rows = 11;
const dots = Array.from({ length: columns * rows }, (_, index) => ({
  x: 12 + (index % columns) * (276 / (columns - 1)),
  y: 12 + Math.floor(index / columns) * (176 / (rows - 1)),
  phase: index * 0.73,
}));

type DotState = { x: number; y: number; scale: number; opacity: number };

export const InteractivePattern = ({ className, ...props }: InteractivePatternProps) => {
  const patternRef = useRef<SVGSVGElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const statesRef = useRef<DotState[]>(dots.map(() => ({ x: 0, y: 0, scale: 1, opacity: 0.72 })));

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let running = false;

    const animate = (time: number) => {
      const svg = patternRef.current;
      if (!svg) return;

      const bounds = svg.getBoundingClientRect();
      let hasEnergy = false;

      dots.forEach((dot, index) => {
        const state = statesRef.current[index];
        const pointX = bounds.left + (dot.x / 300) * bounds.width;
        const pointY = bounds.top + (dot.y / 200) * bounds.height;
        const distanceX = pointer ? pointX - pointer.x : 0;
        const distanceY = pointer ? pointY - pointer.y : 0;
        const distance = Math.hypot(distanceX, distanceY);
        const strength = pointer ? Math.max(0, 1 - distance / 155) : 0;
        const angle = Math.atan2(distanceY, distanceX);
        const ripple = Math.sin(time * 0.006 + dot.phase) * strength * 3;
        const targetX = strength ? Math.cos(angle) * strength * 16 + Math.cos(angle + Math.PI / 2) * ripple : 0;
        const targetY = strength ? Math.sin(angle) * strength * 16 + Math.sin(angle + Math.PI / 2) * ripple : 0;
        const targetScale = 1 + strength * 1.15;
        const targetOpacity = 0.5 + strength * 0.5;

        state.x += (targetX - state.x) * 0.14;
        state.y += (targetY - state.y) * 0.14;
        state.scale += (targetScale - state.scale) * 0.14;
        state.opacity += (targetOpacity - state.opacity) * 0.14;

        const node = dotRefs.current[index];
        if (node) {
          node.setAttribute('transform', `translate(${state.x} ${state.y})`);
          node.setAttribute('r', String(0.9 * state.scale));
          node.setAttribute('opacity', String(state.opacity));
        }

        hasEnergy ||= Math.abs(state.x) > 0.05 || Math.abs(state.y) > 0.05 || Math.abs(state.scale - 1) > 0.01;
      });

      if (pointer || hasEnergy) frame = window.requestAnimationFrame(animate);
      else running = false;
    };

    const startAnimation = () => {
      if (running) return;
      running = true;
      frame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = patternRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const isNearPattern = event.clientX >= bounds.left - 120 && event.clientX <= bounds.right + 120 && event.clientY >= bounds.top - 120 && event.clientY <= bounds.bottom + 120;
      pointer = isNearPattern ? { x: event.clientX, y: event.clientY } : null;
      startAnimation();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg
      ref={patternRef}
      aria-hidden="true"
      viewBox="0 0 300 200"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute overflow-visible text-muted', className)}
      {...props}
    >
      {dots.map((dot, index) => (
        <circle
          ref={(node) => { dotRefs.current[index] = node; }}
          cx={dot.x}
          cy={dot.y}
          fill="currentColor"
          key={index}
          opacity="0.72"
          r="0.9"
        />
      ))}
    </svg>
  );
};
