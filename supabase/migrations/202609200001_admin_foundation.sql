reset role;

-- Studio Booth admin foundation.
-- Run this migration in the Supabase SQL editor or through the Supabase CLI.

do $$
begin
  create type public.app_role as enum ('user', 'admin', 'super_admin');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'
  );
$$;

create or replace function public.prevent_unauthorized_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and current_user not in ('postgres', 'service_role')
    and not public.is_super_admin() then
    raise exception 'Only a super admin can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_unauthorized_role_change();

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name)
select id, coalesce(email, ''), nullif(raw_user_meta_data->>'full_name', '')
from auth.users
on conflict (id) do nothing;

create table if not exists public.photobooth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid,
  template_id text,
  photos_taken integer not null default 0 check (photos_taken >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'started' check (status in ('started', 'capturing', 'editing', 'completed', 'cancelled', 'failed')),
  print_count integer not null default 0 check (print_count >= 0),
  download_count integer not null default 0 check (download_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.photobooth_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text,
  storage_path text,
  public_url text,
  print_size text,
  width integer,
  height integer,
  format text,
  file_size integer,
  download_count integer not null default 0 check (download_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists photobooth_sessions_user_id_idx on public.photobooth_sessions(user_id);
create index if not exists photobooth_sessions_created_at_idx on public.photobooth_sessions(created_at desc);
create index if not exists photobooth_sessions_status_idx on public.photobooth_sessions(status);
create index if not exists photos_user_id_idx on public.photos(user_id);
create index if not exists photos_session_id_idx on public.photos(session_id);
create index if not exists photos_created_at_idx on public.photos(created_at desc);

alter table public.photobooth_sessions enable row level security;
alter table public.photos enable row level security;

drop policy if exists sessions_owner_or_admin_select on public.photobooth_sessions;
create policy sessions_owner_or_admin_select on public.photobooth_sessions
for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists sessions_owner_insert on public.photobooth_sessions;
create policy sessions_owner_insert on public.photobooth_sessions
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists sessions_owner_update on public.photobooth_sessions;
create policy sessions_owner_update on public.photobooth_sessions
for update to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists photos_owner_or_admin_select on public.photos;
create policy photos_owner_or_admin_select on public.photos
for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists photos_owner_insert on public.photos;
create policy photos_owner_insert on public.photos
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists photos_owner_update on public.photos;
create policy photos_owner_update on public.photos
for update to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()) or public.is_super_admin())
with check (id = (select auth.uid()) or public.is_super_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
for insert to authenticated
with check (public.is_super_admin());

-- Create the admin account in Supabase Auth first, then promote it with:
-- update public.profiles set role = 'super_admin' where email = 'admin@example.com';

-- Existing application tables should also have RLS enabled and equivalent owner/admin
-- policies before they are exposed in the admin UI. Add those policies after confirming
-- the live Supabase schema, because this repository does not contain the hosted schema.
