# Spec: saltos de línea en el preview y scroll interno del editor

**Status:** implemented
**Fecha:** 2026-10-24
**Feature:** editor-linebreaks-scroll

---

## Declaración del problema

Al escribir en el editor se detectaron dos bugs de experiencia:

1. **El preview no respeta un Enter simple.** Al pulsar Enter una sola vez, el texto se
   guarda con `\n`, pero el preview lo muestra en la misma línea. El writer no puede
   separar párrafos ni versos con un salto simple.
2. **El editor arrastra el workspace al hacer scroll.** Con un texto largo, el editor
   crece con el contenido en lugar de tener scroll propio. Al desplazarse, CodeMirror
   desplaza el contenedor `Workspace` y el header y el panel de Story salen de la vista.

## Causa raíz

- **Bug 1:** CommonMark trata un salto de línea simple como *soft break*. `remark-gfm`
  solo no genera un `<br>`, y el navegador colapsa el `\n` en el HTML renderizado.
- **Bug 2:** las secciones flex de `ArticleEditor` y `StoryEditor` usaban el
  `min-height: auto` por defecto. El `height="100%"` de CodeMirror se resolvía contra
  una altura indefinida, el editor crecía hasta la altura del contenido y la lógica
  `scrollRectIntoView` de CodeMirror terminaba desplazando el `Workspace`.

## Solución

- **Preview:** registrar `remark-breaks` después de `remark-gfm` en el componente
  compartido `MarkdownPreview`. Así un Enter simple produce un `<br>` visible.
- **Layout:** añadir `min-h-0` a las secciones flex raíz de `ArticleEditor` y
  `StoryEditor`. El editor queda acotado a la altura disponible y su scroller interno
  asume el scroll sin mover el `Workspace`.

## Decisiones de implementación

- Se añade `remark-breaks@4.0.0` como dependencia de runtime y se mantiene el preview
  compartido entre Story y Article, sin cambios de API (`{ markdown: string }`).
- El fix de layout se aplica en las dos editoras porque ambas comparten el mismo patrón
  de sección flex y el mismo `TextEditor`.
- El fix de layout no se prueba en jsdom: jsdom no calcula layout. Se verifica con el
  harness headless de Chromium sobre el build de producción.
- El bug 1 sí tiene test de integración en `src/renderer/src/App.test.tsx`, escrito en
  rojo antes del fix (TDD).
- No se toca IPC, preload, dominio, servicios, SQLite ni migraciones.

## Criterios de aceptación

- Un Enter simple en el texto del Article o de la Story renderiza un `<br>` en el preview.
- El scroller de CodeMirror tiene altura acotada (`clientHeight` menor que
  `scrollHeight`) y hace scroll interno.
- Al escribir o desplazarse en un texto largo, `Workspace.scrollTop` permanece en `0` y
  el panel de Story conserva su posición.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.
- El harness headless reporta PASS para los dos bugs.

## Verificación realizada

- Test de regresión en rojo: el párrafo no contenía `<br>`.
- Test de regresión en verde tras añadir `remark-breaks`.
- `pnpm test`: 19 suites, 293 tests passed.
- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0, sin warnings.
- `pnpm build`: exit 0.
- Harness headless sobre el build final: ambos bugs PASS.
  - `.cm-scroller`: `clientHeight: 430`, `scrollHeight: 18922`, `scrollTop: 18478`.
  - `Workspace.scrollTop: 0`; panel de Story con `top: 36`.

## Fuera de alcance

- Verificación manual en la ventana real de Electron: queda pendiente para el usuario.
- Refactors del layout compartido o extracción de clases de layout repetidas.
- Cambios de contrato IPC o de persistencia.

## Referencias

- `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx`
- `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx`
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx`
- `src/renderer/src/App.test.tsx`
- `AGENTS.md`
