-- ============================================================
-- Nosso Lar: os vestidos do Ateliê (o cantinho do vestido no píer do casamento)
-- Cole tudo no Supabase em: SQL Editor → New query → Run
-- Pode rodar de novo sem problema.
--
-- Cada vestido pertence à conta que criou ("dono") e o banco SÓ deixa essa
-- mesma conta ler, mudar ou apagar. A conta dele não vê nenhum vestido dela.
-- ============================================================

create table if not exists public.vestidos (
  id          uuid primary key default gen_random_uuid(),
  dono        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null default 'Meu vestido',
  -- todas as escolhas do vestido (silhueta, decote, mangas, tecido, cor, véu…)
  config      jsonb not null default '{}'::jsonb,
  criado      timestamptz not null default now(),
  atualizado  timestamptz not null default now()
);

create index if not exists vestidos_dono on public.vestidos (dono, atualizado desc);

-- Segurança (RLS): cada um só enxerga os próprios vestidos
alter table public.vestidos enable row level security;

drop policy if exists "ver os meus vestidos" on public.vestidos;
drop policy if exists "criar os meus vestidos" on public.vestidos;
drop policy if exists "mudar os meus vestidos" on public.vestidos;
drop policy if exists "apagar os meus vestidos" on public.vestidos;

create policy "ver os meus vestidos"    on public.vestidos for select to authenticated using (dono = (select auth.uid()));
create policy "criar os meus vestidos"  on public.vestidos for insert to authenticated with check (dono = (select auth.uid()));
create policy "mudar os meus vestidos"  on public.vestidos for update to authenticated using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
create policy "apagar os meus vestidos" on public.vestidos for delete to authenticated using (dono = (select auth.uid()));
