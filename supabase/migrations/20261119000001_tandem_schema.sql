-- =====================================================================
-- TANDEM — Schéma principal
-- Montants stockés en centimes entiers (bigint). Identifiants UUID.
-- Toutes les tables sont protégées par RLS : seuls les membres du foyer
-- accèdent aux données, et un compte privé n'est visible que par son titulaire.
-- =====================================================================

-- gen_random_uuid() est natif depuis PostgreSQL 13.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text not null default '',
  avatar_url  text,
  avatar_emoji text,
  color       text not null default '#C5B6F2',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Notre foyer',
  currency    text not null default 'EUR',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
-- Un utilisateur appartient à un seul foyer.
create unique index household_members_user_unique on public.household_members (user_id);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code         text not null unique,
  email        text,
  invited_by   uuid references auth.users (id) on delete set null,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  accepted_by  uuid references auth.users (id) on delete set null,
  expires_at   timestamptz not null default now() + interval '14 days',
  created_at   timestamptz not null default now()
);
create index invitations_household_idx on public.invitations (household_id);

create table public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references public.households (id) on delete cascade,
  name                  text not null,
  type                  text not null default 'courant'
                          check (type in ('courant', 'joint', 'epargne', 'pro', 'especes')),
  owner_id              uuid references auth.users (id) on delete set null, -- null = commun
  initial_balance_cents bigint not null default 0,
  icon                  text not null default 'wallet',
  color                 text not null default '#C5B6F2',
  is_private            boolean not null default false,
  archived              boolean not null default false,
  sort                  int not null default 0,
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  constraint accounts_private_needs_owner check (not is_private or owner_id is not null)
);
create index accounts_household_idx on public.accounts (household_id);
create index accounts_owner_idx on public.accounts (owner_id);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null,
  icon         text not null default 'tag',
  color        text not null default '#C5B6F2',
  kind         text not null default 'expense' check (kind in ('expense', 'income')),
  is_system    boolean not null default false,
  archived     boolean not null default false,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  unique (household_id, kind, name)
);

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  kind          text not null check (kind in ('expense', 'income', 'transfer')),
  amount_cents  bigint not null check (amount_cents > 0),
  label         text not null default '',
  category_id   uuid references public.categories (id) on delete set null,
  account_id    uuid not null references public.accounts (id) on delete restrict,
  to_account_id uuid references public.accounts (id) on delete restrict,
  occurred_on   date not null default current_date,
  assigned_to   uuid references auth.users (id) on delete set null, -- null = commun
  note          text,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint transactions_transfer_target check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id)
    or (kind <> 'transfer' and to_account_id is null)
  )
);
create index transactions_household_date_idx on public.transactions (household_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_assigned_idx on public.transactions (assigned_to);

create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  month        date not null check (extract(day from month) = 1), -- premier jour du mois
  amount_cents bigint not null check (amount_cents > 0),
  is_recurring boolean not null default true, -- reconduit automatiquement les mois suivants
  created_at   timestamptz not null default now(),
  unique (category_id, month)
);
create index budgets_household_idx on public.budgets (household_id);

create table public.recurring_expenses (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  label         text not null,
  amount_cents  bigint not null check (amount_cents > 0),
  category_id   uuid references public.categories (id) on delete set null,
  account_id    uuid references public.accounts (id) on delete set null,
  frequency     text not null default 'monthly'
                  check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  day_of_month  int not null default 1 check (day_of_month between 1 and 31),
  start_date    date not null default date_trunc('month', current_date)::date,
  end_date      date,
  assigned_to   uuid references auth.users (id) on delete set null,
  active        boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index recurring_household_idx on public.recurring_expenses (household_id);
create index recurring_category_idx on public.recurring_expenses (category_id);
create index recurring_account_idx on public.recurring_expenses (account_id);

-- Une échéance n'est enregistrée ici que lorsqu'elle est réglée ou ignorée.
-- La contrainte d'unicité empêche de compter deux fois le même prélèvement.
create table public.scheduled_transactions (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id) on delete cascade,
  recurring_expense_id uuid not null references public.recurring_expenses (id) on delete cascade,
  due_on               date not null,
  amount_cents         bigint not null check (amount_cents > 0),
  status               text not null default 'paid' check (status in ('paid', 'skipped')),
  transaction_id       uuid references public.transactions (id) on delete cascade,
  created_at           timestamptz not null default now(),
  unique (recurring_expense_id, due_on)
);
create index scheduled_household_idx on public.scheduled_transactions (household_id);
create unique index scheduled_transaction_unique on public.scheduled_transactions (transaction_id);

create table public.savings_goals (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null,
  icon         text not null default 'target',
  color        text not null default '#C5B6F2',
  target_cents bigint not null check (target_cents > 0),
  target_date  date,
  owner_id     uuid references auth.users (id) on delete set null, -- null = objectif commun
  account_id   uuid references public.accounts (id) on delete set null,
  archived     boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index goals_household_idx on public.savings_goals (household_id);
create index goals_account_idx on public.savings_goals (account_id);

create table public.savings_contributions (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id) on delete cascade,
  goal_id        uuid not null references public.savings_goals (id) on delete cascade,
  amount_cents   bigint not null check (amount_cents <> 0), -- négatif = retrait
  contributed_on date not null default current_date,
  user_id        uuid references auth.users (id) on delete set null default auth.uid(),
  note           text,
  created_at     timestamptz not null default now()
);
create index contributions_goal_idx on public.savings_contributions (goal_id);
create index contributions_household_idx on public.savings_contributions (household_id);

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger transactions_touch before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Fonctions d'autorisation (security definer pour éviter la récursion RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_member(hid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_see_account(aid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.accounts a
    join public.household_members m on m.household_id = a.household_id and m.user_id = auth.uid()
    where a.id = aid and (not a.is_private or a.owner_id = auth.uid())
  );
$$;

create or replace function public.shares_household_with(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.households             enable row level security;
alter table public.household_members      enable row level security;
alter table public.invitations            enable row level security;
alter table public.accounts               enable row level security;
alter table public.categories             enable row level security;
alter table public.transactions           enable row level security;
alter table public.budgets                enable row level security;
alter table public.recurring_expenses     enable row level security;
alter table public.scheduled_transactions enable row level security;
alter table public.savings_goals          enable row level security;
alter table public.savings_contributions  enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_household_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- households (création via la fonction create_household)
create policy households_select on public.households for select to authenticated
  using (public.is_member(id));
create policy households_update on public.households for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));

-- household_members (ajout via create_household / accept_invitation)
create policy members_select on public.household_members for select to authenticated
  using (public.is_member(household_id));
create policy members_leave on public.household_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- invitations
create policy invitations_all on public.invitations for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- accounts : un compte privé n'est visible et modifiable que par son titulaire
create policy accounts_select on public.accounts for select to authenticated
  using (public.is_member(household_id) and (not is_private or owner_id = (select auth.uid())));
create policy accounts_insert on public.accounts for insert to authenticated
  with check (public.is_member(household_id)
              and (not is_private or owner_id = (select auth.uid()))
              and (owner_id is null or public.shares_household_with(owner_id)));
create policy accounts_update on public.accounts for update to authenticated
  using (public.is_member(household_id) and (not is_private or owner_id = (select auth.uid())))
  with check (public.is_member(household_id)
              and (not is_private or owner_id = (select auth.uid()))
              and (owner_id is null or public.shares_household_with(owner_id)));
create policy accounts_delete on public.accounts for delete to authenticated
  using (public.is_member(household_id) and (not is_private or owner_id = (select auth.uid())));

-- transactions : visibles si l'un des comptes concernés est visible
create policy transactions_select on public.transactions for select to authenticated
  using (public.is_member(household_id)
         and (public.can_see_account(account_id)
              or (to_account_id is not null and public.can_see_account(to_account_id))));
create policy transactions_insert on public.transactions for insert to authenticated
  with check (public.is_member(household_id)
              and public.can_see_account(account_id)
              and (to_account_id is null or public.can_see_account(to_account_id)));
create policy transactions_update on public.transactions for update to authenticated
  using (public.is_member(household_id) and public.can_see_account(account_id))
  with check (public.is_member(household_id)
              and public.can_see_account(account_id)
              and (to_account_id is null or public.can_see_account(to_account_id)));
create policy transactions_delete on public.transactions for delete to authenticated
  using (public.is_member(household_id) and public.can_see_account(account_id));

-- Tables simplement rattachées au foyer
create policy categories_all on public.categories for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy budgets_all on public.budgets for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy recurring_all on public.recurring_expenses for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy scheduled_all on public.scheduled_transactions for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy goals_all on public.savings_goals for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy contributions_all on public.savings_contributions for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- ---------------------------------------------------------------------
-- Soldes des comptes (calculés à partir des transactions visibles)
-- ---------------------------------------------------------------------
create or replace view public.account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.household_id,
  a.initial_balance_cents + coalesce(sum(
    case
      when t.kind = 'income'   and t.account_id    = a.id then  t.amount_cents
      when t.kind = 'expense'  and t.account_id    = a.id then -t.amount_cents
      when t.kind = 'transfer' and t.account_id    = a.id then -t.amount_cents
      when t.kind = 'transfer' and t.to_account_id = a.id then  t.amount_cents
      else 0
    end), 0)::bigint as balance_cents
from public.accounts a
left join public.transactions t on t.account_id = a.id or t.to_account_id = a.id
group by a.id;

-- ---------------------------------------------------------------------
-- Profil créé automatiquement à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'first_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Catégories par défaut
-- ---------------------------------------------------------------------
create or replace function public.seed_household_defaults(hid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categories (household_id, name, icon, color, kind, is_system, sort) values
    (hid, 'Courses',      'shopping-cart', '#7FB89A', 'expense', true, 1),
    (hid, 'Restaurants',  'utensils',      '#FFAE97', 'expense', true, 2),
    (hid, 'Logement',     'house',         '#8B7FD1', 'expense', true, 3),
    (hid, 'Transport',    'car',           '#E8B04B', 'expense', true, 4),
    (hid, 'Animaux',      'paw-print',     '#D98B5F', 'expense', true, 5),
    (hid, 'Bébé',         'baby',          '#EE97B9', 'expense', true, 6),
    (hid, 'Santé',        'heart-pulse',   '#E06C75', 'expense', true, 7),
    (hid, 'Shopping',     'shopping-bag',  '#B49CF0', 'expense', true, 8),
    (hid, 'Loisirs',      'party-popper',  '#5FA8CF', 'expense', true, 9),
    (hid, 'Abonnements',  'repeat',        '#9C8FE0', 'expense', true, 10),
    (hid, 'Impôts',       'landmark',      '#7D7A8C', 'expense', true, 11),
    (hid, 'Autres',       'ellipsis',      '#ABA4BF', 'expense', true, 12),
    (hid, 'Salaire',        'briefcase',   '#5FB383', 'income', true, 1),
    (hid, 'Remboursement',  'rotate-ccw',  '#5FA8CF', 'income', true, 2),
    (hid, 'Autres revenus', 'sparkles',    '#E8B04B', 'income', true, 3)
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------
-- Création du foyer (le créateur devient propriétaire)
-- ---------------------------------------------------------------------
create or replace function public.create_household(p_name text default 'Notre foyer')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  hid uuid;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'Vous faites déjà partie d''un foyer';
  end if;

  insert into public.households (name, created_by) values (coalesce(nullif(trim(p_name), ''), 'Notre foyer'), uid)
    returning id into hid;
  insert into public.household_members (household_id, user_id, role) values (hid, uid, 'owner');
  perform public.seed_household_defaults(hid);

  insert into public.accounts (household_id, name, type, owner_id, icon, color, sort, created_by) values
    (hid, 'Compte joint', 'joint',   null, 'users',    '#251D40', 1, uid),
    (hid, 'Espèces',      'especes', null, 'banknote', '#7FB89A', 9, uid);
  return hid;
end $$;

-- ---------------------------------------------------------------------
-- Invitations du partenaire
-- ---------------------------------------------------------------------
create or replace function public.create_invitation(p_email text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  hid uuid;
  new_code text;
begin
  select household_id into hid from public.household_members where user_id = auth.uid();
  if hid is null then raise exception 'Aucun foyer'; end if;

  loop
    new_code := upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 6));
    exit when length(new_code) = 6
      and not exists (select 1 from public.invitations where code = new_code);
  end loop;

  update public.invitations set status = 'revoked'
    where household_id = hid and status = 'pending';
  insert into public.invitations (household_id, code, email, invited_by)
    values (hid, new_code, nullif(trim(p_email), ''), auth.uid());
  return new_code;
end $$;

create or replace function public.invitation_preview(p_code text)
returns table (household_name text, inviter_name text, valid boolean)
language sql stable security definer set search_path = '' as $$
  select h.name, p.first_name,
         (i.status = 'pending' and i.expires_at > now()) as valid
  from public.invitations i
  join public.households h on h.id = i.household_id
  left join public.profiles p on p.id = i.invited_by
  where i.code = upper(trim(p_code));
$$;

create or replace function public.accept_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations%rowtype;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  select * into inv from public.invitations where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Code d''invitation introuvable'; end if;
  if inv.status <> 'pending' or inv.expires_at < now() then
    raise exception 'Cette invitation n''est plus valide';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'Vous faites déjà partie d''un foyer';
  end if;

  insert into public.household_members (household_id, user_id, role) values (inv.household_id, uid, 'member');
  update public.invitations set status = 'accepted', accepted_by = uid where id = inv.id;
  return inv.household_id;
end $$;

-- ---------------------------------------------------------------------
-- Droits d'exécution : réservés aux utilisateurs connectés
-- ---------------------------------------------------------------------
revoke execute on function public.seed_household_defaults(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_household(text) from public, anon;
revoke execute on function public.create_invitation(text) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.invitation_preview(text) from public;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.create_invitation(text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.invitation_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Synchronisation temps réel entre Guillaume et Emma
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.transactions, public.accounts, public.categories, public.budgets,
      public.recurring_expenses, public.scheduled_transactions,
      public.savings_goals, public.savings_contributions,
      public.household_members, public.profiles;
  end if;
end $$;
