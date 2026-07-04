import "server-only";
import nodemailer from "nodemailer";

/**
 * Zajednički SMTP mailer (Gmail preko Nodemailer-a).
 *
 * Env:
 *   • GMAIL_USER         — gmail adresa naloga sa kog se šalje
 *   • GMAIL_APP_PASSWORD — 16-cifreni App Password (NE obična lozinka!)
 *
 * Koriste ga: PDF izveštaji (reports/email.ts) i automatska obaveštenja
 * (notifications/service.ts).
 */

export function isMailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendMailParams {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  /** Ime pošiljaoca koje primalac vidi (default: env ili "Sistem za kartice") */
  fromName?: string;
  attachments?: MailAttachment[];
}

/** Baca grešku ako mailer nije konfigurisan — pozivalac proverava isMailConfigured(). */
export async function sendMail(params: SendMailParams): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    throw new Error("Mailer nije konfigurisan (GMAIL_USER / GMAIL_APP_PASSWORD)");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const fromName =
    params.fromName ??
    process.env.REPORT_EMAIL_FROM_NAME ??
    "Sistem za kartice";

  await transporter.sendMail({
    from: `"${fromName}" <${gmailUser}>`,
    to: params.to,
    replyTo: gmailUser,
    subject: params.subject,
    text: params.text,
    html: params.html,
    attachments: params.attachments,
  });
}

/** Minimalni HTML escape za vrednosti koje se interpoliraju u HTML mejla. */
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
