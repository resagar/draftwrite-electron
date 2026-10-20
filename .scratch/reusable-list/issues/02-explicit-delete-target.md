# 02: Objetivo explícito en el diálogo de borrado

**Qué construir:** el diálogo de borrado deja de depender de la selección actual y pasa a llevar un objetivo explícito y discriminado: o una Story con su `storyId`, o un Article con su `articleId`. No debe existir un diálogo de borrado de Article sin Article.

El header del Article pasa su propio ID al abrir el diálogo. `App` resuelve el objetivo por ID contra la biblioteca completa, no contra la lista filtrada, y solo renderiza el diálogo si el objetivo sigue existiendo. Confirmar borra ese ID; cancelar o fallar no borran nada.

Al confirmar el borrado de un Article se limpia la selección solo si el Article borrado era el seleccionado, sin tocar el estado de creación ni cancelar un borrador en curso. Borrar un Article no limpia la Story seleccionada. El borrado de Story conserva su objetivo explícito, su cascada y su limpieza selectiva.

**Blocked by:** None (puede empezar inmediatamente)

**Status:** ready-for-agent

- [ ] El estado del diálogo modela un objetivo discriminado: `delete-story` con `storyId` o `delete-article` con `articleId`.
- [ ] No existe un estado válido de diálogo `delete-article` sin Article.
- [ ] El header del Article abre el diálogo con el ID del Article abierto.
- [ ] `App` resuelve la Story o el Article por ID desde la biblioteca completa, no desde la selección ni desde la lista filtrada.
- [ ] Si el objetivo ya no existe, el diálogo no se renderiza y no se borra nada; no se usa la selección como fallback.
- [ ] Confirmar borra el ID del objetivo resuelto y el mensaje muestra el título o Topic de ese objetivo.
- [ ] Al borrar un Article se limpia la selección solo si coincide con el Article borrado.
- [ ] Borrar un Article no modifica `selectedStoryId`, `creating` ni `creatingStoryId`.
- [ ] El borrado de Article desde el header conserva su comportamiento visible; cancelar, Escape y error siguen funcionando.
- [ ] El borrado de Story desde la fila y desde el editor conserva su comportamiento y sus tests sin cambios.
- [ ] El botón de borrar del header usa el tono destructivo del tema.
- [ ] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md`.
- Este ticket es un prefactor del borrado por fila: no agrega todavía la acción a la lista de Articles.
- El caso de borrar un Article no seleccionado se prueba en el ticket 03, cuando exista el disparador desde la fila.

