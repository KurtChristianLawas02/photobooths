reset role;

create table if not exists public.photo_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.photobooth_sessions(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  public_url text not null,
  format text not null check (format in ('jpeg', 'png')),
  print_size text,
  width integer,
  height integer,
  file_size integer,
  created_at timestamptz not null default now()
);

create index if not exists photo_downloads_user_id_idx on public.photo_downloads(user_id);
create index if not exists photo_downloads_created_at_idx on public.photo_downloads(created_at desc);

alter table public.photo_downloads enable row level security;

drop policy if exists photo_downloads_owner_select on public.photo_downloads;
create policy photo_downloads_owner_select on public.photo_downloads
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists photo_downloads_owner_insert on public.photo_downloads;
create policy photo_downloads_owner_insert on public.photo_downloads
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists photo_downloads_admin_delete on public.photo_downloads;
create policy photo_downloads_admin_delete on public.photo_downloads
for delete to authenticated
using (public.is_admin());

create table if not exists public.app_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_authenticated_select on public.app_settings;
create policy app_settings_authenticated_select on public.app_settings
for select to authenticated using (true);

drop policy if exists app_settings_admin_insert on public.app_settings;
create policy app_settings_admin_insert on public.app_settings
for insert to authenticated
with check (public.is_admin());

drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.app_settings (id, settings)
values ('global', '{"businessName":"Studio Booth","countdownDuration":3,"mirrorCamera":false,"outputFormat":"jpeg","photoQuality":95,"enableQr":true,"autoReturnSeconds":20,"primaryColor":"#d5c28b","secondaryColor":"#8db3a2","defaultPrintSize":"4x6","defaultOrientation":"portrait","dpi":300,"enablePng":true,"enabledPrintSizes":["2x6","4x6","5x7","6x8"]}'::jsonb)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('photobooth-downloads', 'photobooth-downloads', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists photobooth_downloads_storage_insert on storage.objects;
create policy photobooth_downloads_storage_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'photobooth-downloads' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists photobooth_downloads_storage_delete on storage.objects;
create policy photobooth_downloads_storage_delete on storage.objects
for delete to authenticated
using (bucket_id = 'photobooth-downloads' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
