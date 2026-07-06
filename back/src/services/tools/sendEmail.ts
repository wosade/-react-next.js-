import { z } from 'zod';
import nodemailer from 'nodemailer';
import { findUserById } from '../../models/user.js';

async function getTransporter(userId: string) {
  const user = await findUserById(userId);
  if (!user || !user.smtpHost || !user.smtpUser || !user.smtpPass) {
    throw new Error(
      'SMTP 邮件服务未配置，请在设置页面的「个人信息」中填写您的邮箱 SMTP 配置（主机、端口、邮箱地址、授权码）。',
    );
  }

  return nodemailer.createTransport({
    host: user.smtpHost,
    port: user.smtpPort,
    secure: user.smtpPort === 465,
    auth: { user: user.smtpUser, pass: user.smtpPass },
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
    description: '发送一封邮件到指定邮箱地址。发件人信息使用用户在设置中预配置的 SMTP 配置。',
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

export async function sendEmail(
  args: { to: string; subject: string; body: string },
  userId: string,
): Promise<string> {
  try {
    const transporter = await getTransporter(userId);
    const user = await findUserById(userId);
    const from = user?.smtpFrom || user?.smtpUser || '';

    const info = await transporter.sendMail({
      from: `"AI 助手" <${from}>`,
      to: args.to,
      subject: args.subject,
      text: args.body,
    });

    return `✅ 邮件发送成功！\n收件人: ${args.to}\n主题: ${args.subject}\nMessage ID: ${info.messageId}`;
  } catch (err: any) {
    if (err.message?.includes('SMTP 邮件服务未配置')) {
      return `❌ ${err.message}`;
    }
    return `❌ 邮件发送失败: ${err.message || err}`;
  }
}