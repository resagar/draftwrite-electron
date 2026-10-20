# 03: Header de Story con conmutador Edit/Split/Preview

**Qué construir:** una Story almacenada muestra un header análogo al de Article, con el Topic a la izquierda y el `ViewModeSwitcher` a la derecha en la misma posición relativa. El conmutador permite pasar entre Edit, Split y Preview y refleja el modo activo con `aria-pressed`. La creación de Story sigue sin header ni conmutador, igual que la creación de Article. El header no agrega acciones nuevas.

**Blocked by:** 02 (necesita el preview cableado en Story)

**Status:** resolved

- [ ] Una Story almacenada muestra un header con su Topic truncado si no cabe y el grupo `View mode` a la derecha.
- [ ] El header ocupa la misma posición visual que el header de Article y usa los mismos tokens y estructura.
- [ ] Edit oculta el preview y deja el editor a todo el ancho.
- [ ] Preview oculta el editor y la toolbar, y deja el preview a todo el ancho con scroll propio.
- [ ] Split restaura editor, toolbar, divisor y preview.
- [ ] El botón del modo activo expone `aria-pressed="true"`.
- [ ] La creación de Story no muestra header ni grupo `View mode`, replicando la creación de Article.
- [ ] El `viewMode` sigue siendo estado global y se conserva al cambiar entre Story y Article.
- [ ] No se agregan acciones de borrar, duplicar ni abrir panel fuente al header.
- [ ] Tests de integración en el seam de App cubren el header, los tres modos y la ausencia de header en creación.
- [ ] Los tests existentes de Article siguen pasando sin modificaciones.
- [ ] Typecheck, lint y suite completa en verde.
- [ ] No se toca IPC, preload, dominio, servicios, SQLite ni migraciones.

## Comments

- **2026-10-20 — Último ticket de la cadena.** Cierra la paridad con Article: el conmutador vive en el header, en el mismo lugar que en `ArticleHeader`, y la creación queda sin header como en Article.
- **2026-10-20 — Implementado e integrado.** Implementación en `6a08789`; merge en `06646b7`. Evidencia: suite completa 241 tests, typecheck y lint verdes.
