-- Charges fixes : prélèvement automatique + cocher « payée »
alter table public.recurring_expenses add column if not exists auto_pay boolean not null default true;

create or replace function public.pay_charge(p_recurring uuid, p_due date, p_amount bigint default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  r public.recurring_expenses%rowtype;
  sid uuid;
  tid uuid;
begin
  select * into r from public.recurring_expenses where id = p_recurring;
  if not found then raise exception 'Charge introuvable'; end if;
  insert into public.scheduled_transactions (household_id, recurring_expense_id, due_on, amount_cents, status)
    values (r.household_id, r.id, p_due, coalesce(p_amount, r.amount_cents), 'paid')
    on conflict (recurring_expense_id, due_on) do nothing
    returning id into sid;
  if sid is null then return null; end if;
  insert into public.transactions (household_id, kind, amount_cents, label, category_id, occurred_on, assigned_to)
    values (r.household_id, 'expense', coalesce(p_amount, r.amount_cents), r.label, r.category_id, p_due, r.assigned_to)
    returning id into tid;
  update public.scheduled_transactions set transaction_id = tid where id = sid;
  return tid;
end $$;

create or replace function public.unpay_charge(p_recurring uuid, p_due date)
returns void language plpgsql security invoker set search_path = '' as $$
declare tid uuid;
begin
  delete from public.scheduled_transactions where recurring_expense_id = p_recurring and due_on = p_due returning transaction_id into tid;
  if tid is not null then delete from public.transactions where id = tid; end if;
end $$;

revoke execute on function public.pay_charge(uuid, date, bigint) from public, anon;
revoke execute on function public.unpay_charge(uuid, date) from public, anon;
grant execute on function public.pay_charge(uuid, date, bigint) to authenticated;
grant execute on function public.unpay_charge(uuid, date) to authenticated;

-- « unpaid » = décochée à la main : reste à venir et le prélèvement automatique ne la recoche pas.
alter table public.scheduled_transactions drop constraint if exists scheduled_transactions_status_check;
alter table public.scheduled_transactions add constraint scheduled_transactions_status_check check (status in ('paid', 'skipped', 'unpaid'));

create or replace function public.pay_charge(p_recurring uuid, p_due date, p_amount bigint default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  r public.recurring_expenses%rowtype;
  sid uuid;
  tid uuid;
begin
  select * into r from public.recurring_expenses where id = p_recurring;
  if not found then raise exception 'Charge introuvable'; end if;
  insert into public.scheduled_transactions (household_id, recurring_expense_id, due_on, amount_cents, status)
    values (r.household_id, r.id, p_due, coalesce(p_amount, r.amount_cents), 'paid')
    on conflict (recurring_expense_id, due_on) do update
      set status = 'paid', amount_cents = excluded.amount_cents
      where public.scheduled_transactions.status = 'unpaid'
    returning id into sid;
  if sid is null then return null; end if;
  insert into public.transactions (household_id, kind, amount_cents, label, category_id, occurred_on, assigned_to)
    values (r.household_id, 'expense', coalesce(p_amount, r.amount_cents), r.label, r.category_id, p_due, r.assigned_to)
    returning id into tid;
  update public.scheduled_transactions set transaction_id = tid where id = sid;
  return tid;
end $$;

create or replace function public.unpay_charge(p_recurring uuid, p_due date)
returns void language plpgsql security invoker set search_path = '' as $$
declare tid uuid;
begin
  select transaction_id into tid from public.scheduled_transactions where recurring_expense_id = p_recurring and due_on = p_due;
  update public.scheduled_transactions set status = 'unpaid', transaction_id = null where recurring_expense_id = p_recurring and due_on = p_due;
  if tid is not null then delete from public.transactions where id = tid; end if;
end $$;
