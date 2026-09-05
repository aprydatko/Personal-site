export type NavigationItem = {
  label: string;
  href: string | null;
};

export type FooterLink = NavigationItem;

export type ProjectPreview = 'planora' | 'nexora' | 'velox';

export type Project = {
  kind: string;
  name: string;
  description: string;
  stack: string;
  preview: ProjectPreview;
};

export type Article = {
  publishedAt: `${number}-${number}-${number}`;
  displayDate: string;
  title: string;
  description: string;
  readingTime: string;
};

export const navigationItems: NavigationItem[] = [
  { label: 'Blog', href: '#articles' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const footerLinks: FooterLink[] = [
  { label: 'GitHub', href: null },
  { label: 'LinkedIn', href: null },
  { label: 'X (Twitter)', href: null },
  { label: 'Email', href: null },
];

export const projects: Project[] = [
  {
    kind: 'SaaS Platform',
    name: 'Planora',
    description: 'Project management platform for distributed teams.',
    stack: 'Next.js, TypeScript, Tailwind, PostgreSQL',
    preview: 'planora',
  },
  {
    kind: 'Web Application',
    name: 'Nexora',
    description: 'AI-powered analytics platform for business intelligence.',
    stack: 'Next.js, TypeScript, PostgreSQL, Redis',
    preview: 'nexora',
  },
  {
    kind: 'E-commerce',
    name: 'Velox Store',
    description: 'Modern e-commerce built for speed and conversion.',
    stack: 'Next.js, Stripe, Tailwind, PostgreSQL',
    preview: 'velox',
  },
];

export const articles: Article[] = [
  {
    publishedAt: '2024-05-12',
    displayDate: 'May 12, 2024',
    title: 'How I structure Fullstack projects in 2024',
    description:
      'My approach to scalable project architecture with Next.js, Node.js and PostgreSQL.',
    readingTime: '5 min read',
  },
  {
    publishedAt: '2024-04-28',
    displayDate: 'Apr 28, 2024',
    title: '10 practices for writing better TypeScript',
    description: 'Simple rules that make your code safer, cleaner and easier to maintain.',
    readingTime: '6 min read',
  },
  {
    publishedAt: '2024-04-10',
    displayDate: 'Apr 10, 2024',
    title: 'Optimizing Next.js applications',
    description: 'Performance tips that actually make a difference.',
    readingTime: '4 min read',
  },
];
