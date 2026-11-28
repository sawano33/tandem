-- Solde du compte perso saisi à la main (recalage), pour coller au solde affiché par la banque.
alter table public.profiles add column if not exists bank_balance_cents bigint;
alter table public.profiles add column if not exists bank_balance_at timestamptz;
