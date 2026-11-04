# 07: Seguimiento del caret en el preview al hacer clic y al soltar un arrastre

**Qué construir:** el preview sigue al caret también cuando el escritor hace clic en el editor o suelta un arrastre, no solo al escribir o usar flechas. El store distingue el origen y solo publica carets asentados.

Se amplía `EditorStatus.cursor` a `EditorCursor = { line, column, origin: 'keyboard' | 'pointer' }`. Se crea `cursor-origin.ts` con `cursorOrigin(update)`: `docChanged` siempre es `keyboard`; una transacción `select.pointer` sin anotación devuelve `null`; la anotación `pointerSelectionEnd` del ticket 02 devuelve `pointer`. `TextEditor` deja de publicar en updates de foco, scroll o geometría.

`selectPreviewLine` deja de filtrar por origen y devuelve la línea para `keyboard` y `pointer`. `usePreviewLine` sigue devolviendo solo la línea, así que un cambio de columna no re-renderiza el preview.

El preview se mueve una sola vez por clic o arrastre, al soltar; no sigue al puntero durante el gesto. Hacer clic en el preview no mueve el caret del editor.

**Blocked by:** 02 — Centrado del caret al hacer clic y al soltar un arrastre; 06 — Scroller propio, espaciadores y seguimiento por línea en el preview

**Status:** resolved

- [x] `EditorCursor` incluye `origin`; `EditorStatus.cursor` es siempre un caret asentado.
- [x] `cursorOrigin` devuelve `null` en updates sin cambios y `keyboard` en escritura, flechas y comandos.
- [x] Una transacción `select.pointer` intermedia no publica nada.
- [x] La anotación `pointerSelectionEnd` publica `origin: 'pointer'` una sola vez.
- [x] `selectPreviewLine` devuelve la línea para ambos orígenes y `null` solo sin cursor.
- [x] Un clic en otra línea mueve el preview una vez, al soltar.
- [x] Un arrastre no mueve el preview durante el gesto; lo mueve al soltar.
- [x] Un clic en la misma línea no re-renderiza el preview; un cambio de columna tampoco.
- [x] Al montar el preview con un cursor asentado, centra.
- [x] Al cambiar de modo y volver, el preview sigue funcionando.
- [x] Tests puros de `cursorOrigin` y `selectPreviewLine`; integración jsdom de clic y arrastre.
- [ ] Verificación en Chromium/Electron de clic, clic dentro de selección, arrastre y arrastre que sale del contenido.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md` y `../../preview-caret-sync/pointer-sync.md` §4-§15.
- `Ln`/`Col` se congelan durante el arrastre hasta soltar; es una contrapartida aceptada.
- No se publica cursor inicial en `onCreateEditor`.
- El mapeo inverso preview→editor queda fuera de alcance.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`).
- Automatizado: 33 suites / 545 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- El store solo contiene carets asentados; `cursorOrigin` distingue teclado, puntero y transacciones intermedias.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
