import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { runScheduledJobs } from "@/lib/services/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret()}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called every 5 minutes by pg_cron (Supabase) or any scheduler, with
 * `Authorization: Bearer $CRON_SECRET`. Sends flash-offer pushes when offers
 * start, win-back and birthday gifts, and cleans up expired codes.
 */
async function handle(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const report = await runScheduledJobs();
  return Response.json(report);
}

export const GET = handle;
export const POST = handle;
