-- Comptes d'investissement (Trade Republic…) : valeur globale saisie à la main ou détail des lignes (ETF, actions)
alter table public.accounts
  add column if not exists manual_value_cents bigint,
  add column if not exists value_updated_at timestamptz;

create table public.holdings (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  account_id   uuid not null references public.accounts (id) on delete cascade,
  name         text not null,                 -- ex. « iShares Core MSCI World »
  ticker       text,                          -- ISIN ou symbole, facultatif
  quantity     numeric(18, 6),                -- facultatif
  value_cents  bigint not null default 0,     -- valeur actuelle, mise à jour à la main
  invested_cents bigint,                      -- montant investi, facultatif (pour la plus-value)
  sort         int not null default 0,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index holdings_account_idx on public.holdings (account_id);
create index holdings_household_idx on public.holdings (household_id);

alter table public.holdings enable row level security;
create policy holdings_all on public.holdings for all to authenticated
  using (public.is_member(household_id) and public.can_see_account(account_id))
  with check (public.is_member(household_id) and public.can_see_account(account_id));

-- Réglages de répartition des dépenses communes
alter table public.households
  add column if not exists split_settings jsonb not null default jsonb_build_object('mode', 'equal_rate');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.holdings, public.households;
  end if;
end $$;
