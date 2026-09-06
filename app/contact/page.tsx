import { ArrowRight, Clock3, Mail, MapPin, Send } from 'lucide-react';
import { Container } from '@/app/components/layout/Container';
import { ContactFaq } from '@/app/components/contact/ContactFaq';
import { ContactForm } from '@/app/components/contact/ContactForm';
import { Button } from '@/app/components/ui/button';

const contactDetails = [
  { label: 'hello@ap-site.dev', icon: Mail },
  { label: 'Sumy, Ukraine', icon: MapPin },
  { label: 'Usually replies within 24h', icon: Clock3 },
];

export default function ContactPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Container>
        <section className="relative grid gap-12 border-b border-border-subtle py-14 lg:grid-cols-[1fr_0.92fr] lg:gap-20 lg:py-24">
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-20 hidden size-80 bg-[radial-gradient(circle,color-mix(in_srgb,var(--muted)_24%,transparent)_1px,transparent_1.2px)] bg-size-[16px_16px] opacity-45 [mask-image:radial-gradient(ellipse,black,transparent_68%)] lg:block" />
            <p className="relative font-mono text-xs font-semibold text-primary">LET&apos;S CONNECT</p>
            <h1 className="relative mt-7 max-w-2xl font-mono text-[clamp(2.25rem,4vw,3.5rem)] font-medium leading-[1.16] tracking-tight">Have a project<br />in mind<span className="text-primary">?</span></h1>
            <p className="relative mt-7 max-w-sm text-sm leading-7 text-muted sm:text-base">I&apos;m always open to discussing new opportunities, interesting projects or just having a chat about tech.</p>
            <ul className="relative mt-11 flex flex-col gap-4 font-mono text-sm font-medium">
              {contactDetails.map(({ label, icon: Icon }) => <li key={label} className="flex items-center gap-4"><Icon className="size-4" aria-hidden="true" />{label}</li>)}
            </ul>
            <div aria-hidden="true" className="mt-16 hidden h-7 border-l border-b border-border sm:block" />
          </div>
          <ContactForm />
        </section>
        <ContactFaq />
        <section className="mb-14 grid gap-7 rounded-2xl bg-surface p-7 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-10">
          <div className="flex size-16 items-center justify-center rounded-lg bg-background text-primary shadow-sm"><Send className="size-7" aria-hidden="true" /></div>
          <div><h2 className="font-mono text-xl font-medium">Let&apos;s build something great</h2><p className="mt-3 text-sm leading-6 text-muted">I&apos;m currently available for new projects.<br />Drop me a message and I&apos;ll get back to you soon.</p></div>
          <Button href="#main-content" className="w-fit px-6 py-4">Send a message <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
        </section>
      </Container>
    </main>
  );
}
