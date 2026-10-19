# 01: Botón contextual «New Story» / «New Article»

**Qué construir:** el botón inferior del sidebar deja de estar fijo a Story. Cuando la biblioteca activa es Stories dice «New Story», muestra el atajo `Ctrl N` / `⌘ N` y crea una Story como hasta ahora. Cuando la biblioteca activa es Articles dice «New Article» y crea un Article con la Story en contexto preseleccionada (la del Article abierto; si no hay, la Story seleccionada; si no hay ninguna, sin preselección). Si no existe ninguna Story, el botón aparece deshabilitado con el tratamiento visual de deshabilitado, porque un Article no puede existir sin una Story. El nombre accesible y el tooltip son contextuales en todos los estados, incluido el sidebar colapsado. Toda la derivación (tipo, etiqueta, habilitación, Story en contexto y arranque) vive en un hook de estado del renderer reutilizable por el atajo del ticket 02. El clic sigue pasando por el guard de navegación existente. Textos de UI en inglés.

**Blocked by:** ninguna (puede empezar de inmediato)

**Status:** ready-for-agent

- [ ] En Stories, el botón dice «New Story», muestra `Ctrl N` / `⌘ N` y abre el Story editor al hacer clic (regresión del comportamiento actual).
- [ ] En Articles, el botón dice «New Article» y abre el Article editor al hacer clic.
- [ ] Con un Article abierto, la Story preseleccionada es la de ese Article, aunque haya otra Story seleccionada.
- [ ] Sin Article abierto, la Story preseleccionada es la Story seleccionada.
- [ ] Si la Story del Article abierto ya no existe, el editor se abre sin preselección (no cae a la Story seleccionada).
- [ ] Sin ninguna Story y con Articles activo, el botón está deshabilitado y no abre ningún editor.
- [ ] El `aria-label` y el `title` conservan el patrón `<Etiqueta> (<modificador> N)` y cambian según la biblioteca, también con el sidebar colapsado.
- [ ] El clic respeta el diálogo de confirmación cuando hay un draft sin guardar y, al confirmar, continúa la creación.
- [ ] El botón mantiene posición, tamaño, estilos e icono; no se agregan colores fuera de los tokens del tema.
- [ ] La etiqueta contextual y la habilitación salen de un hook de derivación reutilizable por el atajo.
- [ ] No se modifican reducer, IPC, preload, dominio, servicios ni base de datos.
- [ ] Tests de integración en el seam de App cubren etiqueta, clic, preselección, caso sin Story, deshabilitado y guard de drafts.
