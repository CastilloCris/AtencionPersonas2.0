-- =============================================================================
-- Ficha Social — Buscar fichas afectadas por el error de "Editar caso"
-- Solo LEE datos: no modifica nada. Correr en SQL Editor.
-- =============================================================================

-- 1) Quién borró qué y cuándo (registrado por la auditoría desde la migración 01).
--    Muestra las ediciones de personas que tocaron alguno de los 4 campos afectados
--    y si HOY ese campo está vacío.
select
  a.created_at                           as cuando,
  pr.full_name                           as quien,
  p.dni,
  p.apellido_nombre,
  a.meta->'campos'                       as campos_modificados,
  (p.telefono is null)                   as telefono_vacio,
  (p.domicilio is null)                  as domicilio_vacio,
  (p.estado_civil is null)               as estado_civil_vacio,
  (p.trabaja_actualmente is null)        as laboral_vacio
from public.audit_log a
join public.persons p   on p.id::text = a.entity_id
left join public.profiles pr on pr.user_id = a.actor_id
where a.entity = 'persons'
  and a.action = 'UPDATE'
  and a.meta->'campos' ?| array['telefono','domicilio','estado_civil','trabaja_actualmente']
order by a.created_at desc;

-- 2) Datos que se pueden RECUPERAR: personas con campos vacíos cuyo valor
--    todavía figura en alguno de sus casos (los casos viejos guardaban copia).
select
  p.dni,
  p.apellido_nombre,
  case when p.telefono is null then (
    select c.telefono from public.cases c
    where c.person_id = p.id and nullif(trim(c.telefono), '') is not null
    order by c.created_at desc limit 1) end            as telefono_recuperable,
  case when p.domicilio is null then (
    select c.domicilio from public.cases c
    where c.person_id = p.id and nullif(trim(c.domicilio), '') is not null
    order by c.created_at desc limit 1) end            as domicilio_recuperable,
  case when p.estado_civil is null then (
    select c.estado_civil from public.cases c
    where c.person_id = p.id and nullif(trim(c.estado_civil), '') is not null
    order by c.created_at desc limit 1) end            as estado_civil_recuperable,
  case when p.trabaja_actualmente is null then (
    select c.trabaja_actualmente from public.cases c
    where c.person_id = p.id and nullif(trim(c.trabaja_actualmente), '') is not null
    order by c.created_at desc limit 1) end            as laboral_recuperable
from public.persons p
where (p.telefono is null or p.domicilio is null or p.estado_civil is null or p.trabaja_actualmente is null)
  and exists (
    select 1 from public.cases c
    where c.person_id = p.id
      and (nullif(trim(c.telefono), '') is not null or nullif(trim(c.domicilio), '') is not null
           or nullif(trim(c.estado_civil), '') is not null or nullif(trim(c.trabaja_actualmente), '') is not null))
order by p.apellido_nombre;
