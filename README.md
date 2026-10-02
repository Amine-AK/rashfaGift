# Rashfa · رشفة

*Some sips feel like memories.*

The loyalty app for Rashfa café: an installable web app (PWA) in French, Arabic and English.
Customers collect visits, choose between a little discount today or saving toward a mystery gift,
and receive gentle flash offers during quiet hours. Baristas scan codes at the counter; the owner
runs everything from a dashboard.

| Who | Where | What they do |
|---|---|---|
| Customer | `/fr` → `/join`, then `/home` | Sign up with phone + SMS code, show a rotating QR code, reveal gifts, invite friends |
| Barista | `/staff` (PIN) | Scan, enter the amount, *Discount now* / *Save point*, give gifts and flash offers |
| Owner | `/admin` (admin PIN) | Stats, flash offers, menu, gift pool, every rule, team, CSV export, QR poster |

---

## How it works (the short version)

- **Visits** count only when the staff scans the customer's code, the order is at least the
  minimum amount, and the last counted visit is older than the cooldown.
- **The personal QR code rotates every minute** (HMAC-signed token), so screenshots stop working.
- **Discount now or save it**: *discount* = X% off today; *save* = +1 point. Every N points
  unlock a **mystery gift**, drawn on the server from a weighted pool, with a monthly cap on rare
  gifts. A gift is never usable the day it is unlocked: it opens at the next midnight (café time)
  and stays valid N days.
- **Levels** (Newcomer → Regular → Family) by number of visits, each with a perk.
- **Flash offers**: "the first 10 iced lattes between 15:00 and 16:00 get a free cookie", with a
  live counter. Notifications are sent when an offer starts, never between 21:00 and 09:00, and at
  most N per customer per week.
- **Win-back** after N days away (one message + small gift per absence), **birthday gift**,
  **referrals** (+1 point each when the friend makes a first visit, capped per month),
  **welcome gift** locked until the next day.

Every number above is a setting the owner edits in **Admin → Rules**. Nothing is hard-coded.

### Architecture

```
Phones (PWA)  ──►  Next.js on Vercel  ──►  Postgres (Supabase)
                    · pages + server actions        · all data, RLS locked down
                    · every rule runs here, in one  · Realtime: live flash counters
                      transaction with row locks     · Storage: menu photos
                    · /api/cron/tick ◄── pg_cron every 5 minutes
                    · Web Push (VAPID), SMS (Twilio)
```

- The browser never talks to the database directly. Server code connects with `DATABASE_URL`;
  Row Level Security is enabled on every table with no policies, except read-only access to the
  menu and the flash-offer counters (for Realtime).
- Customer and staff sessions are signed, httpOnly cookies. Staff PINs are bcrypt-hashed.
- The reward rules are plain functions in `lib/rules/` (unit tested) and run inside transactions
  in `lib/services/` (tested against a real Postgres, including races: two scans at once count one
  visit, ten people racing for three flash items get exactly three).
- All dates use the café's time zone through the IANA database, so Morocco's Ramadan clock change
  is handled automatically.

```
app/[locale]/        pages (customer, staff, admin, menu, privacy, poster)
app/api/             qr, flash counters, share image, cron, CSV export
components/brand/    mascot, lampshade, zellige frame and ring, tile confetti, doodles
lib/rules/           pure business rules
lib/services/        database transactions (loyalty, automation, stats, menu, customers)
messages/            fr.json, ar.json, en.json (every visible text)
supabase/migrations/ schema
scripts/             migrate, seed (real menu + gift pool), create-staff, icons
tests/               unit + Postgres integration tests
design-reference/    photos of the café used for the design
```

---

## Run it locally

Requirements: Node 20.9+ and a Postgres 15+ database (local, Docker, or a free Supabase project).

```bash
npm install
cp .env.example .env.local          # then fill it in, see below
npm run db:migrate                  # create the tables
npm run db:seed                     # the real menu + a starter gift pool
npm run staff:create -- --name "Owner" --pin 246810 --role admin
npm run staff:create -- --name "Yassine" --pin 1357
npm run dev                         # http://localhost:3000
```

`npm run db:*` and `staff:create` read `DATABASE_URL` from the environment, e.g.
`DATABASE_URL=postgres://… npm run db:migrate`.

With `OTP_DEV_MODE=true` the SMS code is shown on screen, so you can sign up without Twilio.
Visit `/fr/staff` to log in as staff and `/fr/admin` as the owner.

### Checks

```bash
npm run lint && npm run typecheck && npm run i18n:check
npm test                                                     # unit tests
TEST_DATABASE_URL=postgres://…/rashfa_test npm test          # + Postgres integration tests (wipes that database)
```

---

## Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection. On Supabase use the **Transaction pooler** string (port 6543). |
| `SESSION_SECRET` | yes | Signs session cookies. 32+ random characters (`openssl rand -base64 48`). |
| `QR_SECRET` | yes | Signs the rotating QR codes. 32+ characters, different from the above. |
| `CRON_SECRET` | yes | Protects `/api/cron/tick`. 32+ characters. |
| `NEXT_PUBLIC_APP_URL` | yes | Public URL, e.g. `https://rashfa.ma` (links in notifications, invitations, poster). |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | production | Sends the login SMS. `TWILIO_FROM` is a Twilio number or approved sender ID. |
| `OTP_DEV_MODE` | dev only | `true` shows the code on screen. **Never in production.** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | for push | Generate once with `npm run vapid:generate`. Never change them afterwards, or existing subscriptions stop working. |
| `VAPID_SUBJECT` | for push | `mailto:` address of the café. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | Live flash counters through Supabase Realtime (without them, the app polls every 15 s). |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Menu photo uploads to Supabase Storage (without it, paste photo links). Server only. |

---

## Deploy (Vercel + Supabase)

1. **Supabase**: create a project (region: EU West, close to Morocco).
   - *Project Settings → Database*: copy the **Transaction pooler** connection string → `DATABASE_URL`.
   - Run the migrations: `DATABASE_URL=… npm run db:migrate` (or `supabase db push`), then
     `npm run db:seed` and `npm run staff:create … --role admin`.
   - *Project Settings → API*: copy the URL, `anon` key and `service_role` key.
2. **Twilio**: buy a number (or register a sender ID for Morocco), put the three values in the env.
   Expect roughly 0.5–0.8 DH per login SMS; returning customers stay logged in for 6 months.
3. **Vercel**: import the repository, add every variable above (Production), deploy.
   Set `NEXT_PUBLIC_APP_URL` to the final domain and redeploy once the domain is attached.
4. **Scheduler** (flash notifications, win-back, birthdays). In Supabase *SQL editor*:

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select cron.schedule('rashfa-tick', '*/5 * * * *', $$
     select net.http_get(
       url := 'https://YOUR-DOMAIN/api/cron/tick',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
     )
   $$);
   ```

   (Vercel Cron also works on a paid plan: call the same URL every 5 minutes; Vercel sends the
   `CRON_SECRET` header automatically.)
5. **Try it**: open the site on your phone, join, add it to the home screen, allow notifications.
   Log in at `/fr/staff` on the counter phone and scan your own code.
6. **Print the poster**: Admin → *QR poster* → *Print* (A4, works on any printer).

### Before launch

- **Confirm the prices** marked *to confirm* in Admin → Menu (Hot Chocolate, Americano, Latte,
  Cappuccino, Mocha, the iced coffees, milkshakes, Salam mojito and the three crêpes, 15–23 DH).
  Until confirmed they show "at the counter" on the public menu.
- Confirm the full Mojito tagline ("Refreshing, without being…") and the crêpe tagline.
- Add real photos of each product (Admin → Menu → Edit → Upload). Only real photos, never stock or AI.
- Review the gift pool odds and costs (Admin → Gift pool) and the rules (Admin → Rules).
- Give each barista their own PIN (Admin → Team). Every action is in the activity log.

## Changing the rules

Admin → **Rules** lets the owner change, at any time and for everyone: minimum order, cooldown
between visits, instant discount, points per gift, gift value shown to customers, gift validity,
monthly rare-gift cap, level thresholds and perks, notifications per week and quiet hours,
welcome / win-back / birthday gifts (on/off, text, validity, win-back delay), referrals per month
and time zone. Default values match the brief: 15 DH, 4 h, 20 %, 3 points, 50 DH, 14 days,
2 notifications a week, 21 days, 5 referrals, Africa/Casablanca.

## Privacy (Law 09-08)

Only the phone number, first name, optional birthday, visits, gifts and notification
subscriptions are stored. Customers consent at sign-up, can read `/privacy`, and can delete their
account themselves in Settings: personal data is erased at once and visits stay as anonymous rows
for the statistics. CSV exports are recorded in the activity log. Declare the processing to the
CNDP before launch.
