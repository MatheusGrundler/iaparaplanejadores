-- Respostas estruturadas do aluno dentro de um material (ex.: canvas da Semana 0).
-- Aplicada no projeto pajdmyujulamgxrpypmo em 18/07/2026 via MCP.
alter table public.leituras add column if not exists respostas jsonb;
