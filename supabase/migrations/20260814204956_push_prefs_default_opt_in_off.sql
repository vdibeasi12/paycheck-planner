-- Match the existing push_bill_reminders precedent: push notifications
-- default OFF (opt-in), unlike their email counterparts which default ON.
-- The migration that added these columns (20260814204803) mistakenly
-- defaulted them to true, inconsistent with that existing column.
alter table public.notification_preferences
  alter column push_payday_reminder set default false,
  alter column push_debt_reminder set default false,
  alter column push_savings_milestone set default false,
  alter column push_inactivity set default false;

update public.notification_preferences
set push_payday_reminder = false,
    push_debt_reminder = false,
    push_savings_milestone = false,
    push_inactivity = false
where push_payday_reminder = true
   or push_debt_reminder = true
   or push_savings_milestone = true
   or push_inactivity = true;
