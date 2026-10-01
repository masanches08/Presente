-- ============================================================
-- Nosso Lar: segredos da lua de mel que já foram achados
-- (assim, o que ela achar no celular aparece desbloqueado no iPad também)
-- Pode rodar de novo sem problema.
-- ============================================================
create table if not exists public.desbloqueios (
  id          text primary key,
  created_at  timestamptz not null default now()
);

alter table public.desbloqueios enable row level security;

drop policy if exists "ver desbloqueios" on public.desbloqueios;
drop policy if exists "criar desbloqueios" on public.desbloqueios;
drop policy if exists "atualizar desbloqueios" on public.desbloqueios;
drop policy if exists "apagar desbloqueios" on public.desbloqueios;

create policy "ver desbloqueios"       on public.desbloqueios for select to authenticated using (true);
create policy "criar desbloqueios"     on public.desbloqueios for insert to authenticated with check (true);
create policy "atualizar desbloqueios" on public.desbloqueios for update to authenticated using (true) with check (true);
create policy "apagar desbloqueios"    on public.desbloqueios for delete to authenticated using (true);
