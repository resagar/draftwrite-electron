# 03: Módulo compartido de animación de scroll

**Qué construir:** un módulo puro con las primitivas de animación que usarán el editor y el preview, para que la duración, la curva y el umbral tengan una sola definición.

Se crea `src/renderer/src/scroll/smooth-scroll.ts` con `DURATION = 150`, `SCROLL_EPSILON = 2`, `easeOutCubic`, `scrollThreshold`, `prefersReducedMotion`, `isForeignScroll` y `createScrollAnimator(scroller, scheduler)`. El animador recibe un `Scroller = { scrollTop, clientHeight, scrollHeight }` y un `FrameScheduler = { now, requestFrame, cancelFrame, reducedMotion }`, de modo que se puede probar sin layout ni tiempos reales.

El animador mantiene un solo frame y un token `run`; cada petición cancela y retargetea desde el `scrollTop` actual. El primer frame se clampea a `t = 0`. No calcula destinos, no mide y no registra listeners: eso queda en cada consumidor.

**Blocked by:** —

**Status:** resolved

- [x] Existe `smooth-scroll.ts` con las constantes y funciones exportadas.
- [x] `createScrollAnimator` solo escribe `scrollTop`; no mide ni despacha eventos.
- [x] Un delta bajo el umbral asigna el destino y no programa frames.
- [x] Un delta alto anima hasta el destino exacto en ~150 ms.
- [x] Un retarget a mitad de vuelo cancela el frame anterior y termina en el nuevo destino.
- [x] `cancel()` deja `isAnimating()` en `false` y no deja frames vivos.
- [x] `reducedMotion()` asigna el destino sin programar frames.
- [x] `clientHeight = 0` no mide ni anima.
- [x] `prefersReducedMotion()` tiene guarda para entornos sin `matchMedia`.
- [x] `scrollThreshold(lineUnit, height)` devuelve `max(lineUnit, height / 6)`.
- [x] Tests puros con scheduler y scroller inyectados; sin `requestAnimationFrame` real.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md` y `../../preview-caret-sync/smooth-scroll.md` §3-§8.
- El editor puede adoptar este módulo en el ticket 04 o mantener sus constantes equivalentes; el preview lo consume en el ticket 08.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`).
- Automatizado: 33 suites / 545 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- El animador compartido lo consumen el editor y el preview; `centerOffset` centraliza la aritmética de centrado.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
