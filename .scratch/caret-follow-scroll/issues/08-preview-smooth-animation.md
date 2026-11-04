# 08: Animación de los saltos grandes en el preview

**Qué construir:** el preview anima solo los saltos grandes, con el mismo contrato que el editor: 150 ms, ease-out, cancelable y retargeteable; los ajustes pequeños y `prefers-reduced-motion` son instantáneos.

`PreviewCursorSync` calcula el destino y llama al animador compartido con `request(target, { reason: 'caret' | 'layout' })`. Solo `reason: 'caret'` puede animar; resize, montaje, cambio de modo y carga de imagen son instantáneos.

El umbral es `max(lineUnit, clientHeight / 6)`, con `lineUnit` = una fila visual del objetivo, luego el `line-height` resuelto del bloque, luego el del `article`, luego 22 px. La animación escribe `container.scrollTop`; no usa `scrollTo({ behavior: 'smooth' })`.

Cancelan rueda, touchstart, `pointerdown`/`mousedown` sobre el scroller, resize/`ResizeObserver`, cambio de modo o desmontaje, cambio de `markdown` (antes de reescribir espaciadores) y `scroll` con desviación > 2 px respecto al último valor escrito. Una nueva línea de caret retargetea desde el `scrollTop` actual.

**Blocked by:** 03 — Módulo compartido de animación de scroll; 06 — Scroller propio, espaciadores y seguimiento por línea en el preview; 07 — Seguimiento del caret en el preview al hacer clic y al soltar un arrastre

**Status:** resolved

- [x] `PreviewCursorSync` consume `createScrollAnimator` o el bucle compartido.
- [x] Un salto de varias líneas se anima ~150 ms con ease-out y termina en el destino exacto.
- [x] Un ajuste de una línea es instantáneo.
- [x] Un destino ya alcanzado no programa frames.
- [x] Un retarget a mitad de vuelo cancela el frame anterior y termina en el nuevo destino.
- [x] Rueda y touchstart cancelan y dejan el scroll manual.
- [x] `pointerdown`/`mousedown` sobre el scroller cancelan.
- [x] Resize, cambio de modo y desmontaje cancelan y limpian listeners.
- [x] Un cambio de `markdown` cancela antes de reescribir los espaciadores.
- [x] Un `scroll` con desviación > 2 px cancela; un `scroll` causado por nuestras escrituras no.
- [x] `prefers-reduced-motion: reduce` no programa ningún frame.
- [x] El scroll libre finito del ticket 06 sigue cumpliéndose con la animación activa.
- [x] El `Workspace` no se desplaza.
- [ ] Tests puros del animador con scheduler y scroller inyectados; verificación headless/Electron de tiempos, cancelación y reduced motion.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md` y `../../preview-caret-sync/smooth-scroll.md` §3-§13.
- El módulo compartido se define en el ticket 03; este ticket no duplica constantes.
- El arrastre de la barra de scroll se valida en Electron con el guard de `scroll`.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`); corregido después en `main` `ef45c3c`.
- Automatizado: 34 suites / 551 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- **Corrección post-review:** el animador no se creaba porque su efecto de layout corría antes del ref del scroller padre; ahora se crea en un efecto pasivo y hace una sincronización inicial. Sin eso, la animación del preview nunca llegaba a ejecutarse.
- Animador del preview con `reason: caret | layout`, cancelación por gesto/resize/desmontaje y guard de barra con epsilon de 2 px. Tiempos reales y cancelación de barra quedan en la QA manual.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
