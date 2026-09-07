import { BlogCodeBlock } from './BlogCodeBlock';
import hljs from 'highlight.js/lib/common';
import parse, { type DOMNode, Element } from 'html-react-parser';
import styles from './MarkdownArticle.module.css';  

type MarkdownArticleProps = { html: string; numbered?: boolean };

const codeLanguage = (className: string | undefined) =>
  className?.split(' ').find((name) => name.startsWith('language-'))?.replace('language-', '') ?? 'text';

const codeText = (node: DOMNode): string => {
  if ('data' in node && typeof node.data === 'string') return node.data;
  if (!('children' in node)) return '';
  return node.children.map((child) => codeText(child as DOMNode)).join('');
};

const highlightLine = (line: string, language: string) => {
  if (language === 'text') return line;
  const highlighted = hljs.getLanguage(language)
    ? hljs.highlight(line, { language }).value
    : hljs.highlightAuto(line).value;
  const isMarkup = ['html', 'xml', 'jsx', 'tsx'].includes(language.toLowerCase());
  const withTagNames = isMarkup
    ? highlighted.replace(
        /(&lt;\/?)([A-Za-z][\w.-]*)/g,
        '$1<span class="markdown-code-tag">$2</span>'
      )
    : highlighted;
  return parse(withTagNames);
};

export const MarkdownArticle = ({ html, numbered = false }: MarkdownArticleProps) => (
  <div className={`${styles.content}${numbered ? ` ${styles.numbered}` : ''}`}>
    {parse(html, {
      replace: (node) => {
        if (!(node instanceof Element) || node.name !== 'pre') return;
        const code = node.children.find(
          (child): child is Element => child instanceof Element && child.name === 'code'
        );
        if (!code) return;

        const language = codeLanguage(code.attribs.class);
        const source = codeText(code);
        const codeLines = source.replace(/\n$/, '').split('\n');

        return <BlogCodeBlock code={source} highlightedLines={codeLines.map((line) => highlightLine(line, language))} language={language} />;
      },
    })}
  </div>
);
