-- Public bucket for real menu photos (uploads go through the server with the
-- service-role key; anyone can view). Skipped on plain Postgres without Supabase.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('menu', 'menu', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
