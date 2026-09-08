import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

  const smtpUser = process.env.GMAIL_SMTP_USER;
  const smtpPassword = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, '');
  const to = process.env.CONTACT_TO_EMAIL ?? smtpUser;

  if (!smtpUser || !smtpPassword || !to) {
    return NextResponse.json({ error: 'Email service is not configured yet.' }, { status: 503 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transporter.sendMail({
      from: smtpUser,
      to,
      replyTo: email,
      subject: subject || `Project inquiry from ${name}`,
      text: `${message}\n\nFrom: ${name}\nEmail: ${email}`,
    });
  } catch {
    return NextResponse.json(
      { error: 'The message could not be sent. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
