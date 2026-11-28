-- Charges fixes : ne jamais compter deux fois une charge déjà saisie à la main,
-- et ne plus recréer une charge dont on a supprimé la dépense.

-- Cherche une dépense saisie à la main qui correspond à l'échéance (même mois, même montant,
-- même catégorie ou libellé qui commence pareil) et qui n'est liée à aucune charge.
create or replace function public.find_manual_charge_tx(p_recurring uuid, p_due date, p_amount bigint, p_exclude uuid default null)
returns uuid language sql stable security invoker set search_path = '' as $$
  select t.id
  from public.transactions t
  join public.recurring_expenses r on r.id = p_recurring
  where t.household_id = r.household_id
    and t.kind = 'expense'
    and t.amount_cents = p_amount
    and date_trunc('month', t.occurred_on) = date_trunc('month', p_due)
    and (t.category_id is not distinct from r.category_id or t.label ilike r.label || '%')
    and (p_exclude is null or t.id <> p_exclude)
    and not exists (select 1 from public.scheduled_transactions s where s.transaction_id = t.id)
  order by t.occurred_on
  limit 1
$$;

create or replace function public.pay_charge(p_recurring uuid, p_due date, p_amount bigint default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  r public.recurring_expenses%rowtype;
  amt bigint;
  sid uuid;
  tid uuid;
begin
  select * into r from public.recurring_expenses where id = p_recurring;
  if not found then raise exception 'Charge introuvable'; end if;
  amt := coalesce(p_amount, r.amount_cents);
  insert into public.scheduled_transactions (household_id, recurring_expense_id, due_on, amount_cents, status)
    values (r.household_id, r.id, p_due, amt, 'paid')
    on conflict (recurring_expense_id, due_on) do update
      set status = 'paid', amount_cents = excluded.amount_cents
      where public.scheduled_transactions.status = 'unpaid'
    returning id into sid;
  if sid is null then return null; end if;
  -- Déjà saisie à la main ? On la rattache au lieu de créer un doublon.
  tid := public.find_manual_charge_tx(r.id, p_due, amt);
  if tid is null then
    insert into public.transactions (household_id, kind, amount_cents, label, category_id, occurred_on, assigned_to)
      values (r.household_id, 'expense', amt, r.label, r.category_id, p_due, r.assigned_to)
      returning id into tid;
  end if;
  update public.scheduled_transactions set transaction_id = tid where id = sid;
  return tid;
end $$;

-- Supprimer la dépense d'une charge ne supprime plus l'échéance (sinon elle était recréée aussitôt).
alter table public.scheduled_transactions drop constraint if exists scheduled_transactions_transaction_id_fkey;
alter table public.scheduled_transactions add constraint scheduled_transactions_transaction_id_fkey
  foreign key (transaction_id) references public.transactions(id) on delete set null;

create or replace function public.on_charge_tx_deleted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s record; other uuid;
begin
  for s in select * from public.scheduled_transactions where transaction_id = old.id and status = 'paid' loop
    other := public.find_manual_charge_tx(s.recurring_expense_id, s.due_on, s.amount_cents, old.id);
    if other is not null then
      update public.scheduled_transactions set transaction_id = other where id = s.id;
    else
      update public.scheduled_transactions set status = 'unpaid', transaction_id = null where id = s.id;
    end if;
  end loop;
  return old;
end $$;
revoke execute on function public.on_charge_tx_deleted() from public, anon, authenticated;

drop trigger if exists charge_tx_deleted on public.transactions;
create trigger charge_tx_deleted before delete on public.transactions
  for each row execute function public.on_charge_tx_deleted();

revoke execute on function public.find_manual_charge_tx(uuid, date, bigint, uuid) from public, anon;
grant execute on function public.find_manual_charge_tx(uuid, date, bigint, uuid) to authenticated;
