# 01: Extraer OptionList y migrar la lista de Stories

**Qué construir:** un componente de lista interactiva reutilizable que concentre el listbox, el roving tabindex, la fila `role="option"` y el slot de acción por fila. La lista de Stories pasa a usarlo sin cambiar su comportamiento visible: mismas opciones, misma selección, misma navegación por teclado y mismo borrado desde la fila.

El componente debe ser agnóstico de Story y Article: recibe la colección, cómo obtener el ID, cuál es el elemento seleccionado, qué hacer al seleccionar, cómo renderizar el contenido y, opcionalmente, cómo renderizar una acción por fila. La acción se renderiza como control hermano de la opción, nunca anidada dentro de ella. El contenido sigue saliendo de `ListRowItem`.

Incluye el endurecimiento del foco y del teclado: cuando la cantidad de elementos disminuye por filtro o borrado, el índice activo se ajusta para que siempre haya exactamente una opción con `tabIndex=0`; el listbox ignora los eventos de teclado cuyo objetivo no esté dentro de una opción, para que la acción por fila no active la selección.

**Blocked by:** None (puede empezar inmediatamente)

**Status:** resolved

- [x] Existe un componente de lista interactiva compartido, sin conocimiento de Story ni Article.
- [x] La lista de Stories lo usa para el listbox y las filas, sin cambios visibles en opciones, selección, filtrado ni creación.
- [x] La fila sigue exponiendo `role="option"`, `aria-selected` y el foco móvil.
- [x] Exactamente una opción tiene `tabIndex=0`; las flechas, Inicio, Fin, Enter y Espacio siguen funcionando.
- [x] La acción por fila se renderiza como control hermano de la opción, no dentro de ella.
- [x] Un clic, Enter o Espacio sobre la acción no selecciona la fila ni mueve el foco de la lista.
- [x] Cuando no hay acción, no se renderiza botón ni se reserva el espacio de la acción.
- [x] Al reducirse la cantidad de elementos, la lista sigue teniendo exactamente una opción con `tabIndex=0` y la activación no accede a un elemento inexistente.
- [x] Tests enfocados del componente cubren listbox, opciones, selección, roving tabindex, teclado, acción hermana, acción sin selección y lista que se acorta.
- [x] Los tests existentes de la lista de Stories, navegación por teclado y borrado desde la fila pasan sin modificarse.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md`.
- Este ticket es un prefactor: no agrega la acción de borrar a la lista de Articles ni cambia el diálogo de borrado.

- Resuelto en `1389716` e integrado en `feat/reusable-list`.
- Verificación final: 292 tests en 19 suites; typecheck y lint verdes.
- El contrato de `OptionList` cubre listbox, roving tabindex, acción hermana, teclado y reset del foco al vaciar la lista.
