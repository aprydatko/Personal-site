import { cn } from '@/app/lib/utils';
import type { ReactNode } from 'react';

type CodeWindowProps = {
  lines: ReactNode[];
  fileName?: string;
  className?: string;
};

export const CodeWindow = ({ lines, fileName = 'app/page.tsx', className }: CodeWindowProps) => (
  <div
    className={cn(
      'z-10 overflow-hidden rounded-xl border border-[#36363b] bg-code-background text-code-foreground md:shadow-2xl shadow-black/20 p-[clamp(.75rem,1rem,1.25rem)]',
      className
    )}
  >
    <div className="mb-3 md:mb-5 flex items-center gap-3.5 border-b border-white/10 pb-3">
      <i className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-[#ef6b67]" />
      <i className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-[#f5c451]" />
      <i className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-[#47c66d]" />
      <span className="ml-auto font-mono text-sm md:text-md text-[#777980]">{fileName}</span>
    </div>
    <div className="overflow-x-auto font-mono text-[clamp(0.7rem,1vw,1rem)] leading:6 md:leading-7">
      {lines
        .filter((line) => typeof line !== 'string' || line.trim().length > 0)
        .map((line, index) => (
          <div className="flex min-w-max" key={index}>
            <span className="mr-2 md:mr-5 md:w-5 shrink-0 select-none text-right text-code-line">
              {index + 1}
            </span>
            <code
              className={`whitespace-pre ${index < 2 ? 'text-code-keyword' : [2, 3, 6, 7, 11, 12].includes(index) ? 'text-code-tag' : ''}`}
            >
              {line}
            </code>
          </div>
        ))}
    </div>
  </div>
);
