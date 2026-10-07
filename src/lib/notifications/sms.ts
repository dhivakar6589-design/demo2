/**
 * SMS / WhatsApp delivery.
 *
 * Off by default. `SMS_DRIVER=twilio` plus credentials switches on real
 * delivery; anything else logs the message so the flow stays inspectable in
 * development without a provider account.
 *
 * SMS copy is deliberately short — Indian transactional SMS is billed per
 * segment and long bodies silently truncate, so callers pass short strings.
 */

import type { NotificationChannel } from "@/lib/constants";

export interface SmsInput {
  to: string;
  body: string;
  channel?: NotificationChannel;
}

export async function sendSms(input: SmsInput) {
  const driver = (process.env.SMS_DRIVER ?? "off").toLowerCase();
  const channel = input.channel ?? "SMS";

  if (channel === "WHATSAPP" && (process.env.WHATSAPP_ENABLED ?? "false") !== "true") {
    return { sent: false, driver: "off", reason: "WhatsApp disabled" };
  }

  if (driver === "twilio" && process.env.TWILIO_ACCOUNT_SID) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } =
      process.env;

    const form = new URLSearchParams({
      To: input.to,
      From: from ?? "",
      Body: input.body.slice(0, 300),
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    if (!res.ok) throw new Error(`Twilio failed: ${res.status} ${await res.text()}`);
    return { sent: true, driver: "twilio" as const };
  }

  console.log(`[${channel.toLowerCase()}] → ${input.to}  ${input.body}`);
  return { sent: false, driver: "off" as const };
}