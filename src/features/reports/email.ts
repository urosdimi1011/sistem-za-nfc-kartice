import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import nodemailer from "nodemailer";

import { getPersonReport } from "./queries";
import { PersonReportPdf } from "./pdf/person-report-pdf";

export class ReportEmailError extends Error {
  constructor(
    public code:
      | "NO_CONFIG"
      | "NO_EMAIL"
      | "NO_DATA"
      | "SEND_FAILED",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Generiše PDF izveštaj osobe za dati mesec i šalje ga na njen email preko
 * Gmail SMTP-a (Nodemailer).
 *
 * Zahteva env:
 *   • GMAIL_USER         — gmail adresa naloga (npr. dositej.kartice@gmail.com)
 *   • GMAIL_APP_PASSWORD — 16-cifreni App Password (NE obična lozinka naloga!)
 * Opciono:
 *   • REPORT_EMAIL_FROM_NAME — ime pošiljaoca koje primalac vidi
 *     (default: "Sistem za kartice")
 */
export async function sendPersonReportEmail(
  personId: string,
  year: number,
  month: number,
): Promise<{ sentTo: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    throw new ReportEmailError(
      "NO_CONFIG",
      "Email servis nije konfigurisan (nedostaje GMAIL_USER / GMAIL_APP_PASSWORD).",
    );
  }

  const data = await getPersonReport(personId, year, month);
  if (!data) {
    throw new ReportEmailError("NO_DATA", "Izveštaj nije pronađen.");
  }
  if (!data.person.email) {
    throw new ReportEmailError(
      "NO_EMAIL",
      `${data.person.firstName} ${data.person.lastName} nema upisan email.`,
    );
  }

  // Generiši PDF buffer (isti generator kao download endpoint)
  const pdfBuffer = await renderToBuffer(PersonReportPdf({ data }));

  // Gmail SMTP preko Nodemailer-a
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  // Ime pošiljaoca koje primalac vidi — tenant naziv ili env override
  const fromName =
    process.env.REPORT_EMAIL_FROM_NAME ?? data.tenant.name ?? "Sistem za kartice";

  const periodLabel = data.period.label;
  const fullName = `${data.person.firstName} ${data.person.lastName}`;
  const fileName = `izvestaj-${data.person.lastName}-${year}-${String(month).padStart(2, "0")}.pdf`;

  const emailParams = {
    fullName,
    tenantName: data.tenant.name,
    periodLabel,
    currentBalance: data.person.currentBalance,
    spent: data.totals.spent,
    toppedUp: data.totals.toppedUp,
  };

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${gmailUser}>`,
      to: data.person.email,
      // Reply-to na sam nalog — primalac može da odgovori, smanjuje "no-reply" spam signal
      replyTo: gmailUser,
      subject: `Mesečni izveštaj o potrošnji — ${periodLabel}`,
      // Multipart: i plain-text i HTML. Spam filteri jako favorizuju mejlove
      // koji imaju obe verzije — HTML-only deluje "automatizovano/spam".
      text: emailText(emailParams),
      html: emailHtml(emailParams),
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
        },
      ],
    });
  } catch (err) {
    console.error("[ReportEmail] Gmail SMTP greška:", err);
    throw new ReportEmailError(
      "SEND_FAILED",
      "Slanje mejla nije uspelo. Proveri Gmail kredencijale ili pokušaj ponovo.",
    );
  }

  return { sentTo: data.person.email };
}

function fmt(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

/** Minimalni HTML escape — imena osoba/organizacija idu u HTML telo mejla. */
function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function emailHtml(p: {
  fullName: string;
  tenantName: string;
  periodLabel: string;
  currentBalance: number;
  spent: number;
  toppedUp: number;
}) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
    <h2 style="margin: 0 0 4px;">${esc(p.tenantName)}</h2>
    <p style="margin: 0 0 16px; color: #71717a;">Mesečni izveštaj o potrošnji</p>
    <p>Poštovani/a <strong>${esc(p.fullName)}</strong>,</p>
    <p>U prilogu se nalazi vaš detaljan izveštaj za period <strong>${esc(p.periodLabel)}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 0; color: #71717a;">Trenutno stanje</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold;">${fmt(p.currentBalance)} RSD</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #71717a;">Potrošeno u mesecu</td>
        <td style="padding: 8px 0; text-align: right;">${fmt(p.spent)} RSD</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #71717a;">Uplaćeno u mesecu</td>
        <td style="padding: 8px 0; text-align: right;">${fmt(p.toppedUp)} RSD</td>
      </tr>
    </table>
    <p style="color: #71717a; font-size: 13px;">
      Detaljan pregled svih transakcija nalazi se u priloženom PDF dokumentu.
      Ako imate pitanja, slobodno odgovorite na ovaj email.
    </p>
    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 16px 0;" />
    <p style="color: #a1a1aa; font-size: 12px;">
      S poštovanjem,<br />${esc(p.tenantName)}
    </p>
  </div>`;
}

/**
 * Plain-text verzija mejla — obavezna uz HTML za dobru deliverability.
 * Spam filteri penalizuju HTML-only mejlove.
 */
function emailText(p: {
  fullName: string;
  tenantName: string;
  periodLabel: string;
  currentBalance: number;
  spent: number;
  toppedUp: number;
}) {
  return [
    `${p.tenantName}`,
    `Mesečni izveštaj o potrošnji`,
    ``,
    `Poštovani/a ${p.fullName},`,
    ``,
    `U prilogu se nalazi vaš detaljan izveštaj za period ${p.periodLabel}.`,
    ``,
    `Trenutno stanje: ${fmt(p.currentBalance)} RSD`,
    `Potrošeno u mesecu: ${fmt(p.spent)} RSD`,
    `Uplaćeno u mesecu: ${fmt(p.toppedUp)} RSD`,
    ``,
    `Detaljan pregled svih transakcija nalazi se u priloženom PDF dokumentu.`,
    `Ako imate pitanja, slobodno odgovorite na ovaj email.`,
    ``,
    `S poštovanjem,`,
    `${p.tenantName}`,
  ].join("\n");
}
