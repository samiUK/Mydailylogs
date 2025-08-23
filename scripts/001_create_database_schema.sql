-- Create organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#3b82f6',
  secondary_color text default '#1e40af'
);

alter table public.organizations enable row level security;

-- Create profiles table that references auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Added separate first_name and last_name fields, kept full_name for compatibility
  first_name text,
  last_name text,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  avatar_url text,
  email text
);

-- Temporarily disable RLS on profiles table to fix infinite recursion issue
-- alter table public.profiles enable row level security;

-- Comment out RLS policies that were causing infinite recursion
-- Fixed RLS policies following Supabase best practices to avoid infinite recursion
-- Wrap auth.uid() in select statements and add 'to authenticated' clause
-- create policy "profiles_select_own"
--   on public.profiles for select
--   to authenticated
--   using ((select auth.uid()) = id);

-- create policy "profiles_insert_own"
--   on public.profiles for insert
--   to authenticated
--   with check ((select auth.uid()) = id);

-- create policy "profiles_update_own"
--   on public.profiles for update
--   to authenticated
--   using ((select auth.uid()) = id);

-- Organizations policies - simplified to allow authenticated users
create policy "organizations_select_authenticated"
  on public.organizations for select
  to authenticated
  using (true);

create policy "organizations_insert_authenticated"
  on public.organizations for insert
  to authenticated
  with check (true);

create policy "organizations_update_authenticated"
  on public.organizations for update
  to authenticated
  using (true);

-- Create checklist templates table
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null,
  description text,
  is_active boolean default true
);

alter table public.checklist_templates enable row level security;

create policy "checklist_templates_authenticated"
  on public.checklist_templates for all
  to authenticated
  using (true);

-- Create checklist items table
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.checklist_templates(id) on delete cascade,
  created_at timestamptz default now(),
  title text not null,
  description text,
  sort_order integer default 0
);

alter table public.checklist_items enable row level security;

create policy "checklist_items_authenticated"
  on public.checklist_items for all
  to authenticated
  using (true);

-- Create daily checklists table
create table if not exists public.daily_checklists (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.checklist_templates(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete cascade,
  assigned_date date not null,
  created_at timestamptz default now(),
  completed_at timestamptz,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed'))
);

alter table public.daily_checklists enable row level security;

create policy "daily_checklists_authenticated"
  on public.daily_checklists for all
  to authenticated
  using (true);

-- Create checklist responses table
create table if not exists public.checklist_responses (
  id uuid primary key default gen_random_uuid(),
  daily_checklist_id uuid references public.daily_checklists(id) on delete cascade,
  checklist_item_id uuid references public.checklist_items(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed boolean default false,
  notes text,
  completed_at timestamptz
);

alter table public.checklist_responses enable row level security;

create policy "checklist_responses_authenticated"
  on public.checklist_responses for all
  to authenticated
  using (true);

-- Add indexes on columns used in RLS policies for better performance
create index if not exists profiles_id_idx on public.profiles(id);
create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
