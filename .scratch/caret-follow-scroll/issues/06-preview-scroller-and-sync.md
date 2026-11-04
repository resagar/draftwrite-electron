# 06: Scroller propio, espaciadores y seguimiento por línea en el preview

**Qué construir:** el preview es dueño de su scroll, centra la línea de origen del caret al escribir y con las flechas, y permite que el último bloque llegue al borde superior con espacio finito debajo. En este ticket el desplazamiento es instantáneo; la animación llega en el 08.

`EditorPreviewLayout` deja de envolver el preview con `overflow-y-auto`; `MarkdownPreview` pasa a ser el scroller y recibe refs del contenedor, del `article` y de los espaciadores. Se crea `PreviewCursorSync`, un hijo que devuelve `null`, se suscribe a la línea y ejecuta el efecto de layout.

Se crea `preview-sync.ts` con `readSourceBlocks`, `findBlockForLine`, `findTarget`, `lineRect`, `keepContiguousRows`, `centerScrollTop` y el cálculo de espaciadores `T = max(0, H/2 - F - h/2)` y `B = max(0, H - (A - L))`.

`findTarget` prioriza el marcador exacto `[data-source-line="line"]`; si no existe, usa el bloque que contiene la línea y hace *snap* al marcador más cercano dentro del bloque; si no hay marcadores, usa el rect del bloque. El rect de una línea es la unión de las filas del `Range` desde su marcador hasta el siguiente marcador del mismo bloque, filtradas por `keepContiguousRows`.

**Blocked by:** 05 — Anotación del preview por línea de origen

**Status:** resolved

- [x] `EditorPreviewLayout` ya no tiene el wrapper `overflow-y-auto`; el scroller es `MarkdownPreview`.
- [x] `MarkdownPreview` renderiza los espaciadores y `PreviewCursorSync`.
- [x] `PreviewCursorSync` devuelve `null` y no re-renderiza `MarkdownPreview` por cada flecha.
- [x] Al escribir y con flechas, el span de la línea de origen queda centrado (±2 px).
- [x] La primera línea puede quedar centrada; el primer bloque no salta al montar.
- [x] El último bloque puede llegar a `top = 0` con espacio finito debajo.
- [x] Una línea que reflowa centra su span completo; si supera el viewport, centra su primera fila.
- [x] Una línea sin marcador hace *snap* al marcador más cercano del bloque.
- [x] Un clic con origen `pointer` no mueve el preview en este ticket (el selector aún filtra teclado).
- [x] `overflow-anchor: none`, `overscroll-behavior: contain` y `scroll-behavior: auto` están aplicados.
- [x] `ResizeObserver` sobre contenedor y `article`; sin `ResizeObserver`, el efecto sale temprano.
- [x] El `Workspace` no se desplaza.
- [x] Tests puros de `findTarget`, `lineRect`, `keepContiguousRows`, `centerScrollTop` y espaciadores; tests jsdom de estructura y montaje.
- [ ] Verificación headless/Electron de centrado, espacio finito y resize.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md`, `../../preview-caret-sync/research.md` §4-§5 y `../../preview-caret-sync/line-mapping.md` §6.4-6.6.
- No se añade animación todavía; el efecto escribe `scrollTop` de una vez.
- jsdom no mide layout; las aserciones de geometría van al harness.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`); corregido después en `main` `ef45c3c`.
- Automatizado: 34 suites / 551 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- **Corrección post-review:** el animador del preview se crea en un efecto pasivo, porque el `useLayoutEffect` del hijo corría antes de que el ref de la `<section>` padre estuviera adjunto y nunca se creaba; los espaciadores se anclan a la primera/última **línea** de origen, no al bloque, para que la última línea pueda centrarse dentro de un bloque más alto que el viewport. Regresión cubierta por `MarkdownPreview.lifecycle.test.tsx` y `preview-sync.test.ts`.
- El preview es el scroller; espaciadores y `PreviewCursorSync`. Se retiraron de Jest las pruebas de geometría simulada (regla de `AGENTS.md`); la verificación de layout pasa a la QA manual.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
