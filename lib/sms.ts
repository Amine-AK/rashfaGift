import "server-only";
import { env } from "./env";

export type SmsResult = { sent: true } | { sent: false; devCode: string };

/** Sends the login SMS with Twilio, or hands the code back in dev mode. */
export async function sendLoginSms(to: string, body: string, code: string): Promise<SmsResult> {
  const twilio = env.twilio();
  if (!twilio) {
    if (env.otpDevMode()) {
      console.info(`[dev] login code for ${to}: ${code}`);
      return { sent: false, devCode: code };
    }
    throw new Error("SMS is not configured (set TWILIO_* or OTP_DEV_MODE=true for development).");
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: twilio.from, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
  return { sent: true };
}
