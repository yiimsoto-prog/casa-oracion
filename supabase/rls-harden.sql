-- RLS completo para Casa de Oración (Supabase)
-- Ejecutar en SQL Editor con un rol que pueda crear políticas.
-- Anon: sin acceso. Authenticated: según perfiles.rol

begin;

create or replace function public.my_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(rol, '')) from public.perfiles where id = auth.uid()
$$;

revoke all on function public.my_rol() from public, anon;
grant execute on function public.my_rol() to authenticated;

do $$
declare
  t text;
  tables text[] := array[
    'diezmos','miembros','cajachica','servicios','ingresos',
    'remuneraciones','santacena','agendas','presupuestos','auditoria','perfiles'
  ];
begin
  foreach t in array tables loop
    execute format('alter table if exists public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- -------- perfiles --------
drop policy if exists perfil_select on public.perfiles;
drop policy if exists perfil_self_select on public.perfiles;
drop policy if exists perfil_update_self on public.perfiles;
drop policy if exists perfil_lider_all on public.perfiles;

create policy perfil_select on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.my_rol() = 'lider');

create policy perfil_update_self on public.perfiles
  for update to authenticated
  using (id = auth.uid() or public.my_rol() = 'lider')
  with check (id = auth.uid() or public.my_rol() = 'lider');

create policy perfil_lider_insert on public.perfiles
  for insert to authenticated
  with check (public.my_rol() = 'lider' or id = auth.uid());

create policy perfil_lider_delete on public.perfiles
  for delete to authenticated
  using (public.my_rol() = 'lider');

-- -------- finanzas: líder / tesorero --------
do $$
declare
  t text;
  fin text[] := array['diezmos','servicios','ingresos','remuneraciones','cajachica','presupuestos','auditoria'];
begin
  foreach t in array fin loop
    execute format('drop policy if exists %I_fin_all on public.%I', t, t);
    execute format(
      'create policy %I_fin_all on public.%I for all to authenticated
         using (public.my_rol() in (''lider'',''tesorero''))
         with check (public.my_rol() in (''lider'',''tesorero''))',
      t, t
    );
  end loop;
end $$;

-- -------- eclesiástico: lectura líder/secretario/miembro; escritura líder/secretario --------
do $$
declare
  t text;
  ecl text[] := array['miembros','santacena','agendas'];
begin
  foreach t in array ecl loop
    execute format('drop policy if exists %I_ecl_select on public.%I', t, t);
    execute format('drop policy if exists %I_ecl_write on public.%I', t, t);
    execute format(
      'create policy %I_ecl_select on public.%I for select to authenticated
         using (public.my_rol() in (''lider'',''secretario'',''miembro''))',
      t, t
    );
    execute format(
      'create policy %I_ecl_write on public.%I for insert to authenticated
         with check (public.my_rol() in (''lider'',''secretario''))',
      t, t
    );
    execute format('drop policy if exists %I_ecl_update on public.%I', t, t);
    execute format(
      'create policy %I_ecl_update on public.%I for update to authenticated
         using (public.my_rol() in (''lider'',''secretario''))
         with check (public.my_rol() in (''lider'',''secretario''))',
      t, t
    );
    execute format('drop policy if exists %I_ecl_delete on public.%I', t, t);
    execute format(
      'create policy %I_ecl_delete on public.%I for delete to authenticated
         using (public.my_rol() in (''lider'',''secretario''))',
      t, t
    );
  end loop;
end $$;

commit;
