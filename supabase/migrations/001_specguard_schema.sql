create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  session_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  mime_type text not null,
  storage_path text,
  page_count integer not null default 1,
  processing_state text not null default 'processed',
  extracted_assets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer not null default 1,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  asset_tag text not null,
  category text not null,
  approved_fields jsonb not null default '{}'::jsonb,
  submitted_fields jsonb not null default '{}'::jsonb,
  readiness text not null default 'Pending Review',
  unique(project_id, asset_tag)
);

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  asset_tag text not null,
  rule_id text not null,
  severity text not null,
  status text not null default 'Open',
  expected_value text,
  actual_value text,
  evidence jsonb not null default '{}'::jsonb,
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete cascade,
  owner text,
  status text not null default 'Open',
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.assets enable row level security;
alter table public.findings enable row level security;
alter table public.actions enable row level security;

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;
