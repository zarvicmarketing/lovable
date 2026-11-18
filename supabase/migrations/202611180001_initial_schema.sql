create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')) default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','editor')); $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  visible boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  engine_cc integer,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  technical_specs jsonb not null default '{}'::jsonb,
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check(status in ('draft','published','hidden','archived')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  category text,
  image_url text,
  unit_price numeric(12,2),
  notes text,
  status text not null default 'active' check(status in ('active','inactive','archived')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  revision_number integer not null,
  mileage_km integer,
  interval_months integer,
  labor_price numeric(12,2),
  notes text,
  services jsonb not null default '[]'::jsonb,
  recommendations text,
  warnings text,
  status text not null default 'draft' check(status in ('draft','published','hidden','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(model_id,revision_number)
);
create table if not exists public.revision_parts (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions(id) on delete cascade,
  part_id uuid references public.parts(id) on delete set null,
  part_code_snapshot text,
  part_name_snapshot text not null,
  quantity numeric(10,2) not null default 1 check(quantity > 0),
  unit_price_snapshot numeric(12,2),
  created_at timestamptz not null default now()
);
create table if not exists public.cms_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  title text,
  body text,
  status text not null default 'draft' check(status in ('draft','published','hidden','archived')),
  updated_at timestamptz not null default now()
);
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  button_label text,
  button_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  status text not null default 'draft' check(status in ('draft','published','hidden','archived')),
  created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  status text not null default 'draft' check(status in ('draft','published','hidden','archived'))
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- Os modelos iniciais entram como rascunho. Dados técnicos, preços e revisões não são presumidos.
insert into public.models(name,slug,status,sort_order) values
('Pop 110i','pop-110i','draft',10),
('Biz 125','biz-125','draft',20),
('Elite 125','elite-125','draft',30),
('CG 160','cg-160','draft',40),
('PCX 160','pcx-160','draft',50),
('ADV 160','adv-160','draft',60),
('NXR Bros 160','nxr-bros-160','draft',70),
('XRE 190','xre-190','draft',80),
('CB 300F Twister','cb-300f-twister','draft',90),
('Sahara 300','sahara-300','draft',100),
('XR 300L Tornado','xr-300l-tornado','draft',110),
('CB 500X','cb-500x','draft',120),
('CB Hornet 500','cb-hornet-500','draft',130),
('NX 500','nx-500','draft',140),
('CB 650R','cb-650r','draft',150),
('CB Hornet 750','cb-hornet-750','draft',160),
('NC 750X','nc-750x','draft',170),
('NC 750X DCT','nc-750x-dct','draft',180),
('XL 750 Transalp','xl-750-transalp','draft',190),
('CB Hornet 1000','cb-hornet-1000','draft',200),
('CRF 1100 Africa Twin','crf-1100-africa-twin','draft',210),
('CRF 1100 Africa Twin DCT','crf-1100-africa-twin-dct','draft',220)
on conflict(slug) do nothing;

alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.models enable row level security;
alter table public.parts enable row level security;
alter table public.revisions enable row level security;
alter table public.revision_parts enable row level security;
alter table public.cms_content enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;
alter table public.faqs enable row level security;
alter table public.audit_logs enable row level security;

create policy "users read own role" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads visible categories" on public.categories for select using (visible or public.is_admin());
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads published models" on public.models for select using (status='published' or public.is_admin());
create policy "admins manage models" on public.models for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads active parts" on public.parts for select using (status='active' or public.is_admin());
create policy "admins manage parts" on public.parts for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads published revisions" on public.revisions for select using (status='published' or public.is_admin());
create policy "admins manage revisions" on public.revisions for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads revision parts through published revision" on public.revision_parts for select using (
  public.is_admin() or exists(select 1 from public.revisions r where r.id=revision_id and r.status='published')
);
create policy "admins manage revision parts" on public.revision_parts for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads published cms" on public.cms_content for select using (status='published' or public.is_admin());
create policy "admins manage cms" on public.cms_content for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads published banners" on public.banners for select using (status='published' or public.is_admin());
create policy "admins manage banners" on public.banners for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads settings" on public.site_settings for select using (true);
create policy "admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads published faqs" on public.faqs for select using (status='published' or public.is_admin());
create policy "admins manage faqs" on public.faqs for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit logs" on public.audit_logs for select using (public.is_admin());
create policy "admins write audit logs" on public.audit_logs for insert with check (public.is_admin());

insert into storage.buckets(id,name,public) values ('rodaleve-media','rodaleve-media',true) on conflict(id) do nothing;
create policy "public read Rodaleve media" on storage.objects for select using (bucket_id='rodaleve-media');
create policy "admins upload Rodaleve media" on storage.objects for insert with check (bucket_id='rodaleve-media' and public.is_admin());
create policy "admins update Rodaleve media" on storage.objects for update using (bucket_id='rodaleve-media' and public.is_admin());
create policy "admins delete Rodaleve media" on storage.objects for delete using (bucket_id='rodaleve-media' and public.is_admin());
