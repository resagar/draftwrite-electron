# 01: Typewriter centrado y scroll libre finito en el editor

**Qué construir:** el editor compartido mantiene el caret en el centro vertical mientras se escribe y permite que la última línea llegue al borde superior con un espacio en blanco finito debajo.

Se añade `src/renderer/src/editor/typewriter.ts` con un `EditorState.transactionExtender` que convierte el scroll que ya pide la transacción en `EditorView.scrollIntoView(head, { y: 'center' })`, y un `ViewPlugin` que aplica padding asimétrico a `.cm-content`: `padding-top = (H - L) / 2` y `padding-bottom = H - L`, con `H = scrollDOM.clientHeight` y `L = view.defaultLineHeight`. El padding reemplaza el del tema; no se suma. Si `clientHeight <= 0`, el padding es `0/0`.

Se cablea en `articleEditorExtensions`, que es el punto de entrada compartido por Story y Article. `.cm-scroller` queda con `scroll-behavior: auto`.

**Blocked by:** —

**Status:** resolved

- [x] Existe `typewriter.ts` con el extender, el cálculo de padding y el plugin de padding.
- [x] `articleEditorExtensions` incluye la extensión; Story y Article la heredan sin cambios propios.
- [x] Al escribir, el caret se mantiene en el centro vertical.
- [x] La primera línea se puede centrar con `scrollTop = 0`.
- [x] La última línea se centra mientras se escribe.
- [x] En el scroll máximo, la última línea queda en `top = 0` y quedan `H - L` px en blanco debajo.
- [x] El máximo de scroll es finito y no crece al hacer scroll.
- [x] El padding del tema no se suma; no hay `scrollPastEnd()`.
- [x] Con el editor oculto (`clientHeight = 0`), el padding es `0/0` y no se centra.
- [x] `PageUp`/`PageDown` conservan su destino nativo `y: "start"`.
- [x] Documentos cortos, vacíos y de una línea usan las mismas fórmulas sin caso especial.
- [x] Tests puros del extender, padding y destino; tests de integración en App para primera/última línea.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan sin modificar tests existentes.

## Comments

- Spec: `../spec.md`. Informe: `../research.md` y `../../typewriter-scroll/research.md` §4-5.
- No toca `TextEditor`, `StoryEditor` ni `ArticleEditor`.
- No se añade toggle ni preferencia.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`).
- Automatizado: 33 suites / 545 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- El padding vertical del tema se reemplaza; con el editor oculto (`clientHeight <= 0`) el plugin escribe explícitamente `0/0`. La comprobación visual de primera/última línea queda en la QA manual.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
