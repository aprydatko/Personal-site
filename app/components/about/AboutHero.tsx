import { Button } from '@/app/components/ui/button';
import { ContactDetails } from '@/app/components/contact/ContactDetails';
import { ArrowDownToLine, CalendarDays, Code2, FolderOpen, Users } from 'lucide-react';
import Image from 'next/image';

const achievements = [
  { value: '6+', label: 'Years of experience', icon: CalendarDays },
  { value: '20+', label: 'Completed projects', icon: FolderOpen },
  { value: '10+', label: 'Happy clients', icon: Users },
  { value: '∞', label: 'Passion for code', icon: Code2 },
];

export const AboutHero = () => (
  <>
    <section className="relative grid gap-12 py-14 sm:grid-cols-[1.1fr_0.8fr] sm:items-start sm:gap-8 sm:py-20 lg:gap-18 lg:py-24">
      <div className="relative z-10">
        <p className="font-mono text-lg tracking-wide">ABOUT ME</p>
        <h1 className="mt-6 font-mono text-[clamp(2.2rem,4.2vw,3.4rem)] font-medium leading-18 tracking-tight">
          I&apos;m Arthur,
          <br />a Fullstack Developer<span className="text-primary">.</span>
        </h1>
        <p className="mt-7 font-medium max-w-lg text-sm leading-7 text-muted sm:text-lg sm:leading-9 tracking-wider">
          I build scalable web applications with clean code and thoughtful design. I enjoy turning
          ideas into real products that solve problems.
        </p>
        <ContactDetails className="mt-12" />
        <Button
          href="/arthur-prydatko-cv.pdf"
          className="mt-12 gap-6 text-md w-fit bg-surface-sunken px-8 py-5 text-primary-foreground tracking-wide hover:bg-muted-strong"
        >
          Download CV <ArrowDownToLine size={16} data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
      <div className="relative top-8 -left-0 mx-auto w-full max-w-125 lg:max-w-130">
        <div className="relative aspect-[4/4.5] overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_18px_35px_color-mix(in_srgb,var(--foreground)_12%,transparent)]">
          <Image
            src="/about-portrait.png"
            alt="Arthur Prydatko"
            fill
            loading="eager"
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover object-[60%_center]"
          />
        </div>
        <div className="absolute bottom-7 -left-7 flex size-14 items-center justify-center rounded-full bg-background text-primary shadow-lg sm:size-20">
          <Code2 className="size-10" aria-hidden="true" />
        </div>
      </div>
    </section>
    <section
      aria-label="Career highlights"
      className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-border-subtle bg-background shadow-[0_8px_24px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:grid-cols-4"
    >
      {achievements.map(({ value, label, icon: Icon }) => (
        <div
          key={label}
          className="flex min-h-40 flex-col items-center justify-center gap-4 border-b border-border-subtle px-4 py-7 text-center last:border-b-0 odd:border-r odd:border-border-subtle sm:min-h-47 sm:border-b-0 sm:border-r sm:px-5 sm:last:border-r-0"
        >
          <div className="flex items-center gap-5">
            <Icon className="size-7 stroke-[1.6] text-primary" aria-hidden="true" />
            <span className="font-mono text-[2rem] font-medium leading-none tracking-[-0.06em]">
              {value}
            </span>
          </div>
          <p className="font-mono text-sm leading-5">{label}</p>
        </div>
      ))}
    </section>
  </>
);
