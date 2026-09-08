import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn().mockResolvedValue({ messageId: 'test-message' });

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
}));

const { POST } = await import('@/app/api/contact/route');

const request = (payload: unknown) =>
  new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GMAIL_SMTP_USER = 'artyrpridatko@gmail.com';
    process.env.GMAIL_SMTP_APP_PASSWORD = 'abcd efgh ijkl mnop';
    process.env.CONTACT_TO_EMAIL = 'artyrpridatko@gmail.com';
  });

  it('sends a valid contact message', async () => {
    const response = await POST(request({
      name: 'Ivan',
      email: 'ivan_petrow@gmail.com',
      subject: 'Bisness',
      message: 'How are you?',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'artyrpridatko@gmail.com',
      to: 'artyrpridatko@gmail.com',
      replyTo: 'ivan_petrow@gmail.com',
      subject: 'Bisness',
    }));
  });

  it('rejects invalid contact data without sending email', async () => {
    const response = await POST(request({
      name: 'Ivan',
      email: 'not-an-email',
      subject: 'Test',
      message: 'Short',
    }));

    expect(response.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
