# 01: Paneles redimensionables con el ratón

**Qué construir:** sidebar, lista, panel de la Story fuente y split editor/preview redimensionables con puntero, teclado y persistencia.

**Blocked by:** —

**Status:** resolved

- [x] Existe un primitivo `Resizer` compartido con `role="separator"` y ARIA.
- [x] El arrastre usa Pointer Events y `setPointerCapture`, con `user-select: none` mientras dura.
- [x] Flechas izquierda/derecha mueven 16 px (2% en el split); Home/End van a los límites.
- [x] Doble clic restaura el valor por defecto.
- [x] Los anchos y el ratio persisten en `localStorage` con el prefijo `draftwrite.panel.`.
- [x] La sidebar solo se redimensiona en `lg` y cuando está expandida; debajo sigue el rail de 56 px.
- [x] La lista y la Story fuente usan anchos en píxeles con mínimos y máximos.
- [x] El split usa un ratio 0.2–0.8 con mínimo de 160 px por panel y se oculta si no cabe.
- [x] El redimensionado no rompe CodeMirror, el preview ni el typewriter.
- [x] Tests puros, de hooks e integración; la suite completa pasa.
- [x] `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## Comments

- Implementado en `c35d6e3`, integrado en `main` y `feat/caret-follow-scroll`.
- Verificado en la app: sidebar `220→260` (teclado `→276`), lista `280→320` (reset `→280`), Story `360→400`, split `50%→57.3%`; los valores sobreviven a una recarga.
- Suite final: 39 suites / 585 tests.
