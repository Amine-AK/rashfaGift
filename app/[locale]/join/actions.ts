"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { sendLoginSms } from "@/lib/sms";
import { checkOtp, issueOtp } from "@/lib/services/otp";
import { createCustomer, findCustomerIdByPhone } from "@/lib/services/customers";
import { startCustomerSession } from "@/lib/auth/customer";
import { signToken, verifyToken } from "@/lib/auth/tokens";
import { routing } from "@/i18n/routing";

type Fail = { ok: false; error: string };

export async function requestCode(rawPhone: string, locale: string): Promise<{ ok: true; phone: string; devCode?: string } | Fail> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "invalidPhone" };
  const ip = await clientIp();
  const allowed = (await rateLimit(`otp:phone:${phone}`, 3, 15 * 60)) && (await rateLimit(`otp:ip:${ip}`, 12, 60 * 60));
  if (!allowed) return { ok: false, error: "tooMany" };

  const code = await issueOtp(phone);
  const t = await getTranslations({ locale: routing.locales.includes(locale as never) ? locale : "fr", namespace: "join" });
  try {
    const res = await sendLoginSms(phone, t("smsBody", { code }), code);
    return res.sent ? { ok: true, phone } : { ok: true, phone, devCode: res.devCode };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "smsFailed" };
  }
}

export async function verifyCode(phone: string, code: string): Promise<{ ok: true; next: "home" } | { ok: true; next: "profile"; ticket: string } | Fail> {
  if (!/^\+\d{8,15}$/.test(phone) || !/^\d{6}$/.test(code.trim())) return { ok: false, error: "invalidCode" };
  if (!(await rateLimit(`otp-verify:ip:${await clientIp()}`, 40, 60 * 60))) return { ok: false, error: "tooMany" };

  const check = await checkOtp(phone, code);
  if (check === "invalid") return { ok: false, error: "invalidCode" };
  if (check === "expired") return { ok: false, error: "expiredCode" };
  if (check === "too_many") return { ok: false, error: "tooManyAttempts" };

  const existing = await findCustomerIdByPhone(phone);
  if (existing) {
    await startCustomerSession(existing);
    return { ok: true, next: "home" };
  }
  return { ok: true, next: "profile", ticket: await signToken({ phone }, "signup", "30m") };
}

const profileSchema = z.object({
  ticket: z.string().min(10),
  firstName: z.string().trim().min(1).max(40),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => {
      const date = new Date(`${d}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.getUTCFullYear() >= 1900 && date < new Date();
    })
    .nullable(),
  consent: z.literal(true),
  referralCode: z.string().trim().max(12).nullable(),
  locale: z.enum(routing.locales),
});

export async function completeSignup(input: z.input<typeof profileSchema>): Promise<{ ok: true; next: "welcome" | "home" } | Fail> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === "consent" ? "consentRequired" : field === "birthday" ? "invalidBirthday" : "invalidName" };
  }
  const ticket = await verifyToken<{ phone: string }>(parsed.data.ticket, "signup");
  if (!ticket?.phone) return { ok: false, error: "expiredCode" };

  const { id, created } = await createCustomer({
    phone: ticket.phone,
    firstName: parsed.data.firstName,
    birthday: parsed.data.birthday,
    locale: parsed.data.locale,
    referralCode: parsed.data.referralCode,
  });
  await startCustomerSession(id);
  return { ok: true, next: created ? "welcome" : "home" };
}
