-- New-accounts-available flag for plaid_items.
--
-- Plaid sends an ITEM webhook with webhook_code = "NEW_ACCOUNTS_AVAILABLE"
-- when the institution has account(s) the user hasn't yet granted this Item
-- access to (e.g. they opened a second card at a bank they already linked).
-- The app previously had no way to record or surface this, so those new
-- accounts/debts were invisible until the user disconnected and fully
-- re-linked the bank (which the exchange route's duplicate-institution
-- guard actively blocks). This flag lets BankConnections.tsx /
-- ConnectedBankAccounts.tsx show an "Add new accounts" action (Plaid Link
-- in update mode) instead.
alter table public.plaid_items
  add column if not exists new_accounts_available boolean not null default false;
