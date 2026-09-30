-- ============================================================
-- Nosso Lar: entrar sem e-mail e senha
-- O site pergunta "Nome do amor da minha vida:" e esta função confere a resposta.
-- Se estiver certa, devolve a senha técnica da conta única do casal (nos@nossolar.app),
-- que ninguém precisa saber (é gerada aqui mesmo, aleatória, e nunca aparece no site).
--
-- ANTES de rodar: crie o usuário nos@nossolar.app em Authentication → Users
-- (qualquer senha provisória, marque "Auto Confirm User"). Esta script troca a senha.
-- Pode rodar de novo quando quiser (por exemplo, pra mudar as respostas aceitas).
-- ============================================================

-- 1) Um cantinho escondido (a API do site não enxerga este schema)
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table if not exists privado.chave (
  id    int primary key default 1 check (id = 1),
  senha text not null
);

-- 2) A senha técnica: aleatória, criada uma vez só
insert into privado.chave (senha)
values (encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (id) do nothing;

-- 3) A conta do casal passa a usar essa senha
do $$
declare
  n int;
begin
  update auth.users
     set encrypted_password = extensions.crypt((select senha from privado.chave where id = 1), extensions.gen_salt('bf'))
   where email = 'nos@nossolar.app';
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Crie primeiro o usuário nos@nossolar.app (Authentication → Users → Add user) e rode de novo.';
  end if;
end $$;

-- 4) A pergunta: aceita o nome dela de vários jeitos (maiúscula, minúscula, acento, nome completo,
--    apelidos) e também "amor" e parecidos
create or replace function public.chave_do_lar(resposta text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  limpo  text;
  junto  text;
  partes text[];
begin
  -- tira acento, deixa minúsculo e fica só com as letras
  limpo := lower(translate(coalesce(resposta, ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'));
  limpo := btrim(regexp_replace(limpo, '[^a-z]+', ' ', 'g'));
  if limpo = '' then
    return null;
  end if;
  junto := replace(limpo, ' ', '');
  partes := string_to_array(limpo, ' ');

  if partes && array['camila', 'camilla', 'kamila', 'kamilla', 'camilinha', 'cami', 'mila', 'milinha']
     or junto = any (array[
       'amor', 'meuamor', 'amorzinho', 'meuamorzinho', 'amordaminhavida', 'oamordaminhavida',
       'mozao', 'meumozao', 'mozinho', 'vida', 'minhavida', 'eu'
     ]) then
    return (select senha from privado.chave where id = 1);
  end if;
  return null;
end $$;

revoke all on function public.chave_do_lar(text) from public;
grant execute on function public.chave_do_lar(text) to anon, authenticated;
