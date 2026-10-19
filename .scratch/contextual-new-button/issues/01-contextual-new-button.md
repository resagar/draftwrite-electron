# 01: Botón contextual «New Story» / «New Article»

**Qué construir:** el botón inferior del sidebar deja de estar fijo a Story. Cuando la biblioteca activa es Stories dice «New Story», muestra el atajo `Ctrl N` / `⌘ N` y crea una Story como hasta ahora. Cuando la biblioteca activa es Articles dice «New Article» y crea un Article con la Story en contexto preseleccionada (la del Article abierto; si no hay, la Story seleccionada; si no hay ninguna, sin preselección). Si no existe ninguna Story, el botón aparece deshabilitado con el tratamiento visual de deshabilitado, porque un Article no puede existir sin una Story. El nombre accesible y el tooltip son contextuales en todos los estados, incluido el sidebar colapsado. Toda la derivación (tipo, etiqueta, habilitación, Story en contexto y arranque) vive en un hook de estado del renderer reutilizable por el atajo del ticket 02. El clic sigue pasando por el guard de navegación existente. Textos de UI en inglés.

**Blocked by:** ninguna (puede empezar de inmediato)

**Status:** resolved

- [x] En Stories, el botón dice «New Story», muestra `Ctrl N` / `⌘ N` y abre el Story editor al hacer clic (regresión del comportamiento actual).
- [x] En Articles, el botón dice «New Article» y abre el Article editor al hacer clic.
- [x] Con un Article abierto, la Story preseleccionada es la de ese Article, aunque haya otra Story seleccionada.
- [x] Sin Article abierto, la Story preseleccionada es la Story seleccionada.
- [x] Si la Story del Article abierto ya no existe, el editor se abre sin preselección (no cae a la Story seleccionada).
- [x] Sin ninguna Story y con Articles activo, el botón está deshabilitado y no abre ningún editor.
- [x] El `aria-label` y el `title` conservan el patrón `<Etiqueta> (<modificador> N)` y cambian según la biblioteca, también con el sidebar colapsado.
- [x] El clic respeta el diálogo de confirmación cuando hay un draft sin guardar y, al confirmar, continúa la creación.
- [x] El botón mantiene posición, tamaño, estilos e icono; no se agregan colores fuera de los tokens del tema.
- [x] La etiqueta contextual y la habilitación salen de un hook de derivación reutilizable por el atajo.
- [x] No se modifican reducer, IPC, preload, dominio, servicios ni base de datos.
- [x] Tests de integración en el seam de App cubren etiqueta, clic, preselección, caso sin Story, deshabilitado y guard de drafts.

## Comments

- **2026-10-19 — Implementado e integrado.** Implementación en `80e982c`; merge en `fc9fe14`. El refactor post-review que comparte la resolución de Story en contexto quedó en `28bc419` y la cobertura adicional del atajo en `075964d`. Evidencia: suite completa 228 tests, typecheck y lint verdes. Sin cambios fuera del renderer.
