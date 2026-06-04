-- Справочник юр. лиц (корпоративные клиенты) + привязка к броням.
-- Реквизиты ведём у себя (TravelLine их не отдаёт). Для счетов/УПД.

create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  inn           text,
  kpp           text,
  ogrn          text,
  legal_address text,
  bank_name     text,
  bik           text,
  corr_account  text,
  account       text,
  phone         text,
  email         text,
  contact_person text,
  created_at    timestamptz not null default now()
);
alter table public.companies enable row level security;

drop policy if exists "Staff manage companies" on public.companies;
create policy "Staff manage companies"
  on public.companies for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role) or private.has_role(auth.uid(), 'manager'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role) or private.has_role(auth.uid(), 'manager'::public.app_role));

-- Привязка брони к юр. лицу
alter table public.bookings add column if not exists company_id uuid references public.companies(id) on delete set null;
create index if not exists bookings_company_id_idx on public.bookings(company_id);
