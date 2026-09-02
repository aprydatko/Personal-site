import { Footer } from '@/app/components/Footer';
import { Header } from '@/app/components/Header';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import type { Metadata } from 'next';
import { JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';

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
      suppressHydrationWarning
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <a
            href="#main-content"
            className="fixed left-4 top-4 z-50 -translate-y-24 bg-foreground px-5 py-3 font-mono text-sm text-background transition-transform focus:translate-y-0"
          >
            Skip to main content
          </a>
          <Header />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
