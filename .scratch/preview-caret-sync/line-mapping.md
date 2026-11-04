# Mapeo por línea de origen: anotar el hast para seguir el caret línea a línea

**Estado:** investigación de solo lectura sobre el repo. No se modificaron código de producción, tests, `package.json` ni historial de git. Los artefactos creados son este informe y las sondas descartables de `$COMMANDCODE_SCRATCHPAD/` (fuera del repo).

**Fecha:** 2026-10-24.

**Feature:** `preview-caret-sync` (tercera iteración). Continúa `.scratch/preview-caret-sync/research.md` (`PREV` en adelante) y `.scratch/preview-caret-sync/pointer-sync.md` (`PS`). No reabre sus decisiones.

**Alcance:** pipeline de Markdown del renderer (`MarkdownPreview`, plugins de remark/rehype, componentes custom). Sin cambios en IPC, preload, `src/main`, SQLite, migraciones ni dependencias.

---

## Convenciones de cita

| Alias | Ruta |
| --- | --- |
| `MP` | `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx` |
| `EPL` | `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx` |
| `TE` | `src/renderer/src/editor/TextEditor/TextEditor.tsx` |
| `SS` | `src/renderer/src/state/status-store.ts` |
| `UES` | `src/renderer/src/state/use-editor-status.ts` |
| `AT` | `src/renderer/src/App.test.tsx` |
| `RM` | `node_modules/react-markdown/lib/index.js` |
| `RMR` | `node_modules/react-markdown/readme.md` |
| `HJR` | `node_modules/.pnpm/hast-util-to-jsx-runtime@2.3.6_supports-color@7.2.0/node_modules/hast-util-to-jsx-runtime/lib/index.js` |
| `MTH` | `node_modules/.pnpm/mdast-util-to-hast@13.2.1/node_modules/mdast-util-to-hast/lib/state.js` |
| `MTHH` | `node_modules/.pnpm/mdast-util-to-hast@13.2.1/node_modules/mdast-util-to-hast/lib/handlers/` |
| `MTHF` | `node_modules/.pnpm/mdast-util-to-hast@13.2.1/node_modules/mdast-util-to-hast/lib/footer.js` |
| `MNB` | `node_modules/.pnpm/mdast-util-newline-to-break@2.0.0/node_modules/mdast-util-newline-to-break/lib/index.js` |
| `RB` | `node_modules/remark-breaks/lib/index.js` |
| `RG` | `node_modules/remark-gfm/lib/index.js` |
| `MFAR` | `node_modules/.pnpm/mdast-util-find-and-replace@3.0.3/node_modules/mdast-util-find-and-replace/lib/index.js` |
| `PI` | `node_modules/.pnpm/property-information@7.2.0/node_modules/property-information/lib/find.js` |
| `TL` | `node_modules/.pnpm/trim-lines@3.0.1/node_modules/trim-lines/index.js` |
| `TLD` | `node_modules/.pnpm/@testing-library+dom@10.4.2/node_modules/@testing-library/dom/dist/get-node-text.js` |
| `PREV` | `.scratch/preview-caret-sync/research.md` |
| `PS` | `.scratch/preview-caret-sync/pointer-sync.md` |

Etiquetas: `[Hecho]` verificado en código instalado, documentación oficial o sonda reproducible; `[Inferencia]` consecuencia razonada; `[Decisión abierta]` requiere elección de producto o verificación posterior.

Versiones resueltas: `react-markdown@10.1.0`, `remark-gfm@4.0.1`, `remark-breaks@4.0.0`, `mdast-util-to-hast@13.2.1`, `mdast-util-find-and-replace@3.0.3`, `mdast-util-newline-to-break@2.0.0`, `hast-util-to-jsx-runtime@2.3.6`, `property-information@7.2.0`, `trim-lines@3.0.1`, React 19.3.1, Chromium 150.0.7871.100 (medido con la sonda de layout).

Sondas (todas descartables, en `$COMMANDCODE_SCRATCHPAD`):

| Sonda | Qué mide |
| --- | --- |
| `probe/10-pipeline.mjs` | árbol mdast antes/después de `remark-breaks`, hast actual, hast anotado, HTML final, paridad byte a byte, inventario de líneas anotadas |
| `probe/11-layout.mjs` + `harness/drive-lines.mjs` | geometría real en Chromium headless: rect de cada marcador, filas visuales de cada línea, bloques de código, tablas, línea reflowada |
| `probe/12-parity-bench.mjs` | paridad en 27 constructos delicados y coste de la anotación |
| `probe/13-jsdom-textquery.mjs` | paridad de `getByText` (`@testing-library/dom`) entre el HTML actual y el anotado |

---

## 1. Objetivo y decisiones ya fijadas

El preview Markdown debe seguir el caret de CodeMirror **por línea de origen**, no por bloque. Este informe decide **cómo producir y medir** un objetivo DOM por línea de origen en el pipeline actual, no *cuándo* seguirlo (`PS`) ni *cómo* animar el desplazamiento.

Decisiones que este informe **no** reabre (vienen dadas):

1. El seguimiento es por línea de origen; cuando una línea reflowa en varias líneas visuales, se centra el *span* de esa línea de origen. Qué rect exacto es detalle de diseño y este informe lo fija (§6.4).
2. Se sigue al escribir, con flechas y con clic; en un arrastre se centra una sola vez al soltar (`PS` §4.5).
3. El último bloque debe poder llegar al borde superior del viewport, con espacio en blanco finito debajo (`PREV` §4.4).
4. Animación suave solo en saltos grandes (~150 ms ease-out, cancelable/retargetable); `prefers-reduced-motion` es instantáneo.
5. Siempre activo, sin toggle. Aplica a Story y Article (ambos usan `MP` vía `EPL`).
6. Sin dependencias nuevas.

Restricciones heredadas que condicionan el diseño:

- `[Hecho]` `usePreviewLine()` devuelve **solo la línea** y un cambio solo de columna **no** debe re-renderizar el preview (`PS` §7.1, §7.5). Por eso el algoritmo de rect no puede depender de la columna (§6.4).
- `[Hecho]` `PreviewCursorSync` es un hijo que devuelve `null` y ejecuta el efecto de layout (`PREV` §4.5). La medición sigue siendo suya; lo que cambia es la capa de anotación.
- `[Hecho]` Los tests existentes son contrato y no se modifican (`AGENTS.md:60-65`). `AT:694-702` y `AT:737-747` consultan `getByText('sturdy')` / `getByText('world')` y comparan `tagName` con `STRONG` (§5.5).

---

## 2. Resumen ejecutivo

- **Veredicto: viable**, con precisión **exacta por línea de origen** (la fila visual donde empieza cada línea del Markdown) y **sin precisión por columna**. La precisión por columna no es alcanzable sin un mapeo sintaxis→texto renderizado, y no hace falta para el requisito acordado.
- `[Hecho]` Tras `mdast-util-to-hast`, **los nodos de texto de hast sí llevan `position`** con línea y offset (`MTHH/text.js:19-23` + `MTH:336-338`), pero con tres excepciones: los `\n` estructurales que inserta `wrap` (`MTH:437-456`), el texto interno de los bloques de código (`MTHH/code.js:31-36`) y **cualquier texto que haya tocado `remark-breaks`** (`MFAR:157-197` reconstruye los nodos sin `position`).
- `[Hecho]` Por eso, en el pipeline actual, **76 de 101 nodos de texto de hast no tienen `position`** (sonda 10, caso C). La conclusión de `PREV` §2.3/2.4 («no se puede mapear la línea») es correcta *para los nodos de texto resultantes*, y no aplica a una capa de anotación construida antes de `remark-breaks`.
- `[Hecho]` Un **plugin de remark colocado antes de `remark-breaks`** puede partir cada nodo de texto en sus líneas (conservando las posiciones, calculadas del nodo original), emitir los `break` que emitiría `remark-breaks`, e insertar **marcadores vacíos** `<span data-source-line="N"></span>` al inicio de cada línea de origen. Un **plugin de rehype** hace lo mismo con el texto de `pre > code` (§6.1, §6.2).
- `[Hecho]` El HTML resultante, **quitando los marcadores, es byte a byte idéntico al actual** en un documento con 17 constructos y en 27 casos delicados, con **0 warnings de React** (sondas 10 y 12). Los marcadores vacíos no alteran `textContent` ni las consultas de `@testing-library` (sonda 13).
- `[Hecho]` Medido en Chromium: **cada línea de origen empieza una fila visual nueva** (la distancia entre marcadores consecutivos es exactamente el `line-height` local: 22,8 px en `p`, 19,5 px en `code`, 23 px en una fila de tabla). Y el rect del marcador vacío es utilizable: `width: 0`, `height` = caja de línea, `y` = borde superior de la fila.
- `[Hecho]` Coste: **+5 a +6 ms de mediana (+8 a +9 %)** sobre un render de ~70 ms y **+55 % de bytes de HTML** en un documento de 1041 líneas / 4240 palabras, con 600 marcadores. El render completo de react-markdown ya cuesta ~70 ms por cambio de Markdown; la anotación no es el cuello de botella.
- **Riesgo principal:** la invariante «una línea de origen = una fila visual» se rompe cuando un elemento inline contiene un salto de línea que no se renderiza como `<br>` (típicamente `` `código\ninline` ``, que colapsa el salto a un espacio). Está medido y tiene un fallback determinista (§7).

---

## 3. Punto de partida del pipeline

`[Hecho]` `react-markdown@10.1.0` construye el processor así:

```js
unified().use(remarkParse).use(remarkPlugins).use(remarkRehype, {allowDangerousHtml: true}).use(rehypePlugins)
```

(`RM:262-276`), ejecuta `parse` + `runSync` dentro del render (`RM:175-179`) y convierte el hast a JSX con `toJsxRuntime(..., {passNode: true})` (`RM:348-356`). `rehypePlugins` está soportado y documentado (`RMR:328`); **no existe** una opción `sourcePos` en v10: es una deprecación que lanza (`RM:155-158`, `deprecations`).

`[Hecho]` `passNode` adjunta `props.node` solo cuando el tipo no es un tag string ni un Fragment, es decir solo a los componentes custom (`HJR:334-342`).

`[Hecho]` El estado actual del parser respecto a posiciones, medido (sonda 10):

| Caso | Nodos de texto | Con `position` | Sin `position` |
| --- | ---: | ---: | ---: |
| A. mdast antes de `remark-breaks` (`remark-gfm` solo) | 29 | **29** | 0 |
| B. mdast después de `remark-breaks` | 34 | 24 | **10** |
| C. hast actual (`remark-gfm` + `remark-breaks`) | 101 | 25 | **76** |
| D. hast con la anotación propuesta | 131 | 35 | 96 |

En A los nodos multilínea existen y son la clave del diseño:

```text
paragraph 3:1-6:18
  text 3:1-4:18 "First paragraph line\nsecond line with …"
  strong 4:18-5:15
    text 4:20-5:13 "bold\nacross lines"
```

En B, en cambio:

```text
paragraph 3:1-6:18
  text NO-POSITION "First paragraph line"
  break NO-POSITION
  text NO-POSITION "second line with "
  strong 4:18-5:15
    text NO-POSITION "bold"
    break NO-POSITION
    text NO-POSITION "across lines"
```

`[Hecho]` La causa está en `mdast-util-find-and-replace`, que usa `remark-breaks` para sustituir `/\r?\n|\r/g` por `{type:'break'}` (`MNB:16-27`, `RB:14-25`): el reemplazo se hace troceando el nodo de texto y **creando nodos nuevos sin `position`** (`MFAR:157-197`, en particular `169`, `191`, `194`).

---

## 4. Respuestas a las preguntas planteadas

### 4.1 ¿Los nodos de texto de hast llevan `position`? (pregunta 1)

`[Hecho]` Sí, por defecto. El handler de texto crea `{type:'text', value: trimLines(value)}`, llama a `state.patch(node, result)` y devuelve `applyData` (`MTHH/text.js:19-23`). `patch` copia `from.position` a `to.position` (`MTH:336-338`). Las tres excepciones:

| Nodo de texto | ¿`position`? | Fuente |
| --- | --- | --- |
| Texto de un párrafo, encabezado, celda, `emphasis`, `strong`, `del`, `a` | Sí | `MTHH/text.js:22` |
| `"\n"` que `wrap()` inserta entre bloques y dentro de listas/celdas | **No** | `MTH:437-456` (`{type:'text', value:'\n'}`, sin patch) |
| `"\n"` que acompaña a un `br` | **No** | `MTHH/break.js:17-22` |
| Contenido de `pre > code` (un único texto con todo el bloque) | **No** | `MTHH/code.js:31-36` |
| Texto reescrito por `remark-breaks` | **No** | `MFAR:157-197` |
| Etiqueta `↩` de las notas al pie | **No** | `MTHF:79-93` |

`[Inferencia]` Un plugin de rehype que intente «partir los nodos de texto por `\n`» se encuentra con que, después de `remark-breaks`, **los nodos de texto ya no contienen `\n`** (el salto se convirtió en `<br>`): la única excepción es el contenido de `pre > code`. La sonda lo confirma: el hast actual (caso C) tiene 101 nodos de texto y solo 25 con `position`, y los `\n` que quedan son los estructurales de `wrap`.

### 4.2 ¿Se puede partir el texto y envolver cada línea en un `<span data-source-line>`? (pregunta 2)

`[Hecho]` Sí, y hay dos caminos; solo uno sirve en este pipeline.

**Camino A — rehype, partir por `\n` y envolver en spans.** Es un no-op para todo el contenido inline: tras `remark-breaks` no quedan `\n` en los nodos de texto (solo en `pre > code`). Para que funcione habría que partir por elementos `<br>` y deducir la línea por conteo (`línea del bloque + nº de <br>`), una heurística que se rompe con el código inline multilínea (medido en §7) y con los `br` que no vienen de un salto de línea de origen. Además, envolver texto en spans **cambia `getNodeText`** y rompe tests existentes (§5.5).

**Camino B — remark, antes de `remark-breaks`: partir el texto, emitir los `break` y anotar.** Funciona porque en ese punto todos los nodos de texto tienen `position` y los multilínea son visibles (caso A). Es el camino elegido.

`[Hecho]` El mecanismo para producir el `<span>` desde mdast es `data.hName` / `data.hProperties`, que `applyData` interpreta convirtiendo el nodo de texto en un elemento (`MTH:352-395`, en particular `362-377`). No hace falta pasar hast a mano ni usar `passThrough`.

`[Hecho]` `hast-util-to-jsx-runtime` conserva los atributos `data-*` y no avisa:

- `createProperty` resuelve el nombre con `property-information` (`HJR:586-620`): `find` reconoce `data-*`, calcula la propiedad React y el atributo HTML (`PI:43-77`), y como `info.space` es `undefined` para atributos de datos, devuelve `info.attribute`, es decir `data-source-line` tal cual.
- Salida real: `<span data-source-line="4"></span>`, y **0 warnings** capturados en las 27 pruebas de la sonda 12.
- El espacio en blanco sobrevive literalmente: la paridad byte a byte es `true` (§5.4).

`[Hecho]` Comparación medida de los dos caminos, en el documento de la sonda:

| | Camino A (rehype, spans) | Camino B (remark, marcadores) |
| --- | --- | --- |
| Sirve tras `remark-breaks` | No (no quedan `\n`) | Sí |
| Necesita heurística de conteo de `br` | Sí | No |
| Cambia el árbol de texto (y `getNodeText`) | Sí → rompe `AT:700`, `AT:744` | No (spans vacíos) |
| Permite partir un `strong` que cruza líneas | Sí, pero genera varios spans por línea | No hace falta: el marcador va dentro del `strong` |
| Coste de DOM | 1 span por nodo de texto | 1 span vacío por línea de origen |
| Paridad con el render actual | Sólo si no se altera el agrupamiento de texto | Byte a byte idéntica (medida) |

**Recomendación:** camino B (plugin de remark con marcadores) + un plugin de rehype pequeño para `pre > code` (§6.2), que es el único sitio donde el contenido no es un nodo de texto de mdast.

### 4.3 Nombres de atributo y forma del marcador

```html
<!-- marcador de línea: elemento vacío, sin texto, colocado al inicio de la línea -->
<span data-source-line="12"></span>

<!-- ancla de bloque (capa de respaldo, ver §6.3) -->
<h2 data-source-start-line="11" data-source-end-line="14">
```

`[Hecho]` Los dos nombres de atributo no colisionan en selectores CSS: `[data-source-line]` no matchea `data-source-start-line`.

`[Inferencia]` El marcador no necesita `aria-hidden`: un `span` vacío sin rol no aporta nada al árbol accesible, y añadir el atributo encarece cada marcador sin efecto. No se usa `display: none` ni `visibility: hidden` porque entonces no tendría rect.

### 4.4 Posiciones dentro de cada constructo (pregunta 3)

`[Hecho]` Salida real de la sonda 10 para el documento de prueba (las líneas del listado son las del Markdown):

```text
 1  # Heading *one*                          → marcador 1
 3  First paragraph line                     → marcador 3
 4  second line with **bold                  → marcador 4
 5  across lines** and `inline               → marcador 5, dentro del <strong>
 6  code` at the end.                        → marcador 6
 8  Setext heading                           → marcador 8
 9  ==============                           → sin marcador (el h1 cubre 8-9)
11  > Quote line one                         → marcador 11
12  > quote line two                         → marcador 12
14  - item one                               → marcador 14
15  - item two / 16 continued here           → marcadores 15, 16
17  - nested a / 18 nested b                 → marcadores 17, 18
20  1. ordered one / 21 ordered two          → marcadores 20, 21
23  - [ ] task a / 24 - [x] task b           → marcadores 23, 24
26  ```js 27 const a = 1 28 (vacía) 29 const b = 2 30 ```  → marcadores 27, 28, 29
32  indented code / 33 second indented       → marcadores 32, 33
35  | a | b | 36 | - | - | 37 | 1 | 2 | 38 | 3 | 4 |  → marcadores 35, 37, 38
40  ---                                      → sin marcador (el <hr> cubre 40)
42  ![alt text](img.png)                     → sin marcador (el <p> cubre 42)
44  Text with a footnote[^1] and a [link](…) → marcador 44
46  [^1]: footnote body / 47 continued       → marcadores 46, 47 (renderizados al final)
49  (párrafo largo, reflowa)                 → marcador 49
51  Tail paragraph.                          → marcador 51
```

Inventario medido: **30 marcadores para 30 de las 51 líneas**; las 21 sin marcador son 15 líneas en blanco, la línea 9 (subrayado setext), las líneas 26 y 30 (cercas del bloque de código), la 36 (delimitador de tabla), la 40 (`hr`) y la 42 (párrafo con solo una imagen).

`[Hecho]` HTML real por constructo (sonda 10, sin reformatear; los saltos de línea del listado son del formateo, no del HTML):

```html
<h1><span data-source-line="1"></span>Heading <em>one</em></h1>

<p><span data-source-line="3"></span>First paragraph line<br/>
<span data-source-line="4"></span>second line with <strong>bold<br/>
<span data-source-line="5"></span>across lines</strong> and <code>inline code</code>
<span data-source-line="6"></span> at the end.</p>

<h1><span data-source-line="8"></span>Setext heading</h1>

<blockquote><p><span data-source-line="11"></span>Quote line one<br/>
<span data-source-line="12"></span>quote line two</p></blockquote>

<ul><li><span data-source-line="14"></span>item one</li>
<li><span data-source-line="15"></span>item two<br/>
<span data-source-line="16"></span>continued here
<ul><li><span data-source-line="17"></span>nested a</li>
<li><span data-source-line="18"></span>nested b</li></ul>
</li></ul>

<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" disabled=""/>
<span data-source-line="23"></span>task a</li>
<li class="task-list-item"><input type="checkbox" disabled="" checked=""/>
<span data-source-line="24"></span>task b</li></ul>

<pre><code class="language-js">
<span data-source-line="27">const a = 1</span>
<span data-source-line="28"></span>
<span data-source-line="29">const b = 2</span>
</code></pre>

<pre><code><span data-source-line="32">indented code</span>
<span data-source-line="33">second indented</span>
</code></pre>

<table><thead><tr><th><span data-source-line="35"></span>a</th><th>b</th></tr></thead>
<tbody><tr><td><span data-source-line="37"></span>1</td><td>2</td></tr>
<tr><td><span data-source-line="38"></span>3</td><td>4</td></tr></tbody></table>

<hr/>

<p><img src="img.png" alt="alt text"/></p>

<p><span data-source-line="44"></span>Text with a footnote<sup><a href="#user-content-fn-1"
id="user-content-fnref-1" data-footnote-ref="true" aria-describedby="footnote-label">1</a></sup>and a
<a href="https://example.com">link</a>.</p>

<section data-footnotes="true" class="footnotes">…<li><p><span data-source-line="46"></span>footnote body<br/>
<span data-source-line="47"></span>continued footnote …</p></li></ol></section>
```

`[Hecho]` Tabla constructo → elemento anotado → qué hace el plugin:

| Constructo | Ancla de línea | Ancla de bloque (respaldo) | Lo que hace el plugin |
| --- | --- | --- | --- |
| Encabezado ATX (`# x`) | marcador en la línea del `#` | `h1`-`h6` (`startLine = endLine`) | remark: marcador al inicio del texto |
| Encabezado setext (`x` + `===`) | marcador en la línea del título; **la línea del subrayado no tiene ancla** | `h1`/`h2` (título + subrayado, p. ej. 8-9) | remark + respaldo al bloque para la línea del subrayado |
| Párrafo con saltos suaves | un marcador por línea (el salto lo aporta el `break` que emite el plugin) | `p` | remark: parte el texto, emite `break`, recorta el espacio inicial tras el salto |
| Salto duro (dos espacios o `\`) | igual, pero el `break` ya venía del parser | `p` | remark: no toca ese `break`, solo añade el marcador |
| `**strong**`, `*em*`, `~~del~~`, `a` | marcador dentro del inline si la línea empieza ahí; el plugin **no** parte el inline | `p` (o el `li`/`td` contenedor) | remark: recorre los hijos, así que un `strong` que cruza líneas recibe el marcador dentro |
| `code` inline | marcador de su línea; si el `code` contiene un `\n`, ese salto **no** genera marca | el `p` | nada especial → caso límite §7 |
| `blockquote` | marcadores dentro del `p` interno | `blockquote` y `p` | remark |
| Lista ordenada / no ordenada | un marcador por ítem (y por línea de continuación) | `ul`/`ol`, `li` | remark |
| Lista de tareas | marcador tras el `<input type="checkbox">` | `li` | remark (el `<input>` es un hermano previo) |
| Lista anidada | marcadores en los `li` anidados | `li` externo, `ul` interno | remark |
| Bloque de código con cercas | un `span` con texto por línea de contenido, `\n` entre ellos | `pre` | rehype: parte el único texto de `code`, calcula la primera línea de contenido |
| Bloque de código indentado | igual | `pre` | rehype: mismo cálculo (sin desplazamiento por cercas) |
| Tabla GFM (cabecera) | marcador en la primera celda de la fila | `table`, `tr` | remark |
| Tabla GFM (fila delimitadora, p. ej. `---`) | **sin marcador** | `table` | respaldo al bloque |
| Tabla GFM (filas de datos) | marcador en la primera celda | `tr` | remark |
| `hr` | **sin marcador** | `hr` | respaldo al bloque |
| Imagen suelta | **sin marcador** | `p` | respaldo al bloque |
| Imagen dentro de una línea con texto | el marcador de la línea | `p` | remark |
| Nota al pie (referencia `[^1]`) | marcador de la línea del cuerpo | `p` | remark |
| Nota al pie (definición, renderizada al final) | marcadores con la línea **original** | `li`/`p` de la sección | remark: las posiciones se conservan aunque el render vaya al final (`MTHF:217`) |
| HTML crudo (`<div>`) | **sin marcador** (react-markdown lo convierte en texto suelto en la raíz, `RM:359-368`) | — | respaldo al bloque anterior |

### 4.5 Líneas sin elemento renderizado (pregunta 4)

`[Hecho]` Las líneas sin marcador son las 21 del inventario de §4.4, en cuatro clases:

| Clase | Ejemplo | Regla |
| --- | --- | --- |
| Línea en blanco | 2, 7, 10, … | bloque anterior (regla 3) |
| Línea que forma parte de un bloque pero no se renderiza | 9 (subrayado setext), 36 (delimitador de tabla), 26/30 (cercas) | bloque contenedor + *snap* al marcador más cercano dentro del bloque (§6.3) |
| Línea cuyo contenido no genera texto | 40 (`hr`), 42 (solo imagen) | bloque contenedor |
| Contenido sin bloque (HTML crudo) | — | bloque anterior |

**Regla determinista propuesta** (adaptación de `PREV` §4.3 a líneas, en orden):

1. **Marcador exacto** de la línea → objetivo de línea.
2. Si no hay marcador: elegir el **bloque** con las reglas ya acordadas (`PREV` §4.3: candidatos que contienen la línea, preferir no-footnote, mayor profundidad DOM, menor span).
3. Si el bloque elegido **contiene marcadores**, hacer *snap* al marcador más cercano en número de línea **dentro de ese bloque** (empate → el anterior). Esto convierte 9→8, 26→27, 30→29, 36→35 y una línea en blanco entre párrafos → la última línea del párrafo anterior.
4. Si el bloque no contiene marcadores, usar el rect del bloque (caso de la imagen suelta, `hr`, `pre` con un solo texto si el plugin de código no aplicó).
5. Si no hay bloque (documento vacío, líneas antes del primer bloque) → primer bloque no-footnote; si tampoco hay, no se toca `scrollTop`.

`[Inferencia]` El *snap* de la regla 3 es lo que evita que la línea 26 (una cerca de código) centre el `pre` completo en vez de la primera línea de código, y evita que una línea en blanco entre dos párrafos grandes centre el párrafo entero en vez de su última línea. No añade ninguna consulta nueva: los marcadores ya están en el DOM.

`[Inferencia]` Resolución de las 21 líneas sin marcador del documento de prueba, aplicando las reglas (calculada a partir del inventario de §4.4; las líneas 40, 41, 42 y 43 son las únicas que acaban centrando un bloque):

| Línea | Bloque elegido | Marcadores dentro | Objetivo final |
| ---: | --- | --- | --- |
| 2 | `h1` 1-1 | 1 | línea 1 |
| 7 | `p` 3-6 | 3,4,5,6 | línea 6 |
| 9, 10 | `h1` 8-9 | 8 | línea 8 |
| 13 | `p` 11-12 (dentro del blockquote) | 11,12 | línea 12 |
| 19 | `li` 15-18 | 15,16,17,18 | línea 18 |
| 22 | `li` 21-21 | 21 | línea 21 |
| 25 | `li` 24-24 | 24 | línea 24 |
| 26 | `pre` 26-30 | 27,28,29 | línea 27 |
| 30, 31 | `pre` 26-30 | 27,28,29 | línea 29 |
| 34 | `pre` 32-33 | 32,33 | línea 33 |
| 36 | `div` de la tabla 35-38 | 35,37,38 | línea 35 (empate, gana la anterior) |
| 39 | `div` de la tabla 35-38 | 35,37,38 | línea 38 |
| 40 | `hr` 40-40 | — | rect del `hr` |
| 41 | `hr` 40-40 | — | rect del `hr` |
| 42, 43 | `p` 42-42 (imagen) | — | rect del `p` |
| 45, 48 | `p` 44-44 | 44 | línea 44 |
| 50 | `p` 49-49 | 49 | línea 49 |

`[Inferencia]` El caso de las líneas 45 y 48 muestra una mejora lateral sobre `PREV`: antes el respaldo centraba el párrafo 44 completo; ahora centra la última línea del párrafo 44, y **no** salta a la sección de notas al pie.

### 4.6 Comparación de enfoques y recomendación

| Enfoque | Precisión | Coste | Riesgos | Veredicto |
| --- | --- | --- | --- | --- |
| **A. Solo bloques** (lo acordado en `PREV` §4.2-4.4) | bloque completo; un `p` de 6 líneas se centra como un todo | 1 atributo por bloque, 1 `getBoundingClientRect` | ninguno nuevo; no cumple la decisión de producto «por línea de origen» | base de partida, insuficiente |
| **B. Spans envolviendo cada nodo de texto, en rehype** | línea, pero solo si el texto tiene `\n` (tras `remark-breaks` no los tiene) | 1 span por nodo de texto | no-op en el pipeline actual; rompe `getByText` (`TLD:5-10`, `AT:700`/`AT:744`) | descartado |
| **C. Marcadores vacíos `<span data-source-line>`** (remark antes de `remark-breaks` + rehype para `pre > code`) | **exacta por línea de origen** (fila 0 y span completo de la línea) | +8 % de render, +55 % de HTML, +1 elemento por línea con texto | casos de inline multilínea; depende de replicar el recorte de espacio de `MTH:299-311` | **elegido** |
| **D. Columna → offset de carácter renderizado → `Range`** | exacta por columna | necesita un mapa sintaxis→texto | no resoluble sin replicar el parser: 59 caracteres de origen → 33 renderizados en la línea 44 | descartado |
| **E. Columna → fila proporcional dentro de la línea** | ≤ 1 fila de error | necesita columna y largo de línea | obliga a que un cambio solo de columna re-renderice el preview, contra `PS` §7.5 | aplazado (§6.4, decisión abierta 1) |
| **F. Mapeo proporcional por número de línea** (sin DOM) | ninguno | trivial | ignora alturas reales | descartado ya en `PREV` §8 |

`[Inferencia]` Recomendación: **C + A como respaldo**. C cubre todas las líneas con texto; A y el *snap* de §4.5 resuelven las 21 líneas sin marcador del documento de prueba sin ninguna consulta adicional. B, D, E y F quedan documentados con su motivo para no volver a abrirlos.

---

## 5. Evidencia de medición

### 5.1 Geometría del marcador (Chromium 150 headless)

`[Hecho]` Los 30 marcadores del documento de prueba devuelven **exactamente un rect**, con `width: 0`, `height` igual a la caja de línea local y `y` igual al borde superior de la fila:

| Línea | Padre | `x` | `y` | `w` | `h` |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | `h1` | 337 | 33 | 0 | 28 |
| 3 | `p` | 337 | 90 | 0 | 16 |
| 4 | `p` | 337 | 112,8 | 0 | 16 |
| 5 | `strong` | 337 | 135,5 | 0 | 16 |
| 27 | `code` | 349 | 551,8 | 79,5 | 14 |
| 28 | `code` (línea vacía) | 349 | 571,3 | **0** | **14** |
| 35 | `th` | 346 | 712,3 | 0 | 14 |
| 49 | `p` (reflowada) | 337 | 937,4 | 0 | 16 |

`[Hecho]` Esto responde a una duda de diseño: **el `span` vacío sí tiene rect útil** (`y` + `height`), también en `pre` con `white-space: pre` y en una línea vacía de código. No hace falta contenido centinela (`\u200B`) ni `display: inline-block`.

### 5.2 La invariante «una línea de origen = una fila visual»

`[Hecho]` Distancia entre marcadores consecutivos **dentro del mismo bloque**:

```text
3→4   22,8 px    11→12 22,7 px    14→15 22,0 px    17→18 22,0 px
20→21 22,0 px    27→28 19,5 px    28→29 19,5 px    32→33 19,5 px
37→38 23,0 px    46→47 22,8 px
```

Coinciden con el `line-height` local (14 px × 1,625 = 22,75 en `p`; 12 px × 1,625 = 19,5 en `pre`; 23 px es el alto de fila de tabla). `[Inferencia]` Como `remark-breaks` convierte **cada** salto de línea de origen en un `<br>`, cada línea de origen empieza una fila visual nueva. Es la propiedad que hace que «centrar la línea» sea estable y que el rect de la fila 0 sea el inicio real de la línea.

### 5.3 Línea que reflowa: cuántas filas y qué rect

`[Hecho]` La línea 49 (197 caracteres) ocupa **3 filas visuales a 560 px** de ancho y **7 filas a 320 px**:

```text
560 px: rowTops [937,4, 960,2, 982,9]      union { y: 937,4, h: 61,5 }
320 px: rowTops [916,2, 938,9, 961,7, 984,4, 1007,2, 1029,9, 1052,7]   union h: 152,5
```

`[Hecho]` `Range.getClientRects()` sobre el rango de la línea devuelve **un rect por fila visual**, en orden. Es la base de la opción (b) del enunciado.

### 5.4 Paridad con el render actual

`[Hecho]` Quitando los `<span data-source-line="N"></span>`, el HTML anotado es **idéntico byte a byte** al actual:

```text
stock bytes: 1739
annotated minus markers === stock: true
```

`[Hecho]` Y en las 27 pruebas de la sonda 12 (saltos suaves, duros, `\r\n`, tabs, espacios iniciales, énfasis que cruza líneas, código inline con salto, enlaces multilínea, listas anidadas y flojas, setext, tablas, cercas con línea vacía, código indentado, cerca dentro de lista, notas al pie, HTML crudo, líneas en blanco, documento vacío, enlaces de referencia): **paridad `true` en todas, 0 warnings de React**. En el documento largo de 1041 líneas, también `true`.

`[Inferencia]` El detalle que hace falta para que la paridad se sostenga: `mdast-util-to-hast` recorta el espacio inicial del nodo que sigue a un `break` (`MTH:299-311`). Como el marcador se interpone entre el `break` y el texto, **el plugin tiene que recortarlo él mismo**; si no, `" and "` se convierte en `" and "` (con espacio) y la salida deja de ser idéntica. La sonda lo verifica: en la primera versión del prototipo el espacio se perdía y la paridad fallaba.

### 5.5 Compatibilidad con los tests existentes

`[Hecho]` `@testing-library/dom` construye el texto de un nodo solo con sus **hijos de texto directos** (`TLD:5-10`). Envolver texto en un `span` haría que `getByText('sturdy')` devolviera el `span` y no el `strong`, rompiendo `AT:700` y `AT:744`. Con marcadores vacíos, medido (sonda 13):

```text
(tag, direct text) fuera de <pre> — stock: 37, anotado: 37
idéntico: true

"sturdy" | (ninguno) | (ninguno) | igual
"Heading" | H1 | H1 | igual
"item one" | LI | LI | igual
"1" | TD,A | TD,A | igual

stock:     getByText('bold').tagName=undefined · heading="Heading one" · table=true · first link="1"
anotado:   getByText('bold').tagName=undefined · heading="Heading one" · table=true · first link="1"
```

`[Hecho]` Único cambio de estructura: dentro de `<pre>`, el `<code>` deja de tener un hijo de texto directo (ahora tiene `span`s por línea). Ningún test existente consulta texto dentro de un bloque de código.

### 5.6 Coste (pregunta 6)

`[Hecho]` Documento de 1041 líneas / 4240 palabras / 24 920 caracteres, 25 corridas alternadas tras calentar:

| corrida | mínimo actual / anotado | mediana actual / anotado | p90 actual / anotado |
| --- | ---: | ---: | ---: |
| 1 | 63,1 / 68,0 ms | 67,7 / 72,8 ms | 80,9 / 85,8 ms |
| 2 | 66,7 / 71,6 ms | 72,5 / 78,9 ms | 82,6 / 84,9 ms |

- Delta de mediana: **+5 a +6 ms (+8 a +9 %)**. La cifra varía con la carga de la máquina; el orden de magnitud es estable.
- HTML: 39 359 → 60 918 bytes (**+55 %**).
- Marcadores: **600** para 600 de las 1041 líneas (las demás son blancas, cercas, delimitadores o líneas sin texto).
- En el documento pequeño: 89 vs 59 elementos (**+30**, exactamente un marcador por línea) y 179 vs 135 nodos.

`[Hecho]` El render de react-markdown corre dentro del render de React y se re-ejecuta en cada cambio de `markdown` (`RM:175-179`), es decir **en cada tecla**: ese es el coste de base que ya existe hoy. `PreviewCursorSync` solo evita re-renderizar cuando cambia el cursor sin cambiar el Markdown (`PREV` §4.5). La anotación no cambia ese esquema: añade un 8-9 % al render que ya ocurre.

`[Inferencia]` Se puede cachear por string de Markdown (memoizar el par `(markdown) → hast anotado`), pero:
- react-markdown no expone el hast; cachear exigiría construir el processor a mano y renderizar con `hast-util-to-jsx-runtime`, que **no es dependencia directa** (§8).
- El 92 % del coste es el trabajo que ya se hace hoy; optimizar el 8 % mientras el 92 % sigue por tecla no cambia la experiencia.
- Recomendación: **no cachear ahora**; medir en Electron con un artículo real antes de plantearlo.

---

## 6. Diseño propuesto

### 6.1 Plugin de remark: `remarkSourceLineMarkers`

`src/renderer/src/workspace/MarkdownPreview/remark-source-line-markers.ts`

Se coloca **antes** de `remarkBreaks` en la lista de plugins (`[remarkGfm, remarkSourceLineMarkers, remarkBreaks]`). `remark-gfm` no es un transformer sino una extensión de sintaxis (`RG:24-40`), así que el orden respecto a ella es indiferente.

Contrato:

1. Recorre el árbol mdast en orden de documento, con una recursión propia sobre `children` (no se puede usar `unist-util-visit`: **no es dependencia directa**, §8).
2. Para cada nodo `text` con `position`:
   - Si `value` no tiene saltos de línea: si la línea del nodo no está marcada todavía, insertar un marcador antes; si el hermano anterior es un `break`, recortar el espacio inicial del valor (`trimLeadingMarkdownSpace`, réplica de `MTH:466-476`).
   - Si tiene saltos: partir por `/\r?\n|\r/`; entre segmentos emitir `{type:'break'}`; marcador antes de cada segmento cuya línea no esté marcada aún; recortar el espacio inicial de cada segmento posterior al primero.
3. Un contador `lastLine` garantiza **un marcador por línea de origen** aunque la línea tenga varios nodos de texto.
4. Los nodos sin `position` se dejan intactos (degradan al respaldo por bloque).

`[Inferencia]` `remarkBreaks` se mantiene en la lista después del plugin: cuando el plugin ya partió todos los saltos, `newlineToBreak` no encuentra nada y es un no-op (`MNB:16-18`). Mantenerlo es defensa en profundidad: si el plugin alguna vez no recorre un nodo, el render actual no cambia (solo se pierde la marca, y esa línea cae al respaldo por bloque).

### 6.2 Plugin de rehype: `rehypeCodeLineMarkers`

`src/renderer/src/workspace/MarkdownPreview/rehype-code-line-markers.ts`

El contenido de un bloque de código no son nodos de texto de mdast: el handler produce `pre > code > texto único` (`MTHH/code.js:31-47`). El plugin, en rehype:

1. Busca `element` con `tagName === 'pre'` y `position`.
2. Toma su `code` hijo si tiene exactamente un hijo de texto.
3. Calcula `lines = value.split('\n')` (descartando el `\n` final que añade el handler) y `span = position.end.line - position.start.line + 1`.
4. `firstContentLine = position.start.line + (span > lines.length ? 1 : 0)`. Justificación: en un bloque con cercas la posición incluye la línea de apertura (y la de cierre, si existe); en un bloque indentado no. `[Hecho]` medido: cerca en 26-30 con dos líneas de contenido → `span = 5 > 2` → primera línea 27 ✓; indentado en 32-33 → `span = 2`, `lines = 2` → primera línea 32 ✓.
5. Sustituye los hijos de `code` por `[span(l1), '\n', span(l2), '\n', …, '\n']`, con `data-source-line` en cada span y **conservando el `\n` final** para que el contenido de texto sea idéntico.

`[Hecho]` Por qué spans y no un `Range` sobre el nodo de texto: en el documento sin anotar, un `Range` sobre una **línea vacía** de un bloque de código devuelve **0 rects** (medido), mientras el `span` vacío devuelve 1 rect con alto de línea. Las líneas vacías dentro de código son un caso real de escritura.

### 6.3 Anclas de bloque (capa de respaldo)

Se mantiene lo acordado en `PREV` §4.2/§5.1: `data-source-start-line` / `data-source-end-line` en `h1`-`h6`, `p`, `blockquote`, `ul`, `ol`, `li`, `pre`, el `div` de la tabla, `tr` y `hr`. Requiere añadir componentes para `h4`-`h6`, `li` y `tr` (hoy no existen, `MP:9-73`) y pasar `node` al `hr` (`MP:72`).

### 6.4 Selección del objetivo y del rect

```ts
// Pseudocode. Identifiers and comments in English, as AGENTS.md requires.

type Target =
  | { kind: 'line'; anchor: HTMLElement; line: number }
  | { kind: 'block'; element: HTMLElement }
  | null

const INLINE_BLOCK = 'p, h1, h2, h3, h4, h5, h6, li, td, th, code'

function findTarget(article: HTMLElement, line: number, blocks: SourceBlock[]): Target {
  // 1. Exact line marker: the source line has rendered text.
  const anchor = article.querySelector<HTMLElement>(`[data-source-line="${line}"]`)
  if (anchor) return { kind: 'line', anchor, line }

  // 2. Fallback to the block that contains the line (PREV §4.3).
  const block = findBlockForLine(blocks, line)
  if (!block) return null

  // 3. Snap to the nearest marker inside that block (ties go to the previous line).
  const inside = markersInside(block.element)
  const nearest = nearestMarker(inside, line)
  if (nearest) return { kind: 'line', anchor: nearest.element, line: nearest.line }

  // 4. The block has no markers (image-only paragraph, hr, plain pre).
  return { kind: 'block', element: block.element }
}

/**
 * Rect of one source line: the union of its own visual rows.
 * Column-free on purpose: usePreviewLine() only exposes the line (PS §7.5).
 */
function lineRect(anchor: HTMLElement, next: HTMLElement | null): DOMRect | null {
  const block = anchor.closest(INLINE_BLOCK)
  if (!block) return anchor.getBoundingClientRect()

  const range = document.createRange()
  range.setStartAfter(anchor)
  // A following marker inside the same block ends this line exactly; otherwise
  // this is the last line of the block and the range ends with the block.
  if (next && block.contains(next)) {
    range.setEndBefore(next)
  } else {
    range.setEnd(block, block.childNodes.length)
  }

  const rows = keepContiguousRows(range.getClientRects())
  if (rows.length === 0) return anchor.getBoundingClientRect()

  const top = Math.min(...rows.map((r) => r.top))
  const bottom = Math.max(...rows.map((r) => r.bottom))
  return new DOMRect(rows[0].left, top, rows[0].width, bottom - top)
}

/**
 * Drops rows that cannot belong to the line: a nested block inside a tight
 * list item, or a `sup` that adds a couple of pixels, must not extend the span.
 */
function keepContiguousRows(rects: DOMRectList): DOMRect[] { /* group by top (±2 px),
  keep the leading groups while the gap to the previous one is <= 1.6 × its height */ }

/**
 * Scroll offset that puts the middle of the target in the middle of the viewport.
 * `rows` is either the rows of one source line or the single rect of a block.
 */
function centerScrollTop(rows: DOMRect[], container: HTMLElement): number {
  const first = rows[0]
  const containerRect = container.getBoundingClientRect()
  const top = first.top - (containerRect.top + container.clientTop) + container.scrollTop
  const span = rows[rows.length - 1].bottom - first.top

  // A span taller than the viewport cannot be centred with its caret visible:
  // centre its first row instead (deterministic, column-free).
  const height = span > container.clientHeight ? first.height : span
  const target = top + height / 2 - container.clientHeight / 2
  const max = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.min(Math.max(target, 0), max)
}
```

**Decisión sobre qué rect centrar (la que el enunciado deja abierta):**

| Regla | Coste | Error | Veredicto |
| --- | --- | --- | --- |
| (a) rect del marcador (`width: 0`) | 1 `getBoundingClientRect` | siempre la **fila 0** de la línea | sólo como fallback y para «span más alto que el viewport» |
| (b) `range.getClientRects()` → unión de filas | 1 `Range` + `getClientRects` | ninguna (es el span real de la línea) | **elegida** |
| (c) columna → offset de carácter → `Range` | necesita columna + mapeo sintaxis→texto | no resoluble sin un mapa sintáctico: la línea 44 tiene 59 caracteres de origen y **33** renderizados (26 invisibles, 44 %); la línea 4, 23 → 21 | descartada |
| (d) columna → fila proporcional (`floor(col/largo × filas)`) | necesita columna y largo de línea | ≤ 1 fila visual, y **obliga a que un cambio de columna re-renderice el preview**, contra `PS` §7.5 | aplazada: no como comportamiento por defecto (§10, decisión 1) |

`[Hecho]` La opción (c) es la que el enunciado pedía cuantificar: en la línea 44 (`Text with a footnote[^1] and a [link](https://example.com).`) hay 59 caracteres de origen y 33 renderizados; mapear columna→índice renderizado sin conocer la sintaxis se desvía hasta 26 caracteres, más de media línea. En la línea 4 (`second line with **bold`) el desvío es de 2. `[Inferencia]` Un mapeo así exigiría replicar el parser dentro del plugin; no compensa porque el requisito es la línea, no la columna.

`[Decisión abierta]` **Precisión declarada al usuario:** con la regla (b) el usuario obtiene la fila exacta donde empieza su línea y el span completo de esa línea centrado. Si está escribiendo en la fila 5 de una línea que reflowa en 7 filas, el centro del span no es su fila: su fila queda por debajo del centro, hasta un máximo de ~3 filas en el caso medido. Si el producto quisiera «centrar la fila del caret», la regla (d) es la única columna-compatible con error acotado, y exige cambiar `PS` §7.5 (publicar `lineLength` y aceptar re-render por columna o leer la columna de forma imperativa).

### 6.5 Espaciadores y animación

Sin cambios respecto a `PREV` §4.4: los espaciadores superior e inferior se calculan con el primer y el último **bloque** anotado (no con los marcadores), porque el requisito de espacio finito se define sobre bloques (`PREV` §4.4). La animación consume un `scrollTop` objetivo y no le importa si vino de una línea o de un bloque; durante la animación el efecto puede recalcular el objetivo (retarget) sin reiniciar los espaciadores.

### 6.6 Integración en `MarkdownPreview`

```tsx
const PLUGINS = [remarkGfm, remarkSourceLineMarkers, remarkBreaks]
const REHYPE_PLUGINS = [rehypeCodeLineMarkers]
```

`[Hecho]` `ReactMarkdown` acepta `rehypePlugins` (`RMR:328`, `RM:263-273`) y hoy no se usa ninguna (`MP:79-81`). Añadir una no cambia `urlTransform` ni `skipHtml`.

---

## 7. Casos límite y modos de error

| Caso | Comportamiento | Evidencia |
| --- | --- | --- |
| Línea en blanco entre párrafos | *snap* a la última línea del bloque anterior | regla 3; medido: las 15 líneas blancas no tienen marcador |
| Línea en blanco al principio del documento | primer bloque no-footnote | `PREV` §4.3 regla 6 |
| Subrayado setext (línea 9) | *snap* a la línea del título (8) | medido |
| Delimitador de tabla (línea 36) | *snap* a la fila de cabecera (35) | medido: la tabla tiene marcadores 35, 37, 38 |
| Cerca de código (líneas 26, 30) | *snap* a la primera (27) o última (29) línea de contenido | medido |
| Línea vacía dentro de un bloque de código (28) | marcador propio con rect válido (h = 14) | medido |
| `hr` (40) | rect del `hr` | sin marcador |
| Párrafo con solo una imagen (42) | rect del `p` | sin marcador |
| Bloque de código más alto que el viewport | primera fila visible por el clamp; el resto se alcanza con scroll manual | clamp de `centerScrollTop` |
| **`code` inline con salto de línea** (`` `a\nb` ``) | el salto se convierte en espacio (`MTHH/inline-code.js:19`), así que la línea siguiente **no empieza fila nueva**: su marcador comparte `y` con la anterior | medido: línea 6 con `y = 135,5`, igual que la línea 5 |
| Enlace con título en varias líneas | igual que el anterior (el salto vive dentro de un inline) | `[Inferencia]` misma causa |
| Imagen o fuente que carga tarde | el efecto re-mide (`ResizeObserver`) | `PREV` §3.7 |
| HTML crudo en bloque | sin marcador ni bloque → respaldo al bloque anterior | `RM:359-368` |
| Documento vacío | 0 marcadores, 0 bloques, no se toca `scrollTop` | sonda 12 (`empty document`, `only blank lines`) |
| Nota al pie, línea de definición | salta al pie del documento (donde se renderiza) | medido: sección en `y = 1057,4` con la línea 51 en `y = 1021,7` |
| Nota al pie, línea posterior del cuerpo | no salta al pie | regla de respaldo, `PREV` §4.3 |
| Línea de origen de 2000+ caracteres | se centra la fila 0 cuando el span supera el viewport | decisión §6.4 |
| `\r\n` | el plugin parte con `/\r?\n|\r/`, igual que `remark-breaks` | paridad medida en `CRLF` |
| Tabs en el texto | se conservan; no afectan al marcador | paridad medida en `tab indented line` |
| Espacios iniciales tras un salto | el plugin los recorta igual que `MTH:299-311` | paridad medida en `soft break + two leading spaces` |
| StrictMode | el plugin es puro: mismo árbol de entrada → mismo árbol de salida | `[Inferencia]`, `PREV` §3.8 |

---

## 8. Restricciones de implementación que conviene fijar

`[Hecho]` **No se pueden importar** `unist-util-visit`, `@types/mdast`, `@types/hast` ni `hast-util-to-jsx-runtime` desde `src/renderer`: no son dependencias directas del proyecto (`package.json:28-50` vs `node_modules/`), y pnpm no las expone en la raíz. Consecuencias:

- El recorrido del árbol se escribe a mano (una recursión de ~15 líneas sobre `children`).
- Los tipos de mdast/hast se declaran localmente, estructurales y mínimos:

```ts
// Minimal structural types: @types/mdast is not a direct dependency.
type MdNode = {
  type: string
  value?: string
  children?: MdNode[]
  position?: { start: { line: number }; end: { line: number } }
  data?: { hName?: string; hProperties?: Record<string, string | number> }
}

type HastNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
  position?: { start: { line: number }; end: { line: number } }
}
```

- `[Inferencia]` Tipar la lista de plugins como `PluggableList` (de unified) tampoco es posible; se pasa el array literal a la prop `remarkPlugins` / `rehypePlugins` y TypeScript lo acepta si los tipos locales son lo bastante laxos. Si el chequeo se queja, un `as` puntual en el array de plugins es preferible a añadir una dependencia.

`[Hecho]` `react-dom` solo está en `devDependencies`: cualquier utilidad de medición debe vivir en el renderer con APIs del DOM, no en `react-dom/server`.

---

## 9. Plan de pruebas y criterios de aceptación

### 9.1 Jest, funciones puras (la mayor parte)

`src/renderer/src/workspace/MarkdownPreview/source-lines.test.ts`

- `splitTextIntoSourceLines(value, startLine)` (helper puro extraído del plugin):
  - `("a\nb", 3)` → `[{line:3,value:'a'},{line:4,value:'b'}]`.
  - `("a\r\nb", 1)` → líneas 1 y 2.
  - recorte del espacio inicial a partir del segundo segmento.
- `firstCodeLine(position, lineCount)`:
  - cerca cerrada (26-30, 2 líneas) → 27.
  - cerca sin cierre (26-28, 2 líneas) → 27.
  - indentado (32-33, 2 líneas) → 32.
- `nearestMarkerLine([8], 9)` → 8; `([35,37,38], 36)` → 35; `([27,28,29], 26)` → 27; `([27,28,29], 30)` → 29.
- `keepContiguousRows(rects)`: filas a 22,8 px con alto 16 se conservan; una fila a 35 px del primer grupo se descarta (datos de la sonda 11).
- `centerScrollTop`: clamp inferior/superior y el caso «span más alto que el viewport».

`src/renderer/src/workspace/MarkdownPreview/remark-source-line-markers.test.ts` (con `unified` no disponible, se prueba el transformer sobre árboles mdast escritos a mano):

- Un `text` de una línea con `position` recibe un marcador y queda intacto.
- Un `text` multilínea se parte en `text/break/text` y dos marcadores con las líneas correctas.
- Dos nodos de texto en la misma línea → un solo marcador.
- Hermano anterior `break` → se recorta el espacio inicial.
- Nodo sin `position` → no se toca y no se emite marcador.

### 9.2 Jest, integración sin layout (jsdom)

`src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.test.tsx`:

- El `h1` de `# Calm` tiene `data-source-start-line="1"`.
- Existe `[data-source-line="1"]` dentro del `h1`, y es un `span` vacío.
- El párrafo de dos líneas tiene `[data-source-line="3"]` y `[data-source-line="4"]`, y un `<br>` entre ellos.
- El párrafo con `**sturdy**` conserva `getByText('sturdy').tagName === 'STRONG'` (regresión de `AT:700`).
- La tabla tiene `data-source-start-line` en el `div` y en cada `tr`; el delimitador no produce marcador.
- El bloque de código tiene tres `span[data-source-line]` con el texto de cada línea y los `\n` entre ellos; el `textContent` del `code` no cambia.
- Las notas al pie conservan la línea original en sus marcadores.
- Renderizar con `clientHeight === 0` y sin `ResizeObserver` no lanza (early return).

`src/renderer/src/state/status-store.test.ts`: sin cambios respecto a `PS` §12.1 (el selector sigue devolviendo solo la línea).

`[Hecho]` jsdom no mide layout (`AGENTS.md:62-65`, `PREV` §1.5): ningún test de Jest debe afirmar geometría.

### 9.3 Chromium headless / Electron (geometría)

Reutilizar el patrón de `harness/drive-lines.mjs` (CDP sobre `/usr/bin/chromium --headless=new`) o el harness de `PREV` §7.3, con un artículo real de ~1000 líneas:

1. **Cobertura de marcadores:** toda línea con texto tiene marcador; las líneas blancas, cercas, delimitadores y subrayados no.
2. **Una fila por línea:** la distancia entre marcadores consecutivos de un mismo bloque es igual al `line-height` local (±1 px).
3. **Rect del marcador:** `width === 0`, `height === line-height`, `y` dentro del bloque.
4. **Centrado por línea:** con el caret en la línea L, el centro del span de L queda a ±2 px del centro del `clientRect` del scroller.
5. **Línea reflowada:** con una línea de 200 caracteres, el span medido tiene tantas filas como `getClientRects` y su altura es la del bloque de filas.
6. **Bloque de código:** la línea vacía intermedia se centra correctamente (no salta al centro del `pre`).
7. **Tabla:** cada fila de datos se centra en su `tr` (±3 px por el padding de celda).
8. **Notas al pie:** con el caret en la definición, el preview muestra la sección final; con el caret en una línea posterior del cuerpo, no salta al pie.
9. **Espacio finito:** `scrollHeight - clientHeight` finito y hueco inferior ≈ `H - hLast`.
10. **Sin warnings:** ni React ni `ResizeObserver loop`.
11. **Paridad visual:** con los marcadores ocultos (`[data-source-line] { display: none }`) el layout es indistinguible; comparar `scrollHeight` con y sin marcas debe dar el mismo valor (±1 px).

### 9.4 Criterios de aceptación

- `pnpm test` verde **sin modificar ningún test existente**.
- `pnpm typecheck` y `pnpm lint` verdes sin dependencias nuevas.
- En el harness: puntos 1-8 y 11 de §9.3 cumplidos con tolerancia ±2 px.
- Coste: el render anotado no supera el 15 % del render actual en el artículo de referencia (medido: 8-9 %).
- La paridad byte a byte del HTML (sin marcadores) se puede automatizar como test puro con la sonda 12 (comparar dos renders del mismo Markdown).

---

## 10. Qué queda obsoleto en la investigación previa

| Sección de `PREV` | Estado | Motivo |
| --- | --- | --- |
| §2.3, último punto («no se puede mapear la columna ni la línea exacta dentro de un `p` multilínea solo con `node.position`») | **Obsoleto** en su primera mitad | La línea exacta sí se puede, con una capa añadida antes de `remark-breaks`; la columna sigue sin poder mapearse (§6.4) |
| §2.4, segundo punto («no se intenta reconstruir un `Range`… es un proyecto aparte») | **Obsoleto** | Es exactamente lo que resuelve este informe, sin depender de offsets de texto |
| §4.2 (lista de bloques anotados) | **Parcialmente obsoleto** | Pasa a ser la capa de respaldo; la primaria son los marcadores de línea |
| §4.3 (reglas de selección de bloque) | **Vigente como respaldo** | Se le añade el *snap* al marcador más cercano dentro del bloque |
| §4.4 («bloque más alto que el viewport: la línea exacta puede quedar fuera») | **Obsoleto para prosa, código y tablas** | Cada línea tiene su propio rect; el límite queda solo en una línea de origen que reflowa más de un viewport |
| §6, fila «Bloque más alto que el viewport» | **Obsoleto** con el matiz anterior | |
| §8, fila «Mapear la línea exacta con rangos de texto → Futuro» | **Obsoleto** | Sustituido por marcadores; los rangos solo se usan para medir filas de una misma línea |
| §9, riesgo 2 | **Degradado** | Deja de ser el riesgo principal; el riesgo pasa a ser el código inline multilínea (§7) |
| §10, decisión 3 (granularidad bloque vs proporcional) | **Resuelta** | Línea de origen, con la columna explícitamente fuera de alcance (§6.4) |
| §11, veredicto («el riesgo principal es la calidad percibida en bloques más altos que el viewport») | **Superado** | El riesgo ahora es el 8-9 % de coste y los casos de inline multilínea |
| §7.2 (tests de atributos de bloque) | **Ampliar** con los marcadores de línea | |

Sigue vigente sin cambios: §1 (punto de partida), §3 (restricciones del navegador), §4.1 (flujo de datos), §4.4 (espaciadores y matemática del centrado), §4.5 (aislamiento de re-renders), §4.6 (origen del cursor), §5.6/§5.7 (esqueleto de `PreviewCursorSync` y `MarkdownPreview`), §7.3 (verificación headless), y todo `PS`.

### Decisiones abiertas

1. `[Decisión abierta]` **Qué rect para una línea reflowada de más de un viewport.** Propuesta: fila 0 (§6.4). Alternativa: fila proporcional a la columna, que exige cambiar `PS` §7.5.
2. `[Decisión abierta]` **Coste del 8 %.** ¿Se acepta, o se investiga memoria del hast por string de Markdown (requiere construir el processor a mano y `hast-util-to-jsx-runtime` como dependencia nueva)?
3. `[Decisión abierta]` **Marcadores dentro de celdas de tabla.** Hoy el marcador de una fila vive en la primera celda (`th`/`td`), con `y` desplazado por el padding (~4,5 px). Alternativa: no marcar celdas y usar el `tr`. Diferencia medida: 4,5 px, irrelevante para centrar.
4. `[Decisión abierta]` **Código inline multilínea.** ¿Se acepta que la línea siguiente comparta fila (y por tanto el centrado sea el mismo), o se prohíbe reescribir el salto a espacio en ese caso (cambio de render, no recomendado)?
5. `[Decisión abierta]` **Footnotes.** Se mantiene la coincidencia exacta de `PREV` §10.9 (saltar al pie al editar la definición). Con marcadores, ese salto es ahora al pie exacto de la definición, no al bloque.

---

## Sources

### Código de la aplicación

- `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx:7` — `PLUGINS`; `:9-73` — `COMPONENTS`; `:72` — `hr` sin `node`; `:75-85` — sección, artículo y `ReactMarkdown`.
- `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx:18-20` — modos; `:36-40` — wrapper con `overflow-y-auto`.
- `src/renderer/src/editor/TextEditor/TextEditor.tsx:7-10` — `EditorCursor`; `:34-38` — publicación de línea/columna.
- `src/renderer/src/state/status-store.ts:5-11` — `EditorStatus`; `:64-70` — `useSyncExternalStore`.
- `src/renderer/src/App.test.tsx:694-702` — tabla GFM y `getByText('sturdy').tagName`; `:704-726` — salto simple como `<br>`; `:737-747` — `getByText('world').tagName`.
- `AGENTS.md:60-65` — tests como contrato; prohibición de tests de layout en jsdom.

### Dependencias instaladas

- `node_modules/react-markdown/lib/index.js` (`react-markdown@10.1.0`): `:155-158` — `sourcePos` deprecado; `:175-179` — parse dentro del render; `:262-276` — orden parse → remark → rehype; `:313-356` — `post` y `passNode`; `:359-368` — `raw` → texto.
- `node_modules/react-markdown/readme.md:286-293` — `ExtraProps.node`; `:323-330` — `components`, `rehypePlugins`, `remarkPlugins`.
- `node_modules/.pnpm/hast-util-to-jsx-runtime@2.3.6_supports-color@7.2.0/node_modules/hast-util-to-jsx-runtime/lib/index.js`: `:334-342` — `props.node` solo para componentes custom; `:433-435` — recorrido de `properties`; `:586-620` — `createProperty`.
- `node_modules/.pnpm/mdast-util-to-hast@13.2.1/node_modules/mdast-util-to-hast/lib/state.js`: `:287-323` — `all()`; `:299-311` — recorte del espacio tras un `break`; `:336-338` — `patch`; `:352-395` — `applyData` (`hName`, `hProperties`, `hChildren`); `:437-456` — `wrap` con `\n` sin posición; `:466-476` — `trimMarkdownSpaceStart`.
- `…/lib/handlers/text.js:19-23` — `text` + `patch`; `…/break.js:17-22` — `br` + `\n`; `…/code.js:17-48` — `pre > code` con un único texto sin posición; `…/inline-code.js:17-30` — `\n` → espacio; `…/list.js:44-51`; `…/list-item.js:55-87`; `…/table.js:19-61`; `…/table-row.js:19-63`; `…/heading.js:17-27`; `…/paragraph.js:17-27`; `…/thematic-break.js:17-27`; `…/image.js:19-35`; `…/root.js:17-22`.
- `…/lib/footer.js:123-260`, `:217` — `patch(definition, listItem)` de las notas al pie.
- `…/lib/handlers/index.js` — `footnoteDefinition: ignore`, `definition: ignore`.
- `node_modules/.pnpm/mdast-util-newline-to-break@2.0.0/node_modules/mdast-util-newline-to-break/lib/index.js:16-27` — `\n` → `{type:'break'}`.
- `node_modules/remark-breaks/lib/index.js:14-25` — qué hace `remarkBreaks`.
- `node_modules/remark-gfm/lib/index.js:24-40` — extensión de micromark (no transformer).
- `node_modules/.pnpm/mdast-util-find-and-replace@3.0.3/node_modules/mdast-util-find-and-replace/lib/index.js:131-218`, `:157-197` — reconstrucción de nodos sin `position`.
- `node_modules/.pnpm/property-information@7.2.0/node_modules/property-information/lib/find.js:43-77` — resolución de `data-*`.
- `node_modules/.pnpm/trim-lines@3.0.1/node_modules/trim-lines/index.js` — `trimLines`.
- `node_modules/.pnpm/@testing-library+dom@10.4.2/node_modules/@testing-library/dom/dist/get-node-text.js:5-10` — `getNodeText` solo con hijos de texto directos.
- `package.json:28-50` — `dependencies` (sin `unist-util-visit`, `@types/mdast`, `@types/hast`); `:51-83` — `devDependencies` (`react-dom:79` solo en dev).

### Documentación oficial

- mdast, `position` (`start`/`end` con `line`, `column`, `offset`): https://github.com/syntax-tree/mdast#position
- hast, `position` y nodos `text`: https://github.com/syntax-tree/hast#nodes
- Unist, `Point` y `Position`: https://github.com/syntax-tree/unist#point
- react-markdown, `components` y `node`: https://github.com/remarkjs/react-markdown#appendix-b-components
- react-markdown, `rehypePlugins` / `remarkPlugins`: https://github.com/remarkjs/react-markdown#options
- remark-breaks: https://github.com/remarkjs/remark-breaks
- DOM, `Range.getClientRects()`: https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects
- DOM, `Element.getClientRects()`: https://developer.mozilla.org/en-US/docs/Web/API/Element/getClientRects
- DOM, `Element.getBoundingClientRect()`: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
- CSSOM View (coordenadas de `ClientRect`): https://drafts.csswg.org/cssom-view/

### Medición propia (descartable, fuera del repo)

`$COMMANDCODE_SCRATCHPAD/`:

- `probe/10-pipeline.mjs` — mdast antes/después de `remark-breaks`, hast actual y anotado, HTML, paridad, inventario de marcadores. Salida en `probe/10-out.txt`.
- `probe/11-layout.mjs` + `harness/drive-lines.mjs` → `harness/lines-out.json` — geometría en Chromium 150 headless (CDP), con tipografía aproximada del preview.
- `probe/12-parity-bench.mjs` — 27 casos de paridad y coste.
- `probe/13-jsdom-textquery.mjs` — paridad de `getByText` en jsdom.
- Reproducir: `cd $COMMANDCODE_SCRATCHPAD && node probe/10-pipeline.mjs && node probe/11-layout.mjs && node harness/drive-lines.mjs && node probe/12-parity-bench.mjs && node probe/13-jsdom-textquery.mjs` (el directorio contiene un symlink `node_modules` al del proyecto; no se añadió ninguna dependencia).
