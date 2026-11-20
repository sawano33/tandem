-- Préférences de notifications par utilisateur
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default jsonb_build_object(
    'enabled', true, 'budget_warn', true, 'budget_over', true, 'charges', true, 'charges_days', 2,
    'partner', true, 'partner_min_cents', 0, 'weekly', true, 'goals', true, 'quiet', true
  );
