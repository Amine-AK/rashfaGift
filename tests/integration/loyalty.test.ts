/**
 * Reward rules against a real Postgres (transactions, row locks, races).
 * Runs only when TEST_DATABASE_URL is set; the database is wiped first.
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/rashfa_test npm test
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL;
if (url) {
  process.env.DATABASE_URL = url;
  process.env.SESSION_SECRET ??= "integration-test-secret-integration-test";
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const t0 = new Date("2026-10-05T10:00:00Z"); // Monday 11:00 in Casablanca

describe.skipIf(!url)("loyalty services (Postgres)", () => {
  let admin: postgres.Sql;
  let loyalty: typeof import("@/lib/services/loyalty");
  let customers: typeof import("@/lib/services/customers");
  let staffId: string;

  async function setRules(rules: object) {
    await admin`insert into settings (key, value) values ('rules', ${admin.json(rules as never)})
                on conflict (key) do update set value = excluded.value`;
  }

  async function newCustomer(phone: string, opts: { ref?: string; at?: Date } = {}) {
    const { id } = await customers.createCustomer(
      { phone, firstName: "Test", birthday: null, locale: "fr", referralCode: opts.ref ?? null },
      opts.at ?? new Date(t0.getTime() - 30 * DAY),
    );
    return id;
  }

  const visit = (customerId: string, amount: number, choice: "save" | "discount", now: Date) =>
    loyalty.registerVisit({ customerId, staffId, amount, choice }, now);

  beforeAll(async () => {
    admin = postgres(url!, { max: 2, onnotice: () => {} });
    await admin.unsafe("drop schema public cascade; create schema public;");
    const { migrate } = await import("../../scripts/migrate");
    await migrate(url!, () => {});
    loyalty = await import("@/lib/services/loyalty");
    customers = await import("@/lib/services/customers");
  });

  beforeEach(async () => {
    await admin`truncate customers, staff, visits, customer_gifts, gift_pool, flash_offers, referrals, audit_log, settings cascade`;
    [{ id: staffId }] = await admin`insert into staff (name, pin_hash, role) values ('Bar', 'x', 'barista') returning id`;
    await admin`insert into gift_pool (title, tier, weight, est_cost) values
      (${admin.json({ fr: "Cookie", ar: "كوكيز", en: "Cookie" })}, 'common', 1, 4)`;
  });

  afterAll(async () => {
    const { sql } = await import("@/lib/db");
    await sql.end();
    await admin?.end();
  });

  it("welcome gift is created at sign-up and locked until the next day", async () => {
    const id = await newCustomer("+212600000001", { at: t0 });
    const [g] = await admin`select source, available_from from customer_gifts where customer_id = ${id}`;
    expect(g.source).toBe("welcome");
    expect(g.available_from.toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });

  it("enforces the minimum amount and the cooldown", async () => {
    const id = await newCustomer("+212600000002");
    expect(await visit(id, 10, "save", t0)).toMatchObject({ counted: false, reason: "below_min" });
    expect(await visit(id, 20, "save", t0)).toMatchObject({ counted: true, points: 1 });
    expect(await visit(id, 20, "save", new Date(t0.getTime() + HOUR))).toMatchObject({ counted: false, reason: "cooldown" });
    expect(await visit(id, 20, "save", new Date(t0.getTime() + 4 * HOUR))).toMatchObject({ counted: true, points: 2 });
    const rows = await admin`select counted, reason from visits where customer_id = ${id} order by created_at, counted`;
    expect(rows.map((r) => r.reason ?? "ok")).toEqual(["below_min", "ok", "cooldown", "ok"]);
  });

  it("two scans at the same moment count only one visit", async () => {
    const id = await newCustomer("+212600000003");
    const results = await Promise.all(Array.from({ length: 5 }, () => visit(id, 30, "save", t0)));
    expect(results.filter((r) => r.counted)).toHaveLength(1);
    const [c] = await admin`select points, visit_count from customers where id = ${id}`;
    expect(c).toEqual({ points: 1, visit_count: 1 });
  });

  it("discount gives the percentage and no point", async () => {
    const id = await newCustomer("+212600000004");
    expect(await visit(id, 30, "discount", t0)).toMatchObject({ counted: true, discountPercent: 20, points: 0 });
  });

  it("three saves unlock a mystery gift: locked today, claimable tomorrow, once", async () => {
    const id = await newCustomer("+212600000005");
    await visit(id, 20, "save", t0);
    await visit(id, 20, "save", new Date(t0.getTime() + DAY));
    const third = await visit(id, 20, "save", new Date(t0.getTime() + 2 * DAY));
    expect(third).toMatchObject({ counted: true, points: 0 });
    if (!third.counted) throw new Error();
    expect(third.giftsUnlocked).toHaveLength(1);
    const giftId = third.giftsUnlocked[0];

    const sameDay = new Date(t0.getTime() + 2 * DAY + 2 * HOUR);
    await expect(loyalty.claimGift({ customerId: id, giftId, staffId }, sameDay)).rejects.toMatchObject({ code: "gift_not_available", detail: "locked" });

    const nextDay = new Date(t0.getTime() + 3 * DAY);
    expect(await loyalty.claimGift({ customerId: id, giftId, staffId }, nextDay)).toMatchObject({ usesLeft: 0 });
    await expect(loyalty.claimGift({ customerId: id, giftId, staffId }, nextDay)).rejects.toMatchObject({ detail: "claimed" });

    const other = await newCustomer("+212600000006");
    await expect(loyalty.claimGift({ customerId: other, giftId, staffId }, nextDay)).rejects.toMatchObject({ code: "gift_not_found" });
  });

  it("never exceeds the monthly rare-gift cap, even with concurrent draws", async () => {
    await setRules({ rareGiftMonthlyCap: 2 });
    await admin`update gift_pool set weight = 1`;
    await admin`insert into gift_pool (title, tier, weight, est_cost) values (${admin.json({ fr: "Rare", ar: "نادر", en: "Rare" })}, 'rare', 1000, 40)`;
    const ids = await Promise.all(Array.from({ length: 8 }, (_, i) => newCustomer(`+2126000001${i}0`)));
    // Each customer is one save away from a gift.
    await admin`update customers set points = 2 where id = any(${ids}::uuid[])`;
    await Promise.all(ids.map((id) => visit(id, 20, "save", t0)));
    const [{ rare, total }] = await admin`
      select count(*) filter (where tier = 'rare')::int as rare, count(*)::int as total
      from customer_gifts where source = 'mystery'`;
    expect(total).toBe(8);
    expect(rare).toBe(2);
  });

  it("multi-use gift (a drink every day for a week): once per day", async () => {
    await admin`truncate gift_pool cascade`;
    await admin`insert into gift_pool (title, tier, weight, uses) values (${admin.json({ fr: "Semaine", ar: "أسبوع", en: "Week" })}, 'rare', 1, 7)`;
    const id = await newCustomer("+212600000007");
    await admin`update customers set points = 2 where id = ${id}`;
    const res = await visit(id, 20, "save", t0);
    if (!res.counted) throw new Error();
    const giftId = res.giftsUnlocked[0];
    const day1 = new Date(t0.getTime() + DAY);
    expect(await loyalty.claimGift({ customerId: id, giftId, staffId }, day1)).toMatchObject({ usesLeft: 6 });
    await expect(loyalty.claimGift({ customerId: id, giftId, staffId }, new Date(day1.getTime() + HOUR))).rejects.toMatchObject({ detail: "used_today" });
    expect(await loyalty.claimGift({ customerId: id, giftId, staffId }, new Date(day1.getTime() + DAY))).toMatchObject({ usesLeft: 5 });
  });

  it("flash offer: the first N claims win, each customer once", async () => {
    const [{ id: offerId }] = await admin`
      insert into flash_offers (title, reward, starts_at, ends_at, max_qty)
      values (${admin.json({ fr: "Iced latte", ar: "لاتيه", en: "Iced latte" })}, ${admin.json({ fr: "Cookie", ar: "كوكيز", en: "Cookie" })},
              ${new Date(t0.getTime() - HOUR)}, ${new Date(t0.getTime() + HOUR)}, 3)
      returning id`;
    const ids = await Promise.all(Array.from({ length: 10 }, (_, i) => newCustomer(`+2126000002${i}0`)));
    const results = await Promise.allSettled(ids.map((customerId) => loyalty.claimFlashOffer({ customerId, offerId, staffId }, t0)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const [o] = await admin`select claimed_qty from flash_offers where id = ${offerId}`;
    expect(o.claimed_qty).toBe(3);

    const winner = ids[results.findIndex((r) => r.status === "fulfilled")];
    await admin`update flash_offers set max_qty = 10 where id = ${offerId}`;
    await expect(loyalty.claimFlashOffer({ customerId: winner, offerId, staffId }, t0)).rejects.toMatchObject({ detail: "already_claimed" });
    await expect(loyalty.claimFlashOffer({ customerId: winner, offerId, staffId }, new Date(t0.getTime() + 2 * HOUR))).rejects.toMatchObject({ detail: "not_live" });
  });

  it("referral: both get +1 on the friend's first visit, within the monthly limit", async () => {
    await setRules({ maxReferralsPerMonth: 1 });
    const referrer = await newCustomer("+212600000008");
    const [{ referral_code: code }] = await admin`select referral_code from customers where id = ${referrer}`;
    const friend1 = await newCustomer("+212600000009", { ref: code });
    const friend2 = await newCustomer("+212600000010", { ref: code.toLowerCase() });

    expect(await visit(friend1, 20, "discount", t0)).toMatchObject({ counted: true, referralBonus: true, points: 1 });
    expect(await visit(friend2, 20, "discount", t0)).toMatchObject({ counted: true, referralBonus: false, points: 0 });
    const [r] = await admin`select points from customers where id = ${referrer}`;
    expect(r.points).toBe(1);
    // Only the first visit can trigger it.
    expect(await visit(friend1, 20, "discount", new Date(t0.getTime() + DAY))).toMatchObject({ referralBonus: false });
  });

  it("deleting an account erases personal data but keeps anonymous visits", async () => {
    const id = await newCustomer("+212600000011");
    await visit(id, 20, "save", t0);
    await customers.deleteCustomer(id);
    const [c] = await admin`select phone, first_name, deleted_at from customers where id = ${id}`;
    expect(c.phone).toBeNull();
    expect(c.first_name).toBe("—");
    expect(c.deleted_at).not.toBeNull();
    expect(await admin`select 1 from visits where customer_id = ${id}`).toHaveLength(1);
    // The same number can sign up again as a new customer.
    expect(await newCustomer("+212600000011")).not.toBe(id);
    await expect(visit(id, 20, "save", new Date(t0.getTime() + DAY))).rejects.toMatchObject({ code: "customer_not_found" });
  });
});
