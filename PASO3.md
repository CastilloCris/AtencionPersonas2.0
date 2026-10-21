# Ficha Social — Paso 3: bandejas de Intendencia y de Área para celular

Reemplazá `src/` e `index.html` por los del zip (o `git apply cambios-paso3.patch`), hacé el build y publicá.
No hay cambios en la base de datos.

## Qué cambia para el usuario
- **Tarjetas pensadas para el pulgar**: botones de 44 px o más, texto de 14–16 px, una columna en celular y dos en escritorio.
- **Responder en dos toques y sin errores de dedo**: el botón abre una hoja desde abajo; para derivar se elige el área
  y se confirma con un botón que dice a dónde va ("Derivar a CIC").
- **Deshacer**: después de responder o derivar aparece un aviso con "Deshacer" durante 7 segundos.
- **Motivo completo** con "Ver más" (en el celular no se puede pasar el mouse para leer lo cortado).
- **Antigüedad legible**: "hace 24 min", "ayer", "hace 4 días".
- **Sin zoom molesto en iPhone**: los campos usan letra de 16 px en celular.
- **Aviso de derivaciones nuevas en celular**: número rojo sobre el botón del menú (antes solo se veía en el menú lateral, que en celular está oculto).
- En celular, "Cerrar sesión" queda solo en el menú lateral y el título no se repite.

## Qué cambia por dentro (importante con señal débil)
- **Antes, si fallaba la conexión al responder, la tarjeta desaparecía igual aunque no se hubiera guardado.**
  Ahora se confirma con la base; si falla, la tarjeta queda y se muestra "Sin conexión con el servidor. No se guardó…".
- **Recarga al volver a la app**: al desbloquear el teléfono, cambiar de pestaña o recuperar señal, la bandeja se actualiza
  (el canal en tiempo real se corta cuando el teléfono está bloqueado).
- Se registra **quién respondió** cada audiencia (`respondido_por`), que antes quedaba vacío.
- En la bandeja de Área se quitó la etiqueta "Desde: …", que en realidad mostraba el área propia y no el origen.
- Las dos bandejas comparten código (`lib/audiencias.js`, `components/Bandeja/BandejaUI.jsx`): un arreglo sirve para ambas.

## Archivos
- Nuevos: `src/lib/audiencias.js`, `src/components/Bandeja/BandejaUI.jsx`
- Reescritos: `src/components/DashboardIntendencia.jsx`, `src/components/DashboardArea.jsx`
- Modificados: `src/index.css`, `src/components/layout/TopBar.jsx`, `src/App.jsx`, `src/lib/fechas.js`, `index.html`

## Verificado
- Build sin errores; lint: 91 problemas (antes 94), ninguno nuevo.
- Simulación en celular de 390 px con datos de prueba (sin tocar tu base): derivar, deshacer, error de conexión
  (la tarjeta no desaparece), sin desplazamiento horizontal, campos a 16 px. Capturas en `capturas-celular.png`.

## Para probar en tu celular
1. Entrá con un usuario de Intendencia, derivá una audiencia y tocá "Deshacer".
2. Poné el teléfono en modo avión, intentá responder: debe mostrar el error y la tarjeta debe quedar.
3. Con un usuario de un área, bloqueá el teléfono, derivale algo desde otra sesión y desbloqueá: debe aparecer.
