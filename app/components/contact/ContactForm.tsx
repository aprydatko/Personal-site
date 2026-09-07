'use client';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

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
      className="rounded-2xl border border-border-subtle p-7 shadow-[0_8px_24px_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:p-10"
      onSubmit={handleSubmit}
      aria-label="Project inquiry form"
    >
      <div className="mt-6 flex flex-col gap-8">
        {fields.map(({ id, label, placeholder, type }) => (
          <label
            key={id}
            htmlFor={id}
            className="flex flex-col gap-3 font-mono text-sm font-medium text-foreground"
          >
            {label}
            <Input
              id={id}
              name={id}
              type={type}
              placeholder={placeholder}
              required={id !== 'subject'}
              className="min-h-15 rounded-lg px-6 py-4 text-base"
            />
          </label>
        ))}
        <label
          htmlFor="message"
          className="flex flex-col gap-3 font-mono text-sm font-medium text-foreground"
        >
          Message
          <Textarea
            id="message"
            name="message"
            placeholder="Tell me about your project..."
            required
            className="min-h-42 rounded-lg px-6 py-4 text-base"
          />
        </label>
      </div>
      <Button type="submit" className="mt-12 min-h-16 w-full max-w-95 px-7 py-4">
        {isSent ? 'Message received' : 'Send message'}
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
      <p className="mt-8 font-mono text-xs leading-5 text-muted">
        {isSent ? (
          'Thanks — I’ll be in touch soon.'
        ) : (
          <>
            By sending this message, you agree to my{' '}
            <a href="#privacy" className="text-foreground underline underline-offset-2">
              Privacy Policy.
            </a>
          </>
        )}
      </p>
    </form>
  );
};
