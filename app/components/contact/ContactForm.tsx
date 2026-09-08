'use client';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowUpRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export const ContactForm = () => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    if (!name || !email || !message) return;
    const subject = String(data.get('subject') ?? '').trim() || `Project inquiry from ${name}`;
    setStatus('sending');
    setStatusMessage('Sending your message…');
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message }),
    }).catch(() => null);
    if (response?.ok) {
      setStatus('success');
      setStatusMessage('Message sent successfully. I will get back to you soon.');
      event.currentTarget.reset();
    } else {
      const result = await response?.json().catch(() => null);
      setStatus('error');
      setStatusMessage(result?.error ?? 'Something went wrong. Please try again.');
    }
  };
  return (
    <form
      id="contact-form"
      className="rounded-xl border border-border-subtle bg-surface/40 p-6 sm:p-8"
      onSubmit={handleSubmit}
      aria-label="Project inquiry form"
    >
      <h2 className="text-2xl font-semibold">Tell me what you are building.</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        A few details are all we need to start a conversation.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="name">
          Name{' '}
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            required
            maxLength={100}
            pattern=".*\S.*"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="email">
          Email{' '}
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2" htmlFor="subject">
          Subject <span className="sr-only">optional</span>
          <Input
            id="subject"
            name="subject"
            placeholder="Project inquiry (optional)"
            maxLength={150}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2" htmlFor="message">
          Message{' '}
          <Textarea
            id="message"
            name="message"
            placeholder="What do you have in mind?"
            required
            minLength={10}
            maxLength={2000}
            className="min-h-40"
          />
        </label>
      </div>
      <Button type="submit" className="mt-7 w-full" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}{' '}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Button>
      {status !== 'idle' && (
        <p
          role="status"
          className={`mt-4 text-sm leading-6 ${status === 'success' ? 'text-primary' : status === 'error' ? 'text-danger' : 'text-muted'}`}
        >
          {statusMessage}
        </p>
      )}
    </form>
  );
};
