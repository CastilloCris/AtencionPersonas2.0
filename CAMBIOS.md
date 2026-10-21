# Ficha Social — Paso 1: correcciones de datos y lógica

Reemplazá tu carpeta `src/` por la de este zip (o aplicá `cambios.patch` con `git apply cambios.patch`).
No hay cambios en `package.json` ni en la base de datos.

## Archivos nuevos (src/lib)
- `persons.js` — `guardarPersona()`: crea o actualiza una persona **sin pisar datos existentes con campos vacíos**.
- `fechas.js` — `hoyLocal()`, `formatFecha()`, `calcularEdad()`, `parseFechaLocal()`: fechas en hora argentina.
- `texto.js` — `escapeHtml()`, `limpiarBusqueda()`, `normalizarDni()`, `dniConPuntos()`.

## Correcciones
| # | Problema | Archivo(s) |
|---|----------|-----------|
| 1 | Guardar un caso con un DNI existente sin tocar "Buscar" borraba teléfono, domicilio, fecha de nacimiento, etc. | NewCaseForm, MesaEntrada |
| 2 | La búsqueda en casos viejos usaba coincidencia parcial (1234567 encontraba 21234567) y creaba la persona con datos ajenos. Ahora es exacta (acepta DNI con o sin puntos). | NewCaseForm |
| 3 | Al cambiar el DNI quedaban cargados nombre, domicilio, etc. de la persona anterior. Ahora se limpian. | NewCaseForm |
| 4 | Enter en el campo DNI enviaba el formulario. Ahora busca. | NewCaseForm |
| 5 | Al guardar o editar una prestación, el historial no se actualizaba (riesgo de duplicados). | App, Dashboard, PrestacionesSection |
| 6 | Editar una prestación de un caso buscado por DNI abría el modal con el caso equivocado. | App, PrestacionesSection |
| 7 | La ficha de la persona solo mostraba las prestaciones del último caso. Ahora muestra las de todos. | PersonDetail |
| 8 | La impresión de la ficha no escapaba HTML: un nombre o motivo con código podía ejecutarse con la sesión abierta. | PersonDetail |
| 9 | Vincular familiares hacía una consulta por cada familiar. Ahora es una sola. | PersonDetail |
| 10 | La búsqueda global encontraba familiares pero no los mostraba. Ahora aparecen con botón "Ver titular". | GlobalSearch |
| 11 | Comas o paréntesis en búsquedas rompían los filtros de Supabase. Se limpian. Buscar "12.345.678" también funciona. | GlobalSearch, DashboardFarmacia |
| 12 | Fechas por defecto en UTC: después de las 21 h ponían el día siguiente. | 8 formularios, Farmacia, CasesList |
| 13 | Fechas sin hora (nacimiento, turno, entrega) se mostraban un día antes (10/5/1990 → 9/5/1990). | PersonDetail, CasesList, Stats, PrestacionesSection, GlobalSearch |
| 14 | El contador de notificaciones bajaba con cualquier cambio de audiencias de otras áreas y podía quedar en 0 con derivaciones sin leer. Las re-derivaciones entre áreas no siempre notificaban. | useNotifications |

## Otros
- `App.jsx`: el `<Dashboard>` estaba copiado 4 veces con las mismas 9 props → una sola función `renderDashboard()`.
- Se quitaron `console.log` de depuración en los archivos tocados.

## Verificado
- `npm run build` compila sin errores.
- `eslint`: ningún error nuevo (había 89 previos; quedan 88, la mayoría reglas estrictas de react-hooks que se resuelven al refactorizar).
- Funciones de fecha probadas con zona horaria America/Argentina/Buenos_Aires.

## Para probar en tu entorno (no tengo acceso a tu Supabase)
1. Cargar una persona completa. Después, en un caso nuevo, escribir solo su DNI + nombre + motivo y guardar → la ficha debe conservar teléfono y domicilio.
2. Guardar una prestación desde "+ Nueva Prestación" → debe aparecer en el historial al cerrar el modal.
3. Persona con 2 casos y prestaciones en ambos → la ficha debe mostrar todas.
4. Buscar por nombre de un familiar en Búsqueda global → debe aparecer en "Registrados como familiares".
5. Derivar una audiencia a un área, cambiarle la prioridad desde Intendencia → el contador del área no debe bajar.

## Pendiente (próximos pasos)
- Estadísticas limitadas a 1.000 filas (necesito el esquema de la base).
- Reglas RLS y creación de usuarios desde el servidor.
- Nuevo flujo de carga en 3 pasos.
- Código sin uso: `Dashboard/PersonsSection.jsx` y `Prestaciones/PrestacionModal.jsx` no se usan en ninguna pantalla.
