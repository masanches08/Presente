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
do $$ begin
  alter publication supabase_realtime add table public.datas_importantes;
exception when duplicate_object then null;
end $$;

-- 4) A primeira data de todas
insert into public.datas_importantes (titulo, data, emoji)
select 'Pedido de namoro', '2026-01-24', '💍'
where not exists (select 1 from public.datas_importantes where data = '2026-01-24');

-- ============================================================
-- 5) Fotos mandadas pelo próprio site (botão "adicionar foto")
--    (pode rodar este arquivo inteiro de novo sem problema)
-- ============================================================
create table if not exists public.fotos (
  id            uuid primary key default gen_random_uuid(),
  caminho       text not null,   -- a foto grande, dentro da pasta "fotos"
  caminho_mini  text not null,   -- a versão menor (galeria)
  legenda       text,
  criado_por    uuid references auth.users (id) default auth.uid(),
  created_at    timestamptz not null default now()
);

alter table public.fotos enable row level security;

drop policy if exists "ler fotos" on public.fotos;
drop policy if exists "criar fotos" on public.fotos;
drop policy if exists "apagar fotos" on public.fotos;

create policy "ler fotos"    on public.fotos for select to authenticated using (true);
create policy "criar fotos"  on public.fotos for insert to authenticated with check (true);
create policy "apagar fotos" on public.fotos for delete to authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.fotos;
exception when duplicate_object then null;
end $$;

-- a pasta onde os arquivos ficam: PRIVADA (só abre com login, por link que expira)
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "ver arquivos das fotos" on storage.objects;
drop policy if exists "mandar arquivos das fotos" on storage.objects;
drop policy if exists "apagar arquivos das fotos" on storage.objects;

create policy "ver arquivos das fotos"    on storage.objects for select to authenticated using (bucket_id = 'fotos');
create policy "mandar arquivos das fotos" on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
create policy "apagar arquivos das fotos" on storage.objects for delete to authenticated using (bucket_id = 'fotos');

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
