create table if not exists public.templates (
  id text primary key,
  name text not null,
  description text,
  print_size text not null check (print_size in ('2x6', '4x6', '5x7', '6x8')),
  physical_width numeric not null,
  physical_height numeric not null,
  width_pixels integer not null,
  height_pixels integer not null,
  dpi integer not null default 300 check (dpi in (300, 600)),
  orientation text not null check (orientation in ('portrait', 'landscape')),
  aspect_ratio text not null,
  background text not null default '#050505',
  accent_color text not null default '#d5c28b',
  slots jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_active_idx on public.templates(active);
create index if not exists templates_created_at_idx on public.templates(created_at desc);

alter table public.templates enable row level security;

drop policy if exists templates_authenticated_select on public.templates;
create policy templates_authenticated_select on public.templates
for select to authenticated using (active = true or public.is_admin());

drop policy if exists templates_admin_insert on public.templates;
create policy templates_admin_insert on public.templates
for insert to authenticated
with check (public.is_admin());

drop policy if exists templates_admin_update on public.templates;
create policy templates_admin_update on public.templates
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists templates_admin_delete on public.templates;
create policy templates_admin_delete on public.templates
for delete to authenticated
using (public.is_admin());
