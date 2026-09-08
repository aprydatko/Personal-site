export type ContentType = 'blog' | 'projects';

export type BaseFrontmatter = {
  title: string;
  description: string;
  date: string;
  published?: boolean;
  featured?: boolean;
};

export type BlogPost = BaseFrontmatter & {
  slug: string;
  category: string;
  readingTime: string;
  heroCode?: string;
  heroCodeFileName?: string;
  headings: string[];
  html: string;
};

export type Project = BaseFrontmatter & {
  slug: string;
  category: string;
  label: string;
  tagline?: string;
  intro?: string;
  stack: string[];
  heroImage?: string;
  gallery: string[];
  role?: string;
  duration?: string;
  team?: string;
  client?: string;
  services?: string;
  features: string[];
  keyFeatures: string[];
  html: string;
};
