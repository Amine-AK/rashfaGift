import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/** Live counters for flash offers (public data). Fallback when Supabase Realtime is not configured. */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 10);
  if (!ids.length) return Response.json([]);
  const rows = await sql`select id, claimed_qty, max_qty, ends_at, stopped_at from flash_offers where id = any(${ids}::uuid[])`;
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}
