-- =============================================================================
-- Ficha Social — REVERTIR la migración 01
-- =============================================================================
-- Deja permisos, políticas, vistas y funciones EXACTAMENTE como estaban el
-- 20/10/2026 (según el esquema exportado). No toca ningún dato.
--
-- ⚠️ Esto vuelve a abrir los problemas de seguridad. Usalo solo si después de
-- aplicar la migración 01 algo deja de funcionar y necesitás volver atrás
-- mientras lo resolvemos. Mismo procedimiento: SQL Editor → pegar todo → Run.
--
-- Lo único que NO revierte: los índices nuevos (no cambian ningún
-- comportamiento, solo aceleran búsquedas) y las filas ya escritas en audit_log.
-- =============================================================================

begin;

-- 1. Quitar auditoría
do $$
declare r record;
begin
  for r in select event_object_table as t from information_schema.triggers
           where trigger_schema = 'public' and trigger_name = 'auditoria'
  loop
    execute format('drop trigger if exists auditoria on public.%I', r.t);
  end loop;
end $$;
drop function if exists public.registrar_auditoria();

-- 2. Borrar las políticas nuevas
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename = any (array['areas','as_construyendo_techo','as_funebre','as_modulos_alimenticios','as_viajes_movil','audiencias','audit_log','case_prestaciones','cases','cic_combustible','cic_economico','cic_medicamentos','cic_pasajes','family_members','farmacia_catalogo','farmacia_entrega_items','farmacia_entregas','farmacia_medicamentos','farmacia_pacientes','farmacia_precios','persons','prestaciones','prestaciones_catalog','profiles'])
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. Restaurar las políticas originales
create policy "Everyone authenticated can read areas" on public."areas" for SELECT to authenticated using (true);
create policy "Permitir lectura de areas" on public."areas" for SELECT to authenticated using (true);
create policy "Superadmin inserta areas" on public."areas" for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'superadmin'::text)))));
create policy "Permitir todo a autenticados techo" on public."as_construyendo_techo" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados funebre" on public."as_funebre" for ALL to authenticated using (true) with check (true);
create policy "Permitir gestión total a usuarios autenticados" on public."as_modulos_alimenticios" for ALL to authenticated using (true);
create policy "Permitir inserción a usuarios autenticados" on public."as_modulos_alimenticios" for INSERT to authenticated with check (true);
create policy "Permitir lectura a usuarios autenticados" on public."as_modulos_alimenticios" for SELECT to authenticated using (true);
create policy "Permitir todo a autenticados viajes" on public."as_viajes_movil" for ALL to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public."audiencias" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados en prestaciones" on public."case_prestaciones" for ALL to authenticated using (true) with check (true);
create policy "Permitir actualización de casos a autenticados" on public."cases" for UPDATE to authenticated using (true);
create policy "Permitir inserción de casos a autenticados" on public."cases" for INSERT to authenticated with check (true);
create policy "Permitir lectura de casos a autenticados" on public."cases" for SELECT to authenticated using (true);
create policy "View cases policy" on public."cases" for SELECT to authenticated using (((( SELECT profiles.can_view_all
   FROM profiles
  WHERE (profiles.user_id = auth.uid())) = true) OR (created_by = auth.uid())));
create policy "view_cases" on public."cases" for SELECT to public using (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND ((profiles.role = 'superadmin'::text) OR (profiles.can_view_all = true))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.default_area_id = cases.area_id))))));
create policy "Permitir todo a autenticados combustible" on public."cic_combustible" for ALL to authenticated using (true) with check (true);
create policy "Permitir inserción a usuarios autenticados" on public."cic_medicamentos" for INSERT to authenticated with check (true);
create policy "Permitir lectura a usuarios autenticados" on public."cic_medicamentos" for SELECT to authenticated using (true);
create policy "Acceso_Total_Autenticados_Pasajes" on public."cic_pasajes" for ALL to authenticated using (true) with check (true);
create policy "Permitir gestión de familia a autenticados" on public."family_members" for ALL to authenticated using (true) with check (true);
create policy "Actualizacion a autenticados catalogo" on public."farmacia_catalogo" for UPDATE to authenticated using (true) with check (true);
create policy "Borrado a autenticados catalogo" on public."farmacia_catalogo" for DELETE to authenticated using (true);
create policy "Insercion a autenticados catalogo" on public."farmacia_catalogo" for INSERT to authenticated with check (true);
create policy "Lectura a autenticados catalogo" on public."farmacia_catalogo" for SELECT to authenticated using (true);
create policy "Permitir todo a autenticados farmacia_catalogo" on public."farmacia_catalogo" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados farmacia_entrega_items" on public."farmacia_entrega_items" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados farmacia_entregas" on public."farmacia_entregas" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados farmacia_medicamentos" on public."farmacia_medicamentos" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados farmacia_pacientes" on public."farmacia_pacientes" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados farmacia_precios" on public."farmacia_precios" for ALL to authenticated using (true) with check (true);
create policy "Permitir todo a autenticados precios" on public."farmacia_precios" for ALL to authenticated using (true) with check (true);
create policy "Permitir actualización a usuarios autenticados" on public."persons" for UPDATE to authenticated using (true);
create policy "Permitir inserción a usuarios autenticados" on public."persons" for INSERT to authenticated with check (true);
create policy "Permitir lectura a usuarios autenticados" on public."persons" for SELECT to authenticated using (true);
create policy "Permitir lectura de catálogo a autenticados" on public."prestaciones_catalog" for SELECT to authenticated using (true);
create policy "Permitir actualización de perfiles" on public."profiles" for UPDATE to authenticated using (true);
create policy "Permitir inserción de perfiles" on public."profiles" for INSERT to authenticated with check (true);
create policy "Permitir lectura de perfiles" on public."profiles" for SELECT to authenticated using (true);
create policy "Permitir ver nombres de perfiles" on public."profiles" for SELECT to authenticated using (true);
create policy "Users can view own profile" on public."profiles" for SELECT to public using ((auth.uid() = user_id));

-- 4. Funciones auxiliares de la migración (ya sin políticas que las usen)
drop function if exists public.usuario_activo();
drop function if exists public.es_superadmin();
drop function if exists public.es_area(text);

-- 5. Funciones originales
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, default_area_id, is_active)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'operator'),
    (new.raw_user_meta_data->>'area_id')::uuid, -- Captura el área de los metadatos
    true
  );
  RETURN new;
END;
$function$;
CREATE OR REPLACE FUNCTION public.global_search(search_term text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'persons', (SELECT json_agg(p) FROM persons p WHERE dni ILIKE '%' || search_term || '%' OR apellido_nombre ILIKE '%' || search_term || '%'),
    'cases', (SELECT json_agg(c) FROM cases c WHERE motivo ILIKE '%' || search_term || '%')
  ) INTO result;
  RETURN result;
END;
$function$;
alter table public.profiles alter column is_active set default true;

-- 6. Vistas originales
drop view if exists public.todas_las_prestaciones;
create view public.todas_las_prestaciones as SELECT cic_pasajes.id,
    cic_pasajes.ficha_id AS case_id,
    cic_pasajes.person_id,
    'Pasajes de Ómnibus'::text AS nombre_prestacion,
    concat('Destino: ', cic_pasajes.destino, ' | ', cic_pasajes.tipo_viaje, ' | Acomp: ', cic_pasajes.cantidad_acompanantes) AS resumen,
    cic_pasajes.created_at
   FROM cic_pasajes
UNION ALL
 SELECT cic_combustible.id,
    cic_combustible.ficha_id AS case_id,
    NULL::uuid AS person_id,
    'Carga de Combustible'::text AS nombre_prestacion,
    concat(cic_combustible.cantidad_litros, ' lts de ', cic_combustible.tipo_combustible, ' — ', cic_combustible.destino) AS resumen,
    cic_combustible.created_at
   FROM cic_combustible
UNION ALL
 SELECT cic_medicamentos.id,
    cic_medicamentos.case_id,
    NULL::uuid AS person_id,
    'Ayuda Medicamentos'::text AS nombre_prestacion,
    concat(cic_medicamentos.nombre_medicamento, ' — $', cic_medicamentos.monto_medicamento) AS resumen,
    cic_medicamentos.created_at
   FROM cic_medicamentos
UNION ALL
 SELECT as_modulos_alimenticios.id,
    as_modulos_alimenticios.ficha_id AS case_id,
    as_modulos_alimenticios.person_id,
    'Módulos Alimenticios'::text AS nombre_prestacion,
    concat('Cantidad: ', as_modulos_alimenticios.cantidad, ' — Entrega: ', (as_modulos_alimenticios.fecha_entrega)::text) AS resumen,
    as_modulos_alimenticios.created_at
   FROM as_modulos_alimenticios
UNION ALL
 SELECT as_viajes_movil.id,
    as_viajes_movil.case_id,
    NULL::uuid AS person_id,
    'Viaje Móvil Social'::text AS nombre_prestacion,
    concat('Destino: ', as_viajes_movil.destino, ' — ', (as_viajes_movil.fecha)::text) AS resumen,
    as_viajes_movil.created_at
   FROM as_viajes_movil
UNION ALL
 SELECT as_funebre.id,
    as_funebre.case_id,
    NULL::uuid AS person_id,
    'Servicio Fúnebre'::text AS nombre_prestacion,
    concat(as_funebre.nombre_fallecido, ' ', as_funebre.apellido_fallecido, ' — ', (as_funebre.fecha_fallecimiento)::text) AS resumen,
    as_funebre.created_at
   FROM as_funebre
UNION ALL
 SELECT as_construyendo_techo.id,
    as_construyendo_techo.case_id,
    NULL::uuid AS person_id,
    'Construyendo Techo'::text AS nombre_prestacion,
    concat('Fecha: ', (as_construyendo_techo.fecha_entrega)::text,
        CASE
            WHEN (as_construyendo_techo.items IS NOT NULL) THEN concat(' | Materiales: ', array_to_string(array_agg(concat((item.value ->> 'cantidad'::text), ' ', (item.value ->> 'unidad'::text), ' de ', (item.value ->> 'nombre'::text))), ' + '::text))
            ELSE ''::text
        END,
        CASE
            WHEN (as_construyendo_techo.observaciones IS NOT NULL) THEN concat(' | ', as_construyendo_techo.observaciones)
            ELSE ''::text
        END) AS resumen,
    as_construyendo_techo.created_at
   FROM (as_construyendo_techo
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE(as_construyendo_techo.items, '[]'::jsonb)) item(value))
  GROUP BY as_construyendo_techo.id, as_construyendo_techo.case_id, as_construyendo_techo.fecha_entrega, as_construyendo_techo.items, as_construyendo_techo.observaciones, as_construyendo_techo.created_at
UNION ALL
 SELECT prestaciones.id,
    prestaciones.case_id,
    prestaciones.person_id,
    COALESCE(prestaciones.code, 'Prestación'::text) AS nombre_prestacion,
    COALESCE(prestaciones.observaciones, (prestaciones.datos)::text) AS resumen,
    prestaciones.created_at
   FROM prestaciones;
alter view public.cases_readable reset (security_invoker);
alter view public.case_prestaciones_readable reset (security_invoker);
alter view public.farmacia_catalogo_con_precio reset (security_invoker);

-- 7. Permisos originales de Supabase (incluido el rol anon)
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated, public;
alter default privileges for role postgres in schema public grant all on tables    to anon;
alter default privileges for role postgres in schema public grant all on sequences to anon;
alter default privileges for role postgres in schema public grant execute on functions to anon, public;

commit;
