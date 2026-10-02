import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { sql } from "../db";
import { signToken, verifyToken } from "./tokens";

const COOKIE = "rashfa_c";
const MAX_AGE_DAYS = 180;

export type CustomerRow = {
  id: string;
  phone: string;
  firstName: string;
  birthday: Date | null;
  locale: "fr" | "ar" | "en";
  points: number;
  visitCount: number;
  lastVisitAt: Date | null;
  referralCode: string;
  preferredChoice: "discount" | "save" | null;
  createdAt: Date;
};

export async function startCustomerSession(customerId: string) {
  const token = await signToken({ sub: customerId }, "customer", `${MAX_AGE_DAYS}d`);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 3600,
  });
}

export async function endCustomerSession() {
  (await cookies()).delete(COOKIE);
}

/** Cheap check (no database): is there a valid customer cookie? */
export const getCustomerSession = cache(async (): Promise<{ customerId: string } | null> => {
  const payload = await verifyToken((await cookies()).get(COOKIE)?.value, "customer");
  return payload?.sub ? { customerId: payload.sub } : null;
});

/** The signed-in customer, or null if logged out or the account was deleted. */
export const getCurrentCustomer = cache(async (): Promise<CustomerRow | null> => {
  const session = await getCustomerSession();
  if (!session) return null;
  const [row] = await sql<CustomerRow[]>`
    select id, phone, first_name, birthday, locale, points, visit_count, last_visit_at,
           referral_code, preferred_choice, created_at
    from customers where id = ${session.customerId} and deleted_at is null`;
  return row ?? null;
});
