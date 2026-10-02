import "server-only";
import webpush from "web-push";
import { sql } from "./db";
import { env } from "./env";
import type { Settings } from "./settings";
import { canSendPush } from "./rules/push";

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type PushOutcome = "sent" | "no_subscription" | "quiet_hours" | "weekly_cap" | "failed" | "not_configured";

let configured = false;
function configure(): boolean {
  const vapid = env.vapid();
  if (!vapid) return false;
  if (!configured) {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    configured = true;
  }
  return true;
}

/** Sends one notification to all of a customer's devices, after the anti-spam checks. */
export async function sendPush(
  customerId: string,
  payload: PushPayload,
  meta: { kind: "flash" | "winback" | "birthday"; refId?: string | null },
  s: Settings,
  now = new Date(),
): Promise<PushOutcome> {
  if (!configure()) return "not_configured";
  const subs = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
    select id, endpoint, p256dh, auth from push_subscriptions where customer_id = ${customerId}`;
  if (!subs.length) return "no_subscription";

  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from push_log
    where customer_id = ${customerId} and sent_at > ${new Date(now.getTime() - 7 * 86_400_000)}`;
  const decision = canSendPush(count, now, s);
  if (!decision.ok) return decision.reason;

  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 4, urgency: "normal" },
      );
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // The browser dropped this subscription: forget it.
      if (status === 404 || status === 410) await sql`delete from push_subscriptions where id = ${sub.id}`;
      else console.error("push failed", status, (err as Error).message);
    }
  }
  if (!delivered) return "failed";
  await sql`insert into push_log (customer_id, kind, ref_id, sent_at) values (${customerId}, ${meta.kind}, ${meta.refId ?? null}, ${now})`;
  return "sent";
}
