import 'server-only';

import rehypeHighlight from 'rehype-highlight';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import html from 'remark-html';
import { unified } from 'unified';
import { getHeadingId } from './heading-id';

export type RenderedMarkdown = { html: string; headings: string[] };

export const renderMarkdown = async (body: string): Promise<RenderedMarkdown> => {
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const markdownHtml = String(await remark().use(remarkGfm).use(html).process(body));
  const highlightedHtml = String(await unified().use(rehypeParse, { fragment: true }).use(rehypeHighlight, { detect: true }).use(rehypeStringify).process(markdownHtml));
  let headingIndex = 0;
  return { headings, html: highlightedHtml.replace(/<h2>/g, () => `<h2 id="${getHeadingId(headings[headingIndex++] ?? 'section')}">`) };
};
