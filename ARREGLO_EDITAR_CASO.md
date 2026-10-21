# Arreglo: "Editar caso" borraba teléfono, domicilio, estado civil y situación laboral

## Qué pasaba
El botón "Editar" de **Mis casos** llenaba el formulario con los datos guardados en el **caso**, no en la
ficha de la persona. Los casos nuevos no guardan teléfono, domicilio, estado civil ni situación laboral, así que el
formulario abría con esos campos vacíos y, al guardar, los escribía vacíos sobre la persona.
Pasaba **aunque solo se cambiara el motivo**. Era un error del código original (no de los pasos 1–3).

Comprobado en simulación con la versión anterior: cambiando solo el motivo se enviaba
`persons ← {"telefono":null,"domicilio":null,"trabaja_actualmente":null,"estado_civil":null}`.

## Qué cambia
- El formulario carga teléfono, domicilio, estado civil y situación laboral **desde la ficha de la persona**.
- Mientras carga, el botón dice "Cargando datos…" y no se puede guardar.
- Al guardar se envían **solo los campos que cambiaste**. Si no tocaste datos personales, la ficha de la persona
  no se modifica.
- Si no se pudieran leer los datos de la persona, se guarda el caso y la persona no se toca.

Archivo: `src/components/Cases/CasesList.jsx` (reemplazalo, o `git apply cambios-arreglo-editar.patch`).
Revisé el resto: es el único lugar que escribía así sobre personas. No hay cambios en la base.

## Recuperar lo que ya se borró
`supabase/02_buscar_datos_borrados.sql` (solo lee, no modifica nada). Correlo en el SQL Editor:
1. **Primera consulta**: cada edición que tocó esos campos, con fecha, quién la hizo y qué quedó vacío
   (la auditoría existe desde que aplicaste la migración 01; ediciones anteriores no figuran).
2. **Segunda consulta**: personas con esos campos vacíos cuyo dato **todavía figura en algún caso viejo**
   (los casos antiguos guardaban una copia). Ese valor se puede volver a cargar a mano en la ficha.

Lo que no aparezca en ninguna de las dos, hay que pedírselo de nuevo a la persona: la auditoría registra
qué campo cambió, pero no el valor anterior.
