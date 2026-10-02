import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { sql } from "../db";
import { signToken, verifyToken } from "./tokens";

const COOKIE = "rashfa_s";
const SHIFT_HOURS = 14;

export type StaffMember = { id: string; name: string; role: "barista" | "admin" };

export async function startStaffSession(staffId: string) {
  const token = await signToken({ sub: staffId }, "staff", `${SHIFT_HOURS}h`);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SHIFT_HOURS * 3600,
  });
}

export async function endStaffSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in staff member. Re-checked against the database so a deactivated PIN stops working at once. */
export const getCurrentStaff = cache(async (): Promise<StaffMember | null> => {
  const payload = await verifyToken((await cookies()).get(COOKIE)?.value, "staff");
  if (!payload?.sub) return null;
  const [row] = await sql<StaffMember[]>`select id, name, role from staff where id = ${payload.sub} and active`;
  return row ?? null;
});

export class AuthError extends Error {
  constructor(public code: "unauthenticated" | "forbidden") {
    super(code);
  }
}

export async function requireStaff(): Promise<StaffMember> {
  const staff = await getCurrentStaff();
  if (!staff) throw new AuthError("unauthenticated");
  return staff;
}

export async function requireAdmin(): Promise<StaffMember> {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new AuthError("forbidden");
  return staff;
}
