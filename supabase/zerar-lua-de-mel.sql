-- ============================================================
-- Nosso Lar: zera os segredos da lua de mel que já foram achados
-- (todos os aparelhos voltam pro "Bloqueado" na próxima vez que abrirem o site:
--  o site sempre obedece ao que está aqui no banco)
-- Não mexe em datas, fotos nem cartinhas.
-- ============================================================
delete from public.desbloqueios;
