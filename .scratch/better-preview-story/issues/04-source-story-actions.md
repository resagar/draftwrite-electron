# 04: Acciones del panel según contexto y disponibilidad

**Qué construir:** las acciones del panel dependen del contexto y del estado de la Story. En un Article guardado con Story disponible, `Copy source text`, `Open story in editor` y `Delete story` funcionan como hoy. En un borrador con Story disponible solo se ofrece `Copy source text`; el panel no navega ni borra. En `empty`, `loading`, `error` o `missing` no se ofrece ninguna acción que dependa de la Story. En un Article guardado sin Story tampoco se ofrece `Delete story`, para no abrir un diálogo sin destino. Al cambiar de Story, el aviso `Copied` vuelve a `idle` para no atribuir la confirmación a la Story anterior.

**Blocked by:** 03 (necesita los estados de la fuente para decidir qué acciones están disponibles)

**Status:** ready-for-agent

- [ ] En un Article guardado con Story disponible, `Copy source text` copia el texto y muestra la confirmación.
- [ ] En un Article guardado con Story disponible, `Open story in editor` abre el Story editor.
- [ ] En un Article guardado con Story disponible, `Delete story` abre el diálogo de borrado existente y borra la Story correcta.
- [ ] En un borrador con Story disponible, solo se ofrece `Copy source text`; `Open story in editor` y `Delete story` no están disponibles.
- [ ] En `empty`, `loading`, `error` y `missing`, `Copy source text` no está disponible.
- [ ] En un Article guardado sin Story, `Open story in editor` y `Delete story` no están disponibles y no se abre ningún diálogo.
- [ ] Durante la creación no se puede borrar por error la Story de otro Article.
- [ ] Al cambiar de Story, el estado de copiado vuelve a `idle`.
- [ ] Las acciones usan tokens del tema y no agregan colores nuevos.
- [ ] Tests de integración cubren las acciones en Article guardado, borrador, Story ausente y cambio de Story.
