"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "../db";
import { endCustomerSession, getCustomerSession } from "../auth/customer";
import { deleteCustomer } from "../services/customers";
import { routing } from "@/i18n/routing";

async function me() {
  const session = await getCustomerSession();
  if (!session) throw new Error("unauthenticated");
  return session.customerId;
}

/** "Today I'd like to…": shown to the barista as the default choice. */
export async function setPreferredChoice(choice: "discount" | "save" | null) {
  const id = await me();
  const value = z.enum(["discount", "save"]).nullable().parse(choice);
  await sql`update customers set preferred_choice = ${value} where id = ${id} and deleted_at is null`;
  revalidatePath("/[locale]/home", "page");
}

export async function revealGift(giftId: string) {
  const id = await me();
  await sql`update customer_gifts set revealed_at = coalesce(revealed_at, now())
            where id = ${z.string().uuid().parse(giftId)} and customer_id = ${id}`;
}

export async function setLocale(locale: string) {
  const id = await me();
  const value = z.enum(routing.locales).parse(locale);
  await sql`update customers set locale = ${value} where id = ${id}`;
}

export async function logout() {
  await endCustomerSession();
}

export async function deleteMyAccount() {
  const id = await me();
  await deleteCustomer(id);
  await endCustomerSession();
}
