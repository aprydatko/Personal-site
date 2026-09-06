'use client';

import { Container } from '@/app/components/Container';
import { navigationItems } from '@/app/content/site';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type KeyboardEvent, useRef, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !menuOpen) return;

    event.preventDefault();
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <header className="border-b border-border-subtle" onKeyDown={handleKeyDown}>
      <Container className="flex h-24 md:h-30 items-center justify-between">
        <Link href="/" className="font-mono text-xl font-semibold tracking-tight text-foreground">
          <span className="mr-3 ">{'//'}</span>AP SITE
        </Link>
        <nav
          className="hidden items-center gap-6 font-mono text-sm text-muted md:flex lg:gap-10 xl:gap-16"
          aria-label="Main navigation"
        >
          {navigationItems.map(({ label, href }) =>
            href ? (
              <Link
                className={`relative py-9 font-semibold transition-colors tracking-normal hover:text-foreground xl:text-base after:absolute after:bottom-3 after:left-0 after:h-0.75 after:w-full after:bg-foreground after:transition-opacity ${pathname === href ? 'text-foreground after:opacity-100' : 'after:opacity-0'}`}
                href={href}
                key={label}
                aria-current={pathname === href ? 'page' : undefined}
              >
                {label}
              </Link>
            ) : (
              <span
                key={label}
                className="cursor-not-allowed py-9 font-semibold opacity-60 xl:text-base"
                aria-disabled="true"
                title="Coming soon"
              >
                {label}
              </span>
            )
          )}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            className="flex size-10 items-center justify-center text-foreground"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </Container>
      {menuOpen && (
        <nav
          id="mobile-navigation"
          className="border-t border-border-subtle bg-background px-6 py-6 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-6 font-mono text-base text-muted">
            {navigationItems.map(({ label, href }) =>
              href ? (
                <Link
                  href={href}
                  key={label}
                  onClick={() => setMenuOpen(false)}
                  className={`border-l-2 pl-3 transition-colors hover:text-foreground ${pathname === href ? 'border-foreground text-foreground' : 'border-transparent'}`}
                  aria-current={pathname === href ? 'page' : undefined}
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={label}
                  className="cursor-not-allowed opacity-60"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
