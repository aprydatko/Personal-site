import { Header } from '@/app/components/layout/Header';
import { ThemeProvider } from '@/app/components/layout/ThemeProvider';
import type { Metadata } from 'next';
import { JetBrains_Mono, Manrope } from 'next/font/google';
import { Footer } from './components/layout/Footer';
import './globals.css';
import { PageMotion } from './components/motion/PageMotion';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Arthur Prydatko',
  description:
    'Fullstack developer building scalable web applications with clean code and thoughtful design.',
  applicationName: 'Arthur Prydatko Portfolio',
  authors: [{ name: 'Arthur Prydatko' }],
  creator: 'Arthur Prydatko',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    title: 'Arthur Prydatko — Fullstack Developer',
    description:
      'Fullstack developer building scalable web applications with clean code and thoughtful design.',
    siteName: 'Arthur Prydatko Portfolio',
  },
  twitter: {
    card: 'summary',
    title: 'Arthur Prydatko — Fullstack Developer',
    description:
      'Fullstack developer building scalable web applications with clean code and thoughtful design.',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
          <a
            href="#main-content"
            className="fixed left-4 top-4 z-50 -translate-y-24 bg-foreground px-5 py-3 font-mono text-sm text-background transition-transform focus:translate-y-0"
          >
            Skip to main content
          </a>
          <Header />
          <PageMotion>{children}</PageMotion>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
