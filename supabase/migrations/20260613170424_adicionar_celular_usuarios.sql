-- Adiciona o telefone celular ao perfil do usuario.

alter table public.usuarios
    add column if not exists celular varchar;
