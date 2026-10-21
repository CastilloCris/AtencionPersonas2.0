# Ficha Social — Paso 2: seguridad de la base de datos

## ⚠️ Por qué es urgente
Probé tu esquema en una copia local de Postgres que replica a Supabase (mismas tablas, políticas, vistas y funciones).
Resultado con la base **como está hoy** (`supabase/pruebas_antes.txt`):

| Prueba | Hoy |
|---|---|
| Leer casos (DNI, domicilio, ingresos) **sin iniciar sesión** | ✘ se puede (vía la vista `cases_readable`) |
| Obtener todas las personas **sin iniciar sesión** | ✘ se puede (función `global_search`) |
| Registrarse desde afuera como **superadmin activo** | ✘ se puede (el rol sale de los datos de registro) |
| Un operador se cambia el rol a superadmin | ✘ se puede |
| Un usuario dado de baja sigue leyendo datos | ✘ sí (solo se lo bloquea en pantalla) |
| Acción Social lee diagnósticos de Farmacia | ✘ sí |

La "anon key" va dentro del JavaScript de la app, así que cualquiera que abra la página la tiene.

## Cómo aplicar (en este orden)
1. **Red de seguridad** (el plan Free no tiene backups):
   - La migración **no toca datos**: solo permisos, vistas y funciones.
   - Si algo deja de funcionar después de aplicarla, corré `supabase/00_revertir_01.sql`: deja todo
     exactamente como estaba (probado: base original → migración → reversión = idéntica).
   - Si querés además una copia de los datos de prueba: Table Editor → cada tabla → botón *Export* → CSV.
2. **Frontend primero**: reemplazá `src/` por la del zip (incluye el paso 1 + los ajustes de este paso) y publicá.
3. **Base**: SQL Editor → New query → pegá `supabase/01_seguridad_y_correcciones.sql` completo → Run.
   Si algo falla, no se aplica nada (es una sola transacción). Se puede volver a correr sin problema.
4. **Revisar usuarios**: Panel de Control → todos los usuarios reales deben figurar "Activo".

## Qué cambia en la base
- Sin login no se accede a ninguna tabla, vista ni función.
- Las vistas respetan los permisos de quien consulta.
- Se elimina `global_search` (no la usa la app).
- Todo usuario nuevo nace como **operator inactivo**; solo el superadmin asigna rol, área y lo activa.
- Solo el superadmin modifica perfiles, áreas y el catálogo de prestaciones.
- Usuario desactivado = sin acceso a los datos, inmediato.
- Farmacia (pacientes, diagnósticos, medicación, entregas, precios): solo área Farmacia y superadmin.
- Personas y casos: los usuarios activos leen, crean y editan; **borrar, solo el superadmin**.
- Índices en las columnas de búsqueda más usadas.
- **Auditoría**: cada alta, cambio o baja queda registrada con quién y cuándo. Por privacidad se guarda
  solo *qué campos* cambiaron, no los datos. Se ve en Panel de Control → Auditoría.

## Errores funcionales que también corrige
| Problema | Antes | Después |
|---|---|---|
| Guardar **Ayuda Económica** | fallaba siempre (tabla sin permisos) | funciona |
| Ayuda Económica en historial y estadísticas | no aparecía | aparece |
| Editar o borrar **Ayuda Medicamentos** | decía "guardado" pero no cambiaba nada | funciona |
| **Construyendo Techo** sin materiales | desaparecía del historial | aparece |
| Prestación desde "Catálogo disponible" | fallaba siempre (columna `resumen` inexistente) y no figuraba en el historial | funciona y aparece |
| Renombrar un área | no hacía nada | funciona (superadmin) |
| Auditoría en el Panel de Control | siempre vacía | registra todo |

## Cambios de frontend en este paso (`cambios-paso2.patch`)
- `lib/supabase.js` + `admin/AdminModal.jsx`: el alta de usuarios usa un cliente temporal; antes, según la
  configuración de Supabase, el admin podía quedar logueado como el usuario nuevo. El perfil se activa con
  la sesión del superadmin.
- `admin/AdminModal.jsx`: la auditoría muestra el nombre del operador y qué campos cambió.
- `Dashboard/PrestacionesSection.jsx`: la prestación rápida guarda en `observaciones`.
- `App.jsx`: un usuario sin perfil o inactivo ve "Tu cuenta no está activa…" y se cierra la sesión.

## Resultado de las pruebas
`supabase/pruebas_despues.txt`: **23/23** (8 de seguridad, 8 de operación normal, 7 de errores funcionales).
Antes: 8/23. La operación normal (buscar personas, crear casos, audiencias, Farmacia, alertas,
administrar usuarios) sigue funcionando igual.

## Cómo verificar en tu Supabase después de aplicar
1. Supabase → **Advisors → Security**: deberían desaparecer los avisos de "Security Definer View" y
   "RLS Policy Always True".
2. Desde una terminal en Windows (cambiá PROYECTO y ANON_KEY por los tuyos, están en tu `.env`):
   ```
   curl.exe "https://PROYECTO.supabase.co/rest/v1/cases_readable?select=dni&limit=1" -H "apikey: ANON_KEY"
   ```
   Antes devuelve un DNI. Después debe devolver un error de permiso (`permission denied`).
3. Probá en la app: crear un caso, cargar cada tipo de prestación, derivar una audiencia, Farmacia.

## Decisiones pendientes (tuyas, no técnicas)
- **¿Todos los usuarios activos deben ver todos los casos de todas las áreas?** Hoy sí (la ficha de la
  persona muestra su historial completo a Intendencia y a las áreas). Si querés restringirlo por área,
  se ajusta una política, pero cambia lo que ve cada uno.
- **Registro público**: con esta migración un registro desde afuera queda inactivo y sin acceso, así que
  ya no es peligroso. Lo ideal es desactivarlo (Authentication → Sign In / Providers → "Allow new users to
  sign up") cuando el alta de usuarios pase a una Edge Function. Ojo: si lo desactivás ahora, el botón de
  "Crear usuario" del panel deja de funcionar.
