-- Ограничение частоты публичных действий (антиспам/абуз): бронь, чат, AI.
-- Счётчик по ключу «действие:IP» в окне времени. Доступ только через
-- SECURITY DEFINER функцию (вызывается серверными функциями под service-role).

create table if not exists public.rate_limits (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- Политик нет: обычные пользователи не имеют доступа; пишет только функция ниже.

-- Атомарно: увеличивает счётчик в окне и возвращает true, если лимит не превышен.
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_start timestamptz;
begin
  select count, window_start into v_count, v_start
  from public.rate_limits where key = p_key for update;

  if not found then
    insert into public.rate_limits(key, count, window_start) values (p_key, 1, now());
    return true;
  end if;

  -- окно истекло — сбрасываем
  if v_start < now() - make_interval(secs => p_window_seconds) then
    update public.rate_limits set count = 1, window_start = now() where key = p_key;
    return true;
  end if;

  if v_count >= p_max then
    return false; -- лимит превышен
  end if;

  update public.rate_limits set count = count + 1 where key = p_key;
  return true;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
