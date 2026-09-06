'use client';

import { cn } from '@/app/lib/utils';
import { Check, Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import styles from './CodeWindow.module.css';

export type CodeWindowProps = { code?: string; fileName?: string; highlightedLines?: ReactNode[]; language?: string; lines?: ReactNode[]; className?: string };

const languageLabels: Record<string, string> = { ts: 'TypeScript', tsx: 'React TSX', js: 'JavaScript', jsx: 'React JSX', html: 'HTML', css: 'CSS', json: 'JSON', bash: 'Bash', shell: 'Shell', sql: 'SQL', text: 'Text' };

export const CodeWindow = ({ code, fileName, highlightedLines, language = 'text', lines, className }: CodeWindowProps) => {
  const [copied, setCopied] = useState(false);
  const label = languageLabels[language.toLowerCase()] ?? language;
  const visibleLines = lines?.filter((line) => typeof line !== 'string' || line.trim().length > 0);
  const renderedLines = highlightedLines ?? visibleLines;
  const copyCode = async () => {
    if (!code) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    try { await navigator.clipboard.writeText(code); } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  };
  return <div className={cn(styles.window, 'overflow-hidden rounded-xl border border-[#303239] bg-[#191a1f] text-[#f3f4f6] shadow-xl shadow-black/15', className)}>
    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5"><i className="size-2.5 rounded-full bg-[#ef6b67]" /><i className="size-2.5 rounded-full bg-[#f5c451]" /><i className="size-2.5 rounded-full bg-[#47c66d]" /><span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-[#777980]">{fileName ?? label}</span>{code && <button type="button" onClick={copyCode} className="ml-auto inline-flex items-center gap-2 rounded px-2 py-1 font-mono text-[10px] text-[#aeb3bd] transition-colors hover:bg-white/10 hover:text-white" aria-label="Copy code">{copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</button>}</div>
    {renderedLines ? <div className="overflow-x-auto px-4 py-4 font-mono text-[clamp(0.7rem,1vw,0.875rem)] leading-6 sm:px-5">{renderedLines.map((line, index) => <div className="flex min-w-max" key={index}><span className="mr-5 w-5 shrink-0 select-none text-right text-code-line">{index + 1}</span><code className={`whitespace-pre ${highlightedLines ? '' : index < 2 ? 'text-code-keyword' : [2, 3, 6, 7, 11, 12].includes(index) ? 'text-code-tag' : ''}`}>{line || ' '}</code></div>)}</div> : <pre className="overflow-x-auto p-4 text-[0.78rem] leading-6 sm:p-5 sm:text-sm"><code>{code}</code></pre>}
  </div>;
};
