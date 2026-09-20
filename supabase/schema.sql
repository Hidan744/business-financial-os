-- Business Financial OS — схема Supabase
-- Одна таблица хранит весь BusinessState как JSONB (тот же формат, что и в
-- localStorage), что позволяет переиспользовать существующую доменную модель
-- без нормализации на десяток таблиц. RLS гарантирует, что пользователь
-- видит и может менять только свои бизнесы.

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses(owner_id);

alter table public.businesses enable row level security;

drop policy if exists "Users can view own businesses" on public.businesses;
create policy "Users can view own businesses"
  on public.businesses for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own businesses" on public.businesses;
create policy "Users can insert own businesses"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own businesses" on public.businesses;
create policy "Users can update own businesses"
  on public.businesses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own businesses" on public.businesses;
create policy "Users can delete own businesses"
  on public.businesses for delete
  using (auth.uid() = owner_id);

-- Автообновление updated_at при каждом изменении строки.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();
