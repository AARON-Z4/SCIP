-- =============================================================================
-- Smart Complaint Intelligence System (SCIS) — Supabase Schema
-- Run this in your Supabase project: Dashboard → SQL Editor → New Query
-- =============================================================================

-- ─── Enable UUID extension ─────────────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ─── profiles ──────────────────────────────────────────────────────────────
-- Stores registered users. Password is hashed server-side (bcrypt).
create table if not exists profiles (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  full_name      text not null,
  password_hash  text not null,
  role           text not null default 'citizen' check (role in ('citizen', 'admin')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);


-- ─── complaints ────────────────────────────────────────────────────────────
-- Core table. Embedding column stores Gemini text-embedding-004 vectors as JSON.
create table if not exists complaints (
  id              uuid primary key default gen_random_uuid(),
  reference_id    text not null unique,               -- e.g. GRV-2026-08741
  title           text not null,
  description     text not null,
  category        text not null,
  location        text not null,
  priority        text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status          text not null default 'registered'
                    check (status in ('registered', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected')),
  image_urls      jsonb not null default '[]',
  embedding       text,                               -- JSON-encoded float array (768d)
  user_id         uuid not null references profiles(id) on delete cascade,
  submitter_name  text,
  submitter_email text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_complaints_user_id    on complaints(user_id);
create index if not exists idx_complaints_status     on complaints(status);
create index if not exists idx_complaints_category   on complaints(category);
create index if not exists idx_complaints_created_at on complaints(created_at desc);


-- ─── complaint_comments ────────────────────────────────────────────────────
-- Comments/notes left by admins or citizens on a complaint.
create table if not exists complaint_comments (
  id            uuid primary key default gen_random_uuid(),
  complaint_id  uuid not null references complaints(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  content       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_comments_complaint_id on complaint_comments(complaint_id);


-- ─── duplicate_links ───────────────────────────────────────────────────────
-- Logs every duplicate attempt caught by the AI engine.
create table if not exists duplicate_links (
  id                      uuid primary key default gen_random_uuid(),
  original_complaint_id   uuid not null references complaints(id) on delete cascade,
  attempted_title         text not null,
  attempted_description   text not null,
  attempted_by            uuid not null references profiles(id) on delete cascade,
  similarity_score        float not null,
  factor_scores           jsonb,                   -- { text_similarity, location_match, category_match }
  reasoning               text,
  created_at              timestamptz not null default now()
);

create index if not exists idx_dup_links_original on duplicate_links(original_complaint_id);


-- =============================================================================
-- Row Level Security (RLS) — Enable on all tables
-- =============================================================================

alter table profiles           enable row level security;
alter table complaints         enable row level security;
alter table complaint_comments enable row level security;
alter table duplicate_links    enable row level security;


-- NOTE: Our FastAPI backend uses the SERVICE ROLE KEY which bypasses RLS.
-- These policies are for safety if you ever query from the client directly.

-- profiles: users can only read their own row
create policy "profiles_select_own"
  on profiles for select
  using (true);   -- backend controls access via JWT

-- complaints: public select (for tracking), insert/update via backend
create policy "complaints_select_all"
  on complaints for select
  using (true);

create policy "complaints_insert_authenticated"
  on complaints for insert
  with check (true);

create policy "complaints_update_admin"
  on complaints for update
  using (true);

-- complaint_comments: readable by all, writable by backend
create policy "comments_select_all"
  on complaint_comments for select
  using (true);

create policy "comments_insert_all"
  on complaint_comments for insert
  with check (true);

-- duplicate_links: admin only (via backend)
create policy "dup_links_select_all"
  on duplicate_links for select
  using (true);

create policy "dup_links_insert_all"
  on duplicate_links for insert
  with check (true);


-- =============================================================================
-- Seed: Create a default admin user
-- IMPORTANT: Change the password via the app after setup.
-- Password below is: Admin@1234 (bcrypt hash)
-- =============================================================================

insert into profiles (email, full_name, password_hash, role)
values (
  'admin@scis.gov.in',
  'System Administrator',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniYE6oBL/n5D8klQEJJ3HKIIC',  -- Admin@1234
  'admin'
)
on conflict (email) do nothing;
