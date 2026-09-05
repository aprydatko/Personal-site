'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';

const fields = [
  { id: 'name', label: 'Name', placeholder: 'Your name', type: 'text' },
  { id: 'email', label: 'Email', placeholder: 'your@email.com', type: 'email' },
  { id: 'subject', label: 'Subject', placeholder: 'How can I help?', type: 'text' },
];

export const ContactForm = () => {
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSent(true);
  };

  return (
    <form
      className="rounded-xl border border-border-subtle p-6 sm:p-8"
      onSubmit={handleSubmit}
      aria-label="Project inquiry form"
    >
      <div className="flex flex-col gap-5">
        {fields.map(({ id, label, placeholder, type }) => (
          <label key={id} htmlFor={id} className="flex flex-col gap-2 font-mono text-xs font-medium text-foreground">
            {label}
            <Input id={id} name={id} type={type} placeholder={placeholder} required={id !== 'subject'} />
          </label>
        ))}
        <label htmlFor="message" className="flex flex-col gap-2 font-mono text-xs font-medium text-foreground">
          Message
          <Textarea id="message" name="message" placeholder="Tell me about your project..." required />
        </label>
      </div>
      <Button type="submit" className="mt-7 w-full py-4">
        {isSent ? 'Message received' : 'Send message'}
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
      <p className="mt-5 text-center font-mono text-[10px] leading-5 text-muted">
        {isSent ? 'Thanks — I’ll be in touch soon.' : <>By sending this message, you agree to my <a href="#privacy" className="text-foreground underline underline-offset-2">Privacy Policy.</a></>}
      </p>
    </form>
  );
};
