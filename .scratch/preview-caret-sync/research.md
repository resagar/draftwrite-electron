# Sincronización del preview con el cursor y scroll libre finito

**Estado:** investigación de solo lectura; no se modificaron código de producción, tests, `package.json` ni historial de git. El único artefacto creado es este informe.

**Fecha:** 2026-10-24

**Feature:** `preview-caret-sync`

**Alcance:** renderer (`MarkdownPreview`, `EditorPreviewLayout`, `TextEditor`, `status-store`). Sin cambios en IPC, preload, `src/main`, SQLite, migraciones ni dependencias.

---

## Convenciones de cita

Para no repetir rutas largas de `node_modules`, este informe usa estos alias; en **Sources** se expanden con la ruta completa y la versión instalada.

| Alias | Ruta |
| --- | --- |
| `MP` | `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx` |
| `EPL` | `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx` |
| `TE` | `src/renderer/src/editor/TextEditor/TextEditor.tsx` |
| `SS` | `src/renderer/src/state/status-store.ts` |
| `UES` | `src/renderer/src/state/use-editor-status.ts` |
| `AE` | `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx` |
| `SE` | `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx` |
| `WS` | `src/renderer/src/workspace/Workspace/Workspace.tsx` |
| `SB` | `src/renderer/src/shell/StatusBar/StatusBar.tsx` |
| `AT` | `src/renderer/src/App.test.tsx` |
| `RM` | `node_modules/react-markdown/lib/index.js` |
| `RMR` | `node_modules/react-markdown/readme.md` |
| `HJR` | `node_modules/.pnpm/hast-util-to-jsx-runtime@2.3.6_supports-color@7.2.0/node_modules/hast-util-to-jsx-runtime/lib/index.js` |
| `MTH` | `node_modules/.pnpm/mdast-util-to-hast@13.2.1/node_modules/mdast-util-to-hast/lib/state.js` |
| `MNB` | `node_modules/.pnpm/mdast-util-newline-to-break@2.0.0/node_modules/mdast-util-newline-to-break/lib/index.js` |
| `UCM` | `node_modules/.pnpm/@uiw+react-codemirror@4.25.12_@babel+runtime@7.29.10_@codemirror+autocomplete@6.20.3_@c_af6d6fd85eac2abaeccbbbfe81fa1367/node_modules/@uiw/react-codemirror/esm/useCodeMirror.js` |
| `CMV` | `node_modules/@codemirror/view/dist/index.js` |
| `CMD` | `node_modules/.pnpm/@codemirror+commands@6.11.1/node_modules/@codemirror/commands/dist/index.js` |
| `CMVD` | `node_modules/@codemirror/view/dist/index.d.ts` |
| `CMSD` | `node_modules/@codemirror/state/dist/index.d.ts` |

Convención de etiquetas:

- `[Hecho]`: verificado en código instalado, documentación oficial o medición reproducible.
- `[Inferencia]`: consecuencia razonada a partir de los hechos anteriores; no es una medición directa.
- `[Decisión abierta]`: comportamiento que el producto debe elegir antes de implementar.

No se usó material comunitario (blogs, Stack Overflow) para sostener afirmaciones técnicas. Las fuentes son código local, documentación oficial de los proyectos y una sonda SSR propia y descartable.

---

## Objetivo

Que el preview Markdown renderizado:

1. Centre el bloque correspondiente a la línea del cursor de CodeMirror cuando el writer escribe o mueve el cursor con el teclado.
2. Permita scroll manual libre, con un rango finito: el primer bloque debe poder centrarse y el último bloque renderizado debe poder llegar al borde superior del viewport, dejando un espacio en blanco finito por debajo.

No se implementa nada en este informe. Se documenta la viabilidad, la arquitectura recomendada, los límites y las decisiones que quedan abiertas.

---

## Resumen ejecutivo

- `[Hecho]` `react-markdown@10.1.0` pasa el `node` de hast a cada componente custom y ese nodo conserva `position.start.line` / `position.end.line` de mdast (`RM:348-356`, `RMR:292-293`, `RMR:724-727`, `MTH:326-338`, `HJR:339-341`).
- `[Hecho]` CodeMirror expone `docChanged`, `selectionSet` y `Transaction.isUserEvent()`, y distingue la selección con puntero (`select.pointer`) de la selección por teclado (`select`) (`CMVD:597`, `CMVD:601`, `CMSD:989`, `CMV:4854-4861`, `CMD:581`).
- `[Inferencia]` La combinación **anotar bloques renderizados con su rango de líneas + dos espaciadores medidos + `scrollTop` manual** consigue los dos objetivos sin dependencias nuevas ni cambios fuera del renderer.
- `[Inferencia]` El seguimiento debe ser **por bloque**, no por línea exacta: un párrafo de cuatro líneas comparte un solo rectángulo. La línea exacta dentro de un bloque no es accesible sin un mapeo adicional de offsets de texto a rangos del DOM.
- `[Inferencia]` El aislamiento en un componente hijo que devuelve `null` evita que cada flecha del cursor re-renderice `MarkdownPreview` y vuelva a parsear el Markdown (`RM:175-180`).
- **Veredicto:** **viable**. Complejidad media, toda en el renderer; el riesgo principal es la calidad percibida en bloques más altos que el viewport, no la viabilidad técnica.
- **Limitación principal:** si el cursor está dentro de un bloque más alto que el viewport (un párrafo largo, un bloque de código), el preview centra el bloque, pero no puede garantizar que la línea concreta del cursor quede visible.
- **Verificación:** jsdom no mide layout (`src/renderer/src/test/setup.ts:4-29`, `jest.config.js:24-35`, `AGENTS.md:62-63`); la aceptación de layout debe medirse en Chromium/Electron, como en el precedente de `.scratch/editor-linebreaks-scroll/spec.md:43-44,59-69`.

---

## 1. Punto de partida

### 1.1 El preview actual

`MarkdownPreview` recibe solo `{ markdown: string }` (`MP:75-85`). Su raíz es una sección con `aria-label="Preview"`, `min-w-0 flex-1`, y dentro un `article` con `mx-auto max-w-[560px] p-8 select-text` (`MP:77-78`). El Markdown se renderiza con `remarkGfm` y `remarkBreaks` (`MP:7`, `MP:79-81`).

Los componentes custom actuales estilizan `h1`-`h3`, `p`, `a`, `strong`, `em`, `blockquote`, `ul`, `ol`, `code`, `pre`, `table`, `th`, `td`, `del` y `hr` (`MP:9-73`). No hay componentes custom para `h4`-`h6`, `li`, `tr` ni `thead`/`tbody`.

### 1.2 El scroller actual

`EditorPreviewLayout` envuelve el preview en un `div` con `min-h-0 min-w-0 flex-1 overflow-y-auto` (`EPL:36-40`). Es decir, hoy el dueño del scroll es el layout, no el preview.

`Workspace` usa `overflow-hidden` en sus tres variantes (`WS:42`, `WS:57`, `WS:84`), y el editor ya tiene su propio scroller interno. El precedente de `.scratch/editor-linebreaks-scroll/spec.md:24-35` documenta por qué el workspace no debe desplazarse: el scroll pertenece al panel del editor.

### 1.3 El cursor actual

`TextEditor` publica `{ line, column }` en cada `onUpdate` (`TE:34-38`). La línea es 1-based y la columna también (`TE:37`). El tipo `EditorCursor` vive en `TextEditor` (`TE:7-10`).

`useEditorStatus` entrega `publishCursor`, que hace `publishStatus({ cursor })` (`UES:60-62`). El store guarda un snapshot global y notifica a los suscriptores (`SS:21-34`); `useEditorStatus` lo lee con `useSyncExternalStore` (`SS:64-70`). El status bar muestra `Ln`/`Col` (`SB:63-74`).

No hay hoy ningún dato de **origen** del cursor: un clic de mouse y una flecha de teclado publican exactamente el mismo `{ line, column }`.

### 1.4 El mismo texto en editor y preview

`ArticleEditor` pasa `draft.Text` al `TextEditor` y a `EditorPreviewLayout` (`AE:119-127`); `StoryEditor` hace lo mismo (`SE:101-109`). Esto es un requisito implícito de la sincronización: si el preview renderizara un texto normalizado distinto del documento de CodeMirror, los números de línea no coincidirían. `[Hecho]` a partir del cableado; `[Inferencia]` que la correspondencia se mantiene mientras ambos reciban el mismo string.

### 1.5 Pruebas actuales

`App.test.tsx` tiene helpers para obtener la `EditorView` y reemplazar el texto (`AT:555-577`), un test de `Ln`/`Col` (`AT:635-643`) y tests del preview en `split`/`preview` (`AT:684-747`). El entorno es jsdom (`jest.config.js:24-35`), con un shim de `Range` (`src/renderer/src/test/setup.ts:4-29`). jsdom no calcula layout: `clientHeight` es 0 y `getBoundingClientRect()` devuelve ceros. `[Hecho]` por el propio shim y por la regla del proyecto (`AGENTS.md:62-63`).

---

## 2. Evidencia: posiciones de origen en react-markdown

### 2.1 Cómo llega `node` al componente

`react-markdown` construye el árbol hast y lo convierte a JSX con `hast-util-to-jsx-runtime`, pasando `passNode: true` (`RM:348-356`). Ese runtime adjunta `props.node` solo cuando el tipo no es un tag string ni un Fragment, es decir, cuando hay un componente custom (`HJR:339-341`).

Las posiciones no las inventa react-markdown: `mdast-util-to-hast` copia `from.position` a `to.position` (`MTH:326-338`). Por eso `node.position.start.line` y `node.position.end.line` son las líneas 1-based del Markdown de origen.

La documentación oficial lo confirma: cada componente recibe el `Element` original de hast (`RMR:292-293`, `RMR:724-727`). Las posiciones son parte del protocolo mdast/hast (`https://github.com/syntax-tree/mdast#position`, `https://github.com/syntax-tree/hast#position`).

### 2.2 Medición propia

Se ejecutó una sonda SSR descartable en `/tmp/opencode/caret-source-probe.mjs` (no forma parte del repo) con `react-markdown@10.1.0`, `remark-gfm@4.0.1` y `remark-breaks@4.0.0`, pasando componentes custom para registrar `props.node.position`. El Markdown de prueba tenía título, párrafo con salto simple, lista, blockquote, bloque de código, tabla GFM, imagen, `hr` y una footnote.

Resultado de las líneas (1-based):

| Elemento | `start` | `end` | Observación |
| --- | ---: | ---: | --- |
| `h1` | 1 | 1 | Bloque de una línea |
| `p` | 3 | 4 | Un `p` cubre varias líneas |
| `br` | — | — | Sin `position` |
| `ul` | 6 | 8 | Contenedor de lista |
| `li` | 6 | 6 | Primer ítem |
| `li` | 7 | 8 | Segundo ítem, con continuación |
| `blockquote` | 10 | 10 | Contenedor |
| `p` (dentro de blockquote) | 10 | 10 | Más específico que el contenedor |
| `pre` | 12 | 14 | Bloque de código |
| `code` (bloque) | 12 | 14 | También tiene posición, pero es hijo de `pre` |
| `table` | 16 | 18 | Contenedor de tabla |
| `thead` / `tr` / `th` | 16 | 16 | Fila de cabecera |
| `tbody` / `tr` / `td` | 18 | 18 | Fila de datos |
| `p` (imagen) | 20 | 20 | El `p` cubre la línea de la imagen |
| `img` | 20 | 20 | Inline; no se anota |
| `hr` | 22 | 22 | Bloque |
| `p` (referencia a footnote) | 24 | 24 | Texto principal |
| `section[data-footnotes]` | — | — | Sin `position` |
| `ol` (footnotes) | — | — | Sin `position` |
| `li` / `p` (definición de footnote) | 26 | 26 | Conservan la línea de origen aunque se rendericen al final |
| `a` backref | — | — | Sin `position` |

La sonda de footnotes (`/tmp/opencode/footnote-h2-probe.mjs`) confirmó además que el `h2` "Footnotes" generado por `remark-gfm` tampoco tiene `position`.

`[Hecho]` para los valores medidos. La sonda es reproducible pero descartable; no es documentación oficial.

### 2.3 Consecuencias para el mapeo

- `[Hecho]` El `br` que inserta `remark-breaks` no tiene posición: `mdast-util-newline-to-break` reemplaza el salto por `{type: 'break'}` (`MNB:16-27`) y ese nodo no arrastra `position`. No hace falta anotarlo: el `p` o el `li` que lo contiene cubre la línea del salto.
- `[Hecho]` La línea del separador de una tabla GFM (la fila `| - | - |`) no pertenece a ninguna fila renderizada; solo el contenedor `table` la cubre (16-18 en la medición). Si el cursor está en esa línea, el bloque disponible es la tabla completa.
- `[Hecho]` Las definiciones de footnote conservan la línea del Markdown original (26) aunque se rendericen al final del documento. El `section` y el `ol` de footnotes no tienen posición; solo `li` y `p` la tienen.
- `[Hecho]` Los bloques anidados tienen posiciones solapadas: `ul` 6-8 y `li` 7-8; `blockquote` 10-10 y `p` 10-10; `table` 16-18 y `tr` 16-16. Por eso hace falta una regla de desempate.
- `[Inferencia]` El bloque más específico es el de mayor profundidad DOM. Es el que mejor representa el contenido que el writer está mirando: el `li`, no el `ul`; el `p` dentro del blockquote, no el blockquote; la `tr`, no la tabla completa.
- `[Inferencia]` No se puede mapear la columna ni la línea exacta dentro de un `p` multilínea solo con `node.position`: el nodo es el bloque, no cada línea renderizada. Un `p` de 3-4 se centra como un todo.

### 2.4 Lo que no se intenta

- No se anotan elementos inline (`strong`, `em`, `a`, `code` inline, `img`). Su posición vertical es la del bloque que los contiene; anotarlos añadiría candidatos sin mejorar el centrado.
- No se intenta reconstruir un `Range` del DOM para la línea exacta. Eso exigiría mapear offsets del texto Markdown a nodos de texto renderizados y lidiar con el wrapping; es un proyecto aparte.
- No se depende de `rehype-sourcepos` ni de un plugin nuevo. `node.position` ya está disponible en los componentes custom.

---

## 3. Restricciones del navegador y de React

### 3.1 `scrollIntoView` no es la herramienta adecuada

`[Hecho]` MDN documenta que `Element.scrollIntoView()` desplaza los contenedores ancestros del elemento para hacerlo visible, y que la opción `container` por defecto es `all`, es decir, todos los contenedores scrollables, incluido el viewport (`https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView`).

`[Inferencia]` En este preview hay scrollers anidados: `pre` tiene `overflow-x-auto` (`MP:53-56`) y el wrapper de `table` también (`MP:58-64`). Aunque se usara `container: 'nearest'`, el ancestro scrollable más cercano de una `tr` puede ser el wrapper de la tabla, no el preview. El resultado sería un scroll parcial o nulo, y además se podrían mover ancestros que no deben moverse (`Workspace`).

`[Inferencia]` `scrollIntoView` tampoco resuelve el requisito de espacio finito: solo desplaza contenido existente; no puede crear el espacio inferior necesario para que el último bloque llegue arriba.

**Decisión:** usar `container.scrollTop` sobre el scroller del preview, con mediciones propias. Así se controla exactamente qué elemento se desplaza y cuánto.

### 3.2 `scrollTop`, `clientHeight`, `scrollHeight`

`[Hecho]` `scrollTop` es la distancia en píxeles desde el borde superior del contenido hasta el borde superior del scrollport; es subpixel en navegadores modernos (`https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop`). Asignarlo equivale a `scroll()` con `behavior: "auto"`.

`[Hecho]` `clientHeight` incluye padding pero no borde, margen ni scrollbar horizontal; `scrollHeight` incluye padding y contenido no visible, pero no borde ni margen (`https://developer.mozilla.org/en-US/docs/Web/API/Element/clientHeight`, `https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight`). `scrollHeight` y `clientHeight` son enteros redondeados; `scrollTop` puede tener decimales. Por eso las comparaciones de aceptación deben usar una tolerancia de ±1-2 px.

`[Hecho]` `getBoundingClientRect()` devuelve coordenadas relativas al viewport (`https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect`). Para convertir un rectángulo a coordenadas del contenido del scroller:

```text
contentTop = rect.top - (containerRect.top + container.clientTop) + container.scrollTop
```

`container.clientTop` es el ancho del borde superior; la sección del preview no tiene borde hoy, pero incluirlo hace la fórmula robusta si se añade uno.

### 3.3 Scroll anchoring, smooth scroll y overscroll

- `[Hecho]` El navegador ajusta el scroll para minimizar saltos cuando cambia el contenido por encima del viewport (scroll anchoring). `overflow-anchor: none` desactiva ese comportamiento (`https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor`).
- `[Inferencia]` Como los espaciadores cambian de altura, el scroll anchoring puede competir con el `scrollTop` calculado. Conviene `overflow-anchor: none` en el scroller.
- `[Hecho]` `scroll-behavior: smooth` haría que una asignación de `scrollTop` se animara; para seguir el cursor sin lag conviene `scroll-behavior: auto` en el scroller (`https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop`).
- `[Hecho]` `overscroll-behavior: contain` evita el encadenamiento del scroll al ancestro cuando se llega al final (`https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior`).
- `[Inferencia]` `scrollbar-gutter: stable` evita que la aparición/desaparición de la scrollbar cambie el ancho disponible y provoque un reflow que, a su vez, dispare otra medición. Es una mejora opcional, no un requisito.

### 3.4 Por qué no usar padding porcentual

`[Hecho]` En CSS, los porcentajes de `padding` se resuelven contra el tamaño inline del bloque contenedor (el ancho en escritura horizontal), no contra la altura (`https://developer.mozilla.org/en-US/docs/Web/CSS/padding`).

`[Inferencia]` Por eso `padding-top: 50%` no significa "mitad de la altura del viewport". Los espaciadores deben ser alturas en píxeles calculadas en JS a partir de `clientHeight`.

### 3.5 `useLayoutEffect`

`[Hecho]` React ejecuta `useLayoutEffect` después de las mutaciones del DOM y antes de que el navegador repinte (`https://react.dev/reference/react/useLayoutEffect`). Es el lugar correcto para medir y ajustar el scroll sin que el usuario vea el salto intermedio.

`[Inferencia]` Escribir las alturas de los espaciadores directamente en `ref.current.style.height` evita un `setState` y un render extra; el efecto ya corre antes del repintado. La alternativa con estado provocaría un commit adicional y otra pasada de layout.

### 3.6 `useSyncExternalStore` y selectores primitivos

`[Hecho]` React compara el valor devuelto por `getSnapshot` con `Object.is`; si no cambia, no re-renderiza (`https://react.dev/reference/react/useSyncExternalStore`). El snapshot debe ser inmutable y estable.

`[Inferencia]` El store actual publica un snapshot nuevo en cada `publishStatus`, incluso si la línea no cambió. Para que el preview no se re-renderice en cada tecla, el hook del preview debe devolver una **primitiva** (la línea, o `null`), no el objeto `EditorStatus`. Un selector que devuelve `status.cursor.line` es estable si la línea no cambia.

### 3.7 `ResizeObserver` y jsdom

`[Hecho]` `ResizeObserver` notifica cambios de tamaño de un elemento (`https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver`). Es necesario porque las imágenes y las fuentes cambian la altura del `article` después del primer render.

`[Inferencia]` Hay que observar el contenedor (cambios de viewport) y el `article` (cambios de contenido), no los espaciadores: escribirlos cambia `scrollHeight`, no el tamaño observado, y evita un bucle de notificaciones.

`[Hecho]` jsdom no implementa `ResizeObserver`; el efecto debe salir temprano si `typeof ResizeObserver === 'undefined'`, o los tests fallarán. Tampoco mide layout: `clientHeight` es 0 y los rects son ceros (`src/renderer/src/test/setup.ts:4-29`).

### 3.8 StrictMode

`[Hecho]` La app monta bajo `StrictMode` (`src/renderer/src/main.tsx:25-29`). En desarrollo, React ejecuta un ciclo extra de setup/cleanup para los efectos (`https://react.dev/reference/react/useLayoutEffect`).

`[Inferencia]` La sincronización debe ser idempotente: medir, escribir las mismas alturas y volver a fijar el mismo `scrollTop`. No debe acumular espaciadores ni listeners. El `ResizeObserver` se desconecta en el cleanup.

---

## 4. Arquitectura recomendada

### 4.1 Flujo de datos

```text
CodeMirror onUpdate
  -> cursorOrigin(update)
  -> publishCursor({ line, column, origin })
  -> status-store (external store)
  -> usePreviewLine()  // line only for keyboard, null for pointer
  -> PreviewCursorSync (child, renders null)
  -> syncPreview()
       -> readSourceBlocks(article)
       -> findBlockForLine(blocks, line)
       -> measure first/last block
       -> write top/bottom spacer heights
       -> write container.scrollTop
```

La idea central es separar tres responsabilidades:

1. **CodeMirror** sabe dónde está el cursor y de qué origen es el movimiento.
2. **`MarkdownPreview`** es dueño del scroller, de los espaciadores y de las refs; conserva su API `{ markdown: string }`.
3. **`PreviewCursorSync`** es un componente hijo que se suscribe a la línea y ejecuta el efecto de layout; devuelve `null`. Así las flechas del cursor no re-renderizan `MarkdownPreview` ni vuelven a parsear el Markdown.

`[Inferencia]` Si `MarkdownPreview` se suscribiera directamente a la línea, cada flecha dispararía un render del árbol completo y `ReactMarkdown` volvería a ejecutar el parser, que corre dentro del render (`RM:175-180`). El hijo aísla ese coste.

### 4.2 Anotación de bloques

`MarkdownPreview` añade atributos `data-source-start-line` y `data-source-end-line` a los bloques que pueden contener el cursor. La lista recomendada:

- `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- `p`
- `blockquote`
- `ul`, `ol`
- `li`
- `pre`
- el `div` que envuelve la `table` (no la `table` interna)
- `tr`
- `hr`

No se anotan `code` inline, `strong`, `em`, `a`, `img`, `br`, `thead`, `tbody`, `th` ni `td`. `[Inferencia]` `thead`/`tbody` no aportan precisión vertical sobre `tr`; `th`/`td` tampoco, y añaden ruido. `br` e `img` no tienen posición o son inline; el bloque contenedor los cubre.

`[Hecho]` `h4`-`h6`, `li` y `tr` no tienen hoy componente custom en `MP:9-73`. Hay que añadirlos solo para poder esparcir los atributos; sin `className` conservan el render por defecto actual. `hr` ya es custom pero no recibe `node` (`MP:72`).

`[Hecho]` Un atributo `data-*` con valor numérico se renderiza como string y TypeScript lo acepta al esparcirlo en JSX; se verificó con una prueba descartable en `/tmp/opencode/tsx-check/check.tsx`.

### 4.3 Selección del bloque

Reglas, en orden:

1. **Candidatos que contienen la línea:** `startLine <= line <= endLine`.
2. **Preferir no-footnote:** si hay al menos un candidato que no sea footnote, se descartan los de footnote. Esto evita que un bloque principal compita con una definición de footnote.
3. **Mayor profundidad DOM:** el bloque más interno que contiene la línea. Resuelve `ul` vs `li`, `blockquote` vs `p`, `table` vs `tr`.
4. **Menor span:** si empatan en profundidad, el rango de líneas más corto. Es un desempate conservador.
5. **Fallback:** si ningún bloque contiene la línea, elegir el bloque **no-footnote** cuyo `endLine` sea el mayor pero estrictamente menor que `line`. Si empatan, mayor profundidad y menor span. Esto cubre líneas en blanco y el final del documento.
6. **Sin fallback:** si no hay ninguno, el primer bloque no-footnote. Si solo hay footnotes, no se sigue.

`[Inferencia]` Las footnotes se permiten en la coincidencia exacta (para poder editar su definición y verla), pero se excluyen del fallback. Sin esa exclusión, un cursor en una línea posterior a la definición elegiría la footnote —que se renderiza al final— y el preview saltaría al pie aunque el writer esté en el cuerpo principal.

`[Inferencia]` El fallback por `endLine` estrictamente menor evita elegir un bloque que empieza después del cursor. Para una línea en blanco entre dos párrafos, elige el párrafo anterior, que es lo que el writer acaba de escribir.

### 4.4 Espaciadores y centrado

#### Coordenadas

Sean:

- `H` = `container.clientHeight` (alto visible del scroller).
- `T` = altura del espaciador superior.
- `A` = altura del `article` (incluye su padding).
- `B` = altura del espaciador inferior.
- `F` = top del primer bloque relativo al top del `article`.
- `h` = altura del primer bloque.
- `L` = top del último bloque relativo al top del `article`.
- `hLast` = altura del último bloque.

El contenido del scroller mide `T + A + B`; el máximo scroll es `M = T + A + B - H`.

#### Espaciador superior

Con `scrollTop = 0`, el centro del primer bloque está en `T + F + h/2`. Para que quede en `H/2`:

```text
T = max(0, H/2 - F - h/2)
```

`[Inferencia]` Si el primer bloque es tan alto que `F + h/2 > H/2`, `T` se clampea a 0: no se puede centrar sin una altura negativa. Es la misma limitación de bloques altos.

#### Espaciador inferior

Para que el último bloque pueda llegar a `top = 0` en el máximo scroll:

```text
B = max(0, H - (A - L))
```

Derivación:

```text
M = T + A + B - H
top del último bloque en M = T + L - M
                             = T + L - (T + A + B - H)
                             = H - A - B + L
```

Igualando a 0: `B = H - (A - L)`. Es independiente de `T` y de `hLast`.

Invariantes:

- Si `B >= 0`, entonces `M = T + L`: el último bloque llega exactamente a `top = 0`.
- Si `B` se clampea a 0 porque `A - L > H`, entonces `M > T + L`; la posición `scrollTop = T + L` sigue siendo alcanzable y también pone el último bloque en `top = 0`. El rango extra permite ver el resto del bloque alto.
- En el máximo con `B` positivo, el espacio en blanco por debajo del último bloque es `B + (A - L - hLast) = H - hLast`. Es finito y, si el bloque cabe en el viewport, deja exactamente el espacio necesario para que su top llegue a 0.
- `T <= H/2` cuando es positivo; `B <= H` cuando es positivo. Ambos espaciadores son finitos.

#### Centrado de un bloque cualquiera

```text
blockTop = rect.top - (containerRect.top + container.clientTop) + container.scrollTop
target   = blockTop + rect.height / 2 - H / 2
scrollTop = clamp(target, 0, max(0, scrollHeight - clientHeight))
```

`[Inferencia]` El clamp inferior evita desplazamientos negativos al principio; el superior evita pedir un scroll que el contenido no permite. Si el bloque es más alto que el viewport, su centro puede quedar en el centro, pero la línea del cursor puede quedar fuera: es la limitación estructural del mapeo por bloque.

#### Compensación cuando no se sigue

Si no hay línea de teclado (`null`, por ejemplo tras un clic), el efecto igualmente actualiza los espaciadores. Para que el contenido no salte visualmente, compensa el cambio del espaciador superior:

```text
container.scrollTop += newTopHeight - previousTopHeight
```

`[Inferencia]` En el montaje inicial sin cursor, `previousTopHeight` es 0 y la compensación deja el artículo en la misma posición visual; el espacio superior queda disponible para cuando el writer empiece a escribir. Si no se compensara, el artículo se desplazaría hacia abajo al montar.

### 4.5 Aislamiento de re-renders

`MarkdownPreview` no se suscribe al store. Renderiza:

```tsx
<PreviewCursorSync
  markdown={markdown}
  containerRef={containerRef}
  articleRef={articleRef}
  topSpacerRef={topSpacerRef}
  bottomSpacerRef={bottomSpacerRef}
/>
```

`PreviewCursorSync` usa `usePreviewLine()`, que devuelve la línea solo cuando el origen es `keyboard`. Devuelve `null` en el DOM. Su `useLayoutEffect` depende de `[markdown, line]`:

- `line` cambia por una flecha de teclado: se re-ejecuta y centra.
- `markdown` cambia por una tecla: el padre re-renderiza, el hijo recibe un `markdown` nuevo y el efecto se ejecuta después del commit del nuevo DOM.
- Un clic de puntero cambia la línea en el store, pero `usePreviewLine()` sigue devolviendo `null`: el preview no se re-renderiza ni se recentra.
- Un cambio de columna en la misma línea no cambia el selector: no hay re-render.
- Un cambio de estado de guardado re-renderiza el padre, pero no cambia `markdown` ni `line`: el efecto no se repite.

`[Inferencia]` Esta última propiedad es importante porque `ArticleEditor` re-renderiza cuando cambia el estado de persistencia; no queremos volver a medir por eso.

### 4.6 Origen del cursor

`TextEditor` debe publicar un `EditorCursor` con `origin`:

```ts
export type CursorOrigin = 'keyboard' | 'pointer'
export type EditorCursor = { line: number; column: number; origin: CursorOrigin }
```

La regla:

```ts
function cursorOrigin(update: CursorUpdate): CursorOrigin | null {
  if (!update.docChanged && !update.selectionSet) return null

  const pointer =
    !update.docChanged &&
    update.selectionSet &&
    update.transactions.some((tr) => tr.isUserEvent('select.pointer'))

  return pointer ? 'pointer' : 'keyboard'
}
```

Justificación:

- `[Hecho]` CodeMirror marca la selección con puntero como `select.pointer` (`CMV:4854-4861`) y los comandos de teclado como `select` (`CMD:581`).
- `[Hecho]` `ViewUpdate.docChanged` y `ViewUpdate.selectionSet` existen (`CMVD:597`, `CMVD:601`); `Transaction.isUserEvent()` está documentado (`CMSD:989`).
- `[Hecho]` `@uiw/react-codemirror` registra su listener de `onChange` antes de empujar el de `onUpdate` (`UCM:64-84`, `UCM:97-99`). En un mismo update, `onChange` (setState del Markdown) corre antes que `publishCursor`.
- `[Inferencia]` Un update sin `docChanged` ni `selectionSet` (foco, viewport) no debe publicar nada: evita re-renders y mantiene el último cursor conocido.
- `[Inferencia]` Si hay `docChanged`, se considera teclado aunque también haya `select.pointer`: escribir, pegar, undo/redo o una acción de toolbar deben seguir el cursor. El clic puro no cambia el documento, por eso `!docChanged` en la condición de puntero.
- `[Inferencia]` `replaceEditorText` de los tests (`AT:570-577`) usa `view.dispatch({ changes, selection })` sin `userEvent`; cae en `keyboard`, que es lo que los tests de integración necesitan.

### 4.7 Cambios por archivo

| Archivo | Cambio | Riesgo |
| --- | --- | --- |
| `MP` | Pasar a ser el scroller; añadir refs, espaciadores y `PreviewCursorSync`; anotar bloques; añadir `h4`-`h6`, `li`, `tr` | Bajo; conserva `{ markdown }` |
| `EPL` | Eliminar el wrapper `overflow-y-auto` y renderizar `<MarkdownPreview>` directo | Bajo; el preview pasa a ser flex child |
| `TE` | Importar `EditorCursor`, calcular `origin` y no publicar updates irrelevantes | Bajo |
| nuevo `cursor-origin.ts` | Helper puro `cursorOrigin(update)` | Ninguno; testeable sin CodeMirror |
| `SS` | Añadir `CursorOrigin`/`EditorCursor`, `selectPreviewLine` y `usePreviewLine` | Bajo; el snapshot sigue siendo global |
| `UES` | Tipar `publishCursor` con `EditorCursor` | Bajo |
| nuevo `preview-sync.ts` | `readSourceBlocks`, `findBlockForLine`, matemática de espaciadores/centrado | Ninguno; funciones puras/testeables |
| nuevo `PreviewCursorSync.tsx` | Suscripción, `useLayoutEffect`, `ResizeObserver` | Medio; verificar en Electron |
| tests | Unit tests de helpers/selectores; atributos en integración; métricas en headless | Ninguno en jsdom |

No se toca `src/main`, `src/preload`, IPC, SQLite ni migraciones. No se añaden dependencias: `react-markdown` y `@codemirror/*` ya están (`package.json:31-32`, `package.json:39`, `package.json:46-48`).

---

## 5. Boceto de código mínimo

> Los identificadores y comentarios de código van en inglés, como exige `AGENTS.md`. El boceto no incluye todos los estilos actuales de `COMPONENTS`; solo las partes nuevas.

### 5.1 Atributos de origen en los componentes

```tsx
type SourceNode = {
  position?: {
    start: { line: number }
    end: { line: number }
  }
}

type SourceAttributes = {
  'data-source-start-line'?: number
  'data-source-end-line'?: number
}

function sourceAttributes(node: SourceNode | undefined): SourceAttributes {
  const start = node?.position?.start.line
  const end = node?.position?.end.line

  return start === undefined || end === undefined
    ? {}
    : { 'data-source-start-line': start, 'data-source-end-line': end }
}

const COMPONENTS: Components = {
  h1: ({ children, node }) => (
    <h1 {...sourceAttributes(node)} className="mb-4 border-b border-base-300 pb-2 ...">
      {children}
    </h1>
  ),

  // h2, h3 keep their current classes.
  // h4-h6 are new only to receive the data attributes; no className
  // preserves the current default rendering.
  h4: ({ children, node }) => <h4 {...sourceAttributes(node)}>{children}</h4>,
  h5: ({ children, node }) => <h5 {...sourceAttributes(node)}>{children}</h5>,
  h6: ({ children, node }) => <h6 {...sourceAttributes(node)}>{children}</h6>,

  p: ({ children, node }) => (
    <p {...sourceAttributes(node)} className="mb-4 font-sans text-sm leading-relaxed ...">
      {children}
    </p>
  ),

  blockquote: ({ children, node }) => (
    <blockquote {...sourceAttributes(node)} className="my-4 rounded-r border-l-2 ...">
      {children}
    </blockquote>
  ),

  ul: ({ children, node }) => (
    <ul {...sourceAttributes(node)} className="mb-4 list-disc space-y-1.5 pl-5 ...">
      {children}
    </ul>
  ),

  ol: ({ children, node }) => (
    <ol {...sourceAttributes(node)} className="mb-4 list-decimal space-y-1.5 pl-5 ...">
      {children}
    </ol>
  ),

  li: ({ children, node }) => <li {...sourceAttributes(node)}>{children}</li>,

  pre: ({ children, node }) => (
    <pre {...sourceAttributes(node)} className="my-3 overflow-x-auto rounded border ...">
      {children}
    </pre>
  ),

  table: ({ children, node }) => (
    <div {...sourceAttributes(node)} className="my-3 overflow-x-auto">
      <table className="w-full border-collapse font-sans text-xs ...">{children}</table>
    </div>
  ),

  tr: ({ children, node }) => <tr {...sourceAttributes(node)}>{children}</tr>,

  hr: ({ node }) => <hr {...sourceAttributes(node)} className="my-4 border-base-300" />
}
```

Notas:

- `table` recibe la posición de la tabla, pero los atributos van al `div` que envuelve; el `tr` interno tiene su propia posición.
- `th`/`td` no se anotan: la fila (`tr`) ya da la granularidad vertical correcta.
- `node` es el `Element` de hast que `react-markdown` pasa solo a componentes custom (`RM:348-356`, `HJR:339-341`).

### 5.2 Tipos y origen del cursor

`src/renderer/src/state/status-store.ts`:

```ts
export type CursorOrigin = 'keyboard' | 'pointer'

export type EditorCursor = {
  line: number
  column: number
  origin: CursorOrigin
}

export type EditorStatus = {
  save: SaveStatus
  words: number
  characters: number
  readingMinutes: number
  cursor: EditorCursor | null
}
```

`src/renderer/src/editor/TextEditor/cursor-origin.ts`:

```ts
import type { CursorOrigin } from '../../state/status-store'

type CursorUpdate = {
  docChanged: boolean
  selectionSet: boolean
  transactions: readonly { isUserEvent(event: string): boolean }[]
}

export function cursorOrigin(update: CursorUpdate): CursorOrigin | null {
  if (!update.docChanged && !update.selectionSet) {
    return null
  }

  const pointer =
    !update.docChanged &&
    update.selectionSet &&
    update.transactions.some((transaction) => transaction.isUserEvent('select.pointer'))

  return pointer ? 'pointer' : 'keyboard'
}
```

`src/renderer/src/editor/TextEditor/TextEditor.tsx`:

```tsx
import type { EditorCursor } from '../../state/status-store'
import { cursorOrigin } from './cursor-origin'

// ...

onUpdate={(update) => {
  const origin = cursorOrigin(update)
  if (origin === null) {
    return
  }

  const head = update.state.selection.main.head
  const line = update.state.doc.lineAt(head)

  onCursorChange({ line: line.number, column: head - line.from + 1, origin })
}}
```

### 5.3 Selector del preview

`src/renderer/src/state/status-store.ts`:

```ts
export function selectPreviewLine(status: EditorStatus): number | null {
  return status.cursor?.origin === 'keyboard' ? status.cursor.line : null
}

const getPreviewLine = (): number | null => selectPreviewLine(snapshot)

export function usePreviewLine(): number | null {
  return useSyncExternalStore(subscribe, getPreviewLine)
}
```

`[Inferencia]` Un solo selector primitivo basta: si el origen es `pointer`, devuelve `null` y el preview no se re-renderiza durante el arrastre. No hace falta un booleano `follow` separado; la política "solo teclado" vive en este selector y es el único punto a cambiar si mañana se quiere un toggle.

`src/renderer/src/state/use-editor-status.ts`:

```ts
type EditorStatusControls = {
  publishCursor: (cursor: EditorCursor) => void
}

// ...

return {
  publishCursor: (cursor) => publishStatus({ cursor })
}
```

### 5.4 Lectura y selección de bloques

`src/renderer/src/workspace/MarkdownPreview/preview-sync.ts`:

```ts
export type SourceBlock = {
  element: HTMLElement
  startLine: number
  endLine: number
  depth: number
  isFootnote: boolean
}

export function readSourceBlocks(article: HTMLElement): SourceBlock[] {
  const blocks: SourceBlock[] = []

  article.querySelectorAll<HTMLElement>('[data-source-start-line]').forEach((element) => {
    const startLine = Number(element.dataset.sourceStartLine)
    const endLine = Number(element.dataset.sourceEndLine)

    if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) {
      return
    }

    let depth = 0
    for (
      let parent = element.parentElement;
      parent !== null && parent !== article;
      parent = parent.parentElement
    ) {
      depth += 1
    }

    blocks.push({
      element,
      startLine,
      endLine,
      depth,
      isFootnote: element.closest('[data-footnotes]') !== null
    })
  })

  return blocks
}

function isMoreSpecific(candidate: SourceBlock, current: SourceBlock): boolean {
  if (candidate.depth !== current.depth) {
    return candidate.depth > current.depth
  }

  return candidate.endLine - candidate.startLine < current.endLine - current.startLine
}

export function findBlockForLine(
  blocks: readonly SourceBlock[],
  line: number
): SourceBlock | null {
  let containing: SourceBlock | null = null
  let footnoteContaining: SourceBlock | null = null

  for (const block of blocks) {
    if (block.startLine > line || line > block.endLine) {
      continue
    }

    if (block.isFootnote) {
      if (footnoteContaining === null || isMoreSpecific(block, footnoteContaining)) {
        footnoteContaining = block
      }
    } else if (containing === null || isMoreSpecific(block, containing)) {
      containing = block
    }
  }

  if (containing !== null) {
    return containing
  }

  if (footnoteContaining !== null) {
    return footnoteContaining
  }

  let preceding: SourceBlock | null = null

  for (const block of blocks) {
    if (block.isFootnote || block.endLine >= line) {
      continue
    }

    if (
      preceding === null ||
      block.endLine > preceding.endLine ||
      (block.endLine === preceding.endLine && isMoreSpecific(block, preceding))
    ) {
      preceding = block
    }
  }

  if (preceding !== null) {
    return preceding
  }

  return blocks.find((block) => !block.isFootnote) ?? null
}
```

`[Inferencia]` El recorrido es O(n) sobre los bloques anotados. Para documentos normales es despreciable; si un documento enorme muestra problemas, se pueden cachear los bloques mientras `markdown` no cambie.

### 5.5 Matemática de scroll

```ts
export function computeTopSpacer(
  viewportHeight: number,
  firstTop: number,
  firstHeight: number
): number {
  return Math.max(0, viewportHeight / 2 - firstTop - firstHeight / 2)
}

export function computeBottomSpacer(
  viewportHeight: number,
  articleHeight: number,
  lastTop: number
): number {
  return Math.max(0, viewportHeight - (articleHeight - lastTop))
}

export function centerScrollTop(
  blockTop: number,
  blockHeight: number,
  viewportHeight: number,
  maxScroll: number
): number {
  const target = blockTop + blockHeight / 2 - viewportHeight / 2
  return Math.min(Math.max(target, 0), Math.max(0, maxScroll))
}
```

### 5.6 Componente de sincronización

`src/renderer/src/workspace/MarkdownPreview/PreviewCursorSync.tsx`:

```tsx
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { usePreviewLine } from '../../state/status-store'
import {
  centerScrollTop,
  computeBottomSpacer,
  computeTopSpacer,
  findBlockForLine,
  readSourceBlocks
} from './preview-sync'

type PreviewCursorSyncProps = {
  markdown: string
  containerRef: RefObject<HTMLElement | null>
  articleRef: RefObject<HTMLElement | null>
  topSpacerRef: RefObject<HTMLDivElement | null>
  bottomSpacerRef: RefObject<HTMLDivElement | null>
}

type SyncArgs = {
  container: HTMLElement
  article: HTMLElement
  topSpacer: HTMLDivElement
  bottomSpacer: HTMLDivElement
}

function syncPreview({ container, article, topSpacer, bottomSpacer, line }: SyncArgs & { line: number | null }): void {
  const viewportHeight = container.clientHeight

  // jsdom and hidden panes have no layout; nothing to measure.
  if (viewportHeight === 0) {
    return
  }

  const blocks = readSourceBlocks(article)

  if (blocks.length === 0) {
    topSpacer.style.height = '0px'
    bottomSpacer.style.height = '0px'
    return
  }

  const first = blocks[0]
  const last = blocks[blocks.length - 1]
  const articleRect = article.getBoundingClientRect()
  const firstRect = first.element.getBoundingClientRect()
  const lastRect = last.element.getBoundingClientRect()
  const previousTopHeight = topSpacer.getBoundingClientRect().height

  const topHeight = computeTopSpacer(
    viewportHeight,
    firstRect.top - articleRect.top,
    firstRect.height
  )
  const bottomHeight = computeBottomSpacer(
    viewportHeight,
    articleRect.height,
    lastRect.top - articleRect.top
  )

  topSpacer.style.height = `${topHeight}px`
  bottomSpacer.style.height = `${bottomHeight}px`

  if (line === null) {
    // No keyboard line: keep the article visually stable while the
    // spacers change.
    container.scrollTop += topHeight - previousTopHeight
    return
  }

  const block = findBlockForLine(blocks, line)
  if (block === null) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const blockRect = block.element.getBoundingClientRect()
  const blockTop =
    blockRect.top -
    (containerRect.top + container.clientTop) +
    container.scrollTop
  const maxScroll = container.scrollHeight - container.clientHeight

  container.scrollTop = centerScrollTop(
    blockTop,
    blockRect.height,
    viewportHeight,
    maxScroll
  )
}

export function PreviewCursorSync({
  markdown,
  containerRef,
  articleRef,
  topSpacerRef,
  bottomSpacerRef
}: PreviewCursorSyncProps): null {
  const line = usePreviewLine()

  const sync = useCallback(() => {
    const container = containerRef.current
    const article = articleRef.current
    const topSpacer = topSpacerRef.current
    const bottomSpacer = bottomSpacerRef.current

    if (
      container === null ||
      article === null ||
      topSpacer === null ||
      bottomSpacer === null
    ) {
      return
    }

    syncPreview({ container, article, topSpacer, bottomSpacer, line })
  }, [containerRef, articleRef, topSpacerRef, bottomSpacerRef, line])

  const syncRef = useRef(sync)

  useLayoutEffect(() => {
    syncRef.current = sync
    sync()
  }, [sync, markdown])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const container = containerRef.current
    const article = articleRef.current

    if (container === null || article === null) {
      return
    }

    const observer = new ResizeObserver(() => syncRef.current())
    observer.observe(container)
    observer.observe(article)

    return () => observer.disconnect()
  }, [containerRef, articleRef])

  return null
}
```

Detalles deliberados:

- `markdown` está en las dependencias del efecto aunque no se use dentro: es la señal de que el DOM del preview acaba de cambiar y hay que medir de nuevo. `[Inferencia]`
- `syncRef` mantiene el observer estable: no se recrea en cada tecla. El observer llama siempre a la última versión de `sync`. `[Inferencia]`
- El early return por `clientHeight === 0` es obligatorio para jsdom y para el preview oculto. `[Hecho]` por el entorno de tests.
- Los espaciadores no llevan un `style` por props: son `div` vacíos que miden 0 por defecto y el efecto escribe su altura. Así se evita que React y las escrituras imperativas compitan por la misma propiedad. `[Inferencia]`

### 5.7 `MarkdownPreview` y `EditorPreviewLayout`

```tsx
export function MarkdownPreview({ markdown }: { markdown: string }): JSX.Element {
  const containerRef = useRef<HTMLElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const topSpacerRef = useRef<HTMLDivElement>(null)
  const bottomSpacerRef = useRef<HTMLDivElement>(null)

  return (
    <section
      ref={containerRef}
      aria-label="Preview"
      className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] [scroll-behavior:auto]"
    >
      <div ref={topSpacerRef} aria-hidden="true" />
      <article ref={articleRef} className="mx-auto max-w-[560px] p-8 select-text">
        <ReactMarkdown remarkPlugins={PLUGINS} components={COMPONENTS}>
          {markdown}
        </ReactMarkdown>
      </article>
      <div ref={bottomSpacerRef} aria-hidden="true" />
      <PreviewCursorSync
        markdown={markdown}
        containerRef={containerRef}
        articleRef={articleRef}
        topSpacerRef={topSpacerRef}
        bottomSpacerRef={bottomSpacerRef}
      />
    </section>
  )
}
```

`EditorPreviewLayout` elimina el wrapper y deja el preview como flex child:

```tsx
{showsPreview ? <MarkdownPreview markdown={markdown} /> : null}
```

`[Inferencia]` El `article` conserva `p-8`: el padding superior e inferior entra en `F`, `A` y `L`, y las fórmulas lo contabilizan. No hace falta eliminarlo ni sustituirlo por padding dinámico.

### 5.8 `TextEditor`

```tsx
import type { EditorCursor } from '../../state/status-store'
import { cursorOrigin } from './cursor-origin'

type TextEditorProps = {
  value: string
  onChange: (value: string) => void
  onCursorChange: (cursor: EditorCursor) => void
  onCreate: (view: EditorView) => void
}

// ...

onUpdate={(update) => {
  const origin = cursorOrigin(update)
  if (origin === null) {
    return
  }

  const head = update.state.selection.main.head
  const line = update.state.doc.lineAt(head)

  onCursorChange({ line: line.number, column: head - line.from + 1, origin })
}}
```

---

## 6. Casos límite y comportamiento esperado

| Caso | Comportamiento recomendado | Fundamento |
| --- | --- | --- |
| Documento vacío | Sin bloques; espaciadores a 0; no se toca `scrollTop` | `readSourceBlocks` devuelve `[]` |
| Cursor en la línea 1 | Centra el primer bloque; con la fórmula de `T`, `scrollTop = 0` | Derivación de `T` |
| Línea en blanco entre bloques | Fallback al bloque anterior, no al siguiente | `endLine < line` |
| Línea en blanco antes del primer bloque | Primer bloque no-footnote | Fallback final |
| Lista | Se centra el `li` correspondiente, no el `ul` completo | Mayor profundidad |
| Blockquote | Se centra el `p` interno | Mayor profundidad |
| Tabla, línea de cabecera/datos | Se centra la `tr` correspondiente | `tr` más profundo |
| Tabla, línea del separador | Se centra la tabla completa | Único bloque que cubre esa línea |
| Bloque de código | Se centra el `pre` completo | `code` no se anota |
| Imagen | Se centra el `p` que la contiene | `img` inline |
| Footnote, línea de definición | Se permite la coincidencia exacta | `li`/`p` conservan la línea |
| Footnote, línea posterior | No se salta al pie; fallback al cuerpo principal | Footnotes excluidas del fallback |
| Bloque más alto que el viewport | Se centra el bloque; la línea exacta puede quedar fuera | Limitación estructural |
| Clic de mouse | No recentra; el status bar sí actualiza `Ln`/`Col` | `origin: 'pointer'` |
| Flechas, Shift+flechas, PageDown | Recentra | `userEvent: 'select'` → `keyboard` |
| Escribir, pegar, undo/redo, toolbar | Recentra | `docChanged` → `keyboard` |
| IME/composición | `[Decisión abierta]`: posponer hasta `compositionend` | Evitar saltos por cada actualización de composición |
| Imagen/fuente que carga tarde | `ResizeObserver` re-mide y recentra | Altura del `article` cambia |
| Resize del panel | `ResizeObserver` re-mide y recentra | `clientHeight` cambia |
| Preview oculto (`edit`) | Se desmonta; al volver se monta y lee el cursor actual | `EPL:18-20`, `EPL:36-40` |
| StrictMode | Efecto idempotente; observer con cleanup | `main.tsx:25-29` |
| Documento muy grande | O(n) por actualización; cachear si hace falta | `readSourceBlocks` |

---

## 7. Pruebas y criterios de aceptación

### 7.1 Unit tests puros

`src/renderer/src/workspace/MarkdownPreview/preview-sync.test.ts`:

- `findBlockForLine`:
  - línea 8: `ul` 6-8 vs `li` 7-8 → `li`.
  - línea 10: `blockquote` 10-10 vs `p` 10-10 → `p`.
  - línea 16: `table` 16-18 vs `tr` 16-16 → `tr`.
  - línea 17: solo `table` 16-18 → `table`.
  - línea 26: footnote `li`/`p` → `p` (coincidencia exacta permitida).
  - línea 27: cuerpo principal 24 vs footnote 26 → cuerpo 24 (footnote excluida del fallback).
  - línea 1 antes del primer bloque → primer bloque no-footnote.
  - sin bloques → `null`.
- `computeTopSpacer`:
  - `(500, 32, 40) -> 198`.
  - `(500, 400, 300) -> 0` (bloque alto; clamp).
- `computeBottomSpacer`:
  - `(500, 1000, 950) -> 450`.
  - `(500, 1000, 400) -> 0` (clamp).
- `centerScrollTop`:
  - centro exacto, clamp inferior y superior.
- Invariante de rango:
  - con `B` positivo, `T + A + B - H === T + L`, y el top del último bloque en el máximo es 0.
  - con `B = 0` y `A - L > H`, `T + L` sigue siendo un `scrollTop` alcanzable.

`src/renderer/src/editor/TextEditor/cursor-origin.test.ts`:

- update sin `docChanged` ni `selectionSet` → `null`.
- `docChanged` → `keyboard`.
- `selectionSet` con `select` → `keyboard`.
- `selectionSet` con `select.pointer` → `pointer`.
- `docChanged` + `select.pointer` → `keyboard` (la escritura manda).

`src/renderer/src/state/status-store.test.ts`:

- `selectPreviewLine`: cursor keyboard → línea; cursor pointer → `null`; cursor `null` → `null`.
- Contar renders de un componente con `usePreviewLine`: publicar la misma línea dos veces no debe re-renderizar; publicar otra línea sí. `[Inferencia]` React compara con `Object.is` (`https://react.dev/reference/react/useSyncExternalStore`).

### 7.2 Integración en Jest (sin layout)

- Renderizar `MarkdownPreview` con el Markdown de `AT:672` y comprobar que el `h1` tiene `data-source-start-line="1"` y `data-source-end-line="1"`.
- Comprobar que el wrapper de la tabla y la `tr` tienen atributos; que el `p` los tiene; que `strong`/`del` no.
- Comprobar que el documento con footnotes anota `li`/`p` de la definición y no el `section`.
- Comprobar que no explota en jsdom (`clientHeight = 0`, sin `ResizeObserver`).
- Mantener los tests existentes de `AT:684-747` sin cambios.

No añadir tests de layout a Jest: `AGENTS.md:62-63` y `setup.ts:4-29` lo desaconsejan explícitamente.

### 7.3 Verificación headless / Electron

Reutilizar el patrón del precedente `.scratch/editor-linebreaks-scroll/spec.md:43-44,59-69`: build de producción y harness headless (Chromium/Electron) con un artículo largo que incluya título, párrafos, lista, blockquote, código, tabla, imagen, `hr` y footnotes.

Mediciones mínimas:

1. **Centrado:** con el cursor en una línea de un bloque corto, `blockRect.top + blockRect.height/2` debe estar a ±2 px del centro del `clientRect` del scroller.
2. **Primer bloque:** cursor en línea 1; `scrollTop === 0` y centro del primer bloque en `H/2` (si cabe).
3. **Último bloque:** llevar el cursor al último bloque; comprobar que se puede hacer `scrollTop = T + L` y que el top del último bloque queda a ±2 px de 0.
4. **Espacio finito:** en el máximo scroll, `scrollHeight - clientHeight` es finito y el hueco bajo el último bloque es aproximadamente `H - hLast`.
5. **Workspace:** `Workspace.scrollTop === 0` y el panel de Story no se mueve.
6. **Puntero:** clic en otra línea; el `scrollTop` del preview no cambia (el status bar sí).
7. **Teclado:** `ArrowDown`/`PageDown` cambian el bloque y recentran.
8. **Resize:** cambiar el ancho/alto del panel; el bloque del cursor vuelve al centro.
9. **Tabla/código:** con overflow horizontal, el scroll vertical del preview sigue funcionando y no se mueve el wrapper interno.
10. **Sin warnings:** no debe aparecer el error de bucle de `ResizeObserver` en consola.

Tolerancia: ±2 px por subpíxeles y redondeo de `scrollHeight`/`clientHeight` (`https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight`).

### 7.4 Comandos

```bash
pnpm test -- src/renderer/src/workspace/MarkdownPreview
pnpm test -- src/renderer/src/editor/TextEditor
pnpm test -- src/renderer/src/state/status-store.test.ts
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Los tests existentes son contrato y no deben modificarse para hacer pasar la implementación (`AGENTS.md:60-63`).

---

## 8. Alternativas y trade-offs

| Alternativa | Ventajas | Inconvenientes | Veredicto |
| --- | --- | --- | --- |
| **Bloques anotados + espaciadores + `scrollTop`** (recomendada) | Precisión por bloque; sin dependencias; control total del scroller; espacio finito | Requiere medir en layout effect; limitación en bloques altos | **Sí** |
| `scrollIntoView({ block: 'center' })` | Muy simple | Desplaza ancestros; `container` por defecto `all`; scrollers anidados; no crea espacio inferior | No |
| `scrollIntoView({ container: 'nearest' })` | Menos ancestros | Puede detenerse en el wrapper de tabla/`pre`; no resuelve el espacio finito | No |
| Mapeo proporcional por número de línea | Sin DOM; barato | Ignora alturas reales (títulos, imágenes, tablas, código); impreciso | No |
| Padding CSS fijo (`50vh`/`100vh`) | Sin JS | Siempre desperdicia viewport; el fondo no se adapta a `hLast`; no permite centrar el primero y el último con el mismo valor | No |
| Mapear la línea exacta con rangos de texto | Precisión real dentro del párrafo | Requiere plugin/offsets y manejar wrapping; mucho más complejo | Futuro |
| Suscribir `MarkdownPreview` o `EditorPreviewLayout` y pasar `line` por props | Flujo de datos más directo | Cada flecha re-renderiza y re-parsea el Markdown; peor rendimiento | No |
| `React.memo(MarkdownPreview)` | Evita re-parsear en renders de estado de guardado | No resuelve el cursor por sí solo; optimización complementaria | Opcional |
| Virtualizar el preview | Rendimiento en documentos enormes | Complejidad alta; rompe búsqueda/selección nativas | No para este alcance |

---

## 9. Riesgos y mitigaciones

1. **Carrera entre el commit del Markdown y la publicación del cursor.** `onChange` corre antes que `onUpdate` (`UCM:64-99`), pero React puede batchear el `setState` y la notificación del store. `[Inferencia]` Si el efecto mide el DOM viejo, el cambio de `markdown` vuelve a disparar el efecto en el commit siguiente y corrige. Mitigación: incluir `markdown` en las dependencias y verificar en Electron con escritura rápida.
2. **Bloques más altos que el viewport.** El cursor puede quedar fuera del bloque centrado. Mitigación: aceptarlo como límite de bloque; evaluar interpolación proporcional dentro del bloque en una segunda fase.
3. **Footnote al final.** Sin el filtro de fallback, el preview saltaría al pie. Mitigación: `isFootnote` + exclusión del fallback.
4. **Scrollbar/reflow.** La aparición de la scrollbar cambia el ancho y puede reflowear el artículo. Mitigación: `scrollbar-gutter: stable` y `ResizeObserver` sobre contenedor/artículo.
5. **Scroll anchoring.** Puede competir con el `scrollTop` calculado. Mitigación: `overflow-anchor: none`.
6. **Smooth scroll global.** Puede animar las asignaciones. Mitigación: `scroll-behavior: auto` en el scroller.
7. **IME.** Cada actualización de composición puede recentrar y producir jitter. Mitigación: `[Decisión abierta]` posponer mientras `view.composing`.
8. **StrictMode.** Doble setup de efectos. Mitigación: sincronización idempotente y cleanup del observer.
9. **Rendimiento en documentos grandes.** `readSourceBlocks` recorre todos los bloques en cada tecla. Mitigación: cachear por `markdown` si el profiling lo justifica; medir primero.
10. **Accesibilidad.** Los espaciadores son `aria-hidden` y no contienen texto; no alteran el árbol accesible del artículo. `[Inferencia]`

---

## 10. Decisiones abiertas

1. `[Decisión abierta]` **Centrado estricto vs banda de tolerancia.** ¿Se recentra siempre que cambia de bloque, o solo si el bloque sale de una banda central (p. ej. ±20% de `H`)? La banda reduce movimiento, pero puede dejar el cursor fuera del centro. Recomendación provisional: centrado estricto por bloque; ajustar tras probarlo.
2. `[Decisión abierta]` **Teclado solamente vs cualquier movimiento.** La propuesta sigue solo `keyboard`; un clic de mouse no mueve el preview. ¿El writer espera que el clic también sincronice? Recomendación provisional: teclado solamente, porque el clic suele ser para inspeccionar otra zona sin perder el foco de escritura.
3. `[Decisión abierta]` **Granularidad bloque vs proporcional.** Un `p` de 10 líneas se centra como bloque. ¿Hace falta interpolar dentro del bloque? Recomendación provisional: bloque ahora; medir la insatisfacción real antes de añadir complejidad.
4. `[Decisión abierta]` **Documentos cortos.** Los espaciadores añaden espacio superior e inferior aunque el documento quepa en el viewport. ¿Se quiere ese efecto typewriter siempre, o solo cuando el contenido desborda? Recomendación provisional: siempre mientras el seguimiento esté activo.
5. `[Decisión abierta]` **Siempre activo vs toggle.** ¿Debe poder desactivarse el seguimiento? No hay UI de preferencias hoy. Recomendación provisional: siempre activo; el selector `selectPreviewLine` es el punto único para añadir un toggle después.
6. `[Decisión abierta]` **Instantáneo vs suave.** `scroll-behavior: auto` evita lag; un desplazamiento suave podría ser más agradable pero compite con la escritura rápida. Recomendación provisional: instantáneo.
7. `[Decisión abierta]` **Pausa tras scroll manual.** Si el writer hace wheel y luego escribe, el preview vuelve al cursor. ¿Debe pausarse el seguimiento unos segundos tras un scroll manual? Recomendación provisional: no; el recentrado solo ocurre en eventos de cursor.
8. `[Decisión abierta]` **IME.** ¿Se ignora el cursor durante `compositionstart`/`compositionend`? Recomendación provisional: sí, posponer el centrado hasta que termine la composición.
9. `[Decisión abierta]` **Footnotes.** Se permite la coincidencia exacta. ¿O se prefiere no seguirlas nunca? Recomendación provisional: permitir la exacta, para poder editar la definición y verla.
10. `[Decisión abierta]` **Montaje inicial.** Hoy el cursor es `null` hasta el primer update; el preview no centra al abrir. ¿Se debe publicar un cursor inicial en `onCreateEditor` para centrar la línea 1 al abrir? Recomendación provisional: no, para evitar un salto de espacio en blanco antes de que el writer interactúe.
11. `[Decisión abierta]` **Cambio a modo preview.** Si el último origen fue `pointer`, al montar el preview no centra. ¿Debe forzar el centrado al entrar en `preview`? Recomendación provisional: respetar el origen; si el writer quiere centrar, una flecha o una tecla lo hace.
12. `[Decisión abierta]` **Resize.** `ResizeObserver` recentra si hay línea de teclado; si el writer había hecho scroll manual, el resize lo devuelve al cursor. ¿Es aceptable? Recomendación provisional: sí; es coherente con el modo seguimiento.

---

## 11. Veredicto de viabilidad

**Viable con complejidad media.** `[Inferencia]`

- **Técnicamente:** todas las piezas existen y están verificadas: posiciones de bloque en `react-markdown`, distinción teclado/puntero en CodeMirror, medición con `getBoundingClientRect`/`clientHeight`, escritura de `scrollTop` y `ResizeObserver`.
- **Arquitectónicamente:** el cambio queda confinado al renderer y respeta la regla de dependencias del proyecto; no toca IPC, preload, main, SQLite ni migraciones.
- **De producto:** cumple el centrado por bloque y el scroll libre finito. La calidad percibida depende de aceptar que un bloque alto no puede mostrar la línea exacta; esa es la decisión de producto más importante.
- **De verificación:** jsdom no sirve para el layout; hay que cerrar con un harness headless o la app Electron. El precedente del proyecto ya usa ese camino (`spec.md:43-44,59-69`).

La recomendación es implementar primero la versión por bloque, con el selector de teclado y los espaciadores, y medir en Electron antes de añadir interpolación dentro del bloque o un toggle de seguimiento.

---

## Sources

### Código de la aplicación (rutas y líneas exactas)

- `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx:9-73` — `COMPONENTS`; `:75-85` — componente, sección y artículo.
- `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx:18-20` — modos; `:25-41` — layout flex; `:36-40` — wrapper con `overflow-y-auto`.
- `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:76` — `useEditorStatus`; `:116-127` — cableado de `TextEditor` y `EditorPreviewLayout`.
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:66` — `useEditorStatus`; `:98-109` — cableado.
- `src/renderer/src/editor/TextEditor/TextEditor.tsx:7-10` — `EditorCursor`; `:34-38` — publicación de línea/columna.
- `src/renderer/src/state/status-store.ts:5-11` — `EditorStatus`; `:21-34` — snapshot y notificación; `:64-70` — `useSyncExternalStore`.
- `src/renderer/src/state/use-editor-status.ts:10-12` — `publishCursor`; `:60-62` — implementación.
- `src/renderer/src/shell/StatusBar/StatusBar.tsx:16-17` — lectura del estado; `:63-74` — `Ln`/`Col`.
- `src/renderer/src/workspace/Workspace/Workspace.tsx:42`, `:57`, `:84` — `overflow-hidden`.
- `src/renderer/src/App.test.tsx:555-577` — helpers de CodeMirror; `:635-643` — test de cursor; `:684-747` — tests de preview.
- `src/renderer/src/test/setup.ts:4-29` — shim de `Range`; jsdom sin layout.
- `jest.config.js:24-35` — proyecto renderer en jsdom.
- `AGENTS.md:60-63` — tests como contrato y prohibición de tests de layout en jsdom.
- `src/renderer/src/main.tsx:25-29` — `StrictMode`.
- `.scratch/editor-linebreaks-scroll/spec.md:24-35` — causa raíz del scroll del workspace; `:43-44` — verificación headless; `:59-69` — métricas del harness.

### Dependencias instaladas (rutas y líneas exactas)

- `node_modules/react-markdown/lib/index.js:175-180` — parseo dentro del render; `:348-356` — `passNode: true`.
- `node_modules/react-markdown/readme.md:292-293` — `ExtraProps.node`; `:724-727` — cada componente recibe `node`.
- `node_modules/.pnpm/hast-util-to-jsx-runtime@2.3.6_supports-color@7.2.0/node_modules/hast-util-to-jsx-runtime/lib/index.js:339-341` — `props.node` solo para componentes custom.
- `node_modules/.pnpm/mdast-util-to-hast@13.2.1/node_modules/mdast-util-to-hast/lib/state.js:326-338` — copia de `position` de mdast a hast.
- `node_modules/.pnpm/mdast-util-newline-to-break@2.0.0/node_modules/mdast-util-newline-to-break/lib/index.js:16-27` — `break` sin `position`.
- `node_modules/.pnpm/@uiw+react-codemirror@4.25.12_@babel+runtime@7.29.10_@codemirror+autocomplete@6.20.3_@c_af6d6fd85eac2abaeccbbbfe81fa1367/node_modules/@uiw/react-codemirror/esm/useCodeMirror.js:64-84` — listener de `onChange`; `:97-99` — listener de `onUpdate`.
- `node_modules/@codemirror/view/dist/index.js:4854-4861` — `userEvent: "select.pointer"`.
- `node_modules/.pnpm/@codemirror+commands@6.11.1/node_modules/@codemirror/commands/dist/index.js:581` — `userEvent: "select"`.
- `node_modules/@codemirror/view/dist/index.d.ts:597` — `docChanged`; `:601` — `selectionSet`; `:1129` — `EditorView.scrollIntoView`; `:1274` — `updateListener`.
- `node_modules/@codemirror/state/dist/index.d.ts:989` — `Transaction.isUserEvent`.
- `package.json:31-32` — `@codemirror/state` y `@codemirror/view`; `:39` — `@uiw/react-codemirror`; `:46-48` — `react-markdown`, `remark-breaks`, `remark-gfm`; `:67` — `electron`.

Versiones resueltas: `react-markdown@10.1.0`, `remark-gfm@4.0.1`, `remark-breaks@4.0.0`, `@uiw/react-codemirror@4.25.12`, `@codemirror/view@6.43.14`, `@codemirror/state@6.7.6`, `mdast-util-to-hast@13.2.1`, `hast-util-to-jsx-runtime@2.3.6`; Electron `44.9.0` con Chromium `152.0.7977.167` (medido con `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron -p "process.versions.electron + ' / Chromium ' + process.versions.chrome"`).

### Documentación oficial

- react-markdown, componentes y `node`: https://github.com/remarkjs/react-markdown#components
- mdast, `position`: https://github.com/syntax-tree/mdast#position
- hast, `position`: https://github.com/syntax-tree/hast#position
- MDN, `Element.scrollIntoView()` (incluye `container: all` por defecto): https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- MDN, `Element.scrollTop`: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop
- MDN, `Element.scrollHeight`: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight
- MDN, `Element.clientHeight`: https://developer.mozilla.org/en-US/docs/Web/API/Element/clientHeight
- MDN, `Element.getBoundingClientRect()`: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
- MDN, `overflow-anchor`: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor
- MDN, `overscroll-behavior`: https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior
- MDN, `ResizeObserver`: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
- MDN, `padding` (porcentajes contra el ancho): https://developer.mozilla.org/en-US/docs/Web/CSS/padding
- CSSOM View Module: https://drafts.csswg.org/cssom-view/
- React, `useLayoutEffect`: https://react.dev/reference/react/useLayoutEffect
- React, `useSyncExternalStore`: https://react.dev/reference/react/useSyncExternalStore
- CodeMirror, `Transaction.userEvent`: https://codemirror.net/docs/ref/#state.Transaction.userEvent
- CodeMirror, `Transaction.isUserEvent`: https://codemirror.net/docs/ref/#state.Transaction^isUserEvent
- CodeMirror, `ViewUpdate.docChanged`: https://codemirror.net/docs/ref/#view.ViewUpdate.docChanged
- CodeMirror, `ViewUpdate.selectionSet`: https://codemirror.net/docs/ref/#view.ViewUpdate.selectionSet
- CodeMirror, `EditorView.updateListener`: https://codemirror.net/docs/ref/#view.EditorView^updateListener
- CodeMirror, `EditorView.scrollIntoView`: https://codemirror.net/docs/ref/#view.EditorView^scrollIntoView

### Medición propia (descartable, fuera del repo)

- `/tmp/opencode/caret-source-probe.mjs` — sonda SSR de posiciones por bloque. Reproducir con `node /tmp/opencode/caret-source-probe.mjs`.
- `/tmp/opencode/footnote-probe.mjs` — sonda de posiciones de footnotes.
- `/tmp/opencode/footnote-h2-probe.mjs` — sonda del `h2` de footnotes sin `position`.
- `/tmp/opencode/tsx-check/check.tsx` — prueba de tipos para esparcir `data-*` con un tipo concreto.
- Estas sondas no forman parte del repositorio ni de la suite de tests; son evidencia reproducible de la investigación, no documentación oficial.
