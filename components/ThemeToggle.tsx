'use client';

import { useTheme } from 'next-themes';

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-full border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-raised"
    >
      {isDark ? '☼ Light' : '◐ Dark'}
    </button>
  );
};
