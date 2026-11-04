# Typewriter scroll, scroll libre finito y sincronización caret→preview

**Estado:** investigación cerrada. Solo lectura: no se modificó código de producción, tests, `package.json` ni historial de git. Los únicos artefactos son los informes de `.scratch/`.

**Fecha:** 2026-10-24

**Feature:** `caret-follow-scroll`

**Alcance:** renderer. `TextEditor`, `articleEditorExtensions`, `MarkdownPreview`, `EditorPreviewLayout`, `status-store`. Sin cambios en IPC, preload, `src/main`, SQLite, migraciones ni dependencias.

**Informes fuente (evidencia detallada):**

| Alias | Informe | Contenido |
|---|---|---|
| `TW` | `.scratch/typewriter-scroll/research.md` | Editor: caret centrado, padding asimétrico, scroll libre, clic, animación, harness |
| `PREV` | `.scratch/preview-caret-sync/research.md` | Preview: scroller propio, espaciadores, aislamiento de re-renders, matemática base |
| `LM` | `.scratch/preview-caret-sync/line-mapping.md` | Preview: anotación por línea de origen, medición y rect |
| `PS` | `.scratch/preview-caret-sync/pointer-sync.md` | Preview: origen puntero, fin de gesto, store y selectores |
| `SS` | `.scratch/preview-caret-sync/smooth-scroll.md` | Preview: animación, umbral, máquina de estados, módulo compartido |

Convención: `[Hecho]` verificado en código instalado, documentación oficial o medición reproducible; `[Inferencia]` consecuencia razonada; `[Decisión abierta]` requiere elección de producto o verificación en Electron.

---

## 1. Requisitos finales acordados

1. **R1 — Caret centrado al escribir (editor).** Mientras se escribe, el caret se mantiene en el centro vertical del editor y el texto sube; el caret no se queda pegado al borde inferior.
2. **R2 — Primera y última línea centradas.** La primera línea puede quedar centrada al abrir; la última se centra mientras se escribe.
3. **R3 — Scroll libre finito (editor).** La última línea puede llevarse manualmente al borde superior, con un espacio en blanco finito debajo. No es scroll infinito.
4. **R4 — Clic y arrastre centran (editor).** Un clic simple mueve el caret y lo centra; un arrastre centra una sola vez al soltar, nunca en cada movimiento.
5. **R5 — Animación solo en saltos grandes (editor).** Los ajustes pequeños son instantáneos; los saltos grandes se animan ~150 ms con ease-out, son cancelables y retargeteables; `prefers-reduced-motion: reduce` es instantáneo.
6. **R6 — El preview sigue el caret por línea de origen.** No por bloque: cada línea del Markdown tiene un objetivo propio.
7. **R7 — El preview sigue al escribir, con flechas y con clic.** El arrastre centra al soltar.
8. **R8 — Scroll libre finito (preview).** El último bloque renderizado debe poder llegar al borde superior, con espacio finito debajo.
9. **R9 — Animación solo en saltos grandes (preview).** El mismo contrato que el editor: mismo umbral, duración, curva, cancelación y reduced motion.
10. **R10 — Alcance y restricciones.** Story y Article (comparten `TextEditor`); siempre activo, sin toggle; sin dependencias nuevas; todo en el renderer; los tests existentes son contrato.

---

## 2. Veredicto global

**Viable con complejidad media.** `[Inferencia]`

| Área | Veredicto | Riesgo principal |
|---|---|---|
| Editor: centrado + scroll libre | **Viable y medido** en Chromium 150 headless (`TW` §8.7) | IME y touch sin verificar en Electron |
| Editor: clic + animación | **Viable y medido** (`TW` §8.2-8.7) | Arrastre de la barra de scroll |
| Preview: línea de origen | **Viable con precisión exacta por línea y sin precisión por columna** (`LM` §2, §6.4) | Coste +8-9 % de render y `code` inline multilínea |
| Preview: clic | **Viable** con una transacción de fin de gesto anotada (`PS` §4.5) | `mouseup` perdido al soltar fuera de la ventana |
| Preview: animación | **Viable** reutilizando el mismo bucle (`SS` §2) | Valor real de `line-height` y entrega de eventos de la barra |

Lo que **no** se puede prometer:

- **Precisión por columna en el preview.** Si una línea de origen reflowa en 7 filas y el caret está en la fila 5, se centra el span completo de la línea, no la fila 5. El caret puede quedar hasta ~3 filas por debajo del centro en el caso medido (`LM` §6.4).
- **Mapeo inverso preview→editor.** Hacer clic en el preview para mover el caret queda fuera de alcance.
- **Centrado exacto en bloques más altos que el viewport.** El clamp centra la primera fila y el resto se alcanza con scroll manual.

---

## 3. Arquitectura global

```text
CodeMirror (TextEditor)
  ├─ update (tecla, flecha, comando, composición)
  │    └─ transactionExtender → scrollIntoView(head, { y: 'center' })
  │         └─ EditorView.scrollHandler → animador del editor
  ├─ pointerGesture (mousedown contentDOM + mouseup/touchend document + rAF)
  │    └─ transacción de solo efectos con anotación `pointerSelectionEnd`
  │         └─ scrollIntoView(head, { y: 'center' })
  └─ onUpdate
       └─ cursorOrigin(update) → publishCursor({ line, column, origin })
            └─ status-store (external store)
                 └─ usePreviewLine()  // solo la línea, ambos orígenes
                      └─ PreviewCursorSync (hijo que devuelve null)
                           ├─ escribe espaciadores superior/inferior
                           ├─ findTarget(article, line)
                           ├─ lineRect/blockRect → scrollTop objetivo
                           └─ animador compartido (rAF, umbral, cancelación)
```

Tres responsabilidades separadas:

1. **CodeMirror** sabe dónde está el caret y de qué origen es el movimiento.
2. **`MarkdownPreview`** es dueño del scroller, de los espaciadores, de las anotaciones y de las refs; conserva su API `{ markdown: string }`.
3. **`PreviewCursorSync`** se suscribe a la línea y ejecuta el efecto de layout; devuelve `null`. Así las flechas y los clics no re-renderizan `MarkdownPreview` ni vuelven a parsear el Markdown (`PREV` §4.5, `LM` §1).

El editor y el preview comparten **cómo se mueve** el scroll, no **a dónde** ni **cuándo** (`SS` §7).

---

## 4. Editor: caret centrado, scroll libre, clic y animación

### 4.1 Centrado (`TW` §4.1)

Un `EditorState.transactionExtender` añade un efecto de centrado cuando la transacción ya pide scroll:

```ts
// Pseudocode; identifiers and comments in English.
const typewriterScroll = EditorState.transactionExtender.of((tr) => {
  if (!tr.scrollIntoView) return null
  return {
    effects: EditorView.scrollIntoView(tr.newSelection.main.head, { y: 'center' }),
  }
})
```

`[Hecho]` El efecto `"center"` se aplica después de la bandera `tr.scrollIntoView` y de los efectos explícitos, así que el centro gana como destino final (`TW` §2.3). No se despacha una transacción extra por tecla.

### 4.2 Padding asimétrico (`TW` §4.2, §5)

Sean `H = scrollDOM.clientHeight`, `L = defaultLineHeight`, `D = altura del documento`.

```text
padding-top    Pt = (H - L) / 2
padding-bottom Pb = H - L
maxScroll      M  = D - L + (H - L) / 2
```

Consecuencias:

- Primera línea centrada con `scrollTop = 0`.
- Última línea centrada al escribir con `scrollTop = D - L`.
- En el máximo, la última línea queda en `top = 0` y debajo quedan `H - L` px en blanco.
- El máximo es finito y no crece al hacer scroll.
- El padding del tema (16 px) se **reemplaza**, no se suma.
- `scrollPastEnd()` nativo se descarta: descuenta el padding superior y la última línea se queda a ~`P` px del top (`TW` §6).

### 4.3 Clic y arrastre (`TW` §8.1-8.2)

`[Hecho]` CodeMirror despacha las transacciones de puntero con `scrollIntoView: false` y no expone una señal de «fin de gesto». Un extender basado en `select.pointer` centraría en `mousedown` y en cada movimiento del arrastre.

Diseño recomendado: un `ViewPlugin` con

- `mousedown` en `contentDOM` (solo botón principal),
- `mouseup` y `touchend` en `document`,
- un `requestAnimationFrame` que lee `selection.main.head` y despacha un único `EditorView.scrollIntoView(head, { y: 'center' })`.

Cubre clic, doble clic, shift+clic, arrastre que termina fuera del contenido y clic sobre el mismo caret. No se usa `click` (no se dispara en un arrastre) ni `MouseSelectionStyle` (no tiene callback de fin).

### 4.4 Animación (`TW` §8.3-8.4)

Un `EditorView.scrollHandler` intercepta los efectos `{ y: 'center', x: 'nearest' }` y devuelve `true` tras programar la animación; así evita el salto nativo previo.

```text
DURATION = 150 ms
easeOutCubic(t) = 1 - (1 - t)^3
threshold = max(defaultLineHeight, clientHeight / 6)
```

- `abs(target - scrollTop) <= threshold` ⇒ asignación instantánea.
- Salto mayor ⇒ un único `requestAnimationFrame`; cada nueva petición cancela el frame anterior y retargetea desde el `scrollTop` actual.
- El primer frame se clampea a `t = 0` porque el timestamp de `rAF` puede preceder a `performance.now()`.
- `.cm-scroller` debe tener `scroll-behavior: auto`; con `smooth`, cada escritura arrancaría un suavizado nativo.
- Cancelan: rueda, `PageUp`/`PageDown`, resize, editor oculto y cualquier destino distinto de `"center"`.
- `prefers-reduced-motion: reduce` ⇒ asignación directa, cero frames.

### 4.5 Comportamiento por acción (editor)

| Acción | ¿Centra? | Evidencia |
|---|---|---|
| Escribir, pegar, cortar, undo/redo, toolbar | Sí | `TW` §8.7 |
| Flechas, Home/End, Ctrl+A | Sí | `TW` §8.7 |
| PageUp / PageDown | No; conserva el scroll nativo `y: "start"` | `TW` §8.5 |
| Clic simple | Sí, al soltar | `TW` §8.7 |
| Arrastre | Sí, una vez al soltar | `TW` §8.7 |
| Doble / triple clic, shift+clic | Sí, una vez con el `head` final | `TW` §8.6 |
| Clic derecho / central | No | `TW` §8.6 |
| Rueda / trackpad | No; cancela la animación | `TW` §8.7 |
| Editor oculto (`preview`) | No; `clientHeight = 0` | `TW` §7.4 |
| IME / composición | **Decisión abierta**: verificar en Linux | `TW` §7.3 |

---

## 5. Preview: anotación y medición por línea de origen

### 5.1 Por qué el enfoque por bloque no cumple R6

`[Hecho]` Después de `mdast-util-to-hast`, los nodos de texto **sí** llevan `position`, pero el pipeline actual aplica `remark-breaks`, que reconstruye los nodos y **les quita la posición**. En el documento de prueba, 76 de 101 nodos de texto de hast no tienen `position` (`LM` §2).

La solución no es medir después: es **anotar antes de `remark-breaks`**.

### 5.2 Capa de anotación (`LM` §6.1-6.3)

**Plugin de remark `remarkSourceLineMarkers`**, colocado antes de `remarkBreaks`:

- Recorre el mdast con una recursión propia sobre `children` (no se puede importar `unist-util-visit`; no es dependencia directa).
- Para cada nodo `text` con `position`, parte su `value` por `/\r?\n|\r/`, emite los `break` que emitiría `remark-breaks` e inserta un marcador vacío al inicio de cada línea de origen:

```html
<span data-source-line="12"></span>
```

- Un contador `lastLine` garantiza un único marcador por línea aunque haya varios nodos de texto.
- Los nodos sin `position` se dejan intactos y caen al respaldo por bloque.

**Plugin de rehype `rehypeCodeLineMarkers`**, solo para `pre > code`:

- El contenido de un bloque de código es un único nodo de texto sin posición.
- Sustituye los hijos de `code` por `[span(l1), '\n', span(l2), '\n', …]`, conservando el `\n` final.
- `[Hecho]` Las líneas vacías dentro de código necesitan el span: un `Range` sobre una línea vacía devuelve 0 rects; el span vacío devuelve 1 rect con altura de línea.

**Anclas de bloque como respaldo (`PREV` §4.2):** `data-source-start-line` / `data-source-end-line` en `h1`-`h6`, `p`, `blockquote`, `ul`, `ol`, `li`, `pre`, el `div` de la tabla, `tr` y `hr`. Requiere añadir componentes para `h4`-`h6`, `li` y `tr`, y pasar `node` al `hr`.

`[Hecho]` `hast-util-to-jsx-runtime` conserva `data-*` y no avisa. El HTML resultante, quitando los marcadores, es **byte a byte idéntico** al actual en 17 constructos y 27 casos delicados, con 0 warnings de React (`LM` §5.4). Los marcadores no alteran `textContent` ni `getByText`.

### 5.3 Selección del objetivo y rect (`LM` §6.4)

```ts
type Target =
  | { kind: 'line'; anchor: HTMLElement; line: number }
  | { kind: 'block'; element: HTMLElement }

function findTarget(article: HTMLElement, line: number, blocks: SourceBlock[]): Target | null {
  // 1. Exact line marker.
  const anchor = article.querySelector<HTMLElement>(`[data-source-line="${line}"]`)
  if (anchor) return { kind: 'line', anchor, line }

  // 2. Fallback block that contains the line.
  const block = findBlockForLine(blocks, line)
  if (!block) return null

  // 3. Snap to the nearest marker inside the block (ties go to the previous line).
  const nearest = nearestMarker(block.element, line)
  if (nearest) return { kind: 'line', anchor: nearest.element, line: nearest.line }

  // 4. The block has no markers (image-only paragraph, hr, plain pre).
  return { kind: 'block', element: block.element }
}
```

Para medir una línea, se usa un `Range` desde el marcador hasta el siguiente marcador del mismo bloque (o hasta el final del bloque) y se unen sus `getClientRects()`:

```text
rows = keepContiguousRows(range.getClientRects())
top  = min(row.top)
span = max(row.bottom) - top
scrollTop = clamp(top + span/2 - H/2, 0, scrollHeight - H)
```

- `[Hecho]` Cada línea de origen empieza una fila visual nueva: la distancia entre marcadores consecutivos es exactamente el `line-height` local (22,8 px en `p`, 19,5 px en `code`, 23 px en una fila de tabla).
- `[Hecho]` El rect del marcador vacío es utilizable: `width: 0`, `height` = caja de línea, `y` = borde superior de la fila.
- Si el span de una línea supera el viewport, se centra su **primera fila** (regla determinista y sin columna).
- `keepContiguousRows` descarta filas que no son de la línea (bloques anidados en listas apretadas, `sup` de footnotes).

### 5.4 Forma de la anotación, constructo por constructo (`LM` §4.4)

| Constructo | Marcador | Nota |
|---|---|---|
| Encabezado ATX / setext | Sí, en la línea del texto | El subrayado setext no tiene marcador: *snap* al título |
| Párrafo con saltos suaves | Sí, uno por línea | El plugin emite los `<br>` de `remark-breaks` |
| Párrafo con salto duro | Sí | El `<br>` existente se conserva |
| `strong` / `em` que cruza líneas | Sí, dentro del inline | El marcador va dentro del `strong` |
| Blockquote | Sí | Dentro del `p` |
| Listas y listas anidadas | Sí | También task lists |
| Lista ordenada | Sí | |
| Bloque de código con cercas | Sí, por línea de contenido | Las cercas no tienen marcador |
| Bloque de código indentado | Sí, por línea | |
| Tabla GFM | Sí, por fila de datos | El delimitador no tiene marcador; *snap* a la cabecera |
| `hr` | No | Se usa el rect del `hr` |
| Imagen sola en un párrafo | No | Se usa el rect del `p` |
| Footnotes | Sí, en la definición | Se renderizan al final; el marcador conserva la línea original |
| Línea en blanco | No | *Snap* a la última línea del bloque anterior |

Inventario medido: **30 marcadores para 30 de 51 líneas**; las 21 restantes son líneas en blanco, cercas, delimitador de tabla, subrayado setext, `hr` y el párrafo de solo imagen (`LM` §4.4).

### 5.5 Límites reales de precisión

- **Sin columna.** Centrar la fila exacta del caret dentro de una línea reflowada exigiría mapear la columna del Markdown a un índice del texto renderizado. En la línea de prueba con un enlace, 59 caracteres de origen producen 33 renderizados (44 % invisibles). Se descarta (`LM` §6.4).
- **`code` inline con salto de línea.** `` `a\nb` `` convierte el salto en un espacio, así que la línea siguiente no empieza fila nueva; comparte `y` con la anterior. Es el único caso medido que rompe la invariante «una línea = una fila» (`LM` §7).
- **Línea de origen de 2000+ caracteres.** Se centra su primera fila; el resto se ve con scroll.
- **Enlaces con título en varias líneas.** Misma causa que el `code` inline; `[Inferencia]`.
- **HTML crudo.** Sin marcador ni bloque; respaldo al bloque anterior.

### 5.6 Coste y compatibilidad (`LM` §5.6, §8)

- `[Hecho]` **+5 a 6 ms de mediana (+8 a 9 %)** sobre un render de ~70 ms, en un documento de 1041 líneas / 4240 palabras con 600 marcadores.
- `[Hecho]` **+55 % de bytes de HTML**; el render de react-markdown ya domina el coste.
- `[Hecho]` Sin dependencias nuevas: `unist-util-visit`, `@types/mdast` y `@types/hast` no son dependencias directas y pnpm no las expone. El recorrido se escribe a mano y los tipos son estructurales y locales.
- `[Hecho]` `react-dom` solo está en `devDependencies`: la medición usa APIs del DOM, no `react-dom/server`.

---

## 6. Preview: seguimiento del puntero

### 6.1 Diseño elegido (`PS` §4.5)

Una **única extensión `ViewPlugin` constante de módulo** (`pointerGesture`, en `src/renderer/src/editor/pointer-selection.ts`) detecta el fin de gesto:

- `mousedown` en `contentDOM` (solo botón principal),
- `mouseup` y `touchend` en `document`,
- tras un `requestAnimationFrame`, despacha **una sola transacción** con dos cargas:
  1. la anotación `pointerSelectionEnd`,
  2. el efecto `EditorView.scrollIntoView(head, { y: 'center' })`.

`TextEditor.onUpdate` reconoce la anotación y publica `{ line, column, origin: 'pointer' }`. **Una transacción `select.pointer` sin anotación nunca se publica.** No hay callbacks nuevos, ni props nuevas, ni estado de gesto en el store.

Ventajas: el store solo contiene **carets asentados**; el selector del preview es trivial; editor y preview se enteran con el mismo `head` y en el mismo update; una sola detección de gesto.

### 6.2 Por qué pierden las alternativas (`PS` §4.2-4.4)

| Diseño | Por qué no |
|---|---|
| Publicar cada `select.pointer` + debounce | No hay señal de fin; un arrastre lento con pausas recentra con el botón pulsado; un clic fuera de selección publica en `mousedown` |
| Callback en la fábrica de extensiones | Convierte el array constante en fábrica, obliga a blindar la identidad del callback y mantiene la especificación del plugin: es el diseño D con un callback extra |
| Listener documental en el wrapper React | Duplica `mousedown`/`mouseup`/flag/`rAF`/guardas y saca la publicación del ciclo de update de CodeMirror |
| `domEventObservers` | Solo escucha en `contentDOM`; no ve un arrastre que termina fuera |
| El preview lee la `EditorView` | Invierte el flujo de datos y reimplementa la política en la capa equivocada |

### 6.3 Store y selectores (`PS` §7)

```ts
export type CursorOrigin = 'keyboard' | 'pointer'

export type EditorCursor = {
  line: number
  column: number
  origin: CursorOrigin
}
```

Invariante: **`EditorStatus.cursor` es siempre un caret asentado.** `selectPreviewLine` devuelve la línea para ambos orígenes; el filtro por origen deja de existir.

| Situación | `docChanged` | `selectionSet` | Anotación | Origen |
|---|---|---|---|---|
| Escribir, pegar, cortar, undo/redo, toolbar | sí | — | — | `keyboard` |
| Flechas, Home/End, Ctrl+A, PageUp/PageDown | no | sí | — | `keyboard` |
| IME | sí | — | — | `keyboard` |
| Transacción intermedia de clic/arrastre | no | sí | no | `null` (no publica) |
| Fin de clic/arrastre/clic sobre el mismo caret | no | no | sí | `pointer` |
| Foco, scroll, geometría, resize | no | no | no | `null` |

`[Hecho]` En `@uiw/react-codemirror`, una transacción de solo efectos sí produce `onUpdate`; el plugin constante sobrevive a la reconfiguración que `@uiw` hace en cada tecla (medido: 1 construcción con constante de módulo vs. 3 con especificación por render). `tr.userEvent` no existe en `@codemirror/state`; se usa `isUserEvent` (`PS` §3.2).

### 6.4 Secuencias (`PS` §11)

| Gesto | Qué ocurre |
|---|---|
| Clic fuera de una selección | La selección se fija en `mousedown`; el `mouseup` documental programa un frame; se publica una vez con el caret final |
| Clic dentro de una selección existente | El `mousedown` no cambia la selección; el `mouseup` la colapsa; el frame lee el caret final |
| Arrastre | Cero publicaciones durante el gesto; una al soltar |
| Arrastre que termina fuera del contenido | El listener documental lo ve y publica igualmente |
| Doble / triple clic | Una publicación por clic; el segundo delta suele ser pequeño ⇒ instantáneo |
| Shift+clic | Una publicación con el extremo activo |
| Clic sobre el mismo caret | No hay transacción de selección, pero el frame publica y recentra |
| Botón derecho / central | No publica |

### 6.5 Límites y decisiones abiertas (`PS` §14, §16)

- **`Ln`/`Col` se congelan durante un arrastre** hasta soltar. Es la contrapartida de no meter estado de gesto en el store; alternativa: `settled: boolean` y dos emisiones por gesto.
- **Clic en la misma línea tras scroll manual del preview** no re-renderiza (el selector devuelve la misma línea). Alternativa: `cursorRevision`, que choca con «column-only no re-renderiza».
- **`mouseup` perdido al soltar fuera de la ventana.** Mitigación propuesta: `mousemove` con `buttons === 0`, restringido a ratón.
- **Touch real** no verificable sin dispositivo.
- **IME**: no suprimir en la primera versión; verificar con fcitx/ibus en Electron.

---

## 7. Preview: animación de saltos grandes

### 7.1 Bucle (`SS` §3.1)

El mismo bucle del editor, con el `scroller` del preview:

```text
DURATION = 150 ms
easeOutCubic(t) = 1 - (1 - t)^3
```

- Un solo `requestAnimationFrame` y un token `run`; cada petición invalida el anterior.
- El primer frame se clampea a `t = 0`.
- Se escribe `scrollTop` directamente; no se usa `scrollTo({ behavior: 'smooth' })` ni `scroll-behavior: smooth` (el user agent decide duración y curva, anima todas las asignaciones, no tiene umbral ni cancelación real).
- `.preview-scroller` debe declarar `scroll-behavior: auto`.

### 7.2 Umbral (`SS` §4)

No existe `defaultLineHeight` en el preview. Fórmula recomendada:

```text
lineUnit  = rowHeightOfTarget            // una fila visual, nunca el span completo del bloque
            ?? readLineUnit(targetBlock) // CSS resuelto: 'normal', número sin unidad o px
            ?? readLineUnit(article)
            ?? 22                        // 13px × 1.625, la tipografía real de `p`
threshold = max(lineUnit, clientHeight / 6)
```

- `[Hecho]` `p` mide 21.125 px de `line-height` (`--text-sm: 13px` × `--leading-relaxed: 1.625`); `h1` mide 32 px; `pre` 18.7 px. No hay una cifra única.
- `[Inferencia]` `H/6` domina para todo panel de más de ~127 px, así que el comportamiento por defecto depende de una regla estable; `lineUnit` solo protege paneles degenerados.
- El umbral se evalúa sobre `abs(target - scrollTop)`, no sobre la distancia del caret al centro.

### 7.3 Máquina de estados (`SS` §5)

```text
                 request(target, 'caret') && |delta| > threshold && !reducedMotion
   ┌────────┐ ────────────────────────────────────────────────────────────────► ┌───────────┐
   │  idle  │                                                                    │ animating │
   └────────┘ ◄─────────────────────────────────────────────────────────────── └───────────┘
        ▲        t >= 1 · cancel(reason) · retarget con |delta| <= threshold
        │
        └── request(...) con |delta| <= threshold, reason = 'layout', reducedMotion u oculto
```

- **Cancelan:** `wheel`, `touchstart`, `pointerdown`/`mousedown` sobre el scroller, `resize`, `ResizeObserver`, cambio de modo/desmontaje, cambio de `markdown` (cancelar **antes** de reescribir espaciadores), `scroll` con desviación > epsilon.
- **Retargetean:** nueva línea de caret; se recalcula el destino desde el `scrollTop` **actual**, no desde el anterior.
- **Razón de la petición:** `'caret' | 'layout'`. Solo `'caret'` puede animar; resize, montaje, cambio de modo y carga de imagen son instantáneos.
- **Guard de la barra:** mientras `animating`, cada evento `scroll` compara el `scrollTop` real con el último escrito. `SCROLL_EPSILON = 2` px absorbe subpíxeles y el redondeo de `scrollHeight`/`clientHeight`. Un clamp vivo evita falsos positivos cuando `scrollHeight` encoge.

### 7.4 Orden dentro de `useLayoutEffect` (`SS` §6)

1. Cancelar cualquier animación en curso si cambió el `markdown`.
2. Escribir las alturas de los espaciadores superior e inferior.
3. Medir el objetivo (`findTarget` + `lineRect`/`blockRect`).
4. Calcular y clampear `scrollTop`.
5. Pedir al animador `request(target, { reason: 'caret' | 'layout' })`.

`overflow-anchor: none`, `overscroll-behavior: contain` y, opcionalmente, `scrollbar-gutter: stable` en el scroller (`PREV` §3.3, `SS` §3.3).

### 7.5 Reduced motion (`SS` §6.3)

`matchMedia('(prefers-reduced-motion: reduce)').matches` se lee **en cada petición**. No hace falta listener `change` ni cleanup: la ventana de 150 ms no lo justifica. Guarda para jsdom, donde no existe `matchMedia`.

---

## 8. Módulo compartido entre editor y preview

### 8.1 Recomendación

Crear `src/renderer/src/scroll/smooth-scroll.ts` con:

```ts
export const DURATION = 150
export const SCROLL_EPSILON = 2

export function easeOutCubic(t: number): number
export function scrollThreshold(lineUnit: number, viewportHeight: number): number
export function prefersReducedMotion(): boolean
export function isForeignScroll(actual: number, expected: number): boolean

export type Scroller = { scrollTop: number; clientHeight: number; scrollHeight: number }
export type FrameScheduler = {
  now(): number
  requestFrame(callback: (now: number) => void): number
  cancelFrame(handle: number): void
  reducedMotion(): boolean
}

export function createScrollAnimator(scroller: Scroller, scheduler: FrameScheduler): {
  request(target: number, options: { lineUnit: number }): void
  cancel(reason: string): void
  isAnimating(): boolean
}
```

**Qué se comparte:** duración, curva, umbral, epsilon, lectura de reduced motion y el bucle cancelar/retargetear.
**Qué NO se comparte:** cálculo del destino, medición (`lineBlockAt` vs `Rect`/`Range`), espaciadores, listeners y ciclo de vida (facet de CodeMirror vs `useLayoutEffect`).

`SS` recomienda que el preview lo consuma ahora y que el editor lo adopte al implementar `TW` §8.3-8.4; adoptarlo en ambos a la vez amplía el alcance. Es una decisión abierta (`SS` §13.2).

`[Inferencia]` La abstracción está justificada: la decisión de producto «suave solo en saltos grandes» debe tener una sola implementación; duplicar 40 líneas invita a que los umbrales diverjan.

---

## 9. Cambios por archivo

| Archivo | Cambio | Riesgo |
|---|---|---|
| **nuevo** `src/renderer/src/editor/typewriter.ts` | Extender, padding, `TypewriterAnimation`, `scrollHandler`, `CenterOnPointer` y funciones puras | Medio |
| **nuevo** `src/renderer/src/editor/pointer-selection.ts` | `pointerSelectionEnd`, `isPointerGestureEnd`, `PointerGesture`, `pointerGesture` | Medio: listeners documentales; limpiar en `destroy` |
| **nuevo** `src/renderer/src/editor/TextEditor/cursor-origin.ts` | `cursorOrigin(update)` puro | Ninguno |
| `src/renderer/src/editor/extensions.ts` | Añadir `typewriter` y `pointerGesture` al array constante | Bajo |
| `src/renderer/src/editor/TextEditor/TextEditor.tsx` | Calcular `origin`, no publicar `null`, publicar `{ line, column, origin }` | Bajo |
| `src/renderer/src/editor/theme.ts` | Revisar el padding de `.cm-content` (lo reemplaza el plugin) | Bajo |
| `src/renderer/src/state/status-store.ts` | `CursorOrigin`, `EditorCursor`, `selectPreviewLine`, `usePreviewLine` | Bajo |
| `src/renderer/src/state/use-editor-status.ts` | Tipar `publishCursor` con `EditorCursor` | Bajo |
| **nuevo** `src/renderer/src/workspace/MarkdownPreview/remark-source-line-markers.ts` | Plugin de remark con marcadores | Medio |
| **nuevo** `src/renderer/src/workspace/MarkdownPreview/rehype-code-line-markers.ts` | Plugin de rehype para `pre > code` | Bajo |
| **nuevo** `src/renderer/src/workspace/MarkdownPreview/source-lines.ts` | Helpers puros: split, `firstCodeLine`, `nearestMarkerLine`, `keepContiguousRows`, `centerScrollTop` | Ninguno |
| **nuevo** `src/renderer/src/workspace/MarkdownPreview/PreviewCursorSync.tsx` | Suscripción, `useLayoutEffect`, `ResizeObserver`, animación | Medio |
| **nuevo** `src/renderer/src/workspace/MarkdownPreview/preview-sync.ts` | `readSourceBlocks`, `findBlockForLine`, espaciadores, `findTarget`, `lineRect` | Ninguno |
| `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx` | Pasar a ser el scroller; refs, espaciadores, plugins, `<PreviewCursorSync>` | Medio |
| `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx` | Eliminar el wrapper `overflow-y-auto` | Bajo |
| **nuevo** `src/renderer/src/scroll/smooth-scroll.ts` | Animador y constantes compartidas | Bajo |
| Tests nuevos | Ver §10 | — |

No se toca `src/main`, `src/preload`, IPC, SQLite ni migraciones. No se añaden dependencias: `react-markdown` y `@codemirror/*` ya están.

---

## 10. Plan de pruebas

### 10.1 Jest, funciones puras (la mayor parte)

**Editor** (`src/renderer/src/editor/typewriter.test.ts`):

- El extender añade `scrollIntoView` solo si `tr.scrollIntoView`; no lo añade en PageUp/PageDown ni en transacciones sin bandera.
- `computeTypewriterPadding(H, L)` con `H > L`, `H = L`, `H = 0`: `Pt`/`Pb` y clamping.
- `computeCenterTarget` con primera, intermedia y última línea; línea envuelta.
- `typewriterThreshold`, `shouldAnimateCenter` y `easeOutCubic` en los bordes `t = 0`, `t = 1`.

**Preview, anotación** (`source-lines.test.ts`):

- `splitTextIntoSourceLines("a\nb", 3)` → `[{3,'a'},{4,'b'}]`; CRLF; recorte de espacio inicial.
- `firstCodeLine` con cerca cerrada, cerca sin cierre e indentado.
- `nearestMarkerLine([8], 9) → 8`; `([35,37,38], 36) → 35`; `([27,28,29], 30) → 29`.
- `keepContiguousRows` y `centerScrollTop` con clamp y span mayor que el viewport.
- El transformer sobre árboles mdast escritos a mano: nodo de una línea, multilínea, dos nodos en la misma línea, hermano `break`, nodo sin `position`.

**Preview, puntero** (`cursor-origin.test.ts`):

- Sin `docChanged` ni `selectionSet` ni anotación → `null`.
- `docChanged` → `keyboard`.
- `selectionSet` con `select` → `keyboard`.
- `selectionSet` con `select.pointer` sin anotación → `null`.
- Anotación `pointerSelectionEnd` → `pointer`.
- `docChanged` + `select.pointer` → `keyboard` (la escritura manda).

**Preview, animador** (`smooth-scroll.test.ts`), con scheduler y scroller inyectados:

- Easing y `t` clampeado.
- Delta bajo el umbral → instantáneo, cero frames.
- Delta alto → frames hasta el destino exacto.
- Retarget a mitad de vuelo.
- Cancelación por rueda y por `scroll` ajeno.
- `reducedMotion()` → cero frames.
- `clientHeight = 0` → no mide ni anima.

### 10.2 Jest, integración sin layout (jsdom)

- `MarkdownPreview`: `[data-source-line="1"]` dentro del `h1`; el párrafo de dos líneas tiene marcadores 3 y 4 con `<br>` entre ellos; la tabla anota `div` y `tr`; el bloque de código tiene tres spans y conserva `textContent`; las footnotes conservan la línea original.
- Regresión: `getByText('sturdy').tagName === 'STRONG'` (`AT:700`) y `getByText('world')` (`AT:744`).
- Store: `selectPreviewLine` devuelve la línea para `keyboard` y `pointer`; publicar la misma línea dos veces no re-renderiza.
- Click y arrastre: despachar eventos de ratón sobre el editor y comprobar que solo se publica al soltar (`PS` §12.2).
- Sin `ResizeObserver` ni `matchMedia` en jsdom: no debe lanzar.

`[Hecho]` jsdom no mide layout (`src/renderer/src/test/setup.ts:4-29`, `AGENTS.md:60-65`). Ningún test de Jest debe afirmar geometría.

### 10.3 Chromium headless / Electron (geometría)

**Editor** (ya medido en `TW` §8.7): salto grande 150 ms, ajuste pequeño instantáneo, retarget, reduced motion, rueda, `y: "start"`, clic real, arrastre, doble clic, editor oculto, destinos 0/1176/2376, CSS smooth.

**Preview**, con un artículo real de ~1000 líneas:

1. Cobertura de marcadores: toda línea con texto tiene marcador; blancas, cercas, delimitadores y subrayados no.
2. Una fila por línea: distancia entre marcadores consecutivos ≈ `line-height` local (±1 px).
3. Rect del marcador: `width === 0`, `height` = línea, `y` dentro del bloque.
4. Centrado por línea: el centro del span de la línea L a ±2 px del centro del scroller.
5. Línea reflowada: el span tiene tantas filas como `getClientRects` y su altura es la del bloque de filas.
6. Bloque de código: la línea vacía intermedia se centra (no salta al centro del `pre`).
7. Tabla: cada fila se centra en su `tr` (±3 px por el padding de celda).
8. Footnotes: al editar la definición se muestra el pie; una línea posterior del cuerpo no salta al pie.
9. Espacio finito: `scrollTop = T + L` deja el último bloque en `top = 0`; `scrollHeight - clientHeight` es finito.
10. Animación: salto ≥ 6 líneas animado; ≤ 1 línea instantáneo; rueda y barra cancelan; reduced motion con 0 frames.
11. Workspace: `Workspace.scrollTop === 0`; el panel de Story no se mueve.
12. Sin warnings de React ni de `ResizeObserver`.
13. Paridad visual: con `[data-source-line] { display: none }`, `scrollHeight` igual (±1 px).

### 10.4 Comandos

```bash
pnpm test
pnpm test -- src/renderer/src/editor
pnpm test -- src/renderer/src/workspace/MarkdownPreview
pnpm test -- src/renderer/src/state/status-store.test.ts
pnpm typecheck
pnpm lint
pnpm build
```

### 10.5 Criterios de aceptación

- `pnpm test` verde **sin modificar tests existentes**.
- `pnpm typecheck` y `pnpm lint` verdes, sin dependencias nuevas.
- Editor: R1-R5 verificados en Electron con el harness y a mano.
- Preview: R6-R9 verificados con las métricas de §10.3, tolerancia ±2 px.
- El coste del render anotado no supera el 15 % del render actual (medido: 8-9 %).
- Al desmontar el editor o el preview no quedan listeners ni frames pendientes.

---

## 11. Casos límite consolidados

| Caso | Comportamiento esperado | Estado |
|---|---|---|
| Documento vacío o de una línea | Padding calculado; `target = 0`; sin animación | `[Hecho]` `TW` §5.6 |
| Documento corto | El scroll libre existe y muestra espacio finito | `[Hecho]` `TW` §5.6 |
| Primera línea | Centrada desde el inicio | `[Hecho]` `TW` §5.2 |
| Última línea al escribir | Centrada; el viewport sube `(H-L)/2` | `[Hecho]` `TW` §5.3 |
| Última línea con scroll manual al máximo | `top = 0`, `H-L` px en blanco debajo | `[Hecho]` `TW` §5.4 |
| Editor oculto (`preview`) | `clientHeight = 0`; no centra ni anima | `[Hecho]` `TW` §7.4 |
| Resize | Recalcula padding; cancela animación | `[Hecho]` `TW` §7.4 |
| Tecleo rápido | Retarget sin cola; ajustes pequeños instantáneos | `[Hecho]` `TW` §8.7 |
| Rueda / trackpad | Cancela la animación; scroll manual manda | `[Hecho]` `TW` §8.7 |
| Barra de scroll | Debe cancelar; triple defensa con `pointerdown` + `scroll` + epsilon | `[Decisión abierta]` verificar en Electron |
| Clic sobre el mismo caret | Publica y recentra | `[Hecho]` `PS` sonda 03 |
| Clic en otra línea del preview tras scroll manual | No re-renderiza si la línea no cambió | `[Decisión abierta]` `PS` §16.7 |
| Arrastre que suelta fuera de la ventana | Sin publicación hasta el siguiente gesto | `[Inferencia]` `PS` §14 |
| Doble / triple clic | 2-3 publicaciones; deltas pequeños | `[Inferencia]` `PS` + umbral |
| Clic derecho que mueve el caret | No publica | `[Decisión abierta]` `PS` §16.8 |
| IME / composición | Puede retargetear por actualización; no suprimir en v1 | `[Decisión abierta]` `TW` §7.3, `PS` §16.5 |
| Touch | `touchend` + guarda contra `mouseup` sintético | `[Decisión abierta]` validar en dispositivo |
| Línea en blanco | *Snap* a la última línea del bloque anterior | `[Hecho]` `LM` §7 |
| Subrayado setext / delimitador de tabla / cerca | *Snap* a la línea vecina | `[Hecho]` `LM` §7 |
| `hr`, imagen sola | Rect del bloque | `[Hecho]` `LM` §7 |
| `code` inline multilínea | La línea siguiente comparte fila | `[Hecho]` `LM` §7 |
| Footnote definición | Salta al pie exacto | `[Hecho]` `LM` §7 |
| Línea de 2000+ caracteres | Centra la primera fila del span | `[Hecho]` `LM` §6.4 |
| Imagen o fuente que carga tarde | `ResizeObserver` re-mide | `[Hecho]` `PREV` §3.7 |
| StrictMode | Sincronización idempotente; cleanup de observer y animador | `[Inferencia]` `PREV` §3.8, `SS` §5 |
| jsdom | `clientHeight = 0`; los efectos salen temprano | `[Hecho]` `PREV` §3.7 |

---

## 12. Decisiones abiertas y recomendaciones

| # | Decisión | Recomendación |
|---|---|---|
| 1 | Rect de una línea reflowada mayor que el viewport | Centrar la fila 0; no introducir columna |
| 2 | `code` inline multilínea | Aceptar que comparta fila; no cambiar el render |
| 3 | Coste +8-9 % del render anotado | Aceptar; perfilar solo si se nota en documentos enormes |
| 4 | Marcador en celda de tabla o en `tr` | Indiferente (4,5 px); preferir `tr` si se simplifica |
| 5 | Footnotes | Permitir la coincidencia exacta; excluirlas del respaldo |
| 6 | `Ln`/`Col` congelados durante el arrastre | Aceptar; medir la queja real antes de añadir `settled` |
| 7 | Clic en la misma línea tras scroll manual | Aceptar que no recentre; `cursorRevision` solo si se percibe |
| 8 | Publicar cursor inicial al montar | No; el espaciador superior ya centra el primer bloque |
| 9 | `queueMicrotask` vs `rAF` para el fin de gesto | Mantener `rAF`; no cambiar sin harness |
| 10 | `mousemove` con `buttons === 0` como red | Incluirlo; cubre el `mouseup` perdido |
| 11 | IME | No suprimir en v1; verificar fcitx/ibus en Electron |
| 12 | Touch | Validar en dispositivo antes de cerrar |
| 13 | Barra de scroll | Triple defensa; verificar en Electron |
| 14 | El editor adopta el animador compartido ahora o después | Después; el preview lo consume primero |
| 15 | `line-height` computado real en Chromium | Cerrar con una sonda de una línea en la app |
| 16 | Umbral `H/6` vs `H/8` | Mantener `H/6` hasta medir en Electron |
| 17 | `scrollbar-gutter: stable` | Opcional; medir el cambio de ancho |
| 18 | Scroller del preview enfocable (`tabindex`) | Fuera de alcance |
| 19 | Clic en el gutter del editor | Fuera de alcance (no hay números de línea) |
| 20 | Clic derecho que mueve el caret | No centrar; decidir si molesta |

---

## 13. Riesgos y mitigaciones

1. **`mouseup` perdido** al soltar fuera de la ventana. Mitigación: `mousemove` con `buttons === 0` (`PS` §14).
2. **Arrastre de la barra de scroll** con entrega de eventos variable. Mitigación: `pointerdown` + `scroll` con epsilon + clamp vivo (`SS` §5.3).
3. **`scroll-behavior: smooth` accidental.** Mitigación: fijarlo a `auto` en `.cm-scroller` y en el scroller del preview.
4. **Scroll anchoring.** Mitigación: `overflow-anchor: none`.
5. **Carrera entre el commit del Markdown y la publicación del cursor.** Mitigación: incluir `markdown` en las dependencias del efecto; el commit siguiente corrige (`PREV` §9.1).
6. **Re-render del preview por columna.** Mitigación: `selectPreviewLine` devuelve solo la línea; un cambio de columna no re-renderiza.
7. **Doble listener de gesto** si editor y preview lo implementan por separado. Mitigación: una sola extensión publica la anotación y el preview consume el store.
8. **Deriva de umbrales** entre editor y preview. Mitigación: módulo compartido `smooth-scroll.ts`.
9. **Coste del render anotado** en documentos enormes. Mitigación: medido +8-9 %; cachear por string solo si el profiling lo justifica.
10. **`code` inline multilínea** rompe «una línea = una fila». Mitigación: documentado y aceptado; el marcador comparte `y`.
11. **IME** puede mover el candidato si se retargetea durante composición. Mitigación: verificar en Electron; excluir `.compose` solo si hay saltos.
12. **Touch real** no verificado. Mitigación: probar en dispositivo.
13. **Tests de layout en jsdom** no son posibles. Mitigación: harness Chromium/Electron; jsdom solo para estructura y política.

---

## 14. Qué se puede implementar y qué no

**Se puede:**

- Caret centrado al escribir, con flechas, con clic y con arrastre en el editor.
- Primera línea centrada y última línea centrada al escribir.
- Scroll libre finito: última línea al top con `H-L` px en blanco debajo.
- Animación de 150 ms ease-out solo en saltos grandes, cancelable, retargeteable y con reduced motion.
- Preview siguiendo el caret por línea de origen al escribir, con flechas y con clic.
- Preview con scroll libre finito: último bloque al top.
- Animación del preview con el mismo contrato que el editor.
- Story y Article, siempre activo, sin dependencias nuevas.

**No se puede (o queda fuera de alcance):**

- Centrar la fila visual exacta del caret dentro de una línea que reflowa: se centra el span de la línea de origen. La columna requeriría un mapeo sintaxis→texto renderizado.
- Mover el caret del editor haciendo clic en el preview (mapeo inverso).
- Garantizar el centrado exacto de bloques más altos que el viewport.
- Verificar IME y touch sin la app Electron y un dispositivo real.

---

## 15. Siguiente paso

La investigación está cerrada. Queda pendiente, cuando se apruebe:

1. Escribir `.scratch/caret-follow-scroll/spec.md` con los seams ya acordados:
   - integración de la app completa con el fake data port (Article y Story, teclado, clic, arrastre);
   - unitarios puros del extender, padding, anotación, rect, origen y animador;
   - harness headless/Electron para geometría y tiempos.
2. Crear los tickets en `.scratch/caret-follow-scroll/issues/` siguiendo `docs/agents/issue-tracker.md` y `docs/agents/triage-labels.md`.
3. Implementar con TDD y verificar con `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y la app Electron.

No se ha tocado código de producción.
