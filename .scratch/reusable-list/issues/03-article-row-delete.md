# 03: Migrar la lista de Articles y añadir borrado por fila

**Qué construir:** la lista de Articles pasa a usar la misma lista interactiva compartida que Stories y cada fila expone una acción `Delete article` que abre el diálogo de confirmación apuntando al Article de esa fila, aunque haya otro Article abierto.

La fila sigue mostrando título, fecha y extracto como hasta ahora; no muestra los Tags de la Story como si fueran del Article. El botón es visible, discreto y destructivo, no tapa el contenido y es un control hermano de la opción. Su nombre accesible incluye el título del Article y, cuando la Story está disponible, el Topic de la Story para distinguir títulos repetidos.

Confirmar borra el Article de la fila, refresca las listas y limpia la selección solo si ese Article era el seleccionado. Borrar una fila no seleccionada conserva el Article abierto y su editor. Cancelar o Escape no borran ni cambian la selección. Un fallo mantiene el diálogo, muestra el error, conserva el Article y refresca las listas.

Borrar un Article mientras se está creando otro no cancela el borrador en curso. Si se borra el último Article visible de un filtro, se muestra el estado de filtro vacío, no el de biblioteca vacía. El borrado de Story y el resto de la lista de Stories siguen funcionando sin cambios.

**Blocked by:** 01 — Extraer OptionList y migrar la lista de Stories; 02 — Objetivo explícito en el diálogo de borrado

**Status:** resolved

- [x] La lista de Articles usa la lista interactiva compartida para el listbox y las filas.
- [x] Cada fila de Article expone un botón `Delete article` con el título del Article en su nombre accesible.
- [x] Cuando la Story de origen está disponible, el nombre accesible incluye su Topic para desambiguar títulos repetidos.
- [x] El botón es un control hermano de `role="option"`, no un descendiente, y no tapa el contenido de la fila.
- [x] Pulsar el botón de una fila no la selecciona ni navega; abre el diálogo del Article de esa fila.
- [x] Enter o Espacio sobre el botón no seleccionan la fila ni activan la opción.
- [x] El diálogo muestra el título del Article de la fila, no el del Article seleccionado.
- [x] Confirmar borra el Article de la fila y refresca la lista de Articles.
- [x] Borrar una fila no seleccionada conserva el Article abierto, su editor y su selección.
- [x] Borrar la fila del Article seleccionado limpia la selección, desmonta su editor y muestra `No articles yet` si era el último.
- [x] Cancelar o Escape no borran ni cambian la selección.
- [x] Un fallo al borrar muestra el error en el diálogo, mantiene el Article y refresca las listas.
- [x] Borrar el Article seleccionado mientras se crea otro Article no cancela la creación en curso.
- [x] Si se borra el último Article visible de un filtro, se muestra el estado de filtro vacío.
- [x] La fila de Article no muestra los Tags de la Story como si fueran Tags del Article.
- [x] Los tests de integración de App cubren fila seleccionada, fila no seleccionada, objetivo del diálogo, cancelación, error, teclado y creación en curso.
- [x] Los tests existentes de borrado de Article desde el header, borrado de Story, filtro por Tags, creación y navegación por teclado pasan sin modificarse.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md`.
- Depende del componente compartido del ticket 01 y del objetivo explícito del ticket 02.
- No se modifican dominio, servicios, SQLite, migraciones, contrato IPC, preload ni `DataPort`: el borrado de Article ya existe y es idempotente.

- Resuelto en `1389716` e integrado en `feat/reusable-list`.
- Verificación final: 292 tests en 19 suites; typecheck y lint verdes.
- El review añadió cobertura de títulos repetidos, teclas de navegación, foco al vaciar la lista, filtro vacío tras borrar el último Article y activación nativa del botón.
