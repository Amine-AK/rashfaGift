"use server";

import { z } from "zod";
import { sql } from "../db";
import { getCustomerSession } from "../auth/customer";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscription(input: unknown): Promise<{ ok: boolean }> {
  const session = await getCustomerSession();
  const parsed = subscriptionSchema.safeParse(input);
  if (!session || !parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  await sql`
    insert into push_subscriptions (customer_id, endpoint, p256dh, auth)
    values (${session.customerId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    on conflict (endpoint) do update set customer_id = excluded.customer_id, p256dh = excluded.p256dh, auth = excluded.auth`;
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const session = await getCustomerSession();
  if (!session) return;
  await sql`delete from push_subscriptions where endpoint = ${endpoint} and customer_id = ${session.customerId}`;
}
