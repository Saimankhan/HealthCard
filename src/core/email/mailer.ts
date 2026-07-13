import "server-only";
import nodemailer from "nodemailer";

import { serverEnv } from "@/core/config/env.server";

export const mailer = nodemailer.createTransport({
  host: serverEnv.SMTP_HOST,
  port: serverEnv.SMTP_PORT,
  secure: serverEnv.SMTP_PORT === 465,
  auth: {
    user: serverEnv.SMTP_USER,
    pass: serverEnv.SMTP_PASS,
  },
});

const DEFAULT_FROM = serverEnv.SMTP_FROM ?? serverEnv.SMTP_USER;

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  await mailer.sendMail({
    from: options.from ?? DEFAULT_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
