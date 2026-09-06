import 'server-only';

import matter from 'gray-matter';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { BaseFrontmatter, ContentType } from './types';

const contentRoot = path.join(process.cwd(), 'content');

export type ContentFile = { frontmatter: BaseFrontmatter & Record<string, unknown>; body: string; slug: string; filePath: string };

export const readContentFiles = async (type: ContentType): Promise<ContentFile[]> => {
  const directory = path.join(contentRoot, type);
  const entries = await readdir(directory, { withFileTypes: true });
  const filenames = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md')).map((entry) => entry.name);

  return Promise.all(filenames.map(async (filename) => {
    const filePath = path.join(directory, filename);
    const source = await readFile(filePath, 'utf8');
    const { data, content } = matter(source);
    return { frontmatter: data as BaseFrontmatter & Record<string, unknown>, body: content, slug: filename.replace(/\.md$/, ''), filePath };
  }));
};
