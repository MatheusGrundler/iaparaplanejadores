-- A Preparação não inclui mais desenho ou criação de skill. Arquiva qualquer
-- identidade persistida anteriormente sem apagar versões nem respostas históricas.

begin;

update public.curso_formularios
set arquivado = true,
    atualizado_em = now()
where codigo in ('quest-preparacao-skill', 'semana-0-skill-relatorio')
  and not arquivado;

commit;
