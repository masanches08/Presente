-- ============================================================
-- Nosso Lar: banco de dados das datas importantes
-- Cole tudo isso no Supabase em: SQL Editor → New query → Run
-- ============================================================

-- 1) A tabela
create table if not exists public.datas_importantes (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  data        date not null,
  descricao   text,
  emoji       text not null default '❤️',
  criado_por  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- 2) Segurança (RLS): só quem está logado (vocês dois) lê e escreve
alter table public.datas_importantes enable row level security;

drop policy if exists "ler datas" on public.datas_importantes;
drop policy if exists "criar datas" on public.datas_importantes;
drop policy if exists "editar datas" on public.datas_importantes;
drop policy if exists "apagar datas" on public.datas_importantes;

create policy "ler datas"    on public.datas_importantes for select to authenticated using (true);
create policy "criar datas"  on public.datas_importantes for insert to authenticated with check (true);
create policy "editar datas" on public.datas_importantes for update to authenticated using (true) with check (true);
create policy "apagar datas" on public.datas_importantes for delete to authenticated using (true);

-- 3) Tempo real: quando um adiciona, aparece na hora no celular do outro
alter publication supabase_realtime add table public.datas_importantes;

-- 4) A primeira data de todas
insert into public.datas_importantes (titulo, data, emoji)
select 'Pedido de namoro', '2026-01-24', '💍'
where not exists (select 1 from public.datas_importantes where data = '2026-01-24');
