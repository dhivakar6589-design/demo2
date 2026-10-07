/**
 * Transactional email.
 *
 * The rendered body is deliberately plain, inline-styled HTML: email clients
 * strip <style> blocks in some clients and flexbox in most, so every rule
 * lives on the element itself. Fonts fall back to the system stack.
 *
 * EMAIL_DRIVER:
 *   console — logs a preview (default; zero setup)
 *   resend  — real delivery via RESEND_API_KEY
 */

import { formatMoney } from "@/lib/utils";

export interface EmailInput {
  to: string;
  subject: string;
  preview?: string;
  heading: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  meta?: { label: string; value: string }[];
  footnote?: string;
}

const shell = (inner: string, heading: string, body: string, action?: { label: string; href: string }, footnote?: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aurelia</title></head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${
    inner.length ? "" : ""
  }</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F4;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E7E1D6;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0F1B2D;padding:28px 32px;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.02em;color:#FAF8F4;">Aurelia</span>
          <span style="display:block;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#C9A24B;margin-top:6px;">Event Concierge</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:#1C1C1E;font-weight:500;">${heading}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#5B6270;">${body}</p>
          ${
            inner
          }
          ${
            action
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:8px;background:#0F1B2D;">
                   <a href="${action.href}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:500;color:#FAF8F4;text-decoration:none;">${action.label}</a>
                 </td></tr></table>`
              : ""
          }
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8A919E;border-top:1px solid #EFEAE0;padding-top:18px;">
            ${footnote ?? "You are receiving this because you have an active Aurelia account."}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

export function renderEmail(input: EmailInput) {
  const metaRows = input.meta?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #EFEAE0;border-radius:12px;">
        ${input.meta
          .map(
            (m) => `<tr>
              <td style="padding:12px 16px;font-size:13px;color:#8A919E;border-bottom:1px solid #F4F0E8;width:42%;">${m.label}</td>
              <td style="padding:12px 16px;font-size:13px;color:#1C1C1E;font-weight:500;text-align:right;">${m.value}</td>
            </tr>`,
          )
          .join("")}
       </table>`
    : "";

  return shell(
    metaRows,
    input.heading,
    input.body,
    input.actionLabel && input.actionHref
      ? { label: input.actionLabel, href: input.actionHref }
      : undefined,
    input.footnote,
  );
}

export async function sendEmail(input: EmailInput) {
  const html = renderEmail(input);
  const driver = (process.env.EMAIL_DRIVER ?? "console").toLowerCase();
  const from = process.env.EMAIL_FROM ?? "Aurelia <concierge@aurelia.events>";

  if (driver === "resend" && process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html,
        text: `${input.heading}\n\n${input.body}`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
    }
    return { delivered: true, driver: "resend" as const };
  }

  // Console driver — surfaces the subject line without flooding the terminal.
  console.log(
    `[email] → ${input.to}  ${input.subject}${
      input.actionHref ? `\n         ${input.actionHref}` : ""
    }`,
  );
  return { delivered: false, driver: "console" as const };
}

export { formatMoney };