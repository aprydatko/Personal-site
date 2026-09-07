import { footerLinks } from '@/app/content/site';
import Link from 'next/link';
import { BackToTop } from './BackToTop';
import { Container } from './Container';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border-subtle" aria-label="Site footer">
      <Container className="grid gap-8 py-10 font-sans sm:py-12 lg:grid-cols-[auto_auto_1fr_auto] lg:items-center lg:gap-8">
        <Link
          href="/"
          className="w-fit text-lg font-bold tracking-tight text-foreground transition-opacity hover:opacity-60"
        >
          <span className="text-primary">AP</span> SITE
        </Link>

        <p className="text-xs leading-6 text-muted sm:text-sm">
          © {currentYear} All rights reserved.
        </p>

        <nav
          className="flex flex-wrap items-center gap-x-7 gap-y-4 text-sm font-medium text-foreground sm:gap-x-10 lg:justify-end xl:gap-x-14"
          aria-label="Footer navigation"
        >
          {footerLinks.map(({ label, href }) =>
            href ? (
              <Link key={label} href={href} className="transition-opacity hover:opacity-55">
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
            ),
          )}
        </nav>

        <BackToTop />
      </Container>
    </footer>
  );
};
