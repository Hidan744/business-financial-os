-- Business Financial OS — командный доступ (сотрудники со своим логином вместо PIN)
--
-- Полностью ДОПОЛНЯЕТ schema.sql, ничего в нём не меняет и не удаляет — можно
-- накатывать на существующий проект без риска для текущих данных владельцев.
--
-- Идея: PIN, введённый в браузере, не защищает данные — весь JSON бизнеса
-- всё равно загружен в память страницы, PIN лишь прячет UI (см. RouteGate.tsx
-- в клиенте на момент до этой миграции). Здесь доступ проверяется на сервере
-- (Postgres RLS + SECURITY DEFINER функции), для каждого сотрудника — свой
-- реальный логин (Supabase Auth), и сотрудник физически не получает в браузер
-- данные разделов, которые ему не открыты, — а не просто не видит их в UI.
--
-- Row Level Security не умеет ограничивать доступ к части JSONB-колонки (только
-- к строке целиком), поэтому прямого SELECT/UPDATE на businesses для участников
-- НЕТ — они работают только через функции ниже, которые сами решают, какие
-- верхнеуровневые ключи JSON отдать на чтение и разрешить ли запись в конкретный
-- ключ, по списку "доменов", выданных участнику.
--
-- Домены и какие ключи BusinessState они открывают — ДОЛЖНО зеркалить
-- TEAM_DOMAINS в src/types/teamAccess.ts на клиенте:
--   finance        -> financialInputs, history, targets
--   balance        -> balanceSheet, balanceSheetHistory
--   cashflow       -> cashFlowInputs
--   taxes          -> taxSettings
--   forecast       -> forecastConfig
--   hr             -> employees, plannedHires
--   goals          -> goals
--   unitEconomics  -> unitEconomics
--   aiCfo          -> aiHistory
-- Всегда отдаются без домена (не содержат чувствительных финансовых данных):
--   profile, scenarios, onboardingComplete

-- ── Таблицы ──────────────────────────────────────────────────────────────

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  allowed_domains text[] not null default '{}',
  label text,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index if not exists business_members_business_id_idx on public.business_members(business_id);

alter table public.business_members enable row level security;

drop policy if exists "Members can view their own membership" on public.business_members;
create policy "Members can view their own membership"
  on public.business_members for select
  using (user_id = auth.uid());

drop policy if exists "Owners can manage members" on public.business_members;
create policy "Owners can manage members"
  on public.business_members for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- Участник может покинуть команду сам (удалить только свою же строку членства).
drop policy if exists "Members can remove themselves" on public.business_members;
create policy "Members can remove themselves"
  on public.business_members for delete
  using (user_id = auth.uid());

create table if not exists public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  allowed_domains text[] not null default '{}',
  label text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists pending_invites_email_idx on public.pending_invites(lower(email));

alter table public.pending_invites enable row level security;

drop policy if exists "Owners can manage invites" on public.pending_invites;
create policy "Owners can manage invites"
  on public.pending_invites for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- ── Приглашение по email ────────────────────────────────────────────────
-- Если пользователь с таким email уже зарегистрирован — членство создаётся
-- сразу. Если нет — приглашение ждёт в pending_invites и подхватывается
-- триггером ниже в момент, когда человек сам зарегистрируется на этот email.

create or replace function public.create_invite(
  p_business_id uuid,
  p_email text,
  p_allowed_domains text[],
  p_label text default null
)
returns text -- 'linked' | 'pending'
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner boolean;
  v_existing_user_id uuid;
begin
  select exists(
    select 1 from public.businesses where id = p_business_id and owner_id = auth.uid()
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'only the business owner can invite members';
  end if;

  select id into v_existing_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_existing_user_id is not null then
    insert into public.business_members (business_id, user_id, allowed_domains, label)
    values (p_business_id, v_existing_user_id, p_allowed_domains, p_label)
    on conflict (business_id, user_id)
    do update set allowed_domains = excluded.allowed_domains, label = excluded.label;
    return 'linked';
  else
    insert into public.pending_invites (business_id, email, allowed_domains, label, created_by)
    values (p_business_id, lower(p_email), p_allowed_domains, p_label, auth.uid());
    return 'pending';
  end if;
end;
$$;

grant execute on function public.create_invite(uuid, text, text[], text) to authenticated;

create or replace function public.handle_new_user_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_members (business_id, user_id, allowed_domains, label)
  select business_id, new.id, allowed_domains, label
  from public.pending_invites
  where lower(email) = lower(new.email)
  on conflict (business_id, user_id) do nothing;

  delete from public.pending_invites where lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_invites on auth.users;
create trigger on_auth_user_created_invites
  after insert on auth.users
  for each row execute function public.handle_new_user_invites();

-- ── Чтение: только через эту функцию (см. пояснение про JSONB и RLS выше) ──

create or replace function public.get_business_view(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_data jsonb;
  v_domains text[];
  v_result jsonb;
begin
  select owner_id, data into v_owner, v_data
  from public.businesses
  where id = p_business_id;

  if v_data is null then
    return null;
  end if;

  if v_owner = auth.uid() then
    return v_data;
  end if;

  select allowed_domains into v_domains
  from public.business_members
  where business_id = p_business_id and user_id = auth.uid();

  if v_domains is null then
    raise exception 'not a member of this business';
  end if;

  v_result := jsonb_build_object(
    'profile', v_data->'profile',
    'scenarios', v_data->'scenarios',
    'onboardingComplete', v_data->'onboardingComplete'
  );

  if 'finance' = any(v_domains) then
    v_result := v_result || jsonb_build_object(
      'financialInputs', v_data->'financialInputs',
      'history', coalesce(v_data->'history', '[]'::jsonb),
      'targets', coalesce(v_data->'targets', '[]'::jsonb)
    );
  end if;
  if 'balance' = any(v_domains) then
    v_result := v_result || jsonb_build_object(
      'balanceSheet', v_data->'balanceSheet',
      'balanceSheetHistory', coalesce(v_data->'balanceSheetHistory', '[]'::jsonb)
    );
  end if;
  if 'cashflow' = any(v_domains) then
    v_result := v_result || jsonb_build_object('cashFlowInputs', v_data->'cashFlowInputs');
  end if;
  if 'taxes' = any(v_domains) then
    v_result := v_result || jsonb_build_object('taxSettings', v_data->'taxSettings');
  end if;
  if 'forecast' = any(v_domains) then
    v_result := v_result || jsonb_build_object('forecastConfig', v_data->'forecastConfig');
  end if;
  if 'hr' = any(v_domains) then
    v_result := v_result || jsonb_build_object(
      'employees', coalesce(v_data->'employees', '[]'::jsonb),
      'plannedHires', coalesce(v_data->'plannedHires', '[]'::jsonb)
    );
  end if;
  if 'goals' = any(v_domains) then
    v_result := v_result || jsonb_build_object('goals', coalesce(v_data->'goals', '[]'::jsonb));
  end if;
  if 'unitEconomics' = any(v_domains) then
    v_result := v_result || jsonb_build_object('unitEconomics', v_data->'unitEconomics');
  end if;
  if 'aiCfo' = any(v_domains) then
    v_result := v_result || jsonb_build_object('aiHistory', coalesce(v_data->'aiHistory', '[]'::jsonb));
  end if;

  return v_result;
end;
$$;

grant execute on function public.get_business_view(uuid) to authenticated;

create or replace function public.list_my_businesses()
returns table(id uuid, role text, allowed_domains text[])
language sql
security definer
set search_path = public
as $$
  select id, 'owner'::text as role, null::text[] as allowed_domains
  from public.businesses where owner_id = auth.uid()
  union
  select business_id as id, 'member'::text as role, allowed_domains
  from public.business_members where user_id = auth.uid();
$$;

grant execute on function public.list_my_businesses() to authenticated;

-- ── Запись: владелец — как раньше (весь blob через businesses.update, RLS не
-- изменилась), участник — только по одному верхнеуровневому ключу за раз,
-- и только если у него есть домен, который этим ключом владеет. ──

create or replace function public.update_business_section(
  p_business_id uuid,
  p_key text,
  p_value jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_domains text[];
  v_required text;
begin
  select owner_id into v_owner from public.businesses where id = p_business_id;
  if v_owner is null then
    raise exception 'business not found';
  end if;

  if v_owner = auth.uid() then
    update public.businesses set data = jsonb_set(data, array[p_key], p_value, true) where id = p_business_id;
    return;
  end if;

  v_required := case p_key
    when 'financialInputs' then 'finance'
    when 'history' then 'finance'
    when 'targets' then 'finance'
    when 'balanceSheet' then 'balance'
    when 'balanceSheetHistory' then 'balance'
    when 'cashFlowInputs' then 'cashflow'
    when 'taxSettings' then 'taxes'
    when 'forecastConfig' then 'forecast'
    when 'employees' then 'hr'
    when 'plannedHires' then 'hr'
    when 'goals' then 'goals'
    when 'unitEconomics' then 'unitEconomics'
    when 'aiHistory' then 'aiCfo'
    else null
  end;

  if v_required is null then
    raise exception 'field % is not editable by team members', p_key;
  end if;

  select allowed_domains into v_domains
  from public.business_members
  where business_id = p_business_id and user_id = auth.uid();

  if v_domains is null or not (v_required = any(v_domains)) then
    raise exception 'no write access to %', p_key;
  end if;

  update public.businesses set data = jsonb_set(data, array[p_key], p_value, true) where id = p_business_id;
end;
$$;

grant execute on function public.update_business_section(uuid, text, jsonb) to authenticated;
