-- Payday reminder toggle, alongside the existing email_bill_reminders /
-- reminder_days_before pattern on notification_preferences. Defaults to
-- true (opt-out), matching email_bill_reminders and email_product_updates.
alter table public.notification_preferences
  add column if not exists email_payday_reminder boolean not null default true,
  add column if not exists payday_reminder_days_before integer not null default 1;

comment on column public.notification_preferences.email_payday_reminder is 'Send a reminder email before each projected payday. See app/api/cron/payday-reminder.';
comment on column public.notification_preferences.payday_reminder_days_before is 'How many days before a projected payday to send the reminder.';
