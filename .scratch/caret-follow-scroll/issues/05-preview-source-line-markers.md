# 05: Anotación del preview por línea de origen

**Qué construir:** cada línea del Markdown renderizado tiene un objetivo medible en el DOM, sin cambiar el HTML visible ni el texto que consumen los tests.

Se crea `remark-source-line-markers.ts`, colocado **antes** de `remarkBreaks` en `[remarkGfm, remarkSourceLineMarkers, remarkBreaks]`. Recorre el mdast con una recursión propia (no se importa `unist-util-visit`), parte cada nodo `text` con `position` por sus saltos de línea, emite los `break` que emitiría `remark-breaks` e inserta `<span data-source-line="N"></span>` al inicio de cada línea. Un contador `lastLine` evita marcadores duplicados.

Se crea `rehype-code-line-markers.ts` para `pre > code`: parte el texto en líneas, conserva los `\n` e inserta un span por línea, incluidas las vacías.

Se mantienen las anclas `data-source-start-line` / `data-source-end-line` como respaldo en `h1`-`h6`, `p`, `blockquote`, `ul`, `ol`, `li`, `pre`, el `div` de tabla, `tr` y `hr`. Se añaden componentes para `h4`-`h6`, `li` y `tr`, y se pasa `node` al `hr`.

**Blocked by:** —

**Status:** resolved

- [x] Existe `remark-source-line-markers.ts` y se ejecuta antes de `remarkBreaks`.
- [x] Existe `rehype-code-line-markers.ts` y se pasa en `rehypePlugins`.
- [x] Un párrafo de dos líneas tiene marcadores 3 y 4 con un `<br>` entre ellos.
- [x] Un `strong` que cruza líneas conserva el marcador dentro del inline.
- [x] Un bloque de código con cerca tiene un marcador por línea de contenido, incluida la vacía.
- [x] Una tabla anota el `div` y cada `tr`; el delimitador no produce marcador.
- [x] Las footnotes conservan la línea original de su definición.
- [x] Las líneas sin marcador (blancas, cercas, delimitador, subrayado setext, `hr`, imagen sola) caen al ancla de bloque.
- [x] Los marcadores son `span` vacíos, sin `display: none` ni `visibility: hidden`.
- [x] El HTML sin marcadores es byte a byte idéntico al actual.
- [x] `getByText('sturdy').tagName === 'STRONG'` y `getByText('world')` siguen pasando.
- [x] No se importan `unist-util-visit`, `@types/mdast` ni `@types/hast`; los tipos son locales.
- [x] Tests puros de `splitTextIntoSourceLines`, `firstCodeLine`, `nearestMarkerLine` y del transformer; tests jsdom de atributos.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Spec: `../spec.md`. Informe: `../research.md` y `../../preview-caret-sync/line-mapping.md` §4-§6.
- El coste medido es +8-9 % sobre el render actual.
- No se anotan elementos inline salvo el marcador que cae dentro de ellos.

- Implementado en `feat/caret-follow-scroll` (HEAD `c83c3d7`).
- Automatizado: 33 suites / 545 tests; `pnpm typecheck`, `pnpm lint` y `pnpm build` verdes.
- Los marcadores se insertan antes de `remark-breaks`; paridad byte a byte verificada sobre 30 documentos.
- **QA manual pendiente en Electron** (no ejecutada en este entorno): centrado ±2 px, espacio finito, `Workspace.scrollTop === 0`, resize, clic/arrastre/arrastre fuera del contenido, rueda y barra de scroll cancelando, tiempos de ~150 ms, `prefers-reduced-motion`, IME (fcitx/ibus) y touch real. El repo no incluye un harness headless; la verificación vive en la app.
