'use client';

import { Check, Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import styles from './BlogCodeBlock.module.css';

type BlogCodeBlockProps = {
  code: string;
  highlightedLines?: ReactNode[];
  language?: string;
  fileName?: string;
};

const languageLabels: Record<string, string> = {
  bash: 'bash',
  css: 'css',
  html: 'html',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  sql: 'sql',
  text: 'text',
  ts: 'typescript',
  tsx: 'tsx',
};

export const BlogCodeBlock = ({
  code,
  highlightedLines,
  language = 'text',
  fileName,
}: BlogCodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');
  const isSingleLine = lines.length === 1;
  const label = fileName ?? languageLabels[language.toLowerCase()] ?? language;

  const copyWithFallback = () => {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  const copyCode = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    if (!navigator.clipboard) return copyWithFallback();
    void navigator.clipboard.writeText(code).catch(copyWithFallback);
  };

  return (
    <section className={`${styles.codeBlock} ${isSingleLine ? styles.singleLine : ''}`} aria-label={`${label} code example`}>
      {!isSingleLine && <p className={styles.fileName}>{label}</p>}
      <button className={styles.copyButton} type="button" onClick={copyCode} aria-label={copied ? 'Code copied' : 'Copy code'}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span className={styles.copyStatus} aria-live="polite">{copied ? 'Copied' : ''}</span>
      </button>
      <pre className={styles.codeArea}>
        {lines.map((line, index) => (
          <span className={styles.line} key={`${line}-${index}`}>
            {!isSingleLine && <span className={styles.lineNumber}>{index + 1}</span>}
            <code>{(highlightedLines?.[index] ?? line) || ' '}</code>
          </span>
        ))}
      </pre>
    </section>
  );
};
