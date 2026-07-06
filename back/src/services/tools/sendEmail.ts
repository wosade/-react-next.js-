import { z } from 'zod';
import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP 未配置，请在 .env 中设置 SMTP_HOST / SMTP_USER / SMTP_PASS');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export const sendEmailSchema = z.object({
  to: z.string().describe('收件人邮箱地址，如 user@example.com'),
  subject: z.string().describe('邮件主题'),
  body: z.string().describe('邮件正文（纯文本）'),
});

export const sendEmailDefinition = {
  type: 'function' as const,
  function: {
    name: 'send_email',
    description: '发送一封邮件到指定邮箱地址',
    parameters: {
      type: 'object' as const,
      properties: {
        to: { type: 'string' as const, description: '收件人邮箱地址，如 user@example.com' },
        subject: { type: 'string' as const, description: '邮件主题' },
        body: { type: 'string' as const, description: '邮件正文（纯文本）' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
};

export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<string> {
  try {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"AI 助手" <${from}>`,
      to: args.to,
      subject: args.subject,
      text: args.body,
    });

    return `✅ 邮件发送成功！\n收件人: ${args.to}\n主题: ${args.subject}\nMessage ID: ${info.messageId}`;
  } catch (err: any) {
    if (err.message?.includes('SMTP 未配置')) {
      return `❌ ${err.message}`;
    }
    return `❌ 邮件发送失败: ${err.message || err}`;
  }
}