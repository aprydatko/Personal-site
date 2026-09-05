export const blogCategories = ['All', 'Architecture', 'Frontend', 'Backend', 'DevOps', 'Tools'] as const;

export type BlogCategory = (typeof blogCategories)[number];

export type BlogArticle = {
  category: Exclude<BlogCategory, 'All'>;
  date: string;
  description: string;
  preview: 'tree' | 'chart' | 'code' | 'architecture' | 'terminal';
  readingTime: string;
  title: string;
};

export const blogArticles: BlogArticle[] = [
  { category: 'Architecture', date: 'May 12, 2024', title: 'How I structure Fullstack projects in 2024', description: 'A practical approach to scalable fullstack applications with Next.js, Node.js and PostgreSQL.', readingTime: '8 min read', preview: 'tree' },
  { category: 'Backend', date: 'Apr 28, 2024', title: '10 practices for writing better TypeScript', description: 'Simple rules that make your code safer, cleaner and easier to maintain.', readingTime: '6 min read', preview: 'chart' },
  { category: 'Frontend', date: 'Apr 10, 2024', title: 'Optimizing Next.js applications', description: 'Performance tips that actually make a difference.', readingTime: '4 min read', preview: 'code' },
  { category: 'Architecture', date: 'Mar 22, 2024', title: 'Designing scalable API architecture', description: 'Building API systems that scale with your product and your team.', readingTime: '7 min read', preview: 'architecture' },
  { category: 'DevOps', date: 'Mar 5, 2024', title: 'Docker setup for local development', description: 'A fast and reliable Docker setup for fullstack projects.', readingTime: '5 min read', preview: 'terminal' },
];
