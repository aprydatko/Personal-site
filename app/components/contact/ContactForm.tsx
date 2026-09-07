'use client';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { contactEmail } from '@/app/content/site';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export const ContactForm = () => {
  const [draft, setDraft] = useState('');
  const [emailHref, setEmailHref] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    if (!name || !email || !message) return;
    const subject = String(data.get('subject') ?? '').trim() || `Project inquiry from ${name}`;
    const body = `${message}\n\nFrom: ${name}\nEmail: ${email}`;
    setDraft(`To: ${contactEmail}\nSubject: ${subject}\n\n${body}`);
    setEmailHref(
      `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
    setCopyStatus('');
  };
  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyStatus('Draft copied');
    } catch {
      setCopyStatus('Could not copy. Select and copy the draft below.');
    }
  };
  return (
    <form
      id="contact-form"
      className="rounded-xl border border-border-subtle bg-surface/40 p-6 sm:p-8"
      onSubmit={handleSubmit}
      onChange={() => {
        setDraft('');
        setCopyStatus('');
      }}
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
      <Button type="submit" className="mt-7 w-full">
        Prepare email <ArrowUpRight className="size-4" aria-hidden="true" />
      </Button>
      <p className="mt-4 text-xs leading-6 text-muted">
        Prepare a draft, then send it from your email app. Nothing is sent or stored by this
        website.
      </p>
      {draft && (
        <div className="mt-6 border-t border-border pt-6">
          <p role="status" className="text-sm font-medium text-primary">
            Your draft is ready. Open your email app to send it.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href={emailHref}>
              Open email app <ArrowUpRight className="size-4" />
            </Button>
            <Button type="button" variant="outline" onClick={copyDraft}>
              {copyStatus === 'Draft copied' ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}{' '}
              Copy draft
            </Button>
          </div>
          <p role="status" className="mt-3 text-xs text-muted">
            {copyStatus}
          </p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer py-2">View email draft</summary>
            <pre className="mt-3 whitespace-pre-wrap break-words rounded bg-background p-4 font-sans text-sm leading-6">
              {draft}
            </pre>
          </details>
        </div>
      )}
    </form>
  );
};
