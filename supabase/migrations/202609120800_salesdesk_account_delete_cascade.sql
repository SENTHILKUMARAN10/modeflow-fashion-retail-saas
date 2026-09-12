-- Allow permanent account deletion without FK violations.
-- Business-created records (invoices, expenses, stock movements) keep their
-- created_by stamp removed (set null) when the creating auth user is deleted,
-- instead of blocking the auth.users DELETE.

alter table public.invoices drop constraint if exists invoices_created_by_fkey;
alter table public.expenses drop constraint if exists expenses_created_by_fkey;
alter table public.stock_movements drop constraint if exists stock_movements_created_by_fkey;

alter table public.invoices alter column created_by drop not null;
alter table public.expenses alter column created_by drop not null;
alter table public.stock_movements alter column created_by drop not null;

alter table public.invoices add constraint invoices_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.expenses add constraint expenses_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.stock_movements add constraint stock_movements_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;