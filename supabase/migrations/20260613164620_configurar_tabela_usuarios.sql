-- Configura a tabela de perfis usada apos o login pelo Supabase Auth.
-- usuarios.id deve ser o mesmo UUID de auth.users.id.

create table if not exists public.usuarios (
    id uuid primary key,
    nome varchar not null,
    email varchar not null unique,
    tipo varchar not null,
    criado_em timestamptz not null default now()
);

alter table public.usuarios
    alter column id drop default;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'usuarios_id_auth_users_fkey'
          and conrelid = 'public.usuarios'::regclass
    ) then
        alter table public.usuarios
            add constraint usuarios_id_auth_users_fkey
            foreign key (id) references auth.users(id)
            on delete cascade;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'usuarios_tipo_check'
          and conrelid = 'public.usuarios'::regclass
    ) then
        alter table public.usuarios
            add constraint usuarios_tipo_check
            check (tipo in ('admin', 'user'));
    end if;
end;
$$;

create schema if not exists private;

create or replace function private.usuario_logado_eh_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.usuarios
        where id = (select auth.uid())
          and tipo = 'admin'
    );
$$;

grant usage on schema private to authenticated;
grant execute on function private.usuario_logado_eh_admin() to authenticated;

revoke all on public.usuarios from anon;
grant select, insert, update, delete on public.usuarios to authenticated;

alter table public.usuarios enable row level security;

drop policy if exists "Usuarios podem ver o proprio perfil" on public.usuarios;
drop policy if exists "Administradores podem ver usuarios" on public.usuarios;
drop policy if exists "Administradores podem cadastrar usuarios" on public.usuarios;
drop policy if exists "Administradores podem atualizar usuarios" on public.usuarios;
drop policy if exists "Administradores podem remover usuarios" on public.usuarios;

create policy "Usuarios podem ver o proprio perfil"
    on public.usuarios
    for select
    to authenticated
    using (id = (select auth.uid()));

create policy "Administradores podem ver usuarios"
    on public.usuarios
    for select
    to authenticated
    using ((select private.usuario_logado_eh_admin()));

create policy "Administradores podem cadastrar usuarios"
    on public.usuarios
    for insert
    to authenticated
    with check ((select private.usuario_logado_eh_admin()));

create policy "Administradores podem atualizar usuarios"
    on public.usuarios
    for update
    to authenticated
    using ((select private.usuario_logado_eh_admin()))
    with check ((select private.usuario_logado_eh_admin()));

create policy "Administradores podem remover usuarios"
    on public.usuarios
    for delete
    to authenticated
    using ((select private.usuario_logado_eh_admin()));
