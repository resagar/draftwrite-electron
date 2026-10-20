# 01: Eliminar la Story desde su editor

**Qué construir:** el escritor puede borrar la Story que tiene abierta desde la banda de su editor. El botón `Delete story` abre el diálogo de confirmación existente, que muestra el Topic de la Story y advierte que se borrarán sus Articles. Al confirmar, la Story se elimina en cascada, el editor se cierra, las listas se refrescan y solo se limpian las selecciones que apuntan a esa Story.

Este ticket también deja el diálogo con una Story objetivo explícita: deja de inferirla de la selección actual y recibe su ID. El botón que ya existe en el panel «Source story» se adapta a ese contrato y se deshabilita cuando la Story de origen ya no existe.

**Blocked by:** Ninguna (puede empezar de inmediato)

**Status:** resolved

- [x] El editor muestra `Delete story` cuando la Story está almacenada y no lo muestra al crear una Story nueva.
- [x] El clic abre el diálogo de confirmación con el Topic de la Story y la advertencia de que se borrarán sus Articles.
- [x] El diálogo resuelve la Story por un ID explícito, no por la selección actual ni por la Story en contexto.
- [x] El botón existente de `StoryPane` pasa el ID de su Story y se deshabilita si la Story de origen ya no existe.
- [x] Confirmar borra la Story, cierra el editor, refresca Stories y Articles y limpia la selección de la Story y del Article asociado.
- [x] Cancelar o Escape cierra el diálogo sin borrar ni cambiar la Story.
- [x] Un fallo al borrar muestra el error en el diálogo, mantiene la Story y refresca las listas.
- [x] El borrado de Article y el diálogo «Leave without saving?» conservan su comportamiento.
- [x] Tests de integración de App cubren el flujo del editor, cancelación, Escape, error y cascada.
- [x] No se modifican dominio, servicios, repositorios, SQLite, IPC, preload ni `DataPort`.

## Comments

- Spec: `../spec.md`. Informe: `../research.md`.
- La lista reutiliza el diálogo con ID explícito en el ticket 02; por eso ese contrato se introduce aquí.
- **2026-10-20 — Implementado en `d324f1b`.** El diálogo de borrado recibe el ID de la Story objetivo; `StoryBand` expone `Delete story` solo con una Story almacenada y `StoryPane` pasa su ID y se deshabilita si la Story de origen ya no existe. La limpieza de selecciones es selectiva. Tests de integración de App para confirmar, cancelar, Escape, error y cascada. Suite completa: 242 tests, typecheck y lint verdes. La carrera de autosave queda documentada y fuera de alcance.
