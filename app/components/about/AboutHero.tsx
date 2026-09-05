import Image from 'next/image';
import { ArrowDownToLine, CalendarDays, Clock3, Code2, FolderOpen, Mail, MapPin, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

const contactDetails = [
  { label: 'Sumy, Ukraine', icon: MapPin },
  { label: 'hello@ap-site.dev', icon: Mail },
  { label: 'Available for new projects', icon: Clock3 },
];

const achievements = [
  { value: '6+', label: 'Years of experience', icon: CalendarDays },
  { value: '20+', label: 'Completed projects', icon: FolderOpen },
  { value: '10+', label: 'Happy clients', icon: Users },
  { value: '∞', label: 'Passion for code', icon: Code2 },
];

export const AboutHero = () => (
  <>
    <section className="relative grid gap-12 py-14 sm:grid-cols-[1.08fr_0.92fr] sm:items-center sm:gap-8 sm:py-20 lg:gap-18 lg:py-24">
      <div className="relative z-10">
        <p className="font-mono text-xs font-semibold text-primary">ABOUT ME</p>
        <h1 className="mt-6 font-mono text-[clamp(2.2rem,4.2vw,3.6rem)] font-medium leading-[1.2] tracking-tight">
          I&apos;m Arthur,<br />a Fullstack Developer<span className="text-primary">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-7 text-muted sm:text-base sm:leading-8">
          I build scalable web applications with clean code and thoughtful design. I enjoy turning ideas into real products that solve problems.
        </p>
        <ul className="mt-8 flex flex-col gap-3 font-mono text-sm font-medium text-foreground">
          {contactDetails.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-4"><Icon className="size-4 text-primary" aria-hidden="true" />{label}</li>
          ))}
        </ul>
        <Button href="/arthur-prydatko-cv.pdf" className="mt-8 w-fit bg-surface-sunken px-6 py-4 text-primary-foreground hover:bg-muted-strong" download>
          Download CV <ArrowDownToLine data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
      <div className="relative mx-auto w-full max-w-105 lg:max-w-none">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 hidden size-72 bg-[radial-gradient(circle,color-mix(in_srgb,var(--muted)_28%,transparent)_1px,transparent_1.2px)] [background-size:16px_16px] opacity-55 [mask-image:radial-gradient(ellipse,black,transparent_70%)] lg:block" />
        <div className="relative aspect-[4/4.1] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_35px_color-mix(in_srgb,var(--foreground)_12%,transparent)]">
          <Image src="/about-portrait.png" alt="Arthur Prydatko" fill priority sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover object-[60%_center]" />
        </div>
        <div className="absolute -bottom-7 -left-7 flex size-14 items-center justify-center rounded-full bg-background text-primary shadow-lg sm:size-16"><Code2 className="size-7" aria-hidden="true" /></div>
      </div>
    </section>
    <section className="grid grid-cols-2 overflow-hidden rounded-xl border border-border-subtle sm:grid-cols-4">
      {achievements.map(({ value, label, icon: Icon }) => (
        <div key={label} className="flex min-h-35 flex-col justify-center gap-3 border-b border-border-subtle px-5 py-6 last:border-b-0 odd:border-r odd:border-border-subtle sm:min-h-36 sm:border-b-0 sm:border-r sm:px-7 sm:last:border-r-0">
          <div className="flex items-center gap-4"><Icon className="size-6 text-primary" aria-hidden="true" /><span className="font-mono text-3xl font-medium tracking-tight">{value}</span></div>
          <p className="pl-0 font-mono text-xs leading-5 text-muted sm:pl-10">{label}</p>
        </div>
      ))}
    </section>
  </>
);
