import { ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Button } from '@/app/components/ui/button';

const questions = [
  ['What types of projects do you work on?', 'I build thoughtful web products, internal tools, and user-focused platforms from early ideas through production.'],
  ['What is your tech stack?', 'My core stack is Next.js, TypeScript, React, Node.js, PostgreSQL, Docker, and AWS.'],
  ['Are you available for freelance work?', 'Yes. I am open to select freelance and contract projects that are a strong mutual fit.'],
  ['How do you work?', 'I keep the process collaborative: clarify the problem, prototype the solution, and deliver in focused, transparent iterations.'],
  ['What is your hourly rate?', 'Scope and engagement shape the rate. Send a short brief and I will provide a clear estimate.'],
];

export const ContactFaq = () => (
  <section className="grid gap-10 border-t border-border-subtle py-14 lg:grid-cols-[0.44fr_1fr] lg:gap-16 lg:py-20">
    <div>
      <p className="font-mono text-xs font-semibold text-primary">FAQ</p>
      <h2 className="mt-6 font-mono text-3xl font-medium leading-tight tracking-tight">Quick answers<span className="text-primary">.</span></h2>
      <p className="mt-6 max-w-50 text-sm leading-7 text-muted">Some common questions I get asked.</p>
      <Button href="/about" variant="outline" className="mt-7 w-fit px-5 py-3">
        More about me <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </div>
    <Accordion className="border-t border-border-subtle" multiple>
      {questions.map(([question, answer]) => (
        <AccordionItem key={question} value={question}>
          <AccordionTrigger>{question}</AccordionTrigger>
          <AccordionContent>{answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);
