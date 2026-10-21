# Ficha Social — Paso 3b: superadmin en celular

Reemplazá `src/` por la del zip (o `git apply cambios-paso3b.patch` sobre el paso 3), hacé el build y publicá.
No hay cambios en la base de datos. Incluye todo lo del paso 3.

## Mi Bandeja del superadmin
- Antes mostraba solo el área asignada al superadmin (o "Sin área asignada"), mientras el aviso rojo contaba
  derivaciones de **todas** las áreas: podía decir "5" y la bandeja estar vacía.
- Ahora ve **todas las derivaciones pendientes** con filtros por área arriba ("Todas 4", "Acción Social 2", "CIC 1"…).
  Cada tarjeta dice en qué área está. Puede atender o re-derivar como cualquier área.

## Error grave encontrado y corregido
- **La pantalla de inicio (Nuevo caso) medía 624 px de ancho en un celular de 390.** El navegador achicaba toda la
  app para que entrara; al abrir ventanas encima (Gestión de Personas) quedaban cortadas a la derecha.
  Causa: la cuadrícula del Dashboard no tenía columnas definidas en celular. Afectaba a todos los usuarios que entran
  a esa pantalla, no solo al superadmin.
- Estadísticas también se pasaba 10 px (columnas de ancho fijo en la tabla por área).

## Pantallas adaptadas
| Pantalla | Antes en celular | Ahora |
|---|---|---|
| Panel de Control → Usuarios | tabla aplastada ("Sup", "Adr") | una tarjeta por usuario con rol, área y botón Activar/Suspender |
| Panel de Control → Auditoría | tabla cortada | tarjetas: "Cambio · Persona — Carlos — Cambió: domicilio, telefono" |
| Ficha de la persona | datos cortados ("28456", "GONZÁ"), historial de 1.200 px | datos uno debajo del otro, familia e historial en tarjetas |
| Búsqueda global | botón "Ver ficha" fuera de la pantalla | tarjetas con el botón siempre visible |
| Gestión de Personas | ventana corrida a la derecha | pantalla completa con tarjetas |
| Mis casos | los filtros ocupaban toda la pantalla | filtros plegables ("Filtros (2 activos) ▼"), acciones en su propia fila |
| Menú | "Nuevo caso" y "Grupo familiar" se marcaban juntos | se quitó "Grupo familiar" (llevaba a la misma pantalla) |
| Todas | textos de 8–11 px | mínimo 12 px en celular |

## Mejoras de uso en la calle
- En la ficha de la persona, **el teléfono se toca para llamar** y **el domicilio abre Google Maps**.
- En el grupo familiar, si un familiar también tiene ficha propia, aparece "Ver ficha".

## Correcciones de paso
- Panel de Control: "Suspender" ahora pide confirmación; los cambios de rol/área que fallaban no avisaban; el pie
  quedaba en "Cargando usuarios…"; se quitó la etiqueta "[TEST]" del botón de áreas.
- Mis casos: cambiar el estado de un caso ahora avisa si falla.

## Verificado (celular simulado de 390 px, datos de prueba, sin tocar tu base)
- 16 pantallas del superadmin: ninguna más ancha que el celular, ningún texto menor a 12 px.
- Bandejas: derivar, deshacer y error de conexión siguen funcionando igual que en el paso 3.
- Build sin errores; lint 90 problemas (antes 94), ninguno nuevo.

## Pendiente (a propósito)
- **Estadísticas** entra en el celular pero no está pensada para él: la rehago en el próximo paso, junto con el cálculo en la base.
- **Nuevo caso / Grupo familiar / Prestaciones** se reemplaza por el flujo nuevo de carga; no se rediseñó acá.
