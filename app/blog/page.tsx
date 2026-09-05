import { Container } from '@/app/components/Container';
import { BlogIndex } from '@/app/components/blog/BlogIndex';

export default function BlogPage() {
  return <main id="main-content" tabIndex={-1}><Container><section className="relative py-14 sm:py-20"><div aria-hidden="true" className="pointer-events-none absolute right-0 top-8 hidden size-64 bg-[radial-gradient(circle,color-mix(in_srgb,var(--muted)_28%,transparent)_1px,transparent_1.2px)] [background-size:16px_16px] opacity-55 [mask-image:radial-gradient(ellipse,black,transparent_68%)] lg:block" /><p className="font-mono text-xs font-semibold text-muted">/ BLOG</p><h1 className="relative mt-7 max-w-3xl font-mono text-[clamp(2.2rem,4.4vw,3.5rem)] font-medium leading-[1.18] tracking-tight">Thoughts on code,<br />product and everything<br />in between<span className="text-primary">.</span></h1><p className="mt-6 max-w-xl text-sm leading-7 text-muted sm:text-base">Articles, tutorials and notes about fullstack development, architecture, performance and building better products.</p></section><BlogIndex /></Container></main>;
}
