"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyQrToken } from "@/lib/qr";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { endStaffSession, getCurrentStaff, startStaffSession } from "@/lib/auth/staff";
import { signToken, verifyToken } from "@/lib/auth/tokens";
import {
  LoyaltyError,
  claimFlashOffer,
  claimGift,
  getScanSummary,
  giftOwner,
  registerVisit,
  type ScanSummary,
  type VisitResult,
} from "@/lib/services/loyalty";

type Fail = { ok: false; error: string; detail?: string };

export async function loginStaff(pin: string): Promise<{ ok: true; role: "barista" | "admin" } | Fail> {
  if (!/^\d{4,12}$/.test(pin)) return { ok: false, error: "wrongPin" };
  if (!(await rateLimit(`staff-login:${await clientIp()}`, 8, 10 * 60))) return { ok: false, error: "tooMany" };
  const staff = await sql<{ id: string; pinHash: string; role: "barista" | "admin" }[]>`
    select id, pin_hash, role from staff where active`;
  for (const member of staff) {
    if (await bcrypt.compare(pin, member.pinHash)) {
      await startStaffSession(member.id);
      await sql`insert into audit_log (staff_id, action, payload) values (${member.id}, 'staff_login', '{}')`;
      return { ok: true, role: member.role };
    }
  }
  return { ok: false, error: "wrongPin" };
}

export async function logoutStaff() {
  await endStaffSession();
}

async function staffOrFail() {
  const staff = await getCurrentStaff();
  if (!staff) throw new LoyaltyError("customer_not_found", "unauthenticated");
  return staff;
}

function fail(err: unknown): Fail {
  if (err instanceof LoyaltyError) {
    if (err.detail === "unauthenticated") return { ok: false, error: "unauthenticated" };
    if (err.detail === "ticket") return { ok: false, error: "ticketExpired" };
    return { ok: false, error: err.code, detail: err.detail };
  }
  console.error(err);
  return { ok: false, error: "generic" };
}

/** Scanned a QR code: check it, and hand back a short-lived ticket for the actions that follow. */
export async function lookupScan(token: string): Promise<{ ok: true; ticket: string; summary: ScanSummary; giftId: string | null } | Fail> {
  try {
    const staff = await staffOrFail();
    if (!(await rateLimit(`scan:${staff.id}`, 60, 60))) return { ok: false, error: "tooMany" };
    const res = verifyQrToken(token, env.qrSecret());
    if (!res.ok) return { ok: false, error: res.reason === "expired" ? "qrExpired" : "qrInvalid" };

    let customerId = res.payload.id;
    let giftId: string | null = null;
    if (res.payload.kind === "g") {
      giftId = res.payload.id;
      const owner = await giftOwner(giftId);
      if (!owner) return { ok: false, error: "qrInvalid" };
      customerId = owner;
    }
    const summary = await getScanSummary(customerId);
    const ticket = await signToken({ sub: customerId, stf: staff.id }, "scan", "10m");
    return { ok: true, ticket, summary, giftId };
  } catch (err) {
    return fail(err);
  }
}

async function fromTicket(ticket: string) {
  const staff = await staffOrFail();
  const payload = await verifyToken<{ sub: string; stf: string }>(ticket, "scan");
  if (!payload?.sub || payload.stf !== staff.id) throw new LoyaltyError("customer_not_found", "ticket");
  return { staff, customerId: payload.sub };
}

const visitSchema = z.object({ amount: z.number().min(0).max(100_000), choice: z.enum(["discount", "save"]) });

export async function recordVisit(ticket: string, amount: number, choice: "discount" | "save"): Promise<{ ok: true; result: VisitResult; summary: ScanSummary } | Fail> {
  try {
    const { staff, customerId } = await fromTicket(ticket);
    const input = visitSchema.parse({ amount, choice });
    const result = await registerVisit({ customerId, staffId: staff.id, ...input });
    return { ok: true, result, summary: await getScanSummary(customerId) };
  } catch (err) {
    return fail(err);
  }
}

export async function redeemGift(ticket: string, giftId: string) {
  try {
    const { staff, customerId } = await fromTicket(ticket);
    const result = await claimGift({ customerId, giftId: z.string().uuid().parse(giftId), staffId: staff.id });
    return { ok: true as const, result, summary: await getScanSummary(customerId) };
  } catch (err) {
    return fail(err);
  }
}

export async function redeemFlash(ticket: string, offerId: string) {
  try {
    const { staff, customerId } = await fromTicket(ticket);
    const result = await claimFlashOffer({ customerId, offerId: z.string().uuid().parse(offerId), staffId: staff.id });
    return { ok: true as const, result, summary: await getScanSummary(customerId) };
  } catch (err) {
    return fail(err);
  }
}
