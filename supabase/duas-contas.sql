-- ============================================================
-- Nosso Lar: uma conta pra cada um (substitui o entrar-sem-senha.sql)
-- O site continua perguntando só "Nome do amor da minha vida:", e a resposta decide a conta:
--   • a senha dele                       → conta dele  (ele@nossolar.app)
--   • Camila, Ca, amor e parecidos       → conta dela  (nos@nossolar.app, a que já existia)
-- Assim o site sabe quem é quem (cartinhas, avisos no celular…).
-- Tudo que já existe (datas, fotos, segredos) continua aparecendo pros dois.
--
-- ANTES de rodar: crie o usuário ele@nossolar.app em Authentication → Users → Add user
-- (qualquer senha provisória, marque "Auto Confirm User"). Esta script troca a senha.
-- Pode rodar de novo quando quiser.
-- ============================================================

-- 1) As senhas técnicas de cada conta (aleatórias, ninguém precisa saber; a API do site não enxerga "privado")
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table if not exists privado.chaves (
  conta text primary key check (conta in ('ele', 'ela')),
  email text not null,
  senha text not null
);

-- a dela continua a mesma de antes (se existir), pra não precisar mexer em nada
do $$ begin
  if to_regclass('privado.chave') is not null then
    execute $q$
      insert into privado.chaves (conta, email, senha)
      select 'ela', 'nos@nossolar.app', senha from privado.chave where id = 1
      on conflict (conta) do nothing
    $q$;
  end if;
end $$;
insert into privado.chaves (conta, email, senha)
values ('ela', 'nos@nossolar.app', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (conta) do nothing;
insert into privado.chaves (conta, email, senha)
values ('ele', 'ele@nossolar.app', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (conta) do nothing;

-- 2) Cada conta passa a usar a sua senha técnica
do $$
declare
  c record;
  n int;
begin
  for c in select * from privado.chaves loop
    update auth.users
       set encrypted_password = extensions.crypt(c.senha, extensions.gen_salt('bf'))
     where email = c.email;
    get diagnostics n = row_count;
    if n = 0 then
      raise exception 'Crie primeiro o usuário % (Authentication → Users → Add user, com "Auto Confirm User") e rode de novo.', c.email;
    end if;
  end loop;
end $$;

-- 3) A pergunta: devolve a conta certa (e-mail + senha técnica), ou nada se a resposta não bater
create or replace function public.entrar_no_lar(resposta text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  cru    text;
  limpo  text;
  junto  text;
  partes text[];
  qual   text;
begin
  cru := regexp_replace(lower(coalesce(resposta, '')), '\s+', '', 'g');
  if cru = '' then
    return null;
  end if;

  -- a senha dele (guardada só embaralhada: o texto dela não fica escrito em lugar nenhum)
  if extensions.crypt(cru, '$2a$10$gGJAcFunZ5HWXkwuYll5tuh23vyvgVHpqyJ.q5161J1oGyFnP0mni') = '$2a$10$gGJAcFunZ5HWXkwuYll5tuh23vyvgVHpqyJ.q5161J1oGyFnP0mni' then
    qual := 'ele';
  else
    -- o nome dela de vários jeitos (sem acento, minúsculo, nome completo, apelidos) e "amor" e parecidos
    limpo := lower(translate(coalesce(resposta, ''),
      'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'));
    limpo := btrim(regexp_replace(limpo, '[^a-z]+', ' ', 'g'));
    junto := replace(limpo, ' ', '');
    partes := string_to_array(limpo, ' ');
    if limpo <> '' and (
      partes && array['camila', 'camilla', 'kamila', 'kamilla', 'camilinha', 'cami', 'mila', 'milinha', 'ca', 'ka']
      or junto = any (array[
        'amor', 'meuamor', 'amorzinho', 'meuamorzinho', 'amordaminhavida', 'oamordaminhavida',
        'mozao', 'meumozao', 'mozinho', 'vida', 'minhavida', 'eu'
      ])
    ) then
      qual := 'ela';
    end if;
  end if;

  if qual is null then
    return null;
  end if;
  return (select json_build_object('conta', c.conta, 'email', c.email, 'senha', c.senha) from privado.chaves c where c.conta = qual);
end $$;

revoke all on function public.entrar_no_lar(text) from public;
grant execute on function public.entrar_no_lar(text) to anon, authenticated;

-- 4) A função antiga (conta única) sai de cena
drop function if exists public.chave_do_lar(text);
