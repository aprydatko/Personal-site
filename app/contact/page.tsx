import { ContactDetails } from '@/app/components/contact/ContactDetails';
import { ContactFaq } from '@/app/components/contact/ContactFaq';
import { ContactForm } from '@/app/components/contact/ContactForm';
import { ContactPattern } from '@/app/components/contact/ContactPattern';
import { Container } from '@/app/components/layout/Container';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Clock3, Mail, MapPin, Send } from 'lucide-react';

const contactPageDetails = [
  { label: 'artyrpridatko@gmail.com', icon: Mail },
  { label: 'Sumy, Ukraine', icon: MapPin },
  { label: 'Usually replies within 24h', icon: Clock3 },
];

export default function ContactPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Container>
        <section className="relative grid gap-12 border-b border-border-subtle py-14 lg:grid-cols-[1fr_0.92fr] lg:gap-20 lg:py-20">
          <div className="relative">
            <ContactPattern className="right-0 bottom-[-1rem] hidden h-32 w-[min(42rem,60vw)] opacity-75 lg:block" />
            <p className="relative font-mono text-md font-medium">LET&apos;S CONNECT</p>
            <h1 className="relative mt-9.5 max-w-2xl font-sans text-[clamp(2.25rem,4vw,3.4rem)] font-medium leading-tight tracking-tighter">
              Have a project
              <br />
              in mind?<span className="text-primary opacity-60"></span>
            </h1>
            <p className="relative mt-11 max-w-md font-medium text-sm leading-8 text-muted sm:text-lg tracking-wide">
              I&apos;m always open to discussing new opportunities, interesting projects or just
              having a chat about tech.
            </p>
            <ContactDetails items={contactPageDetails} className="relative mt-12" />
          </div>
          <ContactForm />
        </section>
        <ContactFaq />
        <section className="mb-14 grid gap-7 rounded-2xl bg-surface p-7 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-10">
          <div className="flex size-16 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
            <Send className="size-7" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-medium">Let&apos;s build something great</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              I&apos;m currently available for new projects.
              <br />
              Drop me a message and I&apos;ll get back to you soon.
            </p>
          </div>
          <Button href="#contact-form" className="w-fit px-6 py-4">
            Send a message <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </section>
      </Container>
    </main>
  );
}
