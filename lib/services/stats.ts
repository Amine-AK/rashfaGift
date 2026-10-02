import "server-only";
import { sql } from "../db";
import type { I18nText } from "../i18n-text";
import type { Settings } from "../settings";
import { startOfLocalMonth } from "../time";

export type Stats = Awaited<ReturnType<typeof loadStats>>;

/** Everything on the owner's dashboard. All grouping happens in café-local time. */
export async function loadStats(s: Settings, now = new Date()) {
  const tz = s.timezone;
  const monthStart = startOfLocalMonth(now, tz);
  const weeksAgo = (n: number) => new Date(now.getTime() - n * 7 * 86_400_000);

  const [totals] = await sql<{ customers: number; active30: number; returning: number; visited: number; visitsWeek: number; newWeek: number }[]>`
    select
      count(*) filter (where deleted_at is null)::int as customers,
      count(*) filter (where deleted_at is null and last_visit_at > ${new Date(now.getTime() - 30 * 86_400_000)})::int as active30,
      count(*) filter (where visit_count >= 2)::int as returning,
      count(*) filter (where visit_count >= 1)::int as visited,
      (select count(*) from visits where counted and created_at > ${weeksAgo(1)})::int as visits_week,
      count(*) filter (where created_at > ${weeksAgo(1)})::int as new_week
    from customers`;

  const newPerWeek = await sql<{ week: string; count: number }[]>`
    with weeks as (
      select generate_series(date_trunc('week', ${weeksAgo(7)}::timestamptz at time zone ${tz}),
                             date_trunc('week', ${now}::timestamptz at time zone ${tz}), interval '1 week') as week
    )
    select to_char(w.week, 'YYYY-MM-DD') as week, count(c.id)::int as count
    from weeks w left join customers c
      on date_trunc('week', c.created_at at time zone ${tz}) = w.week
    group by w.week order by w.week`;

  const heatmap = await sql<{ dow: number; hour: number; count: number }[]>`
    select extract(isodow from created_at at time zone ${tz})::int as dow,
           extract(hour from created_at at time zone ${tz})::int as hour,
           count(*)::int as count
    from visits where counted and created_at > ${weeksAgo(8)}
    group by 1, 2`;

  const [choices] = await sql<{ discount: number; save: number }[]>`
    select count(*) filter (where choice = 'discount')::int as discount,
           count(*) filter (where choice = 'save')::int as save
    from visits where counted and created_at > ${new Date(now.getTime() - 30 * 86_400_000)}`;

  const [gifts] = await sql<{ unlocked: number; claimed: number; cost: number; rare: number; open: number }[]>`
    select
      count(*) filter (where created_at >= ${monthStart})::int as unlocked,
      count(*) filter (where claimed_at >= ${monthStart} or (last_used_at >= ${monthStart}))::int as claimed,
      coalesce(sum(est_cost) filter (where claimed_at >= ${monthStart}), 0)::float as cost,
      count(*) filter (where tier = 'rare' and source = 'mystery' and created_at >= ${monthStart})::int as rare,
      count(*) filter (where claimed_at is null and expires_at > ${now})::int as open
    from customer_gifts`;

  const flash = await sql<{ id: string; title: I18nText; startsAt: Date; pushedCount: number; claimedQty: number; maxQty: number; pushStatus: string }[]>`
    select id, title, starts_at, pushed_count, claimed_qty, max_qty, push_status
    from flash_offers where starts_at <= ${now} order by starts_at desc limit 8`;

  const [winback] = await sql<{ sent: number; returned: number }[]>`
    select count(*)::int as sent, count(returned_at)::int as returned
    from winback_events where sent_at > ${new Date(now.getTime() - 90 * 86_400_000)}`;

  return {
    totals,
    returningRate: totals.visited ? totals.returning / totals.visited : 0,
    newPerWeek,
    heatmap,
    choices,
    gifts,
    flash,
    winback: { ...winback, rate: winback.sent ? winback.returned / winback.sent : 0 },
  };
}
