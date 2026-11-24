-- Run only in a new, dedicated Supabase project for Rotta Canonica.
-- Paste this whole file into SQL Editor and click Run.

create table if not exists public.rotta_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint rotta_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint rotta_state_size check (octet_length(state::text) <= 300000)
);

alter table public.rotta_user_state enable row level security;

revoke all on table public.rotta_user_state from anon;
grant select, insert, update, delete on table public.rotta_user_state to authenticated;

drop policy if exists "Users read their own route" on public.rotta_user_state;
drop policy if exists "Users create their own route" on public.rotta_user_state;
drop policy if exists "Users update their own route" on public.rotta_user_state;
drop policy if exists "Users delete their own route" on public.rotta_user_state;

create policy "Users read their own route"
  on public.rotta_user_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own route"
  on public.rotta_user_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own route"
  on public.rotta_user_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own route"
  on public.rotta_user_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Column "auth" is quoted on purpose: unquoted AUTH can clash with schema auth.
create table if not exists public.rotta_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  "auth" text not null,
  last_sent_episode integer not null default 1155,
  created_at timestamptz not null default now(),
  constraint rotta_push_endpoint_length check (char_length(endpoint) between 10 and 2300)
);

create index if not exists rotta_push_user_idx
  on public.rotta_push_subscriptions (user_id);

alter table public.rotta_push_subscriptions enable row level security;

revoke all on table public.rotta_push_subscriptions from anon;
revoke all on table public.rotta_push_subscriptions from authenticated;
-- Push rows are only accessible from trusted Vercel serverless functions via service role.
