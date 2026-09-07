'use client';

import { ArrowUp } from 'lucide-react';

export const BackToTop = () => (
  <button
    type="button"
    className="flex size-11 items-center justify-center border border-border text-foreground transition-colors hover:bg-foreground hover:text-background sm:size-9 sm:border-0"
    aria-label="Back to top"
    onClick={() =>
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
    }
  >
    <ArrowUp size={22} strokeWidth={1.5} aria-hidden="true" />
  </button>
);
