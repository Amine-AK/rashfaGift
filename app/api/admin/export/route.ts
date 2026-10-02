import { getCurrentStaff } from "@/lib/auth/staff";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

function csv(rows: Record<string, unknown>[], columns: string[]): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
    // Quote everything and neutralise spreadsheet formulas.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  return "﻿" + [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n");
}

/** CSV exports for the owner (Excel-friendly UTF-8). Every export is written to the audit log. */
export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "admin") return new Response("forbidden", { status: 403 });
  const type = new URL(request.url).searchParams.get("type");

  let body: string;
  if (type === "customers") {
    const rows = await sql`
      select id, first_name, phone, birthday, locale, points, visit_count, last_visit_at, referral_code, created_at
      from customers where deleted_at is null order by created_at`;
    body = csv(rows, ["id", "firstName", "phone", "birthday", "locale", "points", "visitCount", "lastVisitAt", "referralCode", "createdAt"]);
  } else if (type === "visits") {
    const rows = await sql`
      select v.created_at, v.customer_id, v.amount, v.counted, v.reason, v.choice, v.discount_percent, s.name as staff
      from visits v left join staff s on s.id = v.staff_id order by v.created_at`;
    body = csv(rows, ["createdAt", "customerId", "amount", "counted", "reason", "choice", "discountPercent", "staff"]);
  } else {
    return new Response("unknown export", { status: 400 });
  }
  await sql`insert into audit_log (staff_id, action, payload) values (${staff.id}, 'export', ${sql.json({ type })})`;
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rashfa-${type}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
