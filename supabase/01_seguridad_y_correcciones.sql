-- =============================================================================
-- Ficha Social — Migración 01: seguridad y correcciones de base de datos
-- =============================================================================
-- Cómo aplicarla:
--   1. Hacé un backup antes: Supabase → Database → Backups (o al menos exportá
--      las tablas principales). Esta migración NO borra datos, pero es buena
--      práctica antes de tocar permisos.
--   2. SQL Editor → New query → pegá TODO este archivo → Run.
--   3. Si algo falla, se revierte completo (está dentro de una transacción).
--
-- Qué hace (resumen):
--   A. Cierra el acceso sin login (rol anon) a tablas, vistas y funciones.
--   B. Hace que las vistas respeten las reglas de seguridad (security_invoker).
--   C. Elimina global_search (no se usa y exponía toda la base sin login).
--   D. Impide que cualquiera se haga superadmin (registro público y perfiles).
--   E. Los usuarios desactivados pierden acceso real a los datos, no solo en pantalla.
--   F. Farmacia (diagnósticos y medicación) solo para Farmacia y superadmin.
--   G. Políticas faltantes: Ayuda Económica, editar Medicamentos, editar áreas.
--   H. Vista todas_las_prestaciones: suma Ayuda Económica y prestaciones rápidas,
--      y deja de ocultar los "Construyendo Techo" sin materiales.
--   I. Índices para las búsquedas más frecuentes.
--   J. Auditoría: registra quién crea, modifica o borra cada registro.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Funciones auxiliares para las políticas
--    SECURITY DEFINER: leen profiles sin quedar atrapadas en su propia RLS.
-- -----------------------------------------------------------------------------
create or replace function public.usuario_activo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and is_active is true
  );
$$;

create or replace function public.es_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and is_active is true and role = 'superadmin'
  );
$$;

create or replace function public.es_area(p_nombre text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.areas a on a.id = p.default_area_id
    where p.user_id = auth.uid() and p.is_active is true
      and lower(trim(a.name)) = lower(trim(p_nombre))
  );
$$;

-- -----------------------------------------------------------------------------
-- A. Sin login no se accede a nada
--    La anon key está dentro del JavaScript de la app: cualquiera puede verla.
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant  execute on all functions in schema public to authenticated;

-- Que las tablas/funciones que se creen en el futuro tampoco queden abiertas
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon, public;

-- -----------------------------------------------------------------------------
-- C. global_search: SECURITY DEFINER, sin uso en la app y devolvía TODAS las
--    personas y casos a cualquiera (incluso sin login).
-- -----------------------------------------------------------------------------
drop function if exists public.global_search(text);

-- -----------------------------------------------------------------------------
-- D. Alta de usuarios: nadie elige su propio rol
--    Antes el rol y el área salían de los metadatos del registro, que controla
--    quien se registra. Ahora todo usuario nuevo nace como operator INACTIVO y
--    un superadmin lo activa y le asigna rol y área desde el Panel de Control.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, role, default_area_id, is_active)
  values (new.id, new.raw_user_meta_data->>'full_name', 'operator', null, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

alter table public.profiles alter column is_active set default false;
alter table public.profiles alter column role set default 'operator';

-- -----------------------------------------------------------------------------
-- Reemplazo de políticas: se borran TODAS las actuales de estas tablas.
-- Hoy casi todas dicen "USING (true)": cualquier usuario logueado puede leer,
-- modificar y borrar todo, y las políticas restrictivas de cases no tienen
-- efecto porque otra política paralela permite todo.
-- -----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'areas','as_construyendo_techo','as_funebre','as_modulos_alimenticios','as_viajes_movil',
      'audiencias','audit_log','case_prestaciones','cases','cic_combustible','cic_economico',
      'cic_medicamentos','cic_pasajes','family_members','farmacia_catalogo','farmacia_entrega_items',
      'farmacia_entregas','farmacia_medicamentos','farmacia_pacientes','farmacia_precios',
      'persons','prestaciones','prestaciones_catalog','profiles')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- E. Tablas de trabajo diario: cualquier usuario ACTIVO
do $$
declare t text;
begin
  foreach t in array array[
    'as_construyendo_techo','as_funebre','as_modulos_alimenticios','as_viajes_movil',
    'audiencias','case_prestaciones','cic_combustible','cic_economico','cic_medicamentos',
    'cic_pasajes','family_members','prestaciones']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "personal_activo" on public.%I for all to authenticated
         using ((select public.usuario_activo())) with check ((select public.usuario_activo()))', t);
  end loop;
end $$;

-- Personas y casos: leer, crear y editar usuarios activos; borrar solo superadmin
do $$
declare t text;
begin
  foreach t in array array['persons','cases']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "leer_activos" on public.%I for select to authenticated using ((select public.usuario_activo()))', t);
    execute format('create policy "crear_activos" on public.%I for insert to authenticated with check ((select public.usuario_activo()))', t);
    execute format('create policy "editar_activos" on public.%I for update to authenticated using ((select public.usuario_activo())) with check ((select public.usuario_activo()))', t);
    execute format('create policy "borrar_superadmin" on public.%I for delete to authenticated using ((select public.es_superadmin()))', t);
  end loop;
end $$;

-- Áreas y catálogo: leen todos los activos; administra el superadmin (G: antes no se podían editar)
do $$
declare t text;
begin
  foreach t in array array['areas','prestaciones_catalog']
  loop
    execute format('create policy "leer_activos" on public.%I for select to authenticated using ((select public.usuario_activo()))', t);
    execute format('create policy "administra_superadmin" on public.%I for all to authenticated using ((select public.es_superadmin())) with check ((select public.es_superadmin()))', t);
  end loop;
end $$;

-- F. Farmacia: datos de salud → solo área Farmacia y superadmin
do $$
declare t text;
begin
  foreach t in array array[
    'farmacia_catalogo','farmacia_entrega_items','farmacia_entregas',
    'farmacia_medicamentos','farmacia_pacientes','farmacia_precios']
  loop
    execute format(
      'create policy "solo_farmacia" on public.%I for all to authenticated
         using ((select public.es_area(''farmacia'')) or (select public.es_superadmin()))
         with check ((select public.es_area(''farmacia'')) or (select public.es_superadmin()))', t);
  end loop;
end $$;

-- D. Perfiles: cada uno ve el suyo; los activos ven los demás (nombres de operadores);
--    solo el superadmin crea, modifica o borra perfiles (rol, área, activo).
create policy "ver_propio" on public.profiles for select to authenticated
  using (user_id = auth.uid());
create policy "ver_activos" on public.profiles for select to authenticated
  using ((select public.usuario_activo()));
create policy "administra_superadmin" on public.profiles for all to authenticated
  using ((select public.es_superadmin())) with check ((select public.es_superadmin()));

-- Auditoría: solo la lee el superadmin. Se escribe únicamente desde el trigger.
create policy "leer_superadmin" on public.audit_log for select to authenticated
  using ((select public.es_superadmin()));

-- -----------------------------------------------------------------------------
-- B + H. Vistas: respetan la seguridad de quien consulta + vista corregida
-- -----------------------------------------------------------------------------
create or replace view public.todas_las_prestaciones with (security_invoker = true) as
 select p.id, p.ficha_id as case_id, p.person_id,
        'Pasajes de Ómnibus'::text as nombre_prestacion,
        concat('Destino: ', p.destino, ' | ', p.tipo_viaje, ' | Acomp: ', p.cantidad_acompanantes) as resumen,
        p.created_at
   from public.cic_pasajes p
union all
 select c.id, c.ficha_id, null::uuid,
        'Carga de Combustible',
        concat(c.cantidad_litros, ' lts de ', c.tipo_combustible, ' — ', c.destino),
        c.created_at
   from public.cic_combustible c
union all
 select m.id, m.case_id, null::uuid,
        'Ayuda Medicamentos',
        concat(m.nombre_medicamento, ' — $', m.monto_medicamento),
        m.created_at
   from public.cic_medicamentos m
union all
 -- NUEVO: antes Ayuda Económica no aparecía en historial ni estadísticas
 select e.id, coalesce(e.case_id, e.ficha_id), null::uuid,
        'Ayuda Económica',
        concat('$', e.monto, case when e.concepto is not null then concat(' — ', e.concepto) else '' end),
        e.created_at
   from public.cic_economico e
union all
 select mo.id, mo.ficha_id, mo.person_id,
        'Módulos Alimenticios',
        concat('Cantidad: ', mo.cantidad, ' — Entrega: ', mo.fecha_entrega::text),
        mo.created_at
   from public.as_modulos_alimenticios mo
union all
 select v.id, v.case_id, null::uuid,
        'Viaje Móvil Social',
        concat('Destino: ', v.destino, ' — ', v.fecha::text),
        v.created_at
   from public.as_viajes_movil v
union all
 select f.id, f.case_id, null::uuid,
        'Servicio Fúnebre',
        concat(f.nombre_fallecido, ' ', f.apellido_fallecido, ' — ', f.fecha_fallecimiento::text),
        f.created_at
   from public.as_funebre f
union all
 -- CORREGIDO: antes un techo sin materiales desaparecía de la vista
 select t.id, t.case_id, null::uuid,
        'Construyendo Techo',
        concat('Fecha: ', t.fecha_entrega::text,
          case when jsonb_typeof(t.items) = 'array' and jsonb_array_length(t.items) > 0
               then concat(' | Materiales: ', (
                 select string_agg(concat(i->>'cantidad', ' ', i->>'unidad', ' de ', i->>'nombre'), ' + ')
                 from jsonb_array_elements(t.items) i))
               else '' end,
          case when t.observaciones is not null then concat(' | ', t.observaciones) else '' end),
        t.created_at
   from public.as_construyendo_techo t
union all
 -- NUEVO: prestaciones cargadas desde el "Catálogo disponible"
 select cp.id, cp.case_id, cp.person_id,
        coalesce(cp.nombre_prestacion, 'Prestación'),
        coalesce(cp.observaciones, ''),
        cp.created_at
   from public.case_prestaciones cp
union all
 select pr.id, pr.case_id, pr.person_id,
        coalesce(pr.code, 'Prestación'),
        coalesce(pr.observaciones, pr.datos::text),
        pr.created_at
   from public.prestaciones pr;

alter view public.cases_readable               set (security_invoker = true);
alter view public.case_prestaciones_readable   set (security_invoker = true);
alter view public.farmacia_catalogo_con_precio set (security_invoker = true);

revoke all on public.todas_las_prestaciones from anon;
grant select on public.todas_las_prestaciones to authenticated;

-- -----------------------------------------------------------------------------
-- I. Índices (búsquedas por caso, persona, DNI, bandejas)
-- -----------------------------------------------------------------------------
create index if not exists cases_person_id_idx            on public.cases (person_id);
create index if not exists cases_area_id_idx              on public.cases (area_id);
create index if not exists cases_created_at_idx           on public.cases (created_at desc);
create index if not exists cases_dni_idx                  on public.cases (dni);
create index if not exists family_members_person_id_idx   on public.family_members (person_id);
create index if not exists family_members_dni_idx         on public.family_members (dni);
create index if not exists audiencias_estado_area_idx     on public.audiencias (estado, area_id);
create index if not exists audiencias_person_id_idx       on public.audiencias (person_id);
create index if not exists cic_pasajes_ficha_id_idx       on public.cic_pasajes (ficha_id);
create index if not exists cic_combustible_ficha_id_idx   on public.cic_combustible (ficha_id);
create index if not exists cic_medicamentos_case_id_idx   on public.cic_medicamentos (case_id);
create index if not exists cic_economico_case_id_idx      on public.cic_economico (case_id);
create index if not exists as_modulos_ficha_id_idx        on public.as_modulos_alimenticios (ficha_id);
create index if not exists as_viajes_case_id_idx          on public.as_viajes_movil (case_id);
create index if not exists as_funebre_case_id_idx         on public.as_funebre (case_id);
create index if not exists as_techo_case_id_idx           on public.as_construyendo_techo (case_id);
create index if not exists case_prestaciones_case_id_idx  on public.case_prestaciones (case_id);
create index if not exists farmacia_medicamentos_pac_idx  on public.farmacia_medicamentos (paciente_id);
create index if not exists farmacia_entrega_items_ent_idx on public.farmacia_entrega_items (entrega_id);
create index if not exists audit_log_created_at_idx       on public.audit_log (created_at desc);

-- -----------------------------------------------------------------------------
-- J. Auditoría: quién hizo qué y cuándo.
--    Por privacidad NO se copian los datos: solo qué campos cambiaron.
-- -----------------------------------------------------------------------------
create or replace function public.registrar_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_campos text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_campos
    from jsonb_each(to_jsonb(new)) n
    where n.value is distinct from (to_jsonb(old) -> n.key)
      and n.key not in ('updated_at');
    if v_campos is null then return null; end if;  -- nada cambió realmente
  end if;

  insert into public.audit_log (actor_id, entity, entity_id, action, meta)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(v_fila->>'id', v_fila->>'user_id'),
    tg_op,
    case when v_campos is not null then jsonb_build_object('campos', v_campos) end
  );
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'persons','cases','family_members','audiencias','profiles','areas',
    'as_construyendo_techo','as_funebre','as_modulos_alimenticios','as_viajes_movil',
    'case_prestaciones','cic_combustible','cic_economico','cic_medicamentos','cic_pasajes',
    'farmacia_pacientes','farmacia_medicamentos','farmacia_entregas']
  loop
    execute format('drop trigger if exists auditoria on public.%I', t);
    execute format(
      'create trigger auditoria after insert or update or delete on public.%I
         for each row execute function public.registrar_auditoria()', t);
  end loop;
end $$;

-- Las funciones nuevas tampoco quedan disponibles sin login
revoke execute on all functions in schema public from anon, public;
grant  execute on all functions in schema public to authenticated;

commit;

-- =============================================================================
-- Después de aplicar:
--   * Revisá en Panel de Control que todos los usuarios reales figuren "Activo".
--     Los que estaban con is_active NULL quedan sin acceso hasta activarlos.
--   * Supabase → Advisors → Security: los avisos de "security definer view" y
--     "policy always true" deberían desaparecer.
-- =============================================================================
