import "server-only";
import { createTranslator } from "next-intl";
import fr from "@/messages/fr.json";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { sql } from "../db";
import { env } from "../env";
import { tr, type I18nText } from "../i18n-text";
import { loadSettings, type Settings } from "../settings";
import { sendPush, type PushOutcome } from "../push";
import { isQuietHour } from "../rules/push";
import { isTargeted } from "../rules/flash";
import { levelFor } from "../rules/levels";
import { immediateGiftWindow } from "../rules/gifts";
import { isBirthdayToday, isWinbackDue } from "../rules/engagement";
import { localParts } from "../time";
import { insertGift } from "./gifts-store";

type Locale = "fr" | "ar" | "en";
const BATCH = 200;

const catalogs = { fr, ar, en };

/** Push texts in the customer's language (works outside a request, e.g. in the scheduler). */
function pushT(locale: Locale) {
  return createTranslator({ locale, messages: catalogs[locale] ?? fr, namespace: "push" });
}

function link(locale: Locale, path: string) {
  return `${env.appUrl()}/${locale}${path}`;
}

function tally(outcomes: PushOutcome[]) {
  return outcomes.reduce<Record<string, number>>((acc, o) => ((acc[o] = (acc[o] ?? 0) + 1), acc), {});
}

/** When a flash offer starts, notify the targeted customers once (unless it is night time). */
export async function runFlashPushes(s: Settings, now = new Date()) {
  const due = await sql<{ id: string }[]>`
    select id from flash_offers
    where push_status = 'pending' and stopped_at is null and starts_at <= ${now} and ends_at > ${now}`;
  const report: Record<string, unknown>[] = [];
  for (const { id } of due) {
    const quiet = isQuietHour(now, s);
    // Claim the offer atomically so two overlapping cron runs never notify twice.
    const [offer] = await sql<{ id: string; title: I18nText; reward: I18nText; endsAt: Date; maxQty: number; target: "all" | "level" | "inactive"; targetLevel: never }[]>`
      update flash_offers set push_status = ${quiet ? "skipped" : "sent"}
      where id = ${id} and push_status = 'pending'
      returning id, title, reward, ends_at, max_qty, target, target_level`;
    if (!offer || quiet) {
      report.push({ offer: id, skipped: quiet ? "quiet_hours" : "taken" });
      continue;
    }
    const audience = await sql<{ id: string; locale: Locale; visitCount: number; lastVisitAt: Date | null; createdAt: Date }[]>`
      select c.id, c.locale, c.visit_count, c.last_visit_at, c.created_at from customers c
      where c.deleted_at is null and exists (select 1 from push_subscriptions p where p.customer_id = c.id)`;
    const outcomes: PushOutcome[] = [];
    for (const c of audience) {
      if (!isTargeted(offer, { level: levelFor(c.visitCount, s), lastVisitAt: c.lastVisitAt, createdAt: c.createdAt }, now)) continue;
      const t = pushT(c.locale);
      const until = new Intl.DateTimeFormat(c.locale, { hour: "2-digit", minute: "2-digit", timeZone: s.timezone }).format(offer.endsAt);
      outcomes.push(
        await sendPush(
          c.id,
          {
            title: tr(offer.title, c.locale),
            body: t("flashBody", { reward: tr(offer.reward, c.locale), qty: offer.maxQty, until }),
            url: link(c.locale, "/home"),
            tag: `flash-${offer.id}`,
          },
          { kind: "flash", refId: offer.id },
          s,
          now,
        ),
      );
    }
    const counts = tally(outcomes);
    await sql`update flash_offers set pushed_count = ${counts.sent ?? 0} where id = ${offer.id}`;
    report.push({ offer: offer.id, ...counts });
  }
  return report;
}

/** "We miss you": one gentle message and a small gift per inactivity period. */
export async function runWinback(s: Settings, now = new Date()) {
  if (!s.winbackEnabled || isQuietHour(now, s)) return { skipped: true };
  const cutoff = new Date(now.getTime() - s.winbackDays * 86_400_000);
  const candidates = await sql<{ id: string; locale: Locale; lastVisitAt: Date | null; createdAt: Date; lastWinbackAt: Date | null }[]>`
    select c.id, c.locale, c.last_visit_at, c.created_at,
           (select max(sent_at) from winback_events w where w.customer_id = c.id) as last_winback_at
    from customers c
    where c.deleted_at is null and c.visit_count > 0 and c.last_visit_at < ${cutoff}
      and not exists (select 1 from winback_events w where w.customer_id = c.id and w.sent_at >= c.last_visit_at)
    order by c.last_visit_at
    limit ${BATCH}`;
  const outcomes: PushOutcome[] = [];
  for (const c of candidates) {
    if (!isWinbackDue(c, now, s)) continue;
    const created = await sql.begin(async (tx) => {
      // Re-check under lock: the customer may have just visited.
      const [fresh] = await tx`select 1 from customers where id = ${c.id} and last_visit_at < ${cutoff} for update`;
      if (!fresh) return false;
      const giftId = await insertGift(tx, {
        customerId: c.id,
        source: "winback",
        title: s.winbackGift,
        window: immediateGiftWindow(now, s.winbackGiftValidityDays, s.timezone),
      });
      await tx`insert into winback_events (customer_id, gift_id, sent_at) values (${c.id}, ${giftId}, ${now})`;
      return true;
    });
    if (!created) continue;
    const t = pushT(c.locale);
    outcomes.push(
      await sendPush(c.id, { title: t("winbackTitle"), body: t("winbackBody"), url: link(c.locale, "/home"), tag: "winback" }, { kind: "winback" }, s, now),
    );
  }
  return { gifts: outcomes.length, ...tally(outcomes) };
}

/** A small gift on the customer's birthday, once a year. */
export async function runBirthdays(s: Settings, now = new Date()) {
  if (!s.birthdayEnabled || isQuietHour(now, s)) return { skipped: true };
  const today = localParts(now, s.timezone);
  const candidates = await sql<{ id: string; locale: Locale; firstName: string; birthday: Date; birthdayGiftYear: number | null }[]>`
    select id, locale, first_name, birthday, birthday_gift_year from customers
    where deleted_at is null and birthday is not null
      and (birthday_gift_year is null or birthday_gift_year < ${today.year})
      and (extract(month from birthday) = ${today.month} and extract(day from birthday) in (${today.day}, 29))
    limit ${BATCH}`;
  const outcomes: PushOutcome[] = [];
  for (const c of candidates) {
    if (!isBirthdayToday(c.birthday, c.birthdayGiftYear, now, s.timezone)) continue;
    const created = await sql.begin(async (tx) => {
      const [row] = await tx`update customers set birthday_gift_year = ${today.year}
                             where id = ${c.id} and (birthday_gift_year is null or birthday_gift_year < ${today.year}) returning id`;
      if (!row) return false;
      await insertGift(tx, {
        customerId: c.id,
        source: "birthday",
        title: s.birthdayGift,
        window: immediateGiftWindow(now, s.birthdayGiftValidityDays, s.timezone),
      });
      return true;
    });
    if (!created) continue;
    const t = pushT(c.locale);
    outcomes.push(
      await sendPush(
        c.id,
        { title: t("birthdayTitle", { name: c.firstName }), body: t("birthdayBody"), url: link(c.locale, "/home"), tag: "birthday" },
        { kind: "birthday" },
        s,
        now,
      ),
    );
  }
  return { gifts: outcomes.length, ...tally(outcomes) };
}

export async function cleanup(now = new Date()) {
  await sql`delete from otp_codes where expires_at < ${now}`;
  await sql`delete from rate_limits where window_start < ${new Date(now.getTime() - 86_400_000)}`;
}

/** Everything the scheduler runs every few minutes. */
export async function runScheduledJobs(now = new Date()) {
  const s = await loadSettings();
  const flash = await runFlashPushes(s, now);
  const winback = await runWinback(s, now);
  const birthdays = await runBirthdays(s, now);
  await cleanup(now);
  return { at: now.toISOString(), flash, winback, birthdays };
}
