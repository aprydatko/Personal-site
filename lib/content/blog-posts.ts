import 'server-only';

import { cache } from 'react';
import { readContentFiles } from './content-files';
import { sortByNewest } from './content-order';
import { assertString, optionalString } from './frontmatter';
import { renderMarkdown } from './markdown-renderer';
import type { BlogPost } from './types';

export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  const files = await readContentFiles('blog');
  const posts = await Promise.all(files.map(async ({ frontmatter, body, slug, filePath }) => ({
    title: assertString(frontmatter.title, 'title', filePath),
    description: assertString(frontmatter.description, 'description', filePath),
    date: assertString(frontmatter.date, 'date', filePath),
    category: assertString(frontmatter.category, 'category', filePath),
    readingTime: assertString(frontmatter.readingTime, 'readingTime', filePath),
    published: frontmatter.published !== false,
    featured: frontmatter.featured === true,
    heroCode: optionalString(frontmatter.heroCode),
    heroCodeFileName: optionalString(frontmatter.heroCodeFileName),
    slug,
    ...(await renderMarkdown(body)),
  })));
  return sortByNewest(posts.filter((post) => post.published));
});

export const getBlogPost = cache(async (slug: string) => (await getBlogPosts()).find((post) => post.slug === slug));
