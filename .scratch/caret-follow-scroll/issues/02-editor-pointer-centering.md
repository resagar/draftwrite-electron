# 02: Centrado del caret al hacer clic y al soltar un arrastre

**Qué construir:** un clic en el editor mueve el caret y lo centra; un arrastre para seleccionar no mueve el viewport durante el gesto y centra una sola vez al soltar.

Se añade `src/renderer/src/editor/pointer-selection.ts` con una `ViewPlugin` constante de módulo. Escucha `mousedown` en `contentDOM` (solo `button === 0`) y `mouseup`/`touchend` en `document`. Al terminar el gesto espera un `requestAnimationFrame`, lee `view.state.selection.main.head` y despacha una única transacción con la anotación `pointerSelectionEnd` y `EditorView.scrollIntoView(head, { y: 'center' })`. No se centra en `mousedown` ni en cada `mousemove`.

La anotación se define en este ticket, pero su consumo por el store y el preview llega en el ticket 07.

**Blocked by:** 01 — Typewriter centrado y scroll libre finito en el editor

**Status:** resolved

- [x] Existe `pointer-selection.ts` con la anotación, el predicado y la clase del plugin.
- [x] El plugin se añade al array constante de `articleEditorExtensions`.
- [x] Un clic simple centra el caret al soltar.
- [x] Un clic sobre el mismo caret centra igualmente (no hay transacción de selección).
- [x] Un clic dentro de una selección existente usa el caret colapsado final.
- [x] Un arrastre no produce centrados intermedios; centra una vez al soltar.
- [x] Un arrastre que termina fuera del contenido también centra.
- [x] Doble clic y shift+clic centran una vez con el `head` final.
- [x] Botón derecho y central no centran.
- [x] El `touchend` no se duplica con el `mouseup` sintético.
- [x] `destroy()` limpia listeners y frame pendiente.
- [x] Tests de integración en jsdom: clic y arrastre publican/centran una sola vez; no hay jitter.
- [ ] Verificación en Chromium/Electron de clic, arrastre y arrastre que sale del contenido.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md` y `../../typewriter-scroll/research.md` §8.1-8.2.
- No se usa `click` ni `MouseSelectionStyle`.
- El `mouseup` perdido fuera de la ventana queda como riesgo conocido; se evalúa `mousemove` con `buttons === 0`.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`).
- Automatizado: 33 suites / 545 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- El gesto se arma también en `touchstart`; el par `mousedown`/`mouseup` sintético posterior a un toque se ignora con `sourceCapabilities` y una ventana de 500 ms. El arrastre real queda en la QA manual.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
