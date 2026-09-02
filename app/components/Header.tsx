'use client';

import { Container } from '@/app/components/Container';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  ['Blog', '#writing'],
  ['Projects', '#projects'],
  ['About', '#about'],
  ['Contact', 'mailto:hello@example.com'],
];

export const Header = () => {
  const pathname = usePathname();
  const activeLabel =
    pathname === '/' ? 'Projects' : links.find(([, href]) => href === pathname)?.[0];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-border-subtle">
      <Container className="flex h-24 md:h-44 items-center justify-between">
        <Link href="/" className="font-mono text-xl font-semibold tracking-tight text-foreground">
          <span className="mr-3">{'//'}</span>AP SITE
        </Link>
        <nav
          className="hidden items-center gap-18 font-mono text-sm text-muted md:flex"
          aria-label="Main navigation"
        >
          {links.map(([label, href]) => (
            <Link
              className={`relative py-9 text-base font-semibold transition-colors hover:text-foreground ${activeLabel === label ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-foreground' : ''}`}
              href={href}
              key={label}
              aria-current={activeLabel === label ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
          <span className="text-2xl font-semibold">•</span>
        </nav>
        <button
          type="button"
          className="text-foreground md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </Container>
      {menuOpen && (
        <nav
          className="border-t border-border-subtle bg-background px-6 py-6 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-9xl flex-col gap-6 font-mono text-base text-muted">
            {links.map(([label, href]) => (
              <Link
                href={href}
                key={label}
                onClick={() => setMenuOpen(false)}
                className={
                  activeLabel === label
                    ? 'text-foreground underline decoration-2 underline-offset-8'
                    : ''
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};
