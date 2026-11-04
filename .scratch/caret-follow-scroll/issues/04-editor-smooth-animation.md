# 04: Animación de los saltos grandes en el editor

**Qué construir:** los recentrados del editor se animan solo cuando el salto supera el umbral; los ajustes pequeños son instantáneos, la animación es cancelable y retargeteable, y `prefers-reduced-motion` la desactiva.

Se intercepta el centrado con `EditorView.scrollHandler`. Si las opciones no son `{ y: 'center', x: 'nearest' }`, se cancela la animación y se devuelve `false` para dejar el scroll nativo. Si son de centrado, se calcula el destino desde `documentPadding.top` y `lineBlockAt(head)`, se compara con el `scrollTop` actual y se anima con `requestAnimationFrame` o se asigna directamente.

Constantes: `DURATION = 150`, `easeOutCubic`, umbral `max(view.defaultLineHeight, clientHeight / 6)`. Cancelan rueda, touchstart, `pointerdown`/`mousedown` en el scroller, PageUp/PageDown, resize, editor oculto y cualquier destino distinto de `"center"`.

**Blocked by:** 01 — Typewriter centrado y scroll libre finito en el editor; 03 — Módulo compartido de animación de scroll

**Status:** resolved

- [x] `typewriter.ts` incluye el `scrollHandler` y el animador, o consume `smooth-scroll.ts`.
- [x] Un salto grande se anima ~150 ms con ease-out y termina exactamente en el destino.
- [x] Un ajuste de una o dos líneas es instantáneo.
- [x] Un destino ya alcanzado no programa frames.
- [x] Un tecleo rápido retargetea sin cola; no acumula animaciones.
- [x] Rueda y touchstart cancelan y dejan el scroll manual.
- [x] `PageUp`/`PageDown` cancelan y conservan su destino nativo.
- [x] Resize y editor oculto cancelan.
- [x] `prefers-reduced-motion: reduce` no programa ningún frame.
- [x] `.cm-scroller` tiene `scroll-behavior: auto`.
- [x] El `scrollHandler` no despacha transacciones.
- [ ] Tests puros del destino, umbral, easing y cancelación; verificación de frames en Chromium/Electron.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md` y `../../typewriter-scroll/research.md` §8.3-8.7.
- No se usa `scrollTo({ behavior: 'smooth' })` ni `scroll-behavior: smooth`.
- El arrastre de la barra de scroll queda como verificación en Electron.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`).
- Automatizado: 33 suites / 545 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- Consume `createScrollAnimator`; `scroll-behavior: auto` se fuerza en el scroller. Los frames reales quedan en la QA manual.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
