'use client';
import { Copy, Check, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

export const ArticleShare = () => {
  const [status, setStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('Link copied');
    } catch {
      setStatus('Copy the URL from your browser address bar.');
    }
  };
  return (
    <div className="mt-10 border-t border-border-subtle pt-6">
      <p className="font-mono text-xs text-muted">SHARE ARTICLE</p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 flex min-h-11 items-center gap-3 text-sm hover:text-primary"
      >
        {status === 'Link copied' ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
        link
      </button>
      <button
        type="button"
        onClick={() =>
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
            '_blank',
            'noopener,noreferrer',
          )
        }
        className="flex min-h-11 items-center gap-3 text-sm hover:text-primary"
      >
        <ArrowUpRight className="size-4" /> Share on LinkedIn
      </button>
      <p role="status" className="mt-2 text-xs leading-6 text-primary">
        {status}
      </p>
    </div>
  );
};
