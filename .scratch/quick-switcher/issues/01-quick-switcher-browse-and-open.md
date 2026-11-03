# 01: Quick switcher: abrir, explorar y abrir entidades

**What to build:** El tracer bullet completo del quick switcher. Con `Cmd/Ctrl+K` (o clic en el disparador de la barra de título, todavía sin estilos definitivos) se abre un diálogo modal con las Stories, Articles y Posts ya cargados, agrupados por tipo y ordenados por `UpdatedAt` descendente. Cada fila muestra su identificador, el contexto cuando existe (Story de un Article, `PostState` de un Post), la fecha relativa y un preview del `Text`. Las flechas mueven la opción activa sin wrap, `Home`/`End` saltan a los extremos, `Enter` o clic abren, `Escape` o clic fuera cierran. Abrir una entrada cambia la biblioteca activa, la selecciona, limpia el `tagFilter` solo si ese filtro la ocultaría y pasa por el guard de borradores sin guardar.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `Cmd/Ctrl+K` abre la paleta desde cualquier punto de la app y no se dispara si la paleta ya está abierta, si hay un diálogo de borrado abierto o si hay una navegación pendiente.
- [ ] La caja de búsqueda de la barra de título deja de estar deshabilitada y abre la paleta al hacer clic o activarla con teclado; su texto y `aria-label` mencionan Stories, Articles y Posts y el atajo.
- [ ] La paleta se anuncia como `dialog` con un `combobox` y una `listbox`; el foco permanece en el input y la opción activa se comunica con `aria-activedescendant`.
- [ ] La lista muestra las tres colecciones agrupadas en `Stories`, `Articles`, `Posts`, cada grupo ordenado por `UpdatedAt` descendente; los grupos vacíos se omiten.
- [ ] Cada fila muestra identificador, badge de tipo, contexto, fecha relativa y preview del `Text`.
- [ ] `↑`/`↓` se clampan en los extremos, `Home`/`End` van al primero/último, `Enter` y clic abren la opción activa.
- [ ] `Escape` y clic en el overlay cierran sin cambiar la selección; el foco vuelve al elemento que lo tenía antes de abrir.
- [ ] Abrir una entrada fija la biblioteca correcta, la selecciona, limpia las otras dos selecciones, cancela cualquier creación en curso e incrementa `editorSession` en una sola acción del reducer.
- [ ] El `tagFilter` se limpia solo si la entrada elegida quedaría oculta con él; para Posts nunca se limpia y para un Article se evalúa el tag de su Story.
- [ ] Si hay un borrador sin guardar, abrir otra entrada muestra la confirmación existente "Leave without saving?"; cancelar deja la selección y el borrador intactos.
- [ ] Mientras la paleta está abierta, los atajos `N`, `S` y Zen no se disparan.
- [ ] No hay cambios en `src/main`, IPC ni SQLite.
