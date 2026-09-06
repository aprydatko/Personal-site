export const ArticlePreview = () => (
  <div
    className="relative aspect-[1.75/1] overflow-hidden rounded-md border border-border-subtle bg-[radial-gradient(circle_at_78%_22%,color-mix(in_srgb,var(--primary)_35%,transparent),transparent_30%),linear-gradient(135deg,var(--surface-raised),var(--surface))]"
    aria-hidden="true"
  >
    <div className="absolute left-[14%] top-[18%] h-[54%] w-[72%] rounded-[0.3rem] border border-foreground/10 bg-background/70 shadow-[0_14px_30px_color-mix(in_srgb,var(--foreground)_10%,transparent)]" />
    <div className="absolute bottom-[18%] left-[22%] h-1.5 w-[38%] rounded-full bg-primary/45" />
    <div className="absolute bottom-[28%] left-[22%] h-1.5 w-[55%] rounded-full bg-foreground/10" />
  </div>
);
