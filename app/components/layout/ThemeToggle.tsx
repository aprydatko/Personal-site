'use client';

import { Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const toggleClassName =
  'flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-foreground text-lg transition-colors hover:bg-surface-raised';
const subscribe = () => () => undefined;

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    return (
      <button type="button" className={toggleClassName} aria-label="Toggle color theme" disabled>
        <Moon size={18} className="opacity-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className={toggleClassName}
    >
      <span
        className={`size-2 rounded-full  border-primary transition-colors opacity-60 ${
          isDark ? 'bg-primary' : 'bg-foreground'
        }`}
        aria-hidden="true"
      />
    </button>
  );
};
