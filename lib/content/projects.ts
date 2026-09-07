import 'server-only';

import { cache } from 'react';
import { readContentFiles } from './content-files';
import { sortByNewest } from './content-order';
import { assertString, optionalString, stringList } from './frontmatter';
import { renderMarkdown } from './markdown-renderer';
import type { Project } from './types';

export const getProjects = cache(async (): Promise<Project[]> => {
  const files = await readContentFiles('projects');
  const projects = await Promise.all(files.map(async ({ frontmatter, body, slug, filePath }) => ({
    title: assertString(frontmatter.title, 'title', filePath),
    description: assertString(frontmatter.description, 'description', filePath),
    date: assertString(frontmatter.date, 'date', filePath),
    category: assertString(frontmatter.category, 'category', filePath),
    label: assertString(frontmatter.label, 'label', filePath),
    tagline: optionalString(frontmatter.tagline),
    intro: optionalString(frontmatter.intro),
    stack: stringList(frontmatter.stack, 'stack', filePath),
    features: stringList(frontmatter.features, 'features', filePath),
    keyFeatures: stringList(frontmatter.keyFeatures, 'keyFeatures', filePath),
    heroImage: optionalString(frontmatter.heroImage),
    role: optionalString(frontmatter.role),
    duration: optionalString(frontmatter.duration),
    team: optionalString(frontmatter.team),
    client: optionalString(frontmatter.client),
    services: optionalString(frontmatter.services),
    published: frontmatter.published !== false,
    featured: frontmatter.featured === true,
    slug,
    ...(await renderMarkdown(body)),
  })));
  return sortByNewest(projects.filter((project) => project.published));
});

export const getProject = cache(async (slug: string) => (await getProjects()).find((project) => project.slug === slug));
