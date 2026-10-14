-- ============================================================
-- Nosso Lar: cartinhas escritas pelo próprio site (um pro outro)
-- Cole tudo no Supabase em: SQL Editor → New query → Run
-- Pode rodar de novo sem problema.
--
-- As fotos coladas como adesivo vão pra mesma pasta privada "fotos"
-- (subpasta cartinhas/), que já existe e já tem as permissões certas.
-- ============================================================

create table if not exists public.cartinhas (
  id          uuid primary key default gen_random_uuid(),
  de          text not null check (de in ('ele', 'ela')),
  para        text not null check (para in ('ele', 'ela')),
  titulo      text not null default '',
  texto       text not null default '',
  papel       text not null default 'creme',
  selo        text not null default 'terracota',
  -- adesivos, fitinhas e fotos: [{ id, tipo, valor, x, y, giro, escala }]
  enfeites    jsonb not null default '[]'::jsonb,
  lida_em     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists cartinhas_para on public.cartinhas (para, created_at desc);

-- Segurança (RLS): só quem está logado (vocês dois) lê e escreve
alter table public.cartinhas enable row level security;

drop policy if exists "ler cartinhas" on public.cartinhas;
drop policy if exists "escrever cartinhas" on public.cartinhas;
drop policy if exists "marcar cartinhas" on public.cartinhas;
drop policy if exists "apagar cartinhas" on public.cartinhas;

create policy "ler cartinhas"      on public.cartinhas for select to authenticated using (true);
create policy "escrever cartinhas" on public.cartinhas for insert to authenticated with check (true);
create policy "marcar cartinhas"   on public.cartinhas for update to authenticated using (true) with check (true);
create policy "apagar cartinhas"   on public.cartinhas for delete to authenticated using (true);

-- Tempo real: a cartinha aparece na hora no aparelho do outro (com o site aberto)
do $$ begin
  alter publication supabase_realtime add table public.cartinhas;
exception when duplicate_object then null;
end $$;
