import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function hasSmtpConfig() {
  return env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS;
}

const transporter = hasSmtpConfig()
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    })
  : null;

export async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.log(`[mail:dev] ${subject} -> ${to}\n${html}`);
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html
  });
}

export function verificationEmail(url) {
  return `<p>Welcome to Theo.</p><p><a href="${url}">Verify your email</a></p>`;
}

export function passwordResetEmail(url) {
  return `<p>Reset your Theo password.</p><p><a href="${url}">Choose a new password</a></p>`;
}
