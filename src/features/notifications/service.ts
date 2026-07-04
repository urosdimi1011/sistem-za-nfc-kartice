import "server-only";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail, escapeHtml as esc } from "@/lib/mailer";

/**
 * Automatska email obaveštenja — okidaju se POSLE uspešne porudžbine,
 * van transakcije i van response puta (preko `after()` u akciji).
 *
 * Sva su opt-in preko tenant podešavanja (Podešavanja → Pravila →
 * Email obaveštenja) i tiho se preskaču ako mailer nije konfigurisan.
 * Greške se samo loguju — obaveštenje nikad ne sme da obori porudžbinu.
 */

function fmt(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

/** Mejl osobi: stanje je palo ispod praga. Poziva se samo pri prelasku praga. */
export async function notifyLowBalance(params: {
  tenantId: string;
  personId: string;
  newBalance: number;
  threshold: number;
}): Promise<void> {
  try {
    if (!isMailConfigured()) return;

    const [person, tenant] = await Promise.all([
      prisma.person.findFirst({
        where: { id: params.personId, tenantId: params.tenantId },
        select: { firstName: true, lastName: true, email: true },
      }),
      prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: { name: true },
      }),
    ]);
    if (!person?.email || !tenant) return;

    const fullName = `${person.firstName} ${person.lastName}`;
    const subject = `Nisko stanje kredita — ${fmt(params.newBalance)}`;
    const intro = `Vaše stanje kredita je palo ispod ${fmt(params.threshold)} i trenutno iznosi ${fmt(params.newBalance)}.`;

    await sendMail({
      to: person.email,
      fromName: tenant.name,
      subject,
      text: [
        tenant.name,
        "",
        `Poštovani/a ${fullName},`,
        "",
        intro,
        "",
        "Ako želite dopunu, javite se administraciji.",
      ].join("\n"),
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
    <h2 style="margin: 0 0 16px;">${esc(tenant.name)}</h2>
    <p>Poštovani/a <strong>${esc(fullName)}</strong>,</p>
    <p>${esc(intro)}</p>
    <p style="color: #71717a; font-size: 13px;">Ako želite dopunu, javite se administraciji.</p>
  </div>`,
    });
  } catch (e) {
    console.error("[notifyLowBalance] Slanje nije uspelo:", e);
  }
}

export interface LowStockItem {
  name: string;
  stock: number;
  threshold: number;
}

/** Mejl svim aktivnim adminima tenanta: artikli su pali ispod praga zaliha. */
export async function notifyLowStock(params: {
  tenantId: string;
  items: LowStockItem[];
}): Promise<void> {
  try {
    if (!isMailConfigured() || params.items.length === 0) return;

    const [admins, tenant] = await Promise.all([
      prisma.systemAccount.findMany({
        where: { tenantId: params.tenantId, role: "ADMIN", isActive: true },
        select: { email: true },
      }),
      prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: { name: true },
      }),
    ]);
    if (admins.length === 0 || !tenant) return;

    const lines = params.items.map(
      (i) => `• ${i.name} — na stanju ${fmt(i.stock)} (prag: ${fmt(i.threshold)})`,
    );
    const rowsHtml = params.items
      .map(
        (i) => `
      <tr>
        <td style="padding: 6px 0;">${esc(i.name)}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold;">${fmt(i.stock)}</td>
        <td style="padding: 6px 0; text-align: right; color: #71717a;">${fmt(i.threshold)}</td>
      </tr>`,
      )
      .join("");

    await sendMail({
      to: admins.map((a) => a.email),
      fromName: tenant.name,
      subject: `Niske zalihe — ${params.items.length} ${params.items.length === 1 ? "artikal" : "artikla"}`,
      text: [
        tenant.name,
        "Upozorenje o niskim zalihama",
        "",
        ...lines,
        "",
        "Dopuni zalihe u sekciji Stanje.",
      ].join("\n"),
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
    <h2 style="margin: 0 0 4px;">${esc(tenant.name)}</h2>
    <p style="margin: 0 0 16px; color: #71717a;">Upozorenje o niskim zalihama</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="color: #71717a; font-size: 12px; text-align: left;">
        <th style="padding: 4px 0;">Artikal</th>
        <th style="padding: 4px 0; text-align: right;">Na stanju</th>
        <th style="padding: 4px 0; text-align: right;">Prag</th>
      </tr>
      ${rowsHtml}
    </table>
    <p style="color: #71717a; font-size: 13px; margin-top: 16px;">Dopuni zalihe u sekciji Stanje.</p>
  </div>`,
    });
  } catch (e) {
    console.error("[notifyLowStock] Slanje nije uspelo:", e);
  }
}
