-- Execute no SQL Editor do Supabase antes de usar o Modo Lançamento.
create table if not exists public.store_settings (
 id integer primary key default 1 check (id = 1),
 launch_mode boolean not null default false,
 countdown_enabled boolean not null default false,
 launch_at timestamptz,
 launch_title text not null default 'Algo especial está chegando',
 launch_message text not null default 'Uma nova coleção Uselamajo está a caminho. Aguarde!',
 launch_image text,
 updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;
alter table public.store_settings enable row level security;
drop policy if exists "Todos podem visualizar configuracoes da loja" on public.store_settings;
create policy "Todos podem visualizar configuracoes da loja" on public.store_settings for select to anon, authenticated using (true);
drop policy if exists "Somente administradores podem editar configuracoes" on public.store_settings;
create policy "Somente administradores podem editar configuracoes" on public.store_settings for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
