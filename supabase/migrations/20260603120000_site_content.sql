-- Онлайн-редактор контента сайта (Фаза 2 / задел под channel manager).
-- Таблица «ключ → JSON»: цены, тексты, списки фото для публичных страниц.
-- Читать может кто угодно (нужно публичному сайту), писать — только админ.

create table if not exists public.site_content (
  key        text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Публичное чтение (сайт читает контент анонимно)
drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content"
  on public.site_content for select
  using (true);

-- Запись — только роль admin
drop policy if exists "Admins manage site content" on public.site_content;
create policy "Admins manage site content"
  on public.site_content for all
  to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Бакет для загружаемых фото (публичный на чтение)
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

-- Публичное чтение файлов бакета
drop policy if exists "Public read site-media" on storage.objects;
create policy "Public read site-media"
  on storage.objects for select
  using (bucket_id = 'site-media');

-- Загрузка / изменение / удаление файлов — только админ
drop policy if exists "Admins upload site-media" on storage.objects;
create policy "Admins upload site-media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and private.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins update site-media" on storage.objects;
create policy "Admins update site-media"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and private.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins delete site-media" on storage.objects;
create policy "Admins delete site-media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and private.has_role(auth.uid(), 'admin'::public.app_role));
