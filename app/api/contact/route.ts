import { NextResponse } from 'next/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!name || !emailPattern.test(email) || !message || message.length < 10) {
    return NextResponse.json(
      { error: 'Please complete all fields with valid information.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return NextResponse.json({ error: 'Email service is not configured yet.' }, { status: 503 });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: subject || `Project inquiry from ${name}`,
      text: `${message}\n\nFrom: ${name}\nEmail: ${email}`,
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'The message could not be sent. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
