import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion';
import { Button } from '@/app/components/ui/button';
import { ArrowRight } from 'lucide-react';

const questions = [
  [
    'What types of projects do you work on?',
    'I build thoughtful web products, internal tools, and user-focused platforms from early ideas through production.',
  ],
  [
    'What is your tech stack?',
    'My core stack is Next.js, TypeScript, React, Node.js, PostgreSQL, Docker, and AWS.',
  ],
  [
    'Are you available for freelance work?',
    'Yes. I am open to select freelance and contract projects that are a strong mutual fit.',
  ],
  [
    'How do you work?',
    'I keep the process collaborative: clarify the problem, prototype the solution, and deliver in focused, transparent iterations.',
  ],
  [
    'What is your hourly rate?',
    'Scope and engagement shape the rate. Send a short brief and I will provide a clear estimate.',
  ],
];

export const ContactFaq = () => (
  <section className="grid gap-12 border-t border-border-subtle py-16 lg:grid-cols-[0.44fr_1fr] lg:gap-16 lg:py-24">
    <div>
      <p className="font-mono text-sm font-medium tracking-wide text-primary">FAQ</p>
      <h2 className="mt-8 max-w-xs font-mono text-[clamp(2.5rem,4vw,2rem)] font-medium leading-14 tracking-tight">
        Quick answers<span className="opacity-60">.</span>
      </h2>
      <p className="mt-11 max-w-56 text-lg leading-9 font-medium text-muted">
        Some common questions <br /> I get asked.
      </p>
      <Button
        href="/about"
        variant="outline"
        className="mt-11 w-fit rounded-1 text-base border-foreground/35 px-10 py-4.5 gap-6"
      >
        More about me <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </div>
    <Accordion multiple>
      {questions.map(([question, answer]) => (
        <AccordionItem key={question} value={question} className="last:border-b-0">
          <AccordionTrigger>{question}</AccordionTrigger>
          <AccordionContent>{answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);
