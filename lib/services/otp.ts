import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { sql } from "../db";
import { env } from "../env";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

function hash(phone: string, code: string) {
  return createHmac("sha256", env.sessionSecret()).update(`otp:${phone}:${code}`).digest("hex");
}

/** Creates (or replaces) the pending code for this phone and returns it. */
export async function issueOtp(phone: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sql`
    insert into otp_codes (phone, code_hash, expires_at, attempts)
    values (${phone}, ${hash(phone, code)}, now() + make_interval(mins => ${OTP_TTL_MINUTES}), 0)
    on conflict (phone) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at,
      attempts = 0, created_at = now()`;
  return code;
}

export type OtpCheck = "ok" | "invalid" | "expired" | "too_many";

export async function checkOtp(phone: string, code: string): Promise<OtpCheck> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ codeHash: string; expired: boolean; attempts: number }[]>`
      select code_hash, expires_at < now() as expired, attempts from otp_codes where phone = ${phone} for update`;
    if (!row) return "expired";
    if (row.expired) {
      await tx`delete from otp_codes where phone = ${phone}`;
      return "expired";
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) return "too_many";
    const a = Buffer.from(row.codeHash, "hex");
    const b = Buffer.from(hash(phone, code.trim()), "hex");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      await tx`delete from otp_codes where phone = ${phone}`;
      return "ok";
    }
    await tx`update otp_codes set attempts = attempts + 1 where phone = ${phone}`;
    return row.attempts + 1 >= OTP_MAX_ATTEMPTS ? "too_many" : "invalid";
  });
}
