import "server-only";
import { randomInt } from "node:crypto";
import { sql } from "../db";
import { loadSettings } from "../settings";
import { welcomeGiftWindow } from "../rules/gifts";
import { insertGift } from "./gifts-store";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function makeReferralCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export async function findCustomerIdByPhone(phone: string): Promise<string | null> {
  const [row] = await sql<{ id: string }[]>`select id from customers where phone = ${phone} and deleted_at is null`;
  return row?.id ?? null;
}

export type SignupInput = {
  phone: string;
  firstName: string;
  birthday: string | null; // YYYY-MM-DD
  locale: "fr" | "ar" | "en";
  referralCode: string | null;
};

/** Creates the customer, links the referrer, and gives the bounce-back welcome gift (locked until tomorrow). */
export async function createCustomer(input: SignupInput, now = new Date()): Promise<{ id: string; created: boolean }> {
  return sql.begin(async (tx) => {
    const settings = await loadSettings(tx);
    // Serialise concurrent sign-ups of the same phone number.
    await tx`select pg_advisory_xact_lock(hashtext(${input.phone}))`;
    const [existing] = await tx<{ id: string }[]>`select id from customers where phone = ${input.phone} and deleted_at is null`;
    if (existing) return { id: existing.id, created: false };

    let referrerId: string | null = null;
    if (input.referralCode) {
      const [ref] = await tx<{ id: string }[]>`
        select id from customers where referral_code = ${input.referralCode.toUpperCase()} and deleted_at is null`;
      referrerId = ref?.id ?? null;
    }

    let id = "";
    for (let attempt = 0; !id; attempt++) {
      const rows = await tx<{ id: string }[]>`
        insert into customers (phone, first_name, birthday, locale, referral_code, referred_by, consent_at, created_at)
        values (${input.phone}, ${input.firstName}, ${input.birthday}, ${input.locale}, ${makeReferralCode()},
                ${referrerId}, ${now}, ${now})
        on conflict (referral_code) do nothing
        returning id`;
      id = rows[0]?.id ?? "";
      if (!id && attempt > 5) throw new Error("could not allocate a referral code");
    }

    if (referrerId) await tx`insert into referrals (referrer_id, referee_id) values (${referrerId}, ${id})`;

    if (settings.welcomeGiftEnabled) {
      await insertGift(tx, {
        customerId: id,
        source: "welcome",
        title: settings.welcomeGift,
        window: welcomeGiftWindow(now, settings),
      });
    }
    return { id, created: true };
  });
}

/**
 * "Delete my account": personal data is erased at once (Law 09-08). Visits stay
 * as anonymous rows so the café's statistics remain correct.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`delete from push_subscriptions where customer_id = ${customerId}`;
    await tx`delete from push_log where customer_id = ${customerId}`;
    await tx`
      update customers set phone = null, first_name = '—', birthday = null, preferred_choice = null,
        referral_code = 'DEL-' || replace(id::text, '-', ''), deleted_at = now()
      where id = ${customerId}`;
  });
}
