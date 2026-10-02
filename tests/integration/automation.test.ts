/** Scheduled jobs against a real Postgres, with web-push mocked. Needs TEST_DATABASE_URL. */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import postgres from "postgres";

const sent: { endpoint: string; payload: { title: string; body: string } }[] = [];
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }, payload: string) => {
      if (sub.endpoint.includes("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
    },
  },
}));

const url = process.env.TEST_DATABASE_URL;
if (url) {
  process.env.DATABASE_URL = url;
  process.env.SESSION_SECRET ??= "integration-test-secret-integration-test";
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public";
  process.env.VAPID_PRIVATE_KEY = "test-private";
}

const DAY = 86_400_000;
const afternoon = new Date("2026-10-05T14:00:00Z"); // 15:00 in Casablanca
const night = new Date("2026-10-05T22:30:00Z"); // 23:30

describe.skipIf(!url)("scheduled jobs (Postgres)", () => {
  let admin: postgres.Sql;
  let jobs: typeof import("@/lib/services/automation");
  let s: import("@/lib/settings-schema").Settings;

  async function customer(phone: string, fields: Record<string, unknown> = {}, endpoint?: string) {
    const [{ id }] = await admin`
      insert into customers (phone, first_name, referral_code, consent_at, locale)
      values (${phone}, 'Sara', ${phone.slice(-6)}, now(), 'fr') returning id`;
    if (Object.keys(fields).length) await admin`update customers set ${admin(fields)} where id = ${id}`;
    if (endpoint) await admin`insert into push_subscriptions (customer_id, endpoint, p256dh, auth) values (${id}, ${endpoint}, 'k', 'a')`;
    return id as string;
  }

  beforeAll(async () => {
    admin = postgres(url!, { max: 2, onnotice: () => {} });
    await admin.unsafe("drop schema public cascade; create schema public;");
    const { migrate } = await import("../../scripts/migrate");
    await migrate(url!, () => {});
    jobs = await import("@/lib/services/automation");
    s = (await import("@/lib/settings-schema")).defaultSettings;
  });

  beforeEach(async () => {
    sent.length = 0;
    await admin`truncate customers, flash_offers, push_log, winback_events, customer_gifts cascade`;
  });

  afterAll(async () => {
    const { sql } = await import("@/lib/db");
    await sql.end();
    await admin?.end();
  });

  it("win-back: one gift and one message per inactivity period", async () => {
    const away = await customer("+212611000001", { visit_count: 3, last_visit_at: new Date(afternoon.getTime() - 30 * DAY) }, "https://push/away");
    await customer("+212611000002", { visit_count: 3, last_visit_at: new Date(afternoon.getTime() - 5 * DAY) }, "https://push/recent");
    await customer("+212611000003", { visit_count: 0, created_at: new Date(afternoon.getTime() - 60 * DAY) }, "https://push/never");

    expect(await jobs.runWinback(s, afternoon)).toMatchObject({ gifts: 1, sent: 1 });
    expect(sent[0].payload.title).toBe("Cela fait un moment");
    const [g] = await admin`select source, available_from <= ${afternoon} as open from customer_gifts where customer_id = ${away}`;
    expect(g).toEqual({ source: "winback", open: true });

    // Next run: nothing new for the same period.
    expect(await jobs.runWinback(s, new Date(afternoon.getTime() + DAY))).toMatchObject({ gifts: 0 });
    // Never at night.
    expect(await jobs.runWinback(s, night)).toEqual({ skipped: true });

    // They came back, then disappeared again: a new period starts.
    await admin`update customers set last_visit_at = ${new Date(afternoon.getTime() + 2 * DAY)} where id = ${away}`;
    await jobs.runWinback(s, new Date(afternoon.getTime() + 40 * DAY));
    const events = await admin`select 1 from winback_events where customer_id = ${away}`;
    expect(events).toHaveLength(2);
  });

  it("birthday gift once a year", async () => {
    await customer("+212611000004", { birthday: new Date("1996-10-05T00:00:00Z") }, "https://push/bday");
    await customer("+212611000005", { birthday: new Date("1996-10-06T00:00:00Z") });
    expect(await jobs.runBirthdays(s, afternoon)).toMatchObject({ gifts: 1, sent: 1 });
    expect(sent[0].payload.title).toBe("Joyeux anniversaire, Sara");
    expect(await jobs.runBirthdays(s, new Date(afternoon.getTime() + 3_600_000))).toMatchObject({ gifts: 0 });
  });

  it("flash offer: notifies targeted customers once, removes dead subscriptions", async () => {
    const regular = await customer("+212611000006", { visit_count: 6, last_visit_at: afternoon }, "https://push/regular");
    await customer("+212611000007", { visit_count: 1, last_visit_at: afternoon }, "https://push/newcomer");
    await customer("+212611000008", { visit_count: 7, last_visit_at: afternoon }, "https://push/gone");
    const t = (x: string) => admin.json({ fr: x, ar: x, en: x });
    await admin`insert into flash_offers (title, reward, starts_at, ends_at, max_qty, target, target_level)
                values (${t("Un après-midi lent")}, ${t("Un cookie offert")}, ${new Date(afternoon.getTime() - 60_000)},
                        ${new Date(afternoon.getTime() + 3_600_000)}, 10, 'level', 'regular')`;

    const [report] = await jobs.runFlashPushes(s, afternoon);
    expect(report).toMatchObject({ sent: 1, failed: 1 });
    expect(sent.map((x) => x.endpoint)).toEqual(["https://push/regular"]);
    expect(sent[0].payload.body).toBe("Un cookie offert. Pour les 10 premiers, jusqu'à 16:00.");
    expect(await admin`select 1 from push_subscriptions where endpoint = 'https://push/gone'`).toHaveLength(0);
    expect(await jobs.runFlashPushes(s, afternoon)).toEqual([]);
    const [log] = await admin`select kind from push_log where customer_id = ${regular}`;
    expect(log.kind).toBe("flash");
  });

  it("flash offer starting at night is not pushed", async () => {
    await customer("+212611000009", {}, "https://push/sleepy");
    const t = (x: string) => admin.json({ fr: x, ar: x, en: x });
    await admin`insert into flash_offers (title, reward, starts_at, ends_at, max_qty)
                values (${t("Nuit")}, ${t("Thé")}, ${new Date(night.getTime() - 60_000)}, ${new Date(night.getTime() + 3_600_000)}, 5)`;
    expect(await jobs.runFlashPushes(s, night)).toEqual([expect.objectContaining({ skipped: "quiet_hours" })]);
    expect(sent).toHaveLength(0);
  });

  it("weekly cap: at most N notifications per customer per 7 days", async () => {
    const id = await customer("+212611000010", { visit_count: 3, last_visit_at: new Date(afternoon.getTime() - 30 * DAY) }, "https://push/capped");
    await admin`insert into push_log (customer_id, kind, sent_at) values
      (${id}, 'flash', ${new Date(afternoon.getTime() - 2 * DAY)}), (${id}, 'flash', ${new Date(afternoon.getTime() - 3 * DAY)})`;
    expect(await jobs.runWinback(s, afternoon)).toMatchObject({ gifts: 1, weekly_cap: 1 });
    expect(sent).toHaveLength(0);
  });
});
