import Image from 'next/image';

export const AuthorBadge = () => (
  <div className="mt-10 flex items-center gap-6">
    <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-sunken">
      <Image
        src="/about-portrait.png"
        alt="Arthur Prydatko"
        fill
        sizes="56px"
        className="object-cover object-[60%_center]"
      />
    </div>
    <div className="space-y-1">
      <p className="font-mono text-sm font-semibold tracking-tight">Arthur Prydatko</p>
      <p className="text-md text-muted tracking-wider">Fullstack Developer</p>
    </div>
  </div>
);
