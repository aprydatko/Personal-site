import { ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { Container } from './Container';

const footerLinks = [
  { label: 'GitHub', href: '#' },
  { label: 'LinkedIn', href: '#' },
  { label: 'X (Twitter)', href: '#' },
  { label: 'Email', href: 'mailto:hello@example.com' },
];

export const Footer = () => (
  <footer className="mt-auto border-t border-border-subtle" aria-label="Site footer">
    <Container className="grid gap-8 py-10 font-mono sm:py-12 lg:grid-cols-[auto_auto_1fr_auto] lg:items-center lg:gap-12 xl:gap-16">
      <Link
        href="/"
        className="w-fit text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-60"
      >
        <span className="mr-3">{'//'}</span>AP SITE
      </Link>

      <p className="text-xs leading-6 text-muted sm:text-sm">© 2026 All rights reserved.</p>

      <nav
        className="flex flex-wrap items-center gap-x-7 gap-y-4 text-sm font-medium text-foreground sm:gap-x-10 lg:justify-end xl:gap-x-14"
        aria-label="Social links"
      >
        {footerLinks.map(({ label, href }) => (
          <Link key={label} href={href} className="transition-opacity hover:opacity-55">
            {label}
          </Link>
        ))}
      </nav>

      <Link
        href="#top"
        className="flex size-11 items-center justify-center border border-border text-foreground transition-colors hover:bg-foreground hover:text-background lg:size-9 lg:border-0"
        aria-label="Back to top"
      >
        <ArrowUp size={22} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </Container>
  </footer>
);
