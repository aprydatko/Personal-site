'use client';

import { Button } from '@/app/components/ui/button';
import { ArrowDownToLine, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const ResumeViewer = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      document.body.style.overflow = '';
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  const openResume = () => {
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
  };

  return (
    <>
      <Button type="button" onClick={openResume} className="mt-12 w-fit gap-6 px-8 py-5 text-md tracking-wide">
        View my CV <ArrowDownToLine data-icon="inline-end" aria-hidden="true" />
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="resume-viewer-title"
        className="m-auto h-[min(92vh,980px)] w-[min(94vw,1100px)] overflow-hidden rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4 sm:px-7">
            <div>
              <h2 id="resume-viewer-title" className="font-sans text-lg font-medium">Arthur Prydatko — CV</h2>
              <p className="mt-1 font-mono text-xs text-muted">2026 edition</p>
            </div>
            <button type="button" aria-label="Close resume" onClick={() => dialogRef.current?.close()} className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground">
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <iframe title="Arthur Prydatko CV" src="/Arthur_Prydatko_CV_2026.pdf" className="min-h-0 flex-1 bg-surface" />
          <footer className="flex items-center justify-end border-t border-border-subtle px-5 py-3 sm:px-7">
            <a href="/Arthur_Prydatko_CV_2026.pdf" download className="font-mono text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground">Download PDF</a>
          </footer>
        </div>
      </dialog>
    </>
  );
};
