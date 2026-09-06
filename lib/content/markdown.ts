import 'server-only';

import matter from 'gray-matter';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import html from 'remark-html';
import rehypeHighlight from 'rehype-highlight';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';

const contentRoot = path.join(process.cwd(), 'content');

type ContentType = 'blog' | 'projects';

type BaseFrontmatter = {
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
  headings: string[];
  html: string;
};

export type Project = BaseFrontmatter & {
  slug: string;
  category: string;
  label: string;
  stack: string[];
  heroImage?: string;
  role?: string;
  duration?: string;
  team?: string;
  client?: string;
  services?: string;
  features: string[];
  html: string;
};

const assertString = (value: unknown, field: string, filePath: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required frontmatter field "${field}" in ${filePath}`);
  }

  return value;
};

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const stringList = (value: unknown, field: string, filePath: string) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Frontmatter field "${field}" must be a list of strings in ${filePath}`);
  }
  return value;
};

const headingId = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const readMarkdownFiles = async (type: ContentType) => {
  const directory = path.join(contentRoot, type);
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);
};

const parseMarkdown = async (type: ContentType, filename: string) => {
  const filePath = path.join(contentRoot, type, filename);
  const source = await readFile(filePath, 'utf8');
  const { data, content } = matter(source);
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  let headingIndex = 0;
  const markdownHtml = String(await remark().use(html).process(content));
  const highlightedHtml = String(
    await unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeHighlight, { detect: true })
      .use(rehypeStringify)
      .process(markdownHtml)
  );
  const htmlContent = highlightedHtml.replace(/<h2>/g, () => {
    const heading = headings[headingIndex++] ?? 'section';
    return `<h2 id="${headingId(heading)}">`;
  });

  return {
    frontmatter: data as BaseFrontmatter & Record<string, unknown>,
    html: htmlContent,
    headings,
    slug: filename.replace(/\.md$/, ''),
    filePath,
  };
};

const sortByNewest = <T extends { date: string }>(items: T[]) =>
  items.toSorted((first, second) => Date.parse(second.date) - Date.parse(first.date));

export const getBlogPosts = async (): Promise<BlogPost[]> => {
  const files = await readMarkdownFiles('blog');
  const posts = await Promise.all(
    files.map(async (filename) => {
      const { frontmatter, html: htmlContent, headings, slug, filePath } = await parseMarkdown('blog', filename);

      return {
        title: assertString(frontmatter.title, 'title', filePath),
        description: assertString(frontmatter.description, 'description', filePath),
        date: assertString(frontmatter.date, 'date', filePath),
        category: assertString(frontmatter.category, 'category', filePath),
        readingTime: assertString(frontmatter.readingTime, 'readingTime', filePath),
        published: frontmatter.published !== false,
        featured: frontmatter.featured === true,
        slug,
        headings,
        html: htmlContent,
      };
    })
  );

  return sortByNewest(posts.filter((post) => post.published));
};

export const getBlogPost = async (slug: string) => {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug);
};

export const getProjects = async (): Promise<Project[]> => {
  const files = await readMarkdownFiles('projects');
  const projects = await Promise.all(
    files.map(async (filename) => {
      const { frontmatter, html: htmlContent, slug, filePath } = await parseMarkdown(
        'projects',
        filename
      );
      const stack = stringList(frontmatter.stack, 'stack', filePath);

      return {
        title: assertString(frontmatter.title, 'title', filePath),
        description: assertString(frontmatter.description, 'description', filePath),
        date: assertString(frontmatter.date, 'date', filePath),
        category: assertString(frontmatter.category, 'category', filePath),
        label: assertString(frontmatter.label, 'label', filePath),
        stack,
        features: stringList(frontmatter.features, 'features', filePath),
        heroImage: optionalString(frontmatter.heroImage),
        role: optionalString(frontmatter.role),
        duration: optionalString(frontmatter.duration),
        team: optionalString(frontmatter.team),
        client: optionalString(frontmatter.client),
        services: optionalString(frontmatter.services),
        published: frontmatter.published !== false,
        featured: frontmatter.featured === true,
        slug,
        html: htmlContent,
      };
    })
  );

  return sortByNewest(projects.filter((project) => project.published));
};

export const getProject = async (slug: string) => {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug);
};
