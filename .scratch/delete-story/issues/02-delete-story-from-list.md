# 02: Eliminar la Story desde la lista

**Qué construir:** cada fila de la lista de Stories expone una acción `Delete story “<Topic>”`. Al pulsarla se abre el mismo diálogo de confirmación del ticket 01, apuntando a la Story de esa fila aunque haya otra seleccionada. Confirmar borra esa Story, refresca ambas listas y conserva las selecciones no relacionadas; si la Story borrada era la seleccionada, la selección se limpia; si era la fuente del Article abierto, también se limpia la selección del Article.

La fila sigue siendo una opción seleccionable de la lista y el botón es un control independiente, no anidado dentro de la opción. El botón no activa la selección con clic, Enter ni Espacio, y la navegación por teclado de la lista no cambia.

**Blocked by:** 01 — Eliminar la Story desde su editor

**Status:** resolved

- [x] Cada fila de Stories expone un botón `Delete story “<Topic>”`.
- [x] El botón abre el diálogo para la Story de esa fila aunque haya otra Story seleccionada.
- [x] El diálogo muestra el Topic de la fila, no el de la Story seleccionada.
- [x] Confirmar borra esa Story y refresca Stories y Articles.
- [x] Borrar una Story no seleccionada conserva la selección y el editor de la otra Story.
- [x] Borrar la Story seleccionada limpia la selección y muestra el estado vacío si era la única.
- [x] Borrar la Story de origen de un Article abierto limpia la selección del Article.
- [x] Los Articles de la Story borrada desaparecen de la biblioteca.
- [x] Cancelar o Escape no borra ni cambia la selección.
- [x] Un fallo al borrar muestra el error en el diálogo, mantiene la Story y refresca las listas.
- [x] El botón de la fila no activa la selección con clic, Enter ni Espacio.
- [x] La fila sigue exponiendo `role="option"` y la navegación por flechas, Inicio y Fin no cambia.
- [x] El botón no está anidado dentro del elemento `role="option"`; es un control hermano.
- [x] Los nombres accesibles de los botones de fila son distinguibles por Topic.
- [x] Tests de integración cubren fila no seleccionada, fila seleccionada, Article de origen, cascada, error, cancelación y teclado.
- [x] Los tests existentes de navegación por teclado de la lista pasan sin modificarse.

## Comments

- Spec: `../spec.md`. Informe: `../research.md`.
- Requiere el diálogo con Story objetivo explícita del ticket 01; la conservación de selecciones no relacionadas se completa y se prueba aquí.
- **2026-10-20 — Implementado en `d324f1b`.** Cada fila expone `Delete story “<Topic>”` como control hermano de la opción, sin anidar interactivos en `role="option"`. El botón no selecciona la fila con clic, Enter ni Espacio, y el diálogo apunta a la Story de esa fila. Tests de integración para fila seleccionada y no seleccionada, Article de origen, cascada, error, teclado y selección no relacionada. Suite completa: 242 tests, typecheck y lint verdes.
