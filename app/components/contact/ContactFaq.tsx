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
    'I work on websites, SaaS products, internal tools, dashboards, and custom web applications. I can help shape an early idea, improve an existing product, or take a well-defined feature from design through production.',
  ],
  [
    'What is your tech stack?',
    'My core stack is Next.js, React, TypeScript, Node.js, PostgreSQL, Docker, and AWS. I choose tools based on the product rather than forcing every project into the same stack, with a focus on maintainable code and reliable performance.',
  ],
  [
    'Are you available for freelance work?',
    'Yes. I am available for select freelance and contract projects. I am especially interested in products that need a thoughtful frontend, a reliable backend, or help turning a rough idea into a polished, working application.',
  ],
  [
    'How do you work?',
    'I start by understanding the goals, users, and technical constraints. Then I break the work into clear milestones, validate the direction early, and deliver in focused iterations with regular communication, code reviews, and practical documentation.',
  ],
  [
    'What is your hourly rate?',
    'I usually price work based on the scope, complexity, and type of engagement rather than using one fixed rate for every project. Send me a short description of what you need, your timeline, and any existing materials, and I will suggest the best approach with a clear estimate.',
  ],
];

export const ContactFaq = () => (
  <section className="grid gap-12 border-t border-border-subtle py-16 lg:grid-cols-[0.44fr_1fr] lg:gap-16 lg:py-24">
    <div>
      <p className="font-mono text-sm font-medium tracking-wide text-primary">FAQ</p>
      <h2 className="mt-8 max-w-xs font-sans text-[clamp(2.5rem,4vw,2rem)] font-medium leading-14 tracking-tight">
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
