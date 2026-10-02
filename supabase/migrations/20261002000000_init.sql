-- Rashfa loyalty: initial schema.
--
-- Access model: the Next.js server talks to Postgres directly (DATABASE_URL) and
-- enforces every business rule inside transactions. Browsers never query tables.
-- RLS is enabled on every table with NO policies for anon/authenticated, so the
-- public Supabase API exposes nothing, except two read-only views of public data
-- (menu, live flash-offer counters) granted explicitly below.

create extension if not exists pgcrypto;

-- ── Settings ───────────────────────────────────────────────────────────────
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── People ─────────────────────────────────────────────────────────────────
create table customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique,                       -- E.164. NULL once the account is deleted.
  first_name text not null,
  birthday date,
  locale text not null default 'fr' check (locale in ('fr', 'ar', 'en')),
  points int not null default 0 check (points >= 0),
  visit_count int not null default 0,
  last_visit_at timestamptz,
  referral_code text not null unique,
  referred_by uuid references customers (id) on delete set null,
  preferred_choice text check (preferred_choice in ('discount', 'save')),
  consent_at timestamptz not null,
  birthday_gift_year int,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index customers_last_visit_idx on customers (last_visit_at) where deleted_at is null;

create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,                  -- bcrypt
  role text not null default 'barista' check (role in ('barista', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Auth helpers ───────────────────────────────────────────────────────────
create table otp_codes (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table rate_limits (
  key text primary key,
  count int not null,
  window_start timestamptz not null
);

-- ── Visits & rewards ───────────────────────────────────────────────────────
create table visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  staff_id uuid references staff (id) on delete set null,
  amount numeric(8, 2) not null check (amount >= 0),
  counted boolean not null,
  reason text,                             -- why it did not count: below_min | cooldown
  choice text check (choice in ('discount', 'save')),
  discount_percent int,
  created_at timestamptz not null default now()
);
create index visits_customer_idx on visits (customer_id, created_at desc);
create index visits_created_idx on visits (created_at);

create table gift_pool (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,                    -- {fr, ar, en}
  tier text not null check (tier in ('common', 'medium', 'rare')),
  weight int not null check (weight > 0),
  est_cost numeric(8, 2) not null default 0,
  uses int not null default 1 check (uses between 1 and 31), -- e.g. 7 = "a free drink every day for a week"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customer_gifts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  source text not null check (source in ('mystery', 'welcome', 'winback', 'birthday')),
  gift_pool_id uuid references gift_pool (id) on delete set null,
  title jsonb not null,                    -- snapshot, so editing the pool never changes a gift already given
  tier text,
  est_cost numeric(8, 2) not null default 0,
  created_at timestamptz not null default now(),
  available_from timestamptz not null,
  expires_at timestamptz not null,
  uses_left int not null default 1 check (uses_left >= 0),
  last_used_at timestamptz,
  revealed_at timestamptz,
  claimed_at timestamptz,                  -- set when the last use is redeemed
  claimed_by uuid references staff (id) on delete set null
);
create index customer_gifts_customer_idx on customer_gifts (customer_id, created_at desc);
create index customer_gifts_rare_idx on customer_gifts (created_at) where tier = 'rare';

-- ── Flash offers ───────────────────────────────────────────────────────────
create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  tagline jsonb,
  doodle text not null default 'cup',
  sort int not null default 0,
  highlight boolean not null default false,
  hidden boolean not null default false
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories (id) on delete cascade,
  name jsonb not null,
  description jsonb,
  price numeric(8, 2),                     -- NULL = price to confirm
  photo_url text,
  popular boolean not null default false,
  sold_out boolean not null default false,
  hidden boolean not null default false,
  needs_verify boolean not null default false,
  sort int not null default 0
);
create index menu_items_category_idx on menu_items (category_id, sort);

create table flash_offers (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,
  reward jsonb not null,
  menu_item_id uuid references menu_items (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_qty int not null check (max_qty > 0),
  claimed_qty int not null default 0,
  target text not null default 'all' check (target in ('all', 'level', 'inactive')),
  target_level text check (target_level in ('newcomer', 'regular', 'family')),
  push_status text not null default 'pending' check (push_status in ('pending', 'sent', 'skipped')),
  pushed_count int not null default 0,
  stopped_at timestamptz,
  created_by uuid references staff (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (claimed_qty <= max_qty)
);
create index flash_offers_window_idx on flash_offers (starts_at, ends_at);

create table flash_claims (
  offer_id uuid not null references flash_offers (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  staff_id uuid references staff (id) on delete set null,
  claimed_at timestamptz not null default now(),
  primary key (offer_id, customer_id)
);

-- ── Referrals & win-back ───────────────────────────────────────────────────
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references customers (id) on delete cascade,
  referee_id uuid not null unique references customers (id) on delete cascade,
  rewarded_at timestamptz,
  created_at timestamptz not null default now()
);
create index referrals_referrer_idx on referrals (referrer_id, rewarded_at);

create table winback_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  gift_id uuid references customer_gifts (id) on delete set null,
  sent_at timestamptz not null default now(),
  returned_at timestamptz
);
create index winback_customer_idx on winback_events (customer_id, sent_at desc);

-- ── Push ───────────────────────────────────────────────────────────────────
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_customer_idx on push_subscriptions (customer_id);

create table push_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  kind text not null,                      -- flash | winback | birthday | gift
  ref_id uuid,
  sent_at timestamptz not null default now()
);
create index push_log_customer_idx on push_log (customer_id, sent_at desc);

-- ── Audit ──────────────────────────────────────────────────────────────────
create table audit_log (
  id bigint generated always as identity primary key,
  staff_id uuid references staff (id) on delete set null,
  action text not null,
  customer_id uuid references customers (id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);

-- ── Lock everything down ───────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['settings','customers','staff','otp_codes','rate_limits','visits','gift_pool',
    'customer_gifts','menu_categories','menu_items','flash_offers','flash_claims','referrals',
    'winback_events','push_subscriptions','push_log','audit_log']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Public, read-only data: the menu and live flash-offer counters (for Realtime).
-- These are the only rows the anon key can ever read.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on menu_categories, menu_items, flash_offers to anon, authenticated;
    create policy "menu categories are public" on menu_categories for select to anon, authenticated using (not hidden);
    create policy "menu items are public" on menu_items for select to anon, authenticated using (not hidden);
    create policy "live flash offers are public" on flash_offers for select to anon, authenticated
      using (stopped_at is null and ends_at > now() - interval '1 hour');
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table flash_offers;
  end if;
end $$;
