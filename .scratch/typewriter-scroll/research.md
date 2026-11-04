# Investigación: typewriter scrolling y scroll libre en el editor CodeMirror 6

**Estado:** investigación histórica. El centrado del caret del editor se retiró por decisión de producto el 2026-10-26: no quedan `typewriterScroll`, `typewriterAnimation` ni el padding asimétrico. Se conserva solo el scroll inferior (`padding-bottom = H - L`) en `src/renderer/src/editor/scroll-past-end.ts`, para llevar la última línea al borde superior. El preview ya no sigue al caret: editor y preview usan scroll proporcional (`.scratch/scroll-sync/spec.md`).
**Fecha:** 2026-10-24.
**Objetivo:** determinar si el editor compartido de DraftWrite (CodeMirror 6 vía `@uiw/react-codemirror`) puede, por un lado, mantener la línea del cursor centrada verticalmente mientras se escribe y, por otro, permitir que la última línea del documento se desplace manualmente hasta el borde superior del viewport dejando un espacio en blanco finito debajo. Documentar una implementación combinada, sin dependencias nuevas.

**Actualización de producto (2026-10-24):** se incorporan dos requisitos adicionales. El clic debe mover el cursor y centrarlo; el arrastre debe centrar al soltar, no en cada evento intermedio. Los saltos grandes deben animarse ~150 ms con ease-out, mientras que los ajustes pequeños, los destinos ya cercanos al centro y `prefers-reduced-motion` deben ser instantáneos. La animación debe ser cancelable y retargetable. Esta actualización investiga ambos requisitos y ajusta las decisiones, los criterios de aceptación y los casos de harness; no implementa código.

Convenciones de este informe:

- **[Hecho]**: verificado leyendo código, tests, configuración, las fuentes de los paquetes instalados o una medición propia reproducible.
- **[Inferencia]**: consecuencia razonable de los hechos, pero no una regla escrita en el repo.
- **[Decisión abierta]**: el repo o el producto no la resuelven; requiere que la persona usuaria elija.

---

## Resumen ejecutivo

- **[Hecho]** No existe un modo «typewriter» nativo en las versiones instaladas de CodeMirror ni en `@uiw/react-codemirror`: una búsqueda de `typewriter` en `@codemirror/*` y `@uiw/react-codemirror` no devuelve coincidencias.
- **[Hecho]** CodeMirror 6 ofrece la pieza base del centrado: `EditorView.scrollIntoView(pos, { y: 'center' })` devuelve un efecto que centra verticalmente el cursor en el scroller (`node_modules/@codemirror/view/dist/index.d.ts:1124-1156`).
- **[Hecho]** La recomendación del maintainer de CodeMirror, Marijn Haverbeke, es un `EditorState.transactionExtender` que añada ese efecto a las transacciones que ya piden scroll del cursor. En el mismo hilo del foro, su respuesta de 2024 indica que este enfoque causa menos reflujos que la receta anterior basada en `ViewPlugin` y `requestMeasure` (`https://discuss.codemirror.net/t/cm6-scroll-to-middle/2924`, posts 4 y 10).
- **[Hecho]** El editor es único y compartido: `TextEditor` usa `articleEditorExtensions` y lo montan tanto `StoryEditor` como `ArticleEditor` (`src/renderer/src/editor/TextEditor/TextEditor.tsx:3-4,31`; `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:101`; `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:119`).
- **[Hecho]** El layout ya está acotado con `min-h-0`, así que el scroll ocurre dentro de `.cm-scroller` y no arrastra el workspace. Ese es el requisito previo para que el centrado y el scroll libre funcionen (`.scratch/editor-linebreaks-scroll/spec.md:24-35,43-44,52-55`).
- **[Hecho]** `scrollPastEnd()` no resuelve las dos necesidades a la vez. Su padding inferior real es `H - L - documentPadding.top - 0.5` (`node_modules/@codemirror/view/dist/index.js:10049-10075`). Si se añade un padding superior `P`, el padding inferior baja a `H - L - P - 0.5` y la última línea ya no puede llegar al borde físico superior: se queda a la altura de `P` (la fórmula da `P + 0.5`, pero el redondeo entero de `scrollHeight` puede eliminar la fracción). La documentación oficial lo describe como «margen inferior equivalente a la altura del editor menos una línea» (`index.d.ts:1671-1680`), pero la implementación descuenta además el padding superior.
- **[Inferencia]** La solución combinada es un único `ViewPlugin` de padding asimétrico, sin `scrollPastEnd()`: `padding-top = (H - L) / 2` y `padding-bottom = H - L`, donde `H` es `scrollDOM.clientHeight` y `L` es `defaultLineHeight`. Con eso, la primera línea queda centrada con `scrollTop = 0`, la última se centra al escribir con `scrollTop = D - L`, y el scroll manual máximo `D - L + (H - L) / 2` deja la última línea en el borde superior con `H - L` px en blanco debajo. El máximo es finito y no crece al hacer scroll.
- **[Hecho]** Medición propia con un harness mínimo de CodeMirror 6.43.14 en Chromium headless (`H = 430`, `L = 24`, `D = 2400`): con `padding-top = 203` y `padding-bottom = 406`, el primer caret queda a 215 px (centro), el último caret al escribir queda a 215 px con `scrollTop = 2376`, y el máximo manual es `2579`, con la última línea en `top = 0`. Con `scrollPastEnd()` y el mismo padding superior, el máximo es `2376` y la última línea se queda en `top = 203`. La tabla completa está en la sección 6.2.
- **[Hecho]** El tema actual declara `padding: 16px 20px` en `.cm-content` (`src/renderer/src/editor/theme.ts:9-13`). El padding del plugin es absoluto y reemplaza el `padding-top`/`padding-bottom` del tema; no se suma a los 16 px. Los 20 px laterales se conservan porque el plugin no declara `padding-left`/`padding-right`.
- **[Hecho]** Los gutters de CodeMirror ya compensan el padding superior del contenido: `UpdateContext` arranca en `-documentPadding.top` y el primer elemento recibe `marginTop = paddingTop` (`node_modules/@codemirror/view/dist/index.js:11525,11633,11741`). Verificado con `lineNumbers()` y el padding combinado: línea y número de línea coinciden con delta 0 px.
- **[Hecho]** Inkdrop es closed source. Lo que sí es first-party: el autor confirmó en 2017 que el «scroll past end» de Inkdrop era el addon de CodeMirror 5 (`https://forum.inkdrop.app/t/scroll-past-end/169`, post 2) y el historial de versiones registra «Scroll past end should stop at the last line» en v5.4.0 (`https://github.com/inkdropapp/version-history/blob/master/README.md`, línea 1056). La v6 reconstruyó el editor sobre CodeMirror 6 (`https://forum.inkdrop.app/t/inkdrop-desktop-v6-0-0/5571`, post 1), pero no hay fuente pública de su implementación actual. No se usa Inkdrop como fuente técnica.
- **[Hecho]** El clic de puntero no se puede detectar bien desde el `transactionExtender`. CodeMirror marca las selecciones de puntero con `userEvent: "select.pointer"` y `scrollIntoView: false` (`node_modules/@codemirror/view/dist/index.js:4332-4341,4855-4862`). Un clic fuera de la selección despacha la transacción en `mousedown`; un clic dentro de una selección existente la despacha en el `mouseup` documental; un arrastre despacha una transacción colapsada al empezar y otra por cada movimiento; un clic sobre el mismo caret no despacha ninguna. Por eso una condición `tr.isUserEvent('select.pointer')` en el extender centraría al inicio del arrastre y volvería a centrar en cada movimiento, que es justo el jitter que el producto quiere evitar. Verificado en fuente y con eventos reales de Chromium.
- **[Hecho]** `EditorView.scrollHandler` es un facet público que se ejecuta antes de que CodeMirror calcule el rectángulo y escriba `scrollTop`; si devuelve `true`, se suprime el scroll nativo (`node_modules/@codemirror/view/dist/index.d.ts:1234-1250`; `index.js:3463-3466`). Esto permite interceptar solo los efectos `{ y: 'center', x: 'nearest' }`, calcular el destino con `lineBlockAt(head).top` y animar sin que el efecto nativo haga antes un salto a `"nearest"`. Verificado en el harness: primera línea `0`, línea 90 `2136`, última línea `2376`, sin salto intermedio.
- **[Hecho]** El supuesto de que `scrollTop =` siempre es instantáneo es falso si `.cm-scroller` tiene `scroll-behavior: smooth`. En Chromium 150 headless, una asignación directa de `scrollTop = 500` con `scroll-behavior: smooth` estaba en `0` inmediatamente y en `304` a los 120 ms; el efecto de centrado de CodeMirror hacia `2376` estaba en `44` a los 100 ms y en `1775` a los 350 ms. La duración y el easing los decide el navegador, no el producto (MDN: `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior`). Por eso la animación propia debe desactivar `scroll-behavior: smooth` en el scroller y usar `requestAnimationFrame`; no se puede confiar en el efecto nativo para un `150 ms` controlado.
- **[Inferencia]** La solución recomendada para el clic es un `ViewPlugin` que escuche `mousedown` en `contentDOM` y `mouseup`/`touchend` en el documento, espere un `requestAnimationFrame` para que CodeMirror termine de fijar la selección y despache un efecto de centrado. El `ViewPlugin` documental cubre el arrastre que termina fuera del editor; `EditorView.domEventHandlers` solo escucha en `contentDOM` y perdería ese caso (`index.d.ts:1186-1202`).
- **[Inferencia]** La animación recomendada se integra en el mismo `scrollHandler`: calcula el destino con `documentPadding.top + lineBlockAt(head).top + block.height / 2 - clientHeight / 2`, lo recorta a `[0, scrollHeight - clientHeight]` y, si el delta supera `max(defaultLineHeight, clientHeight / 6)` (~72 px con `H = 430`, `L = 24`), anima 150 ms con ease-out cúbico; si no, asigna `scrollTop` directamente. Una nueva petición cancela el frame anterior y arranca desde el `scrollTop` actual. `prefers-reduced-motion: reduce` fuerza el modo instantáneo. No se encola ninguna animación ni se despachan transacciones desde el bucle.
- **[Hecho]** Medición propia en Chromium 150 headless (`H = 430`, `L = 24`): un salto de `0` a `2136` se completó en 10 frames/150 ms; un ajuste de `24` px fue instantáneo; un retarget de `2136` a `0` a mitad de vuelo canceló el frame anterior y terminó en `0`; `prefers-reduced-motion` emulado terminó en el destino sin frames; la rueda canceló en `1531`; un `y: 'start'` nativo canceló la animación y quedó instantáneo; un clic real centró la línea 6 en `120`; un clic pequeño de `24` px fue instantáneo; un arrastre centró una sola vez al soltar (head `30`, destino `96`), incluso terminando fuera del contenido; doble clic centró la palabra seleccionada (`35-39`, destino `120`); el editor oculto no animó ni falló.
- **[Decisión abierta]** Quedan decisiones de producto: activación siempre o con toggle, comportamiento en documentos cortos o de una línea, si el scroll libre está siempre activo, IME, touch real en dispositivos y el caso de la barra de scroll. Las decisiones de clic y suavizado ya están tomadas en esta actualización (sección 8).

**Veredicto:** **[Hecho]** CodeMirror 6 permite implementar las cuatro capacidades con APIs públicas y estables del propio paquete: `transactionExtender` para el centrado de teclado/edición, `ViewPlugin` + listeners documentales para el fin de gesto del puntero y `EditorView.scrollHandler` + `requestAnimationFrame` para la animación selectiva. **[Inferencia]** La implementación sigue siendo pequeña, no toca dominio, IPC ni SQLite, y se puede probar en Jest a nivel de transacción, umbral, easing y decisión de animar; la verificación visual y de cancelación requiere Chromium headless o la app Electron.

---

## 1. Contexto: el editor de DraftWrite

### 1.1 Componente y extensiones

- **[Hecho]** `TextEditor` envuelve `@uiw/react-codemirror` con `height="100%"`, `className="h-full"`, el tema `draftwriteTheme`, las extensiones `articleEditorExtensions` y un callback `onUpdate` (`src/renderer/src/editor/TextEditor/TextEditor.tsx:26-38`).
- **[Hecho]** `articleEditorExtensions` contiene el lenguaje Markdown, `EditorView.lineWrapping` y el `aria-label` del textbox (`src/renderer/src/editor/extensions.ts:1-8`).
- **[Hecho]** El array es una constante de módulo. `@uiw/react-codemirror` concatena las extensiones personalizadas después de las suyas (`node_modules/@uiw/react-codemirror/esm/useCodeMirror.js:96-100`) y reconfigura, entre otras dependencias, cuando cambia la identidad del array (`:147-154`). Añadir extensiones estáticas al array no provoca recreaciones por render.
- **[Hecho]** `StoryEditor` y `ArticleEditor` comparten `TextEditor` y `EditorPreviewLayout` (`StoryEditor.tsx:98-109`; `ArticleEditor.tsx:116-127`). Cualquier extensión añadida a `articleEditorExtensions` afecta a las dos editoras.

### 1.2 Layout y scroll

- **[Hecho]** `EditorPreviewLayout` muestra el editor y/o el preview según `viewMode`; en modo `preview` oculta el editor con la clase `hidden`, sin desmontarlo (`src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx:17-19,25-40`).
- **[Hecho]** El tema fija `line-height: 1.7` en `.cm-scroller` y `padding: 16px 20px` en `.cm-content` (`src/renderer/src/editor/theme.ts:8-13`).
- **[Hecho]** Las secciones raíz de Story y Article usan `min-h-0`, lo que acota la altura del editor y hace que `.cm-scroller` sea el contenedor con scroll. El informe de `editor-linebreaks-scroll` documenta el bug anterior: sin `min-h-0`, CodeMirror crecía con el contenido y `scrollRectIntoView` terminaba desplazando el `Workspace` (`.scratch/editor-linebreaks-scroll/spec.md:24-35,43-44,52-55`).
- **[Inferencia]** Typewriter scrolling y scroll libre dependen de ese arreglo: si el editor no tiene altura acotada, el centrado y el scroll manual intentarían mover el documento entero en lugar del scroller interno.

### 1.3 Transacciones que ya piden scroll

- **[Hecho]** Al escribir, CodeMirror despacha la transacción con `scrollIntoView: true` (`node_modules/@codemirror/view/dist/index.js:4443-4453`).
- **[Hecho]** Los comandos de la toolbar de DraftWrite también lo hacen (`src/renderer/src/editor/commands.ts:29,60,78-85,97-105,111-120`).
- **[Hecho]** Los comandos estándar de movimiento de cursor, undo y redo usan la misma bandera (`node_modules/.pnpm/@codemirror+commands@6.11.1/node_modules/@codemirror/commands/dist/index.js:538,555,581,1382`). PageUp/PageDown usan un efecto explícito con `y: "start"` y no la bandera (`:822-830`).
- **[Inferencia]** Engancharse a `tr.scrollIntoView` cubre escritura, teclado, toolbar, pegar/cortar, undo/redo y movimientos de cursor por teclado (salvo PageUp/PageDown, que usan un efecto explícito), sin tener que enumerar cada comando.

### 1.4 Requisitos y geometría compartida

El producto pide cuatro cosas distintas:

1. **Centrado tipo máquina de escribir:** mientras se escribe, la línea del cursor se mantiene en el centro vertical del editor. También la primera línea debe poder quedar centrada.
2. **Scroll libre hasta el final:** la última línea debe poder llevarse manualmente al borde superior del viewport, dejando un espacio en blanco finito debajo. No es scroll infinito: el máximo lo fija la altura del contenido más un padding constante.
3. **Clic para centrar:** un clic simple mueve el caret y lo centra; un arrastre no persigue cada movimiento y centra al soltar.
4. **Animación selectiva:** solo los saltos grandes se animan (~150 ms, ease-out); los ajustes pequeños, los destinos ya cercanos al centro y `prefers-reduced-motion` son instantáneos. La animación es cancelable y retargetable.

- **[Hecho]** Las cuatro necesidades se resuelven moviendo el mismo par de valores: `padding-top` y `padding-bottom` de `.cm-content`, y calculando el destino de scroll a partir de la geometría de la línea. El centrado de la primera línea exige padding superior; el centrado de la última y el scroll libre exigen padding inferior.
- **[Inferencia]** Diseñarlas juntas evita parches incompatibles. En particular, impide combinar un padding superior propio con `scrollPastEnd()`, que es la combinación que parece natural pero no cumple el «última línea al top» (sección 6). También obliga a que la animación y el clic compartan el mismo destino geométrico y el mismo umbral, para que el comportamiento sea coherente entre teclado, clic y arrastre.
- **[Inferencia]** El clic y la animación no cambian el padding ni el máximo de scroll libre; reutilizan la geometría de las secciones 5 y 8. El preview se investiga aparte, pero puede reutilizar el criterio de umbral y duración.

---

## 2. Cómo funciona el scroll en CodeMirror 6

### 2.1 La API de centrado

```ts
EditorView.scrollIntoView(pos, { y: 'center' })
```

- **[Hecho]** Devuelve un `StateEffect` que se añade a una transacción (`node_modules/@codemirror/view/dist/index.d.ts:1124-1156`).
- **[Hecho]** `y` acepta `"nearest"` (por defecto), `"start"`, `"end"` y `"center"` (`index.d.ts:1130-1137`).
- **[Hecho]** `yMargin` no se usa con `"center"` (`index.d.ts:1144-1147`).

### 2.2 Qué hace `"center"` por dentro

- **[Hecho]** `scrollRectIntoView` calcula el destino vertical con `targetTop = rect.top + rectHeight / 2 - boundingHeight / 2` cuando `y === "center"` y el rect cabe en el viewport (`node_modules/@codemirror/view/dist/index.js:578-584`).
- **[Hecho]** Ese cálculo se hace siempre que se aplica el efecto, no solo cuando el cursor está fuera del viewport. Luego escribe `scrollTop` y deja que el navegador recorte al rango válido (`index.js:603-618`).
- **[Hecho]** La escritura es una asignación directa de `scrollTop`, pero el navegador puede suavizarla si el scroller tiene `scroll-behavior: smooth`: en Chromium 150, el efecto de centrado hacia `2376` estaba en `44` a los 100 ms y en `1775` a los 350 ms. La duración y el easing son del user agent, no de CodeMirror (MDN: `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior`). Medición propia en el harness de la sección 8.
- **[Inferencia]** Por eso `"center"` sirve tanto para «llevar al centro» como para «mantener centrado»: si el cursor ya está centrado, el desplazamiento calculado es cero. Para controlar la duración hay que interceptar antes de `scrollRectIntoView` con `EditorView.scrollHandler` y no usar `scroll-behavior: smooth` en `.cm-scroller` (sección 8).

### 2.3 Orden de efectos: el extender gana al efecto explícito

- **[Hecho]** `EditorState.transactionExtender` corre después de los filtros y solo puede añadir efectos o anotaciones (`node_modules/@codemirror/state/dist/index.d.ts:1350-1363`).
- **[Hecho]** Al resolver la transacción, `extendTransaction` combina el spec original con la extensión y `mergeTransaction` concatena los efectos del extender después de los existentes (`node_modules/@codemirror/state/dist/index.js:2395-2400,2469-2476`).
- **[Hecho]** En `EditorView.update`, primero se procesa la bandera `tr.scrollIntoView` (que crea un destino `"nearest"`) y después se recorren los efectos en orden; cada efecto de scroll reemplaza el destino anterior (`node_modules/@codemirror/view/dist/index.js:8031-8045`).
- **[Hecho]** El destino final no se escribe hasta el ciclo de medida; `docView.scrollIntoView` consulta primero el facet `scrollHandler` y, si un handler devuelve `true`, no calcula el rectángulo ni llama a `scrollRectIntoView` (`index.js:3456-3466`). Ese es el punto de integración de la animación.
- **[Inferencia]** Si una transacción trae un efecto explícito `y: "start"` y además `scrollIntoView: true`, el efecto `"center"` del extender queda último y gana. Esto es deseable para escritura, pero hay que tenerlo en cuenta para comandos que quieran conservar un destino propio.

### 2.4 `scrollMargins` no añade espacio scrolleable

- **[Hecho]** `EditorView.scrollMargins` es un facet que declara zonas del scroller que deben considerarse ocultas, por ejemplo un gutter fijo (`index.d.ts:1375-1383`).
- **[Hecho]** `getScrollMargins` toma el máximo por lado (`index.js:1580-1597`) y `docView.scrollIntoView` lo usa para expandir el rect destino (`index.js:3479-3485`).
- **[Hecho]** No modifica `scrollHeight` ni permite que el primer/último bloque se desplacen más allá de los límites del contenido.
- **[Inferencia]** No sirve como sustituto del padding: aunque se declare medio viewport de margen, el navegador sigue recortando `scrollTop` a `[0, scrollHeight - clientHeight]`.

### 2.5 No hay modo nativo

- **[Hecho]** Las versiones instaladas son `@codemirror/view` 6.43.14, `@codemirror/state` 6.7.6 y `@uiw/react-codemirror` 4.25.12 (`package.json:29-32,39`).
- **[Hecho]** No hay una extensión `typewriter` en esos paquetes. El comportamiento hay que componerlo con las APIs anteriores.
- **[Hecho]** Sí existe `scrollPastEnd()`, pero es solo un padding inferior y no centra la primera línea. Su análisis exacto está en la sección 2.6 y su comparación con la solución combinada en la sección 6.

### 2.6 Qué hace exactamente `scrollPastEnd()`

- **[Hecho]** `scrollPastEnd()` devuelve un `ViewPlugin` más un `contentAttributes` que aplica el padding calculado (`node_modules/@codemirror/view/dist/index.js:10049-10075`).
- **[Hecho]** El plugin arranca con `padding-bottom: 1000px` y solo lo actualiza cuando la altura calculada es `>= 0` (`index.js:10050-10061`). Si el editor está oculto o es más bajo que una línea más el padding superior, conserva los 1000 px iniciales.
- **[Hecho]** La fórmula real es:

```text
padding-bottom = editorHeight - lineHeight - documentPadding.top - 0.5
```

  (`index.js:10056-10057`). `editorHeight` es `scrollDOM.clientHeight` sin escalar (`index.js:6243,6416-6419`); `documentPadding.top` es el `padding-top` medido del `.cm-content` (`index.js:6378-6383,8406-8408`), no el que el tema declaró originalmente.
- **[Hecho]** `documentPadding.top` y `documentPadding.bottom` se obtienen con `parseInt` sobre el `padding-top`/`padding-bottom` calculado (`index.js:6378`), así que trunca fracciones. Por eso el `padding-bottom` CSS de 202.5 px se reporta como 202 en la medición del harness.
- **[Hecho]** La documentación oficial dice que añade «un margen inferior equivalente a la altura del editor, menos una línea, para que cualquier línea pueda llegar al top del editor» (`index.d.ts:1671-1680`; `https://codemirror.net/docs/ref/#view.scrollPastEnd`).
- **[Hecho]** En la práctica, si hay padding superior `Pt`, la última línea no llega al borde físico superior: en el scroll máximo se queda a unos `Pt` px del top (`Pt + 0.5` en la fórmula; el redondeo de `scrollHeight` puede eliminar la fracción). Sin padding superior, la fórmula deja 0.5 px y el redondeo lo lleva a 0.
- **[Inferencia]** `scrollPastEnd` mantiene constante el espacio extra total `H - L - 0.5`, repartido entre el padding superior existente y el inferior. No puede dar a la vez `Pt = (H - L) / 2` (para centrar la primera línea) y `Pb = H - L` (para llevar la última al top), porque eso requiere `1.5 * (H - L)` de espacio extra.
- **[Hecho]** Si se combina con otro `contentAttributes` que declare `padding-bottom`, ambos estilos se fusionan y gana el de la extensión que aparezca antes en el array. La sección 6.6 lo detalla y lo verifica.

---

## 3. Opciones para el centrado

| Opción | Cómo funciona | Ventajas | Límites | Veredicto |
|---|---|---|---|---|
| **A. `transactionExtender` + efecto `"center"`** | Añade `EditorView.scrollIntoView(head, { y: 'center' })` a las transacciones con `scrollIntoView` | Usa el motor de scroll y el centrado existentes; sin transacción extra; menos reflujos; funciona con saltos lejanos porque CodeMirror calcula el viewport antes de medir | Centrado estricto; no permite zona de tolerancia sin código adicional | **Recomendada** |
| **B. `ViewPlugin` + `requestMeasure`** | En `update`, si hubo cambio de selección/documento, mide `coordsAtPos` y ajusta `scrollTop` | Permite tolerancia, animación suave y lógica propia | `coordsAtPos` devuelve `null` fuera del viewport renderizado; hay que coordinar lectura/escritura con `requestMeasure`; más código y más casos límite | Solo si se quiere un comportamiento distinto al centrado estricto |
| **C. `updateListener` que despacha otra transacción** | Al terminar el update, despacha un efecto de centrado | Sencillo de escribir | Duplica transacciones por keystroke; puede provocar bucles o parpadeos; no es la recomendación del maintainer | Descartada |
| **D. Paquete de terceros** | `codemirror-typewriter-scrolling` | Ya existe | Es para CodeMirror 5: versión 0.1.0 con `devDependency "codemirror": "^4.5.0"`; no es compatible con CM6 | Descartada |

### 3.1 Por qué A y no B

La receta original de Marijn (2021) usaba un `ViewPlugin` con `requestMeasure`, `coordsAtPos` y `scrollDOM.scrollTop` (post 4 del hilo del foro). En 2024 el propio Marijn recomendó el `transactionExtender` porque añade el efecto a la misma transacción, evita reflujos y reutiliza el código de centrado existente (post 10). La receta de zudo (fuente secundaria) sigue el enfoque B con `requestAnimationFrame` y una zona de tolerancia; es útil si se busca un comportamiento menos estricto, pero no es la opción mínima.

La opción A sigue siendo la recomendada para el centrado de teclado y edición. El clic y la animación no la reemplazan: se añaden como extensiones separadas. El clic necesita un hook de fin de gesto (sección 8.2) y la animación se integra en el mismo efecto `"center"` mediante `EditorView.scrollHandler` (sección 8.3), sin volver al `ViewPlugin` con `coordsAtPos` para el caso general.

### 3.2 Por qué no C

`ViewPlugin.update` no puede despachar otra transacción: `EditorView.update` lanza `"Calls to EditorView.update are not allowed while an update is in progress"` si ya hay un update en curso (`node_modules/@codemirror/view/dist/index.js:7984-7986`). `updateListener` sí corre cuando el update ya terminó, pero añade una transacción por cada keystroke y complica el control de bucles. El extender evita ambos problemas.

### 3.3 Por qué no D

El paquete `codemirror-typewriter-scrolling` es de la era CodeMirror 5. Su `devDependency` es `codemirror ^4.5.0` y su versión publicada es 0.1.0. No se puede usar con las instancias de CM6 que monta DraftWrite.

La elección del padding (simétrico, `scrollPastEnd`, asimétrico) es una decisión separada; se compara en la sección 6.

---

## 4. Implementación recomendada

### 4.1 Extensión de centrado para teclado y edición

Archivo propuesto: `src/renderer/src/editor/typewriter.ts`.

```ts
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

export const typewriterScroll = EditorState.transactionExtender.of((tr) => {
  if (!tr.scrollIntoView) return null

  return {
    effects: EditorView.scrollIntoView(tr.newSelection.main.head, { y: 'center' })
  }
})
```

Puntos de diseño:

- **[Hecho]** `tr.newSelection` es la selección ya mapeada a través de los cambios; evita calcular `tr.state` y es la API prevista para esto (`node_modules/@codemirror/state/dist/index.d.ts:953-959`).
- **[Hecho]** `tr.scrollIntoView` es la bandera que CodeMirror ya usa para «llevar el cursor a la vista» (`index.d.ts:938-942`).
- **[Inferencia]** Usar `main.head` centra el extremo activo. Para un cursor coincide con la posición; para una selección no vacía, centra el extremo activo y no todo el rango. Es el comportamiento esperado en una editora de texto.
- **[Inferencia]** No se modifica la selección ni el documento: solo se añade un efecto. El documento y la selección resultantes son los mismos y el historial no cambia.
- **[Inferencia]** Este extender no cubre el clic ni el arrastre: sus transacciones tienen `scrollIntoView: false` y se disparan en momentos distintos (sección 8.1). El clic se engancha al final del gesto y despacha un efecto de centrado aparte (sección 8.2). La animación se aplica a cualquier efecto `"center"` mediante `EditorView.scrollHandler` (sección 8.3), sin cambiar este código.

### 4.2 Padding asimétrico combinado

El padding debe cumplir tres condiciones:

1. La primera línea centrada con `scrollTop = 0`.
2. La última línea centrada mientras se escribe.
3. La última línea puede llevarse al borde superior con scroll manual, dejando `H - L` px en blanco debajo.

La solución es `padding-top = (H - L) / 2` y `padding-bottom = H - L`. No se usa `scrollPastEnd()`.

```ts
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

export interface TypewriterPadding {
  top: number
  bottom: number
}

export function computeTypewriterPadding(
  editorHeight: number,
  lineHeight: number
): TypewriterPadding {
  if (editorHeight <= 0 || lineHeight <= 0 || editorHeight <= lineHeight) {
    return { top: 0, bottom: 0 }
  }

  return {
    top: Math.round((editorHeight - lineHeight) / 2),
    bottom: Math.ceil(editorHeight - lineHeight)
  }
}

export function typewriterPaddingStyle(
  editorHeight: number,
  lineHeight: number
): string | null {
  const { top, bottom } = computeTypewriterPadding(editorHeight, lineHeight)
  if (top === 0 && bottom === 0) return null

  return `padding-top: ${top}px; padding-bottom: ${bottom}px`
}

function typewriterPaddingAttrs(view: EditorView): { style: string } | null {
  const style = typewriterPaddingStyle(
    view.scrollDOM.clientHeight,
    view.defaultLineHeight
  )

  return style === null ? null : { style }
}

const paddingPlugin = ViewPlugin.fromClass(
  class {
    attrs: { style: string } | null

    constructor(readonly view: EditorView) {
      this.attrs = typewriterPaddingAttrs(view)
    }

    update(update: ViewUpdate): void {
      if (!update.geometryChanged) return
      this.attrs = typewriterPaddingAttrs(update.view)
    }
  }
)

export const typewriterPadding = [
  paddingPlugin,
  EditorView.contentAttributes.of((view) => view.plugin(paddingPlugin)?.attrs ?? null)
]

export const typewriter = [typewriterScroll, ...typewriterPadding]
```

Puntos de diseño:

- **[Hecho]** `EditorView.contentAttributes` añade atributos al elemento editable `.cm-content` (`node_modules/@codemirror/view/dist/index.d.ts:1430-1434`). Es el mecanismo que usa `scrollPastEnd` (`node_modules/@codemirror/view/dist/index.js:10073-10075`) y la vía que la documentación oficial recomienda para el padding vertical del documento (`https://codemirror.net/examples/styling/`).
- **[Hecho]** Los estilos inline se combinan con los del tema: `combineAttrs` concatena los `style` y el inline gana en las propiedades que declara (`index.js:36-46,9061-9066`). El tema conserva `padding-left`/`padding-right: 20px`; el plugin solo pisa `padding-top` y `padding-bottom`.
- **[Hecho]** `scrollDOM.clientHeight` es el alto visible del scroller y `defaultLineHeight` el alto de línea medido por CodeMirror (`index.d.ts:798,1071`; `index.js:8602`).
- **[Hecho]** `geometryChanged` es verdadero cuando cambió el documento o el tamaño del editor (`index.d.ts:585-589`), que es cuando hace falta recalcular el padding.
- **[Hecho]** El constructor calcula los attrs iniciales para evitar un primer frame con el padding de 16 px del tema. Si `clientHeight` o `defaultLineHeight` todavía son 0, devuelve `null` y el primer update de geometría lo corrige.
- **[Inferencia]** `Math.round` en el top y `Math.ceil` en el bottom evitan fracciones en el padding; el `ceil` garantiza que la última línea no quede por debajo del top (a cambio de sobresalir como máximo 1 px por arriba, imperceptible). Si se prefiere exactitud estricta, usar `Math.round` en ambos y aceptar una tolerancia de ±1 px.
- **[Inferencia]** Leer `scrollDOM.clientHeight` en `update` es una lectura de layout; CodeMirror la cachea internamente como `viewState.editorHeight` (`index.js:6243,6416-6419`), pero esa propiedad no está en la API pública tipada. Si el perfil muestra reflujos, se puede mover la lectura a un `ResizeObserver` o cachearla. Para una editora de escritura, una lectura por update de geometría es aceptable.

### 4.3 Cableado

```ts
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { typewriter } from './typewriter'

export const articleEditorExtensions = [
  markdown({ base: markdownLanguage }),
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'Article text' }),
  ...typewriter
]
```

- **[Hecho]** `articleEditorExtensions` es el único punto de entrada de extensiones de `TextEditor` (`src/renderer/src/editor/extensions.ts:4-8`; `TextEditor.tsx:4,31`), así que este cambio activa el comportamiento en Story y Article a la vez.
- **[Inferencia]** No hace falta tocar `TextEditor`, `StoryEditor`, `ArticleEditor`, el tema, el dominio, el IPC ni la persistencia.
- **[Inferencia]** El array `typewriter` debe incluir el extender, el padding, `TypewriterAnimation` (como `ViewPlugin`), `typewriterCenterScroll` (`EditorView.scrollHandler`) y `CenterOnPointer` (como `ViewPlugin`). El orden no cambia la semántica, pero el plugin de animación debe existir antes de que el `scrollHandler` reciba el primer efecto; CodeMirror inicializa todos los plugins de la configuración antes de procesar transacciones.
- **[Inferencia]** No añadir `scrollPastEnd()` junto a `typewriter`: su padding inferior competiría con el del plugin y su fórmula parte de un padding superior que aquí es `P`, no 0. La sección 6 explica por qué la combinación no cumple el requisito.

### 4.4 Secuencia de una pulsación

1. El usuario escribe.
2. CodeMirror crea la transacción con `scrollIntoView: true` (`index.js:4453`).
3. El `transactionExtender` añade el efecto `y: "center"` para `tr.newSelection.main.head`.
4. `EditorView.update` procesa la bandera y los efectos; el último efecto de scroll queda como destino (`index.js:8031-8045`).
5. El ciclo de medida asegura que el viewport incluya el destino; `docView.scrollIntoView` consulta el `scrollHandler` y, si el handler intercepta `"center"`, no se ejecuta el scroll nativo (`index.js:3456-3466`).
6. El `scrollHandler` calcula el destino con la geometría de la línea y decide: si el delta supera `max(L, H/6)`, anima 150 ms; si no, asigna `scrollTop` directamente (secciones 8.3 y 8.4).
7. El padding asimétrico permite que la primera y la última línea también alcancen el centro.

### 4.5 Secuencia del scroll libre manual

1. El usuario hace rueda, trackpad o arrastra la barra hasta el máximo. No hay transacción; solo cambia `scrollTop` (`index.js:4964-4973,7231-7242`).
2. El máximo es `D - L + (H - L) / 2`. La última línea queda en `top = 0` y quedan `H - L` px en blanco debajo.
3. Si el usuario escribe en ese estado, la transacción lleva `scrollIntoView: true` y el extender recentra la última línea en `scrollTop = D - L`. El viewport sube `(H - L) / 2` px; es el comportamiento typewriter esperado.
4. El máximo no cambia al hacer scroll: el padding es constante. No hay crecimiento infinito ni acumulación de espacio.

### 4.6 Toggle opcional

- **[Hecho]** `Compartment` permite reconfigurar una extensión sin recrear la vista (`https://codemirror.net/docs/ref/#state.Compartment`; `@codemirror/state` ya es dependencia).
- **[Inferencia]** Si el producto quiere un toggle, se puede envolver `typewriter` en un `Compartment` y despachar `reconfigure` desde un botón de la toolbar o desde el estado del workspace. No hace falta añadir un paquete.
- **[Decisión abierta]** El repo no tiene una pantalla de preferencias ni un lugar obvio para el toggle; hoy la toolbar solo contiene comandos de formato (`src/renderer/src/workspace/EditorToolbar/EditorToolbar.tsx:20-64`).
- **[Inferencia]** Si se quiere separar «centrado» de «scroll libre», se pueden usar dos `Compartment` distintos: uno para `typewriterScroll` y otro para `typewriterPadding`. El padding es el que habilita el scroll libre; el extender es el que centra.

---

## 5. Geometría del padding combinado

### 5.1 Variables y fórmulas

Sean:

- `H` = `scrollDOM.clientHeight` (alto visible del scroller).
- `L` = `defaultLineHeight` (alto de una línea).
- `D` = alto del contenido del documento, sin contar el padding.
- `Pt` = padding superior.
- `Pb` = padding inferior.
- `P` = `(H - L) / 2`.

- **[Inferencia]** El harness usa `L = 24` para mantener números enteros; en la app, `line-height: 1.7` sobre `--text-sm` produce un `L` fraccional (≈23.8 px si `--text-sm` es 14 px). Las fórmulas no cambian; el plugin redondea el padding a enteros.

Entonces:

```text
scrollHeight S = Pt + D + Pb
maxScroll     M = S - H = Pt + D + Pb - H
centro de la última línea al escribir C = Pt + D - L/2 - H/2
```

Con la elección `Pt = P`, `Pb = H - L`:

```text
S = P + D + H - L
M = P + D - L = D - L + P
C = P + D - L/2 - H/2 = D - L
M - C = P
```

- **[Hecho]** El navegador recorta `scrollTop` a `[0, M]`; `scrollRectIntoView` escribe `scrollTop` y deja que el navegador aplique el clamp (`index.js:603-618`).
- **[Hecho]** Para cualquier línea, el destino de centrado se puede calcular sin `coordsAtPos` a partir de `lineBlockAt(head)`: `lineBlockAt` devuelve `top` relativo al inicio del documento y `height` del bloque, incluso fuera del viewport (`node_modules/@codemirror/view/dist/index.d.ts:925-933`; `index.js:6669-6674,8455-8456`). El destino es:

```text
target(head) = clamp(Pt + block.top + block.height/2 - H/2, 0, M)
```

  donde `Pt` es `view.documentPadding.top` (`index.js:8400-8408`) y `block = view.lineBlockAt(head)`. Con `Pt = P = (H - L)/2` y un bloque de altura `L`, la fórmula se simplifica a `target = block.top`, que es exactamente el `scrollTop` que centra la línea. El harness midió `target = block.top` para la primera (`0`), una intermedia (`1176`) y la última (`2376`); la fórmula con `block.height` cubre bloques más altos o líneas envueltas.
- **[Inferencia]** `C <= M` siempre que `P >= 0`, que es el caso normal `H >= L`. Por eso la última línea puede centrarse al escribir sin llegar al máximo.

### 5.2 Primera línea centrada

Con `scrollTop = 0`, el centro de la primera línea queda en:

```text
Pt + L/2 = (H - L)/2 + L/2 = H/2
```

- **[Hecho]** Verificado en Chromium headless con `H = 430`, `L = 24`, `Pt = 203`: el caret de la primera línea queda a 215 px, exactamente `H/2` (tabla 6.2).
- **[Inferencia]** `scrollTop` no necesita ser negativo: el padding superior aporta el espacio que falta. Sin padding, la primera línea no puede bajar del top porque `scrollTop` mínimo es 0.

### 5.3 Última línea centrada al escribir

Con `Pt = P` y `Pb = H - L`, el scroll que centra la última línea es:

```text
C = Pt + D - L/2 - H/2 = D - L
```

- **[Hecho]** Verificado con `D = 2400`, `H = 430`, `L = 24`: `C = 2376`; el caret queda a 215 px y el máximo es 2579. Quedan 203 px de recorrido manual adicional (tabla 6.2).
- **[Inferencia]** `C` no depende de `H`; solo de la altura del documento y de la línea. Al redimensionar, si el padding se recalcula, la última línea sigue centrada en el mismo `scrollTop` (verificado con alturas 600 y 300 en el harness).

### 5.4 Última línea en el top y máximo finito

En el scroll máximo, la posición de la última línea respecto al borde superior es:

```text
topÚltima = Pt + D - L - M = H - L - Pb
```

Para que sea 0:

```text
Pb = H - L
```

Con `Pt = P` y `Pb = H - L`:

```text
M = D - L + P
```

- **[Hecho]** Verificado con `H = 430`, `L = 24`, `D = 2400`: `M = 2579`; al fijar `scrollTop = 2579`, el caret de la última línea queda a 12 px del top (línea de 24 px), es decir, la línea está en `top = 0`; quedan 406 px en blanco debajo (tabla 6.2).
- **[Inferencia]** El espacio en blanco debajo de la última línea cuando está en el top es exactamente `H - L` (406 px en el ejemplo). No es infinito: `scrollHeight` es constante y `M` no depende del scroll.
- **[Inferencia]** El recorrido manual adicional desde el centrado hasta el top es `M - C = P` (203 px en el ejemplo). Es la mitad del viewport menos media línea.

### 5.5 El padding del tema y `documentPadding`

- **[Hecho]** El tema actual declara `padding: 16px 20px` en `.cm-content` (`src/renderer/src/editor/theme.ts:9-13`).
- **[Hecho]** El plugin declara `padding-top` y `padding-bottom` inline; el shorthand del tema sigue aportando `padding-left` y `padding-right`. `updateAttrs` asigna el `style` combinado con `cssText` (`index.js:79-99,8303-8328`), y una propiedad inline gana a la del tema salvo `!important`.
- **[Hecho]** `documentPadding.top` no es el valor del tema: es el `padding-top` medido del `.cm-content` después de aplicar el inline (`index.js:6378-6383,8406-8408`). Por eso, al usar el plugin, `documentPadding.top` vale `P`, no 16.
- **[Inferencia]** El padding del plugin es absoluto, no aditivo: `Pt = P` reemplaza los 16 px, no se suma a ellos. Si se sumaran, la primera línea quedaría en `16 + P + L/2`, descentrada.
- **[Inferencia]** El `padding-bottom` del tema (16 px) también se reemplaza por `H - L`. No hay que sumarle 16: si se sumara, la última línea podría subir 16 px por encima del top en el máximo.
- **[Hecho]** `parseInt` trunca fracciones (`index.js:6378`). Para que `documentPadding` y la alineación de gutters coincidan con el CSS, el plugin usa enteros (`Math.round`/`Math.ceil`). Un `padding-top: 203.5px` se reportaría como 203 y el gutter quedaría 0.5 px desalineado.

### 5.6 Documentos cortos, vacíos y de una línea

- **[Hecho]** El documento vacío y el de una línea se comportan igual en CodeMirror: hay una línea vacía/única de altura `L`, así que `D = L`.
- **[Hecho]** Con `Pt = P` y `Pb = H - L`, para `D = L`: `S = P + L + H - L = H + P`, `M = P`, y el centro de la única línea es `H/2` con `scrollTop = 0`. El máximo manual `P` la lleva al top y deja `H - L` px debajo. Verificado en el harness para documento vacío y de una línea (`H = 430`, `L = 24`: `M = 203`, caret en el top a 12 px).
- **[Hecho]** Para tres líneas (`D = 72`): `M = 251`, el centrado de la última línea es `scrollTop = 48`, y el máximo deja la última línea en el top. Verificado.
- **[Inferencia]** El padding siempre activo hace que incluso un documento vacío tenga `P` px de recorrido y un scrollbar potencial. Es coherente con el scroll libre, pero cambia la sensación de un editor recién abierto. Es una decisión de producto (sección 9).
- **[Inferencia]** No hace falta un caso especial para documentos cortos: las fórmulas se cumplen para todo `D >= L`. Si se decidiera desactivar el scroll libre en documentos cortos, habría que poner `Pb = 0` para ellos y aceptar que la última línea no llegue al top.

### 5.7 Gutters y números de línea

- **[Hecho]** Hoy el editor no habilita números de línea ni gutters: `articleEditorExtensions` solo tiene Markdown, `lineWrapping` y el `aria-label` (`src/renderer/src/editor/extensions.ts:1-8`).
- **[Hecho]** Si se añadieran, CodeMirror ya compensa el padding superior: `syncGutters` crea los contextos con `-documentPadding.top` (`index.js:11525`), y `UpdateContext.addElement` calcula `above = (block.top - this.height) / scaleY` (`index.js:11633`). Para la primera línea, `block.top = 0` y `this.height = -paddingTop`, así que `marginTop = paddingTop` (`index.js:11741`).
- **[Hecho]** El contenedor `.cm-gutters` es `position: sticky`, `height: 100%`, y su `minHeight` se actualiza a `contentHeight` (`index.js:6974-7000,11464,11502-11507`). `contentHeight` incluye `paddingTop + paddingBottom` (`index.js:6693-6695`).
- **[Hecho]** Verificado con `lineNumbers()` y `Pt = 203`, `Pb = 406`: el primer `.cm-gutterElement` visible tiene `marginTop: 203px` y su centro coincide con el centro de `.cm-line` (delta 0 px).
- **[Inferencia]** Añadir números de línea en el futuro no rompe la alineación vertical, siempre que el padding se aplique a `.cm-content` y no a `.cm-scroller` ni con `margin`. Con `margin-top` en `.cm-content`, `documentPadding.top` seguiría siendo 0 y el gutter no se desplazaría.

### 5.8 Scrollbar, clamping y espacio finito

- **[Hecho]** `.cm-scroller` tiene `height: 100%`, `overflow-x: auto` y, por el comportamiento CSS de `overflow` en ejes combinados, scroll vertical efectivo (`index.js:6856-6866`). `.cm-content` tiene `minHeight: 100%` y `boxSizing: border-box` (`index.js:6867-6876`).
- **[Inferencia]** El contenido más el padding, `D + Pt + Pb = D + 1.5 * (H - L)`, supera `H` para cualquier `H > L` porque `D >= L`; por eso el scroller siempre tiene rango de scroll, incluso con una línea. El padding por sí solo no basta: `1.5 * (H - L) > H` solo se cumple si `H > 3L`. El scrollbar es finito y su tamaño refleja `S = D + 1.5 * (H - L)`.
- **[Hecho]** El clamp del navegador impide `scrollTop < 0` y `scrollTop > M` (`index.js:603-618`). La primera línea centrada usa exactamente `scrollTop = 0`; no hay valores negativos.
- **[Inferencia]** Al arrastrar la barra o usar la rueda, CodeMirror no despacha una transacción; solo registra el evento y mide (`index.js:4964-4973,7231-7242`). El extender no interviene.

---

## 6. Scroll libre (past-end): comparación de estrategias

### 6.1 El comportamiento exacto de `scrollPastEnd()`

Ya introducido en 2.6. Resumen:

```text
Pb_scrollPastEnd = H - L - Pt - 0.5   (si el resultado es >= 0)
```

- **[Hecho]** Con `Pt = 0`, la fórmula deja la última línea a 0.5 px del top en el máximo; la primera línea queda a `L/2` del top, no centrada.
- **[Hecho]** Con `Pt = 16` (el tema actual), la fórmula deja la última línea a 16.5 px del top y la primera a `16 + L/2`; ninguna de las dos condiciones se cumple.
- **[Hecho]** Con `Pt = P`, la fórmula deja la última línea a `P + 0.5` px del top; la primera sí queda centrada, y la última se centra al escribir dentro de 0.5 px (el objetivo `C = D - L` supera el máximo `M = D - L - 0.5` y el navegador lo recorta), pero no puede subir más.
- **[Hecho]** La fracción de 0.5 px se pierde al redondear `scrollHeight` a un entero. En Chromium 150, con `H = 430` y `L = 24`, el máximo deja la última línea en `top = 0` con `Pt = 0`, `top = 16` con `Pt = 16` y `top = 203` con `Pt = 203`; el desplazamiento es siempre inferior a 1 px y no cambia ninguna conclusión.
- **[Hecho]** Si `H - L - Pt - 0.5 < 0`, el plugin no actualiza y conserva `padding-bottom: 1000px` (`index.js:10050-10061`). Es un caso real en editores ocultos (`H = 0`) o muy bajos.

### 6.2 Por qué `scrollPastEnd()` + padding superior no cumple el requisito

Sea `Pt` el padding superior propio. La fórmula descuenta `Pt`, así que el espacio extra total se mantiene en `H - L - 0.5`. En el máximo:

```text
topÚltima = Pt + D - L - M = Pt + 0.5
```

La última línea se queda `Pt + 0.5` px por debajo del top en la fórmula (`Pt` px en la medición, por el redondeo de `scrollHeight`). Para que llegue al top haría falta `Pt = -0.5`, imposible. En cambio, para centrar la primera línea hace falta `Pt = P`. Son condiciones incompatibles.

La siguiente tabla es una medición propia con un harness mínimo de CodeMirror 6.43.14 en Chromium headless. Parámetros: `H = 430`, `L = 24`, `D = 2400` (100 líneas), tema con `line-height: 24px`, `.cm-content` con `padding: 16px 20px`. En todas las filas se usa el mismo extender de centrado (`typewriterScroll`); la comparación aísla el padding. El harness no forma parte del repo; las fórmulas son la parte reproducible.

| Configuración | `padding` medido | `scrollHeight` | `maxScroll` | Primer caret | Último caret al escribir | Último caret en max manual | Última línea en max |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Combinada** `Pt = 203`, `Pb = 406` | 203 / 406 | 3009 | 2579 | 215 (`scrollTop 0`) | 215 (`scrollTop 2376`) | 12 (`scrollTop 2579`) | `top = 0` |
| **`scrollPastEnd` + `Pt = 203`** | 203 / 202.5 | 2806 | 2376 | 215 (`scrollTop 0`) | 215 (`scrollTop 2376 = max`) | 215 (`scrollTop 2376`) | `top = 203` |
| **`scrollPastEnd` solo** | 16 / 389.5 | 2806 | 2376 | 28 (`scrollTop 0`) | 215 (`scrollTop 2189`) | 28 (`scrollTop 2376`) | `top = 16` (medido; fórmula 16.5) |

Lectura de la tabla:

- **[Hecho]** Solo la configuración combinada centra la primera línea (215 = `H/2`), centra la última al escribir (215) y permite que la última llegue al top (caret 12, línea en 0) con un máximo finito (2579).
- **[Hecho]** `scrollPastEnd` con `Pt = 203` centra la primera y la última al escribir, pero su máximo es 2376 y en ese máximo la última sigue centrada (caret 215), con la línea en `top = 203`; no puede llegar al top.
- **[Hecho]** `scrollPastEnd` solo no centra la primera línea (caret 28).
- **[Hecho]** El `padding-bottom` CSS de `scrollPastEnd` es 202.5, pero `documentPadding.bottom` reporta 202 por el `parseInt`. Es una diferencia de 0.5 px que no afecta al argumento, pero confirma que las fracciones se truncan.

### 6.3 Opción A: `scrollPastEnd()` + padding superior

**Cómo funciona:** se añade `scrollPastEnd()` para el espacio inferior y un `contentAttributes` solo con `padding-top = P` para centrar la primera línea.

**Ventajas:**

- Usa la extensión nativa para el fondo; menos código propio.
- Su plugin cachea `editorHeight` y `documentPadding`, sin leer layout en cada update.
- El centrado de la última línea al escribir funciona dentro de 0.5 px (el máximo coincide con el centro).

**Límites:**

- **[Hecho]** La última línea no llega al top: se queda a unos `P` px del borde (`P + 0.5` en la fórmula; el redondeo puede eliminar la fracción).
- **[Hecho]** Si se añade un `padding-bottom` propio, el estilo de la extensión que aparezca antes en el array gana; `scrollPastEnd` puede pisarlo o ser pisado, según el orden (sección 6.6).
- **[Hecho]** Con `H = 0` o un editor más bajo que `L + Pt`, conserva 1000 px de padding inferior.
- **[Inferencia]** El padding inferior depende de que el padding superior ya esté medido; en el primer frame o tras un resize puede haber un ciclo de medida con el valor anterior.

**Veredicto:** no cumple el requisito de «última línea al top». Se descarta para la implementación combinada.

### 6.4 Opción B: padding asimétrico propio (recomendada)

**Cómo funciona:** un solo `ViewPlugin` calcula `Pt = (H - L)/2` y `Pb = H - L`, sin `scrollPastEnd()`.

**Ventajas:**

- **[Hecho]** Cumple las tres condiciones a la vez (sección 6.2, tabla).
- **[Hecho]** Un solo proveedor de padding; no hay conflicto de estilos ni orden de extensiones.
- **[Hecho]** El máximo es finito y conocido: `D - L + P`.
- **[Hecho]** Los gutters siguen alineados porque el padding es `padding-top` real de `.cm-content` (sección 5.7).
- **[Inferencia]** El código es pequeño y testeable como función pura (`computeTypewriterPadding`, `typewriterPaddingStyle`).

**Límites:**

- **[Inferencia]** Hay que leer `clientHeight`/`defaultLineHeight` en el plugin; una lectura de layout por update de geometría.
- **[Inferencia]** El padding total es `1.5 * (H - L)`, un 50 % más que `scrollPastEnd`; el scrollbar y el rango de scroll son mayores (esperado: hay más espacio en blanco).
- **[Inferencia]** En documentos de una línea el editor también tiene `P` px de recorrido; es una decisión de producto.

**Veredicto:** recomendada.

### 6.5 Opción C: otras combinaciones nativas

| Alternativa | Por qué no |
|---|---|
| **`scrollPastEnd()` solo** | No centra la primera línea; con el tema de 16 px la última tampoco llega al top. |
| **`scrollMargins`** | No añade `scrollHeight`; solo declara zonas ocultas. El navegador sigue recortando `scrollTop`. |
| **`margin-top: P` en `.cm-content` + `scrollPastEnd()`** | Geométricamente funcionaría (`documentPadding.top` sigue 0 y `scrollPastEnd` añade `H - L - 0.5`), pero el gutter no compensa el margen: `documentPadding.top` es 0 y los números de línea quedarían `P` px arriba. Además, el margen de un flex item y `minHeight: 100%` son más frágiles que el padding. |
| **Widget/spacer al final del documento** | Añade contenido real: afecta a posiciones, selección, historial y al `docHeight`; no es solo espacio. |
| **`padding-bottom` en `.cm-scroller`** | El padding del scroller no es `documentPadding.bottom`; puede afectar al layout del flex, a los gutters y a la medición. CodeMirror espera el padding vertical en `.cm-content` (`https://codemirror.net/examples/styling/`). |
| **`::after` en `.cm-content`** | Un pseudo-elemento dentro del contenteditable puede afectar a la selección y al caret; no lo mide `documentPadding`. |
| **`EditorView.scrollSnapshot`** | Sirve para restaurar una posición, no para añadir espacio. |
| **Paquete de terceros** | `codemirror-typewriter-scrolling` es CM5; no aplica. |

- **[Inferencia]** La opción B es la única que cumple las tres condiciones con una sola fuente de padding y sin efectos secundarios en gutters o selección.

### 6.6 Conflicto de estilos entre `contentAttributes`

- **[Hecho]** `attrsFromFacet` recorre las fuentes del facet en orden inverso (`index.js:9061-9067`).
- **[Hecho]** `combineAttrs` concatena los `style` con `;` (`index.js:36-46`).
- **[Hecho]** `updateAttrs` asigna el string resultante a `dom.style.cssText` (`index.js:79-99`). El parser CSS conserva la última declaración de una propiedad duplicada.
- **[Inferencia]** Por eso, si dos extensiones declaran `padding-bottom`, gana la que aparece **antes** en el array de extensiones: se procesa la última en el recorrido inverso y su declaración queda al final del string.
- **[Hecho]** Verificado con dos proveedores en una vista mínima: `[scrollPastEnd(), custom]` deja el `padding-bottom` de `scrollPastEnd`; `[custom, scrollPastEnd()]` deja el de `custom`. En el primer caso se ve `padding-bottom: 1000px` (el valor inicial de `scrollPastEnd` en jsdom, donde `clientHeight` es 0); en el segundo, `padding-bottom: 406px`.
- **[Inferencia]** La recomendación es no combinar: usar solo el plugin propio. Si en el futuro se añade `scrollPastEnd` por otra razón, el padding propio debe ir antes en el array y `scrollPastEnd` no debe usarse para el bottom; aun así, su plugin seguiría calculando y conservaría el riesgo de los 1000 px.

### 6.7 Veredicto de la comparación

| Criterio | A: `scrollPastEnd` + top | B: padding asimétrico | C: otras |
|---|---|---|---|
| Primera línea centrada | Sí | Sí | No / frágil |
| Última centrada al escribir | Sí | Sí | No |
| Última línea al top manual | **No** (queda ~`P`; `P + 0.5` en la fórmula) | **Sí** | No |
| Máximo finito | Sí | Sí | Sí |
| Conflicto de estilos | Sí | No | Variable |
| Gutters futuros | Sí | Sí | No con margen |
| Código propio | Menos | Medio | Variable |
| Veredicto | Descartada | **Recomendada** | Descartadas |

---

## 7. Edge cases y comportamiento esperado

### 7.1 Tipos de transacción y gestos

| Origen | Señal de CodeMirror | Efecto con el extender | Hook adicional / evidencia |
|---|---|---|---|
| Escribir | `scrollIntoView: true` | Centra en cada transacción de escritura | `@codemirror/view/dist/index.js:4443-4453` |
| Movimiento de cursor por teclado | `scrollIntoView: true` | Centra | `@codemirror/commands/dist/index.js:581,1382` |
| Toolbar de formato | `scrollIntoView: true` | Centra después de aplicar el cambio | `src/renderer/src/editor/commands.ts:29,60,78-85,97-105,111-120` |
| Pegar / cortar | `scrollIntoView: true` | Centra | `@codemirror/view/dist/index.js:4959-4962,5234-5238` |
| Undo / redo | `scrollIntoView: true` | Centra en la selección restaurada | `@codemirror/commands/dist/index.js:538,555` |
| Clic fuera de la selección | `select.pointer`, colapsada, `scrollIntoView: false`; se despacha en `mousedown` | No centra | Hook de fin de gesto (sección 8.2); `index.js:4790-4794,4855-4862`; harness real |
| Clic dentro de una selección | `select.pointer`, colapsada, `scrollIntoView: false`; se despacha en el `mouseup` documental | No centra | Hook de fin de gesto; `index.js:4825-4832`; harness real |
| Clic sobre el mismo caret | No hay transacción | No centra | El hook de fin de gesto sí puede centrar; harness real |
| Arrastre | `select.pointer`, primero colapsada y después no vacía por cada movimiento, `scrollIntoView: false` | No centra | Centrar solo al soltar (sección 8.2); `index.js:4782-4784,4801-4809,4855-4862`; harness real |
| Doble / triple clic | `select.pointer`, selección no vacía, `scrollIntoView: false` | No centra | Hook de fin de gesto; `event.detail` en `getClickType` (`index.js:5046-5049`); harness real |
| Shift+clic | `select.pointer`, selección extendida, `scrollIntoView: false` | No centra | Hook de fin de gesto; `extend = startEvent.shiftKey` (`index.js:4785`) |
| PageUp / PageDown | Sin bandera; efecto explícito `y: "start"` | No interfiere | Cancela la animación; el scroll nativo sigue instantáneo (`@codemirror/commands/dist/index.js:822-830`; sección 8.4) |
| Rueda / trackpad | No hay transacción | No centra; solo cambia `scrollTop` | Cancela la animación; `index.js:4964-4973,7231-7242` |
| Arrastrar la barra | No hay transacción | No centra | Cancelar por `mousedown`/`pointerdown` o por desviación de `scrollTop`; ver riesgo en 8.6 |
| Resize del editor | No hay transacción; hay medida | Recalcula padding; no fuerza un centrado nuevo | Cancela la animación en curso; `index.js:7202-7208,8204-8229` |
| Editor oculto | No hay transacción; `clientHeight = 0` | Padding 0; no centra | El hook y la animación se saltan si `clientHeight <= 0`; harness real |
| Cambio de valor externo de UIW | No | No centra | `@uiw/react-codemirror/esm/useCodeMirror.js:155-180` |
| Touch | `select.pointer` como origen; `touchend` | No centra por sí solo | Hook `touchend` con guarda contra el `mouseup` sintético; requiere prueba en dispositivo (sección 8.6) |
| IME / composición | `scrollIntoView: true` con `.compose` | Centra/animará según el delta | Decisión abierta: excluir `.compose` si el candidato se mueve (7.3) |

- **[Hecho]** Todas las transacciones de puntero observadas tienen `scrollIntoView: false`; la bandera solo se pone en selecciones que vienen del DOM con origen `"select"` (`index.js:4332-4341`). Esto explica por qué el extender actual no centra el clic.
- **[Hecho]** `ViewUpdate.selectionSet` es verdadero cuando la actualización fija explícitamente la selección (`index.d.ts:596-601`), pero un arrastre produce una actualización por cada movimiento; no existe una señal de «fin de gesto» en `ViewUpdate`. `MouseSelectionStyle.get` recibe el evento actual y puede consultarse en cada movimiento, pero no tiene callback de `mouseup` (`index.d.ts:609-635`); usarlo para centrar exigiría envolver el estilo y detectar el final por fuera.
- **[Inferencia]** El comportamiento por defecto del extender es «centrar cuando el cursor se mueve por teclado o por una edición» (salvo PageUp/PageDown). El clic y el arrastre se añaden como un hook de fin de gesto, no ampliando la condición del extender.
- **[Decisión abierta]** Si en el futuro se añaden números de línea, el clic en el gutter no pasará por `contentDOM`; habría que decidir si también debe centrar la línea seleccionada. No está en el alcance actual.

### 7.2 Primera línea, última línea, documento vacío y documento corto

- **[Hecho]** El padding combinado hace que la primera línea se centre con `scrollTop = 0` y la última con `scrollTop = D - L`; el máximo la lleva al top (sección 5).
- **[Hecho]** Documento vacío y de una línea: `D = L`, `M = P`; la única línea se centra en 0 y llega al top en `P` (verificado en el harness).
- **[Hecho]** Tres líneas: `M = 251`, centrado de la última en `scrollTop = 48`, top en 251 (verificado).
- **[Inferencia]** No hace falta un caso especial para el documento vacío: CodeMirror siempre tiene una línea vacía de altura `L`.
- **[Decisión abierta]** Si se decide no dar scroll libre a documentos cortos, hay que definir el umbral y aceptar el salto de layout al superarlo. La opción consistente es dejar el padding siempre activo.

### 7.3 IME y composición

- **[Hecho]** Durante la composición, CodeMirror marca la transacción con `userEvent` que incluye `.compose` y mantiene `scrollIntoView: true` (`@codemirror/view/dist/index.js:4443-4453`).
- **[Inferencia]** El extender centrará también en cada actualización de composición. En Linux con fcitx/ibus, el candidato de IME se posiciona cerca del cursor; recentrar en cada evento puede moverlo y producir una experiencia incómoda. Con animación, cada actualización de composición puede además retargetear el vuelo.
- **[Decisión abierta]** Se puede excluir `tr.isUserEvent('input.type.compose')` del centrado y centrar en la siguiente transacción normal, o hacer instantáneos los centrados durante composición. El coste es que el cursor puede quedar descentrado durante la composición. Conviene verificarlo en la app Electron real antes de decidir.

### 7.4 Split, preview y resize

- **[Hecho]** En modo `preview`, el editor se oculta con `hidden` pero no se desmonta (`EditorPreviewLayout.tsx:25-40`). Su `scrollDOM.clientHeight` pasa a 0 y el plugin deja de aplicar padding (`computeTypewriterPadding` devuelve 0/0); el tema recupera sus 16 px.
- **[Hecho]** CodeMirror observa `scrollDOM` con un `ResizeObserver` y solicita una medida cuando cambia el tamaño (`@codemirror/view/dist/index.js:7202-7208`). La medida con cambios de geometría crea un `ViewUpdate` no vacío, actualiza los plugins y vuelve a aplicar `contentAttributes` (`index.js:8204-8238`).
- **[Hecho]** Verificado en el harness al cambiar la altura del contenedor de 600 a 300: el padding se recalculó a 138/276 y el caret de la última línea quedó centrado a 150 px.
- **[Hecho]** Con el editor oculto (`display: none`), el harness midió `clientHeight = 0`: el hook de puntero y el `scrollHandler` se saltan el centrado; una animación en curso se cancela y no se programa ningún frame. Verificado sin excepciones.
- **[Inferencia]** Al volver de `preview` a `edit`/`split`, la medida se recalcula y el padding vuelve. El cursor puede no quedar centrado hasta la siguiente transacción o clic; si se quiere centrar inmediatamente, se puede despachar un efecto de centrado al cambiar `viewMode`.
- **[Inferencia]** En `split`, el ancho cambia y el wrapping puede cambiar la altura del documento, pero el padding depende solo de la altura del scroller; no hace falta recalcularlo por ancho. Un cambio de altura de la ventana sí lo recalcula y debe cancelar la animación en curso.
- **[Inferencia]** Un resize durante un salto grande no debe dejar la animación apuntando a una geometría vieja: el cancel por `resize`/geometría y el chequeo de `clientHeight` en cada frame cubren el caso normal.

### 7.5 Rueda, PageUp/PageDown y barra

- **[Hecho]** La rueda y el arrastre de la barra no crean transacciones; el extender no puede reaccionar a ellos (`index.js:4964-4973,7231-7242`). Por eso no «pelean» con el scroll manual.
- **[Hecho]** PageUp/PageDown despachan una transacción sin `scrollIntoView` y con un efecto explícito `y: "start"` cuando corresponde (`@codemirror/commands/dist/index.js:822-830`). El extender no añade el centro.
- **[Hecho]** En el harness, una rueda a mitad de una animación de centrado canceló el frame en `1531` y la dejó ahí; un efecto `y: "start"` (equivalente a PageUp/PageDown) canceló la animación y aplicó el scroll nativo. El `scrollHandler` cancela en cualquier destino que no sea `{ y: "center", x: "nearest" }`.
- **[Inferencia]** El arrastre de la barra se puede cancelar con `mousedown`/`pointerdown` sobre `scrollDOM` o detectando una desviación de `scrollTop`; el `mousedown` de la barra no siempre llega al documento en todos los navegadores, así que es un riesgo residual que conviene probar en Electron.
- **[Inferencia]** Tras un PageDown en la última página, la última línea puede quedar cerca del top o en el top, mostrando el espacio en blanco. Es el comportamiento de scroll libre, no un recentrado involuntario.
- **[Inferencia]** Si se escribe después de un scroll manual, la siguiente transacción con `scrollIntoView` recentra. Es el comportamiento typewriter esperado; la banda de tolerancia evita animar los ajustes pequeños (sección 10).

### 7.6 Accesibilidad y movimiento

- **[Inferencia]** El centrado no cambia el orden del DOM, el foco ni el texto accesible; no introduce nuevos roles ARIA.
- **[Inferencia]** El movimiento constante del viewport puede molestar a personas con sensibilidad al movimiento o que usan magnificación. Un toggle es la acomodación más directa.
- **[Hecho]** La animación propuesta solo se activa para saltos que superan `max(L, H / 6)`, dura ~150 ms y usa ease-out; los ajustes pequeños y los destinos ya cercanos al centro son instantáneos. Con `prefers-reduced-motion: reduce`, el harness emulado terminó en el destino sin ningún frame.
- **[Hecho]** `scroll-behavior: smooth` de CSS no es una alternativa equivalente: en Chromium 150 sí suaviza la asignación directa de `scrollTop`, pero con duración/easing del navegador y sin la selectividad del umbral (MDN: `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior`; medición en 8.4).
- **[Inferencia]** Un clic que recentra la línea puede producir un movimiento de hasta media pantalla; la animación de 150 ms lo hace menos brusco, pero sigue siendo movimiento. Si el producto necesita una acomodación estricta, el toggle de centrado debe desactivar también el clic-to-center o mantenerlo con animación instantánea.
- **[Inferencia]** La animación no debe ejecutarse si el editor está oculto (`clientHeight = 0`) ni si el usuario prefiere movimiento reducido.

### 7.7 Performance

- **[Hecho]** El extender se ejecuta en cada transacción, pero retorna `null` inmediatamente si `tr.scrollIntoView` es falso. No añade listeners ni bucles.
- **[Hecho]** El plugin de padding recalcula cuando `geometryChanged` es verdadero, que incluye cambios de documento y de tamaño (`index.d.ts:585-589`). No escucha el evento `scroll`.
- **[Inferencia]** El coste es una lectura de `clientHeight` por update de geometría y un efecto extra por transacción que ya iba a hacer scroll. Es despreciable para una editora de texto.
- **[Hecho]** La animación no despacha transacciones ni ejecuta `coordsAtPos` por frame: calcula el destino una vez con `lineBlockAt`, y el bucle solo escribe `scrollTop` durante ~10 frames. El harness no mostró acumulación de animaciones: una nueva petición cancela el frame anterior.
- **[Inferencia]** Cada escritura de `scrollTop` puede provocar una medida del viewport de CodeMirror; 10 frames por salto grande es aceptable, pero no conviene animar los ajustes de una línea. De ahí el umbral y el modo instantáneo.
- **[Inferencia]** El padding total es `1.5 * (H - L)` (frente a `H - L - 0.5` de `scrollPastEnd`), pero no añade líneas al DOM ni al viewport; el coste de render es nulo.
- **[Inferencia]** Si el perfil muestra reflujos por la lectura de `clientHeight`, se puede cachear la altura con un `ResizeObserver` o mover la lectura a un `requestMeasure`. No es necesario en la primera versión.

### 7.8 Selecciones múltiples y RTL

- **[Hecho]** `EditorSelection.main` es el rango principal; el extender centra solo ese (`@codemirror/state/dist/index.d.ts:953-959`).
- **[Inferencia]** DraftWrite no usa selecciones múltiples en su UI actual; si se añadieran, centrar solo la principal es un comportamiento aceptable.
- **[Inferencia]** El centrado es vertical; no depende de la dirección del texto. El eje horizontal sigue usando `x: "nearest"` por defecto.
- **[Inferencia]** El hook de puntero usa `selection.main.head`, por lo que un clic con selección múltiple (si se habilitara) centra el extremo activo de la principal, igual que el extender. La animación no distingue dirección ni rango.

### 7.9 Bloques finales más altos que una línea

- **[Hecho]** La fórmula `Pb = H - L` garantiza que la última **fila visual** de altura `L` llegue al top. Si el último bloque (un widget, una imagen o una línea muy envuelta) mide `W > L`, su top puede quedar por encima del viewport en el máximo: `topBloque = L - W < 0`.
- **[Inferencia]** En el editor Markdown de DraftWrite no hay widgets de bloque en el documento (el preview es otro componente), así que el caso normal es texto. Si se añadieran widgets, habría que decidir si se acepta ese overscroll o si se calcula `Pb = H - W` para el último bloque.
- **[Inferencia]** Para centrar el caret en la última fila visual, `scrollIntoView` sigue funcionando con independencia de `W`; el padding `H - L` es suficiente porque `C <= M`.
- **[Inferencia]** Si el bloque final es más alto que una línea, el `scrollHandler` usa su `block.height` y su centro real, así que el centrado del clic/teclado sigue siendo correcto; el máximo y el «top» del bloque final son los que pueden requerir una decisión de producto.

---

## 8. Clic para centrar y animación de saltos grandes

### 8.1 Qué hace CodeMirror con el puntero

- **[Hecho]** CodeMirror identifica las selecciones hechas con el puntero con `userEvent: "select.pointer"` y las despacha con `scrollIntoView: false`. La marca se añade en `applyDOMChangeInner` cuando el origen es `"select"` (`node_modules/@codemirror/view/dist/index.js:4332-4341`) y en `MouseSelection.select` (`index.js:4855-4862`).
- **[Hecho]** `MouseSelection` instala `mousemove` y `mouseup` a nivel del documento, no solo en `contentDOM` (`index.js:4782-4784`). Por eso un arrastre puede terminar fuera del editor y aun así actualizar la selección.
- **[Hecho]** El momento de la transacción depende del gesto:
  - Clic fuera de la selección: la selección colapsada se aplica en `mousedown` (`index.js:4790-4794`).
  - Clic dentro de una selección existente: el `mousedown` no cambia la selección; el `mouseup` documental la colapsa (`index.js:4825-4832`).
  - Clic sobre el mismo caret: no se despacha ninguna transacción.
  - Arrastre: una transacción colapsada al empezar y una transacción no vacía por cada movimiento; el `mouseup` no es una transacción nueva por sí mismo (`index.js:4801-4809`).
  - Doble y triple clic: selección no vacía; `event.detail` se usa en `getClickType` (`index.js:5046-5049`).
  - Shift+clic: selección extendida; `this.extend = startEvent.shiftKey` (`index.js:4785`).
- **[Hecho]** Verificado con eventos reales de Chromium en el harness:

| Gesto | Transacciones observadas | `scrollIntoView` | Resultado |
|---|---|---|---|
| Clic fuera de selección, línea visible | 1 (`select.pointer`, colapsada) en `mousedown` | `false` | El extender no centra; el hook de fin de gesto sí |
| Clic sobre el mismo caret | Ninguna | — | El hook de fin de gesto sí puede centrar |
| Arrastre dentro del editor | Colapsada al empezar + no vacía por movimiento | `false` | Ninguna transacción pide centro |
| Arrastre que termina fuera del contenido | Igual, con el `mouseup` documental | `false` | El hook documental recibe el fin de gesto |
| Doble clic | 1 (`select.pointer`, no vacía, `35-39`) | `false` | El hook centra una sola vez al final |
| Shift+clic | 1 (`select.pointer`, extendida) | `false` | El hook centra el extremo activo |

- **[Inferencia]** Un extender que se active con `tr.isUserEvent('select.pointer')` centraría al empezar el arrastre —cuando la selección todavía es colapsada— y volvería a centrar en cada movimiento. Es exactamente el jitter que el producto quiere evitar, y además centraría el clic antes de que CodeMirror fije la selección final en los casos en que el `mouseup` manda.
- **[Hecho]** `ViewUpdate.selectionSet` solo indica que la actualización fijó explícitamente la selección (`node_modules/@codemirror/view/dist/index.d.ts:596-601`); un arrastre genera una actualización por movimiento. No existe una señal de «fin de gesto» en `ViewUpdate`.
- **[Hecho]** `MouseSelectionStyle.get` recibe el evento actual y puede consultarse en cada movimiento, pero no tiene callback de `mouseup` ni de fin de arrastre (`index.d.ts:609-635`). Usarlo exigiría envolver el estilo y detectar el final por fuera, más código que el hook documental y con más acoplamiento a la implementación interna.
- **[Decisión abierta]** El clic en el gutter (si se añaden números de línea) no pasa por `contentDOM`; habría que decidir si también debe centrar. No está en el alcance actual.

### 8.2 Dónde enganchar el clic: comparación de hooks

| Hook | Qué cubre | Qué falla | Veredicto |
|---|---|---|---|
| `transactionExtender` con `select.pointer` | Todas las transacciones de puntero | Centra en `mousedown`, en cada movimiento del arrastre y antes del `mouseup` que fija la selección; no distingue fin de gesto | **Descartado** |
| `updateListener` con `selectionSet` | Cambios de selección | Un arrastre produce muchas actualizaciones; no hay evento de fin; un clic sobre el mismo caret no actualiza | **Descartado** |
| `EditorView.domEventHandlers({ mouseup })` | `mouseup` que ocurre dentro de `contentDOM` | No captura un arrastre que termina fuera; el handler corre antes que el `mouseup` documental de `MouseSelection` cuando el evento pasa por el contenido | **Parcial** |
| `ViewPlugin` + `mousedown` en `contentDOM` + `mouseup`/`touchend` en `document` + `requestAnimationFrame` | Clic, doble clic, shift+clic, arrastre que termina dentro o fuera del contenido | Hay que limpiar listeners; el `touchend` real requiere validación en dispositivo; un `mouseup` fuera de la ventana no llega | **Recomendado** |
| `MouseSelectionStyle` propio | Permite calcular la selección durante el gesto | No tiene callback de final; habría que replicar la lógica de CodeMirror; más frágil | **Descartado** |

- **[Hecho]** `EditorView.domEventHandlers` se registra en el elemento de contenido, no en el documento (`index.d.ts:1186-1202`). En el harness, un arrastre que terminaba fuera del contenido no habría sido visto por un handler de `contentDOM`; el listener documental sí lo vio.
- **[Hecho]** El orden de listeners importa: el `mouseup` de un plugin registrado en `contentDOM` corre durante la burbuja antes de que el listener documental de `MouseSelection` fije la selección final. Por eso el hook recomendado no centra en el `mouseup` inmediato: espera un `requestAnimationFrame`.
- **[Hecho]** En el harness, el `requestAnimationFrame` posterior al `mouseup` ya veía la selección final: clic en la línea 6 → `head = 37`, destino `120`; arrastre de la línea 2 a la 5 → `head = 30`, destino `96`; doble clic → selección `35-39`, destino `120`.
- **[Inferencia]** El `requestAnimationFrame` es preferible a `setTimeout(0)` porque se ejecuta después de que el navegador haya procesado el evento y antes del siguiente pintado; además, el efecto de scroll se resolverá en el siguiente ciclo de medida de CodeMirror.
- **[Inferencia]** No se usa el evento `click`: no se dispara en un arrastre, y el `mouseup` documental ya cubre clic, doble clic, shift+clic y arrastre con una sola ruta. `pointerup` sería otra opción, pero CodeMirror usa eventos de mouse y mezclar ambos aumenta el riesgo de doble disparo táctil.
- **[Hecho]** El hook debe ignorar botones que no sean el principal (`event.button !== 0`), no debe activarse si el `mousedown` no empezó en `contentDOM`, y debe coalescer varios `mouseup` seguidos en un solo frame pendiente. En el harness, el clic simple produjo una sola entrada en `pointerLog` y una sola transacción de scroll.

Secuencia recomendada para el plugin de puntero:

```ts
class CenterOnPointer {
  private pointerDown = false
  private frame = 0

  constructor(private readonly view: EditorView) {
    view.contentDOM.addEventListener('mousedown', this.onMouseDown)
    view.contentDOM.addEventListener('touchstart', this.onTouchStart, { passive: true })
    const doc = view.contentDOM.ownerDocument
    doc.addEventListener('mouseup', this.onGestureEnd)
    doc.addEventListener('touchend', this.onGestureEnd, { passive: true })
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button === 0 && this.view.contentDOM.contains(event.target as Node)) {
      this.pointerDown = true
    }
  }

  private onTouchStart = (event: TouchEvent) => {
    if (this.view.contentDOM.contains(event.target as Node)) this.pointerDown = true
  }

  private onGestureEnd = () => {
    if (!this.pointerDown) return
    this.pointerDown = false
    this.scheduleCenter()
  }

  private scheduleCenter() {
    const win = this.view.contentDOM.ownerDocument.defaultView ?? window
    if (this.frame) win.cancelAnimationFrame(this.frame)
    this.frame = win.requestAnimationFrame(() => {
      this.frame = 0
      if (!this.view.dom.isConnected || this.view.scrollDOM.clientHeight <= 0) return
      const head = this.view.state.selection.main.head
      this.view.dispatch({
        effects: EditorView.scrollIntoView(head, { y: 'center' })
      })
    })
  }

  destroy() {
    const win = this.view.contentDOM.ownerDocument.defaultView ?? window
    if (this.frame) win.cancelAnimationFrame(this.frame)
    this.view.contentDOM.removeEventListener('mousedown', this.onMouseDown)
    this.view.contentDOM.removeEventListener('touchstart', this.onTouchStart)
    const doc = this.view.contentDOM.ownerDocument
    doc.removeEventListener('mouseup', this.onGestureEnd)
    doc.removeEventListener('touchend', this.onGestureEnd)
  }
}
```

- **[Inferencia]** En touch real, el `touchend` y el `mouseup` sintético pueden llegar ambos. El flag `pointerDown` se limpia en el primero, así que el segundo no vuelve a centrar; aun así conviene añadir una guarda temporal o comprobar `event.sourceCapabilities?.firesTouchEvents` y probarlo en un dispositivo.
- **[Inferencia]** El hook no necesita leer `coordsAtPos` ni modificar la selección: despacha un efecto de scroll-only con el `head` que CodeMirror ya fijó. La transacción no cambia documento ni historial.

### 8.3 Interceptar el centrado con `EditorView.scrollHandler`

- **[Hecho]** `EditorView.scrollHandler` es un facet público que puede sustituir el scroll nativo. Su documentación dice: «Scroll handlers can override how things are scrolled into view. If they return true, no further handling happens [...] Scroll handlers should never initiate editor updates» (`node_modules/@codemirror/view/dist/index.d.ts:1234-1250`).
- **[Hecho]** `docView.scrollIntoView` consulta el facet antes de calcular el rectángulo del cursor y antes de llamar a `scrollRectIntoView` (`index.js:3456-3466`). Los efectos con `target.isSnapshot` se resuelven antes y no pasan por el facet (`index.js:3456-3462`).
- **[Hecho]** El efecto `"center"` del extender se aplica después de la bandera `tr.scrollIntoView` y de los efectos explícitos, así que el destino final es el centro (`index.js:8031-8045`). Sin el facet, `scrollRectIntoView` escribiría `scrollTop` directamente (`index.js:603-618`).
- **[Inferencia]** El `scrollHandler` es el punto correcto para la animación: recibe el rango y las opciones finales, puede calcular el destino sin `coordsAtPos` y puede devolver `true` para evitar que el navegador haga un salto `"nearest"` antes de que el frame de animación empiece.

```ts
const typewriterAnimation = ViewPlugin.fromClass(TypewriterAnimation)

export const typewriterCenterScroll = EditorView.scrollHandler.of((view, range, options) => {
  if (options.y !== 'center' || options.x !== 'nearest') {
    view.plugin(typewriterAnimation)?.cancel('native scroll')
    return false
  }

  const animation = view.plugin(typewriterAnimation)
  if (!animation) return false // fallback: let CodeMirror scroll if the plugin is absent

  animation.center(range.head)
  return true
})
```

- **[Hecho]** En el harness, este `scrollHandler` recibió `{ x: 'nearest', y: 'center', xMargin: 5, yMargin: 5 }` y calculó los destinos `0` (primera línea), `1176` (intermedia) y `2376` (última), con `scrollHeight = 3009`, `clientHeight = 430` y `documentPadding = { top: 203, bottom: 406 }`.
- **[Hecho]** El handler no despachó transacciones: solo calculó el destino, escribió `scrollTop` o programó un frame. Cumple la restricción «never initiate editor updates».
- **[Inferencia]** Si otro `scrollHandler` con mayor precedencia devuelve `true`, este no se ejecuta; hoy no hay otro en el editor. Si se añade uno, hay que ordenar los facets y documentar la precedencia.
- **[Inferencia]** El fallback `return false` cuando el plugin no está inicializado evita suprimir el scroll sin animación; es una salvaguarda para el primer ciclo de vida.

### 8.4 Animación: umbral, easing y cancelación

#### Comparación de alternativas

| Alternativa | Ventajas | Límites | Veredicto |
|---|---|---|---|
| **A. `scrollHandler` + `requestAnimationFrame` propio** | Control exacto de duración, easing, umbral, cancelación y retarget; solo se anima lo que se decide; se puede respetar `prefers-reduced-motion` | Hay que gestionar el ciclo de vida y cancelar en varios eventos | **Recomendada** |
| **B. `scroll-behavior: smooth` + efecto nativo** | Una línea de CSS; el navegador anima la asignación directa de `scrollTop` | Duración/easing del user agent (no 150 ms garantizados); anima todos los scrolls programáticos, no solo los saltos; no hay umbral ni control de cancelación/retarget; en Chromium 150 el centrado hacia `2376` seguía en `1775` a los 350 ms | **Descartada** |
| **C. `ViewPlugin` que reemplace el efecto de scroll** | Permite cualquier lógica | Sigue existiendo el destino nativo `"nearest"` de `tr.scrollIntoView`; habría que filtrar la bandera o competir con el efecto; más invasivo | **Descartada** |
| **D. CSS transition/transform** | No toca `scrollTop` | No mueve el scroll real ni los gutters; rompe la semántica del scroller y la accesibilidad | **Descartada** |

- **[Hecho]** La opción B **sí funciona** en Chromium 150: con `scroll-behavior: smooth` en el scroller, `scrollTop = 500` estaba en `0` inmediatamente y en `304` a los 120 ms; el efecto de centrado hacia `2376` estaba en `44` a los 100 ms y en `1775` a los 350 ms. El supuesto de que la asignación directa siempre es instantánea es falso.
- **[Hecho]** MDN documenta que `scroll-behavior` se aplica a las APIs de scroll de CSSOM y que la duración/easing del suavizado los define el user agent; los scrolls iniciados por el usuario no se ven afectados (`https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior`). Por eso B no puede garantizar «~150 ms» ni la selectividad del producto.
- **[Hecho]** Para que A funcione, `.cm-scroller` debe tener `scroll-behavior: auto` (o no declarar `scroll-behavior`). Si la app o un tema aplican `smooth`, cada escritura de `scrollTop` del bucle arrancará además un suavizado nativo y la animación se sentirá con retraso. El harness fija `scrollBehavior = 'auto'` en el constructor del plugin.
- **[Inferencia]** La animación propia no debe usar `scrollTo({ behavior: 'smooth' })`: es la misma dependencia del navegador que B. Se escribe `scrollTop` directamente.

#### Umbral

- **[Inferencia]** El umbral es `max(defaultLineHeight, clientHeight / 6)`. En el harness, `H = 430`, `L = 24` → `71.67 px` (≈3 líneas). Un ajuste de una o dos líneas (24/48 px) es instantáneo; un salto de 120 px o más se anima.
- **[Inferencia]** La justificación es la banda central: si el cursor ya está a menos de `H / 6` de la línea central, el usuario lo percibe como «casi centrado» y animar sería un movimiento innecesario. El mínimo `L` evita que un editor muy bajo tenga un umbral sub-línea.
- **[Hecho]** El harness confirmó un delta de `24` px como instantáneo (0 frames) y un delta de `120` px como animado (10 frames). La primera línea (`delta = 0`) y el destino ya alcanzado no programan animación.
- **[Inferencia]** El umbral se evalúa sobre `abs(target - scrollTop)`, no sobre la distancia del caret al centro en píxeles absolutos. Con el padding exacto son equivalentes; con padding redondeado o bloques más altos, el delta es la medida robusta.

#### Duración y easing

- **[Inferencia]** `DURATION = 150` ms y `easeOutCubic(t) = 1 - (1 - t)^3`. El ease-out hace que el primer tramo sea rápido y el final se asiente; encaja con un salto de viewport que no debe sentirse como un «latigazo».
- **[Hecho]** El harness ejecutó 10 frames para un salto de `0` a `2136` y terminó exactamente en `2136`; el frame inicial se clampea a `t = 0` si el timestamp de `requestAnimationFrame` es anterior a `performance.now()` (observado en headless).
- **[Inferencia]** Si el producto prefiere una animación aún más corta, 120 ms es el mínimo razonable para que se perciba; 150 ms es el valor recomendado. No se debe usar `linear` para un salto grande.
- **[Inferencia]** `prefers-reduced-motion: reduce` se consulta en cada petición con `matchMedia`; si está activo, se asigna el destino y no se programa ningún frame. No se necesita animar para cumplir la preferencia.

#### Cancelación y retargeting

- **[Hecho]** El plugin mantiene un solo `requestAnimationFrame` y un token de ejecución. Al llegar una nueva petición, cancela el frame anterior, calcula el nuevo destino desde el `scrollTop` actual y empieza un nuevo vuelo. No hay cola.
- **[Hecho]** En el harness, un retarget de `2136` a `0` a los ~60 ms (posición actual `1640`) canceló el frame anterior y terminó en `0`; el log mostró `cancel(retarget)` y un único `done` final. El frame viejo no volvió a escribir.
- **[Hecho]** La rueda canceló una animación en `1531` y la dejó ahí; un `y: "start"` nativo canceló y aplicó el destino nativo (`2098`). El editor oculto canceló sin programar frames.
- **[Inferencia]** El tecleo continuo no se encola: cada transacción con `scrollIntoView` vuelve a pedir centro. Si el delta ya es pequeño, se vuelve instantáneo; si sigue siendo grande, se retargetea. El retraso máximo es ~150 ms y no crece con la velocidad de escritura.
- **[Inferencia]** Los eventos que deben cancelar son: `wheel`, `touchstart`, `mousedown`/`pointerdown` en el scroller (incluye el inicio de un clic), `PageUp`/`PageDown`/`Escape` por teclado, `resize`, editor oculto y cualquier destino de scroll que no sea `{ y: "center", x: "nearest" }`.
- **[Decisión abierta]** El arrastre de la barra de scroll no siempre entrega `mousedown`/`pointerdown` al documento en todos los navegadores. Si se observa durante la implementación, añadir una comprobación de desviación de `scrollTop` respecto al valor esperado o un listener de `scroll` con cancelación. No se pudo validar en el harness headless.

#### Código base de la animación

```ts
const DURATION = 150

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

class TypewriterAnimation {
  private frame = 0
  private run = 0

  constructor(private readonly view: EditorView) {
    // Native smooth scrolling would smooth every scrollTop write below.
    view.scrollDOM.style.scrollBehavior = 'auto'
  }

  center(head: number) {
    const scroller = this.view.scrollDOM
    const height = scroller.clientHeight
    if (height <= 0) {
      this.cancel('hidden')
      return
    }

    const block = this.view.lineBlockAt(head)
    const maxTop = Math.max(0, scroller.scrollHeight - height)
    const target = Math.max(
      0,
      Math.min(
        maxTop,
        this.view.documentPadding.top + block.top + block.height / 2 - height / 2
      )
    )

    const current = scroller.scrollTop
    const delta = target - current
    const threshold = Math.max(this.view.defaultLineHeight, height / 6)
    this.cancel('retarget')

    if (Math.abs(delta) <= threshold || prefersReducedMotion(this.view)) {
      scroller.scrollTop = target
      return
    }

    const run = ++this.run
    const start = performance.now()
    const win = this.view.contentDOM.ownerDocument.defaultView ?? window
    const step = (now: number) => {
      if (run !== this.run) return
      if (scroller.clientHeight <= 0) {
        this.cancel('hidden')
        return
      }

      const t = Math.max(0, Math.min(1, (now - start) / DURATION))
      scroller.scrollTop = current + delta * easeOutCubic(t)

      if (t < 1) {
        this.frame = win.requestAnimationFrame(step)
      } else {
        this.frame = 0
      }
    }
    this.frame = win.requestAnimationFrame(step)
  }

  cancel(reason: string) {
    if (this.frame) {
      const win = this.view.contentDOM.ownerDocument.defaultView ?? window
      win.cancelAnimationFrame(this.frame)
      this.frame = 0
    }
    this.run++
  }
}
```

- **[Inferencia]** El código debe completar el `cancel` con el registro/limpieza de listeners y un `destroy`; el fragmento omite esa parte para no repetir el plugin de 8.2.
- **[Hecho]** La fórmula de destino es la misma que la de la sección 5.1: con `Pt = (H - L)/2` y un bloque de altura `L`, `target = block.top`. En el harness, `lineBlockAt` devolvió los tops `0`, `1176` y `2376`, y el `scrollTop` final coincidió.
- **[Inferencia]** `lineBlockAt` puede devolver un bloque de altura mayor que `L` para una línea envuelta; usar `block.height / 2` centra el bloque visual completo. Es la aproximación correcta para el typewriter; si se quisiera centrar exactamente el glifo habría que usar `coordsAtPos`, pero no está disponible para un destino lejano.
- **[Inferencia]** La lectura de `scrollHeight` y `lineBlockAt` ocurre una vez por petición, no por frame. El bucle solo escribe `scrollTop`; no hay `requestMeasure` ni transacciones anidadas.

### 8.5 Secuencias completas

#### Tecleo o comando con `scrollIntoView`

1. La transacción se crea con `scrollIntoView: true`.
2. El extender añade `EditorView.scrollIntoView(head, { y: 'center' })`.
3. `EditorView.update` procesa la bandera y el efecto; el centro queda como destino final.
4. El ciclo de medida llama a `docView.scrollIntoView`.
5. El `scrollHandler` calcula el destino y decide animar o asignar.
6. El bucle escribe `scrollTop` durante ~150 ms; si llega otra transacción, se cancela y se retargetea.

#### Clic simple

1. `mousedown` en `contentDOM` activa `pointerDown`; CodeMirror aplica la selección colapsada si el clic está fuera de la selección.
2. El usuario suelta; el `mouseup` documental de `MouseSelection` fija la selección final; el listener del plugin programa un `requestAnimationFrame`.
3. En el frame, el plugin lee `selection.main.head` y despacha `EditorView.scrollIntoView(head, { y: 'center' })`.
4. El `scrollHandler` calcula el destino; si el delta supera el umbral, anima; si no, asigna.
5. No se modifica el documento ni el historial.

#### Arrastre

1. `mousedown` colapsa la selección; `MouseSelection` instala sus listeners documentales.
2. Cada `mousemove` extiende la selección; el plugin de puntero no hace nada.
3. Al soltar, el `mouseup` documental fija la selección final; el plugin programa un único frame.
4. El frame despacha un único centrado para `head`; no hay centrados intermedios.

#### Rueda, PageUp/PageDown y reduced motion

- Rueda: el listener `wheel` cancela el frame; el scroll nativo sigue su curso. No se despacha ningún centrado.
- PageUp/PageDown: el efecto `y: "start"` llega al `scrollHandler`; este cancela la animación, devuelve `false` y deja que el scroll nativo sea instantáneo.
- Reduced motion: `prefersReducedMotion(view)` devuelve `true`; se asigna `scrollTop = target` y no se programa frame.

### 8.6 Edge cases del clic y de la animación

| Caso | Comportamiento esperado | Estado |
|---|---|---|
| Clic en una línea visible lejos del centro | Centra; si el delta supera el umbral, anima 150 ms | **[Hecho]** harness: línea 6, `0 → 120`, 10 frames |
| Clic en una línea ya casi centrada | Centra o ajusta sin animación | **[Hecho]** harness: `120 → 144`, instantáneo |
| Clic sobre el mismo caret | No hay transacción de CodeMirror, pero el hook puede recentrar si el scroll no está centrado | **[Hecho]** por lógica del hook; el `mouseup` se observa |
| Clic fuera de la selección | La selección se fija en `mousedown`; el centrado ocurre al soltar | **[Hecho]** fuente + harness |
| Clic dentro de una selección existente | La selección se colapsa en el `mouseup`; el centrado usa el caret final | **[Hecho]** fuente; el hook espera el frame |
| Arrastre dentro del editor | Sin centrados intermedios; uno al soltar | **[Hecho]** harness: transacciones por movimiento, un solo `pointerLog` |
| Arrastre que termina fuera del contenido | El listener documental recibe el `mouseup`; centra igualmente | **[Hecho]** harness |
| Arrastre que sale de la ventana | El `mouseup` puede perderse; no hay centrado hasta el siguiente gesto | **[Inferencia]** riesgo conocido del hook documental |
| Doble clic | Centra la palabra seleccionada una sola vez | **[Hecho]** harness: `35-39`, destino `120` |
| Shift+clic | Centra el extremo activo de la selección extendida | **[Inferencia]** fuente + misma ruta de `mouseup` |
| Clic derecho o central | No activa el hook; no cambia el centrado | **[Inferencia]** guarda `button === 0` |
| Clic en el gutter | No pasa por `contentDOM`; no centra | **[Decisión abierta]** si se añaden números de línea |
| Rueda durante una animación | Cancela el frame; el scroll manual manda | **[Hecho]** harness: cancelado en `1531` |
| PageUp/PageDown durante una animación | Cancela; el destino `y: "start"` queda nativo e instantáneo | **[Hecho]** harness: cancelado y `2098` nativo |
| Arrastrar la barra durante una animación | Debería cancelar; la entrega de eventos de la barra varía por navegador | **[Decisión abierta]** validar en Electron |
| Editor oculto | No centra, no anima, no lanza | **[Hecho]** harness: `clientHeight = 0`, sin log de centro |
| Resize durante una animación | Cancela; el siguiente centrado usa la nueva geometría | **[Inferencia]** cubierto por `resize` y chequeo de altura |
| Tecleo continuo | Retargetea sin cola; los ajustes pequeños se vuelven instantáneos | **[Inferencia]** diseño de un solo frame |
| IME/composición | Puede retargetear en cada actualización de composición | **[Decisión abierta]** 7.3 |
| Touch real | `touchend` + guarda contra el `mouseup` sintético | **[Decisión abierta]** validar en dispositivo |
| `prefers-reduced-motion` | Destino instantáneo, cero frames | **[Hecho]** harness con emulación |
| Primer/último bloque del documento | El clamp usa `[0, scrollHeight - clientHeight]`; el padding permite el centro | **[Hecho]** destinos `0` y `2376`; máximo `2579` |
| Documento vacío o de una línea | `target = 0`; no hay animación | **[Inferencia]** fórmula y padding |

### 8.7 Resultados del harness

El harness de esta actualización monta un `EditorView` real con `H = 430`, `L = 24`, 100 líneas (`D = 2400`), `P = 203`, `B = 406`, `scrollHeight = 3009` y `maxScroll = 2579`. Usa el padding asimétrico, el extender y el `scrollHandler` con la animación de 150 ms. Los eventos de clic y arrastre se enviaron con CDP (`Input.dispatchMouseEvent`), no con `dispatchEvent` sintético.

| Caso | Medición | Resultado |
|---|---|---|
| Salto grande programático | `0 → 2136` (línea 90), 10 frames | Terminó en `2136`; ease-out; primer frame clampeado a `t = 0` |
| Ajuste pequeño programático | `1176 → 1200`, delta `24` ≤ `71.67` | Instantáneo, 0 frames |
| Retarget | `2136 → 0` a los ~60 ms, posición `1640` | Canceló el frame anterior; terminó en `0`; sin frame viejo |
| Reduced motion | `0 → 2136` con `prefers-reduced-motion: reduce` | Instantáneo, 0 frames |
| Rueda | Animación en `1531` + `WheelEvent` | Canceló en `1531`; permaneció |
| `y: "start"` nativo | Animación en `1531` + efecto `start` | Canceló; el scroll nativo quedó en `2098` |
| Clic real, salto grande | Línea 6, `head = 37`, `scrollTop = 0` | Destino `120`, 10 frames, final `120` |
| Clic real, ajuste pequeño | `scrollTop = 120`, línea 7, `head = 44` | Destino `144`, instantáneo, 0 frames |
| Arrastre dentro | Línea 2 → 5, `head = 30` | Un solo centrado al soltar; destino `96`; 10 frames |
| Arrastre terminando fuera | Mismo arrastre, `mouseup` en `x = 1000` | El listener documental centró igualmente; destino `96` |
| Doble clic | Línea 6, selección `35-39` | Destino `120`, 10 frames; un solo `pointerLog` |
| Editor oculto | `display: none`, `scrollIntoView` a línea 90 | `clientHeight = 0`; no animación; sin excepción |
| Destinos de centrado | Primera / intermedia / última | `0 / 1176 / 2376`; `lineBlockAt` coincide |
| CSS smooth, asignación directa | `scrollTop = 500` con `smooth` | `0` inmediato; `304` a los 120 ms |
| CSS smooth, centro nativo | Destino `2376` | `44` a los 100 ms; `1775` a los 350 ms; no se esperó el final |

- **[Hecho]** El harness no es la app Electron: usa Chromium 150 headless, una fuente monoespaciada y una altura fija. Sirve para verificar la mecánica y los tiempos, no para sustituir la prueba visual con las fuentes, el zoom y el IME reales.
- **[Inferencia]** La diferencia entre `coordsAtPos` (glifo) y `lineBlockAt` (bloque de línea) es de pocos píxeles en texto normal; el objetivo del typewriter es el centro de la línea, no el centro exacto del glifo. El harness confirma que el destino coincide con el top del bloque.
- **[Inferencia]** Las cifras de CSS smooth demuestran que no se puede confiar en una duración de 150 ms sin control propio, pero no son una especificación: otros navegadores pueden usar otra curva o duración.

### 8.8 Riesgos residuales

- **[Inferencia]** El `touchend` real y el `mouseup` sintético deben probarse en un dispositivo táctil; el flag de gesto evita el doble centrado en la teoría, pero no se verificó en hardware.
- **[Inferencia]** El arrastre de la barra de scroll puede no entregar eventos de puntero al documento; si se observa, usar un listener de `scroll` con cancelación por desviación.
- **[Inferencia]** Si el usuario suelta el mouse fuera de la ventana, el `mouseup` puede no llegar; el gesto queda sin centrado hasta el siguiente clic.
- **[Inferencia]** Un `scroll-behavior: smooth` accidental en `.cm-scroller` (tema, CSS global o extensión) haría que cada frame del bucle arranque un suavizado nativo. Hay que fijar `auto` o eliminarlo del tema.
- **[Inferencia]** El IME puede mover el candidato si se retargetea durante la composición; la decisión de excluir `.compose` sigue abierta.
- **[Inferencia]** El clic en el gutter, si se añaden números de línea, no está cubierto por el hook actual.
- **[Inferencia]** El renderer usa jsdom en Jest; no se puede validar allí el layout, el `scrollTop` real ni `requestAnimationFrame` con tiempos. Esas pruebas van al harness/Electron.

---

## 9. Tests y verificación

### 9.1 Tests puros en Jest

El extender y el cálculo del padding se pueden probar sin montar una vista.

```ts
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  computeTypewriterPadding,
  typewriterPaddingStyle,
  typewriterScroll
} from './typewriter'

function createState(): EditorState {
  return EditorState.create({ doc: 'one\ntwo', extensions: [typewriterScroll] })
}

it('centers the head when the transaction asks to scroll', () => {
  const tr = createState().update({
    changes: { from: 3, insert: '!' },
    selection: { anchor: 4 },
    scrollIntoView: true
  })

  const last = tr.effects[tr.effects.length - 1]
  expect(last.value).toMatchObject({ y: 'center', range: { head: 4 } })
})

it('does not add effects without the scroll flag', () => {
  const tr = createState().update({ selection: { anchor: 2 } })
  expect(tr.effects).toHaveLength(0)
})

it('appends the center effect after an explicit target', () => {
  const tr = createState().update({
    selection: { anchor: 6 },
    effects: EditorView.scrollIntoView(6, { y: 'start' }),
    scrollIntoView: true
  })

  expect(tr.effects.map((effect) => (effect.value as { y: string }).y)).toEqual([
    'start',
    'center'
  ])
})

it('computes the combined asymmetric padding', () => {
  expect(computeTypewriterPadding(430, 24)).toEqual({ top: 203, bottom: 406 })
  expect(computeTypewriterPadding(600, 24)).toEqual({ top: 288, bottom: 576 })
  expect(computeTypewriterPadding(0, 24)).toEqual({ top: 0, bottom: 0 })
  expect(computeTypewriterPadding(20, 24)).toEqual({ top: 0, bottom: 0 })
  expect(computeTypewriterPadding(24, 24)).toEqual({ top: 0, bottom: 0 })
})

it('builds the inline style or null', () => {
  expect(typewriterPaddingStyle(430, 24)).toBe(
    'padding-top: 203px; padding-bottom: 406px'
  )
  expect(typewriterPaddingStyle(0, 24)).toBeNull()
})

it('computes and clamps the center target from a line block', () => {
  expect(computeCenterTarget(203, 0, 24, 430, 2579)).toBe(0)
  expect(computeCenterTarget(203, 1176, 24, 430, 2579)).toBe(1176)
  expect(computeCenterTarget(203, 2376, 24, 430, 2579)).toBe(2376)
  expect(computeCenterTarget(203, 2376, 24, 430, 2000)).toBe(2000)
  expect(computeCenterTarget(203, -100, 24, 430, 2579)).toBe(0)
})

it('uses the block height for a wrapped or tall block', () => {
  expect(computeCenterTarget(203, 100, 72, 430, 2579)).toBe(124)
  expect(computeCenterTarget(138, 100, 72, 300, 2579)).toBe(124)
})

it('animates only deltas above max(lineHeight, viewport / 6)', () => {
  expect(typewriterThreshold(430, 24)).toBeCloseTo(71.6667)
  expect(shouldAnimateCenter(24, 430, 24)).toBe(false)
  expect(shouldAnimateCenter(71, 430, 24)).toBe(false)
  expect(shouldAnimateCenter(72, 430, 24)).toBe(true)
  expect(shouldAnimateCenter(120, 430, 24)).toBe(true)
  expect(shouldAnimateCenter(120, 0, 24)).toBe(false)
})

it('eases out from zero to one', () => {
  expect(easeOutCubic(0)).toBe(0)
  expect(easeOutCubic(0.5)).toBeCloseTo(0.875)
  expect(easeOutCubic(1)).toBe(1)
  expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.75))
})

it('does not change selection or document when centering', () => {
  const state = createState()
  const tr = state.update({
    selection: { anchor: 2 },
    effects: EditorView.scrollIntoView(2, { y: 'center' })
  })
  expect(tr.newSelection.eq(state.selection)).toBe(true)
  expect(tr.docChanged).toBe(false)
})
```

- **[Inferencia]** Conviene extraer `computeCenterTarget`, `typewriterThreshold`, `shouldAnimateCenter` y `easeOutCubic` como funciones puras del módulo `typewriter.ts`; así los tests no dependen de un `EditorView` real.
- **[Hecho]** Los tests del renderer corren en jsdom (`jest.config.js:24-35`) con un shim de `Range` que devuelve rects vacíos (`src/renderer/src/test/setup.ts:4-29`).
- **[Hecho]** `articleView()` encuentra la vista a través de `.cm-content` (`src/renderer/src/App.test.tsx:555-563`) y `replaceEditorText` despacha cambios sin `scrollIntoView` (`:570-577`).
- **[Inferencia]** Los tests puros anteriores son estables en jsdom. No conviene afirmar en Jest que `scrollTop` cambió o que el cursor quedó centrado: jsdom no calcula layout y `clientHeight` es 0.
- **[Inferencia]** Se puede probar en jsdom que dos `contentAttributes` con `padding-bottom` producen el estilo esperado, porque el atributo `style` sí se aplica; no se puede probar la posición resultante.
- **[Inferencia]** Los tests de `requestAnimationFrame`, `prefers-reduced-motion` y eventos documentales se reservan para Chromium/Electron; simularlos en jsdom daría falsos positivos.

### 9.2 Verificación de layout y gestos en Chromium headless

- **[Hecho]** El repo ya tiene precedente de verificar bugs de scroll/layout con un harness headless de Chromium sobre el build de producción, y de dejar la verificación manual en Electron como paso aparte (`.scratch/editor-linebreaks-scroll/spec.md:43-44,59-69`).
- **[Inferencia]** Para estas dos features, el harness debe montar un editor con altura acotada y las mismas extensiones, y medir posiciones reales. Métricas sugeridas:

```ts
const scrollerRect = view.scrollDOM.getBoundingClientRect()
const caret = view.coordsAtPos(view.state.selection.main.head)
const caretCenter = (caret.top + caret.bottom) / 2
const viewportCenter = scrollerRect.top + view.scrollDOM.clientHeight / 2
const delta = Math.abs(caretCenter - viewportCenter)
```

Casos y aserciones:

1. **Primera línea centrada:** seleccionar la posición 0 con `scrollIntoView`, comprobar `scrollTop === 0` y `delta <= 2`.
2. **Última línea centrada al escribir:** insertar un carácter al final, comprobar `delta <= 2` y `scrollTop` aproximadamente `D - L`.
3. **Última línea al top manual:** fijar `scrollTop = scrollHeight - clientHeight`; comprobar que la última línea (`.cm-line` final) tiene `top` igual al top del scroller (tolerancia ±2) y que el caret está en la mitad superior de la línea.
4. **Máximo finito:** después de varios `wheel`/`scrollTop` al máximo, comprobar con tolerancia ±1 que `scrollHeight` no cambia y que `maxScroll` es `D - L + P` (con `P = (clientHeight - L) / 2`), por el redondeo entero del padding y de `scrollHeight`.
5. **Workspace intacto:** `document.querySelector('.workspace')?.scrollTop === 0` (o el contenedor real del workspace) tras escribir y scrollear.
6. **Documento vacío / una línea:** `scrollTop 0` centra; `scrollTop = P` deja la línea en el top.
7. **Resize:** cambiar la altura del contenedor, esperar la medida y comprobar que `padding-top` es `Math.round((H' - L)/2)`, `padding-bottom` es `Math.ceil(H' - L)` y el caret sigue centrado.
8. **Oculto → visible:** poner `display: none`/clase `hidden`, comprobar que el padding vuelve al del tema (o 0) y que al mostrarlo se recalcula; el caret se centra en la siguiente transacción.
9. **Gutter (si se añade `lineNumbers()`):** el primer `.cm-gutterElement` visible debe tener `marginTop === paddingTop` y su centro debe coincidir con el de `.cm-line` (delta 0).
10. **Rueda:** simular `scrollTop` manual hasta el máximo; comprobar que no hay transacción ni recentrado; después escribir y comprobar que vuelve al centro.
11. **Clic desde el top:** hacer clic real en una línea visible (por ejemplo, la 6); esperar dos `requestAnimationFrame` y comprobar que `scrollTop` es el `lineBlockAt(head).top` recortado, que el `head` es el clic y que no cambió el documento.
12. **Clic de ajuste pequeño:** situar el scroll a una línea de distancia del centro y hacer clic en la siguiente; comprobar que el destino se alcanza en el mismo frame/layout (0 frames de animación), no tras 150 ms.
13. **Arrastre:** arrastrar de la línea 2 a la 5; comprobar que durante el movimiento no se agregó ningún efecto de centrado y que al soltar hay exactamente un `pointerLog`/una petición de centro con `head` final.
14. **Arrastre fuera:** repetir el arrastre soltando fuera de `contentDOM` (pero dentro de la ventana); comprobar que el listener documental centra igualmente y que no hay doble petición.
15. **Doble clic:** comprobar que la selección es la palabra y que se centra una sola vez, con el `head` final.
16. **Salto grande:** seleccionar una línea lejana (por ejemplo, la 90) con `scrollIntoView`; comprobar que a los ~50 ms el scroll es intermedio, que a los 300 ms el destino es exacto y que hubo entre 5 y 20 frames.
17. **Ajuste pequeño:** un delta de 24 px no debe producir frames; el `scrollTop` final debe ser el destino.
18. **Cancelación por rueda:** iniciar un salto grande, despachar un `WheelEvent` real a mitad de vuelo y comprobar que el `scrollTop` deja de cambiar y que no se completa el destino.
19. **Cancelación por PageUp/PageDown:** iniciar un salto grande y despachar la tecla; comprobar que se cancela, que el destino `y: "start"` se aplica de forma nativa y que no hay un centro posterior.
20. **Reduced motion:** emular `prefers-reduced-motion: reduce` y comprobar que un salto grande llega al destino con 0 frames.
21. **Editor oculto:** con `display: none`, despachar un centrado; comprobar que no hay excepción, que no hay frames y que al mostrarlo el siguiente gesto sí centra.
22. **CSS smooth:** comprobar que `getComputedStyle(view.scrollDOM).scrollBehavior === 'auto'`; si es `smooth`, la animación propia no es fiable y el test debe fallar con un mensaje claro.
23. **Dos editores montados:** montar dos `EditorView` con la extensión; comprobar que un clic en uno solo centra ese editor (el `pointerDown` es local) y que al destruir uno se retiran sus listeners documentales.

- **[Inferencia]** La verificación debe usar el build de producción o un montaje mínimo con las mismas versiones; el harness de esta investigación usó `H = 430`, `L = 24`, `D = 2400` y obtuvo los valores de la tabla 6.2 y de la sección 8.7.
- **[Inferencia]** En la app Electron real conviene verificar con las fuentes y el zoom reales, y con IME si está disponible en el entorno. El clic y el arrastre deben probarse también con trackpad y touch.
- **[Inferencia]** Las aserciones de tiempo no deben exigir exactamente 150 ms en CI: el frame puede variar. Se comprueba el destino final, que hubo animación (frames > 0) y que no se superó un límite superior razonable (por ejemplo, 300 ms).

### 9.3 Criterios de aceptación sugeridos

1. Al escribir en la primera línea, el cursor queda centrado y `scrollTop` es 0.
2. Al escribir en una línea intermedia, el cursor queda centrado tras cada línea nueva.
3. Al escribir en la última línea, el cursor queda centrado y todavía queda recorrido hasta el máximo.
4. Al llevar el scroll al máximo, la última línea queda en el top y hay `H - L` px en blanco debajo; el máximo es finito y no cambia al repetir el scroll.
5. Al escribir después de llevar la última línea al top, el viewport vuelve a centrar la última línea.
6. Un clic real en una línea visible mueve el caret y centra esa línea; el destino es `lineBlockAt(head).top` recortado y no cambia el documento.
7. Un arrastre no mueve el viewport durante el gesto; al soltar, centra una sola vez el `head` final, incluso si se suelta fuera del contenido del editor.
8. Un salto grande se anima ~150 ms con ease-out y termina exactamente en el destino; un ajuste de una o dos líneas, un destino ya centrado o un delta por debajo de `max(L, H/6)` se aplica sin animación.
9. Una nueva petición de centrado durante una animación la cancela y retargetea desde el `scrollTop` actual; no se encolan animaciones ni se producen saltos al frame viejo.
10. La rueda, PageUp/PageDown, `Escape`, el resize y el editor oculto cancelan la animación; PageUp/PageDown conservan su destino nativo y no se recentran.
11. Con `prefers-reduced-motion: reduce`, todos los centrados son instantáneos (0 frames), incluido el clic.
12. `.cm-scroller` no tiene `scroll-behavior: smooth`; la animación propia controla la duración y el easing.
13. La rueda y la barra llegan al máximo sin que el extender interfiera; PageUp/PageDown no se recentran.
14. Al redimensionar la ventana, el padding se recalcula y el cursor vuelve al centro en la siguiente transacción; al cambiar de `preview` a `edit`/`split`, el padding se restaura y el workspace no hace scroll.
15. Si se añaden números de línea, el gutter queda alineado con el texto.
16. Al desmontar el editor se retiran los listeners documentales del hook de puntero y no queda ningún `requestAnimationFrame` pendiente.
17. `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

### 9.4 Regresiones a vigilar

- **[Inferencia]** El padding inline cambia el estilo de `.cm-content`; los tests que consultan ese elemento por texto o por `EditorView.findFromDOM` no deberían romperse.
- **[Inferencia]** `replaceEditorText` no marca `scrollIntoView`, así que no añade efectos en los tests existentes.
- **[Inferencia]** El centrado del clic despacha una transacción solo de efectos (`EditorView.scrollIntoView`); no cambia documento, selección ni historial. Los tests existentes que comparan el doc o el historial no deberían cambiar, pero conviene añadir uno que lo asegure.
- **[Inferencia]** Los listeners documentales del hook deben retirarse en `destroy`; si no, un editor desmontado puede seguir centrando o retener la vista. Probar dos editores y el desmontaje.
- **[Inferencia]** Un doble clic o un `touchend` seguido de `mouseup` no deben producir dos centrados. El flag de gesto y la coalescencia del frame son la defensa; probarlo con eventos reales porque jsdom no reproduce la secuencia.
- **[Inferencia]** El bucle de animación no debe despachar transacciones ni llamar a `requestMeasure`; si se añade un listener de update que reaccione a `scrollTop`, hay que evitar un ciclo. El harness no observó transacciones por frame.
- **[Inferencia]** `prefers-reduced-motion` debe comprobarse antes de programar el primer frame, no solo dentro del bucle; un cambio de preferencia durante el vuelo puede dejar 1-2 frames residuales, aceptable para 150 ms, pero conviene cancelar si se implementa el listener de `matchMedia`.
- **[Inferencia]** Si se añade un toggle, hay que probar que al desactivarlo se retira el padding y se restauran los 16 px del tema, y que el editor no se recrea.
- **[Inferencia]** Si se añade `scrollPastEnd()` en el futuro, hay que probar el orden de `contentAttributes`; el padding del plugin debe ganar y el de `scrollPastEnd` no debe usarse para el bottom.
- **[Inferencia]** Si un tema o CSS global añade `scroll-behavior: smooth`, la animación propia se degrada; el test 22 de 9.2 debe protegerlo.

---

## 10. Decisiones de producto y recomendaciones

| Decisión | Opciones | Recomendación / estado |
|---|---|---|
| Activación del centrado | Siempre activo / toggle en toolbar / preferencia persistida | Empezar siempre activo en Story y Article; añadir toggle solo si el producto lo pide. No hay infraestructura de preferencias hoy. **Abierta.** |
| Activación del scroll libre | Siempre activo / toggle independiente / solo en documentos largos | Empezar siempre activo: es el comportamiento de «free scroll» pedido. Si se separa del centrado, usar dos `Compartment`. **Abierta.** |
| Padding inferior | `H - L` (última línea al top) / `H - L - m` (se detiene `m` px antes) / `H - L + m` (overscroll) | `H - L`: es la única que cumple «última línea al top» con espacio `H - L` debajo; `m` sería un margen de producto. **Resuelta.** |
| Documentos cortos | Padding completo siempre / superior siempre y inferior solo en documentos largos (`D > H`) | Siempre: evita el salto al cruzar el umbral y hace coherente el scroll libre. Aceptar que un documento de una línea tenga `P` px de recorrido. **Abierta.** |
| Apertura del documento | Primera línea centrada desde el inicio / empezar en el top y centrar tras la primera edición | Centrada desde el inicio: es coherente con el requisito 1. Si el producto prefiere el top al abrir, habría que abrir con `padding-top: 0` y aplicarlo en la primera transacción (con un salto de layout) o aceptar que la primera línea se vea centrada. **Abierta.** |
| Clic de mouse | No recentrar / recentrar al hacer clic / solo si el clic está fuera de la banda central | Recentrar al soltar, siempre que el clic haya movido el caret. Si el delta al centro es pequeño, el ajuste es instantáneo; si es grande, se anima. Un clic sobre el mismo caret también puede recentrar, pero no crea transacción. **Resuelta (esta actualización).** |
| Arrastre | Centrar en cada movimiento / centrar solo al soltar | Centrar solo al soltar, con el `head` final. **Resuelta.** |
| Doble/triple clic y shift+clic | Reutilizar el hook de fin de gesto / tratar cada variante por separado | Reutilizar el mismo hook: la selección final la fija CodeMirror y el hook solo centra su `head`. **Resuelta.** |
| Hook del clic | Extender `select.pointer` / `ViewUpdate.selectionSet` / `domEventHandlers` / `ViewPlugin` documental | `ViewPlugin` con `mousedown` en `contentDOM` y `mouseup`/`touchend` en `document`, diferido con `requestAnimationFrame`. Cubre clic, arrastre, doble clic y salida del contenido. **Resuelta.** |
| Tolerancia | Centrado estricto / banda central de ±`H/6` | Banda `max(L, H/6)`: por debajo, instantáneo; por encima, animación. Es una banda de ±`H/6` alrededor del centro, con mínimo de una línea. **Resuelta.** |
| Suavizado | Instantáneo / `scroll-behavior: smooth` / `requestAnimationFrame` propio | `requestAnimationFrame` propio, 150 ms, ease-out cúbico, solo para saltos que superan el umbral. **Resuelta.** |
| CSS smooth en `.cm-scroller` | Permitirlo / prohibirlo | Prohibido o forzado a `auto`: en Chromium 150 sí suaviza la asignación directa de `scrollTop` y pelearía con el bucle; además no permite controlar duración, umbral ni cancelación. **Resuelta.** |
| Reduced motion | Ignorar / respetar con instantáneo | Respetar `prefers-reduced-motion: reduce`; el destino se asigna sin frames. **Resuelta.** |
| Rueda / barra | No recentrar / recentrar al soltar; animación durante el scroll | No recentrar y cancelar cualquier animación de centrado en curso. La barra es un riesgo residual: validar la entrega de eventos o detectar desviación de `scrollTop`. **Resuelta para rueda; barra a validar.** |
| PageUp/PageDown | Centrar / dejar el destino nativo `y: "start"` | Cancelar la animación y dejar el destino nativo instantáneo. No se recentra. **Resuelta.** |
| Editor oculto | Animar igual / saltar y cancelar | Saltar y cancelar: `clientHeight = 0`; el siguiente gesto al volver a mostrarlo centra. **Resuelta.** |
| Tecleo continuo / retarget | Encolar animaciones / cancelar y retargetear | Un solo frame: cancelar y retargetear desde el `scrollTop` actual; los ajustes pequeños se vuelven instantáneos. **Resuelta.** |
| IME | Centrar también durante composición / excluir `.compose` | Verificar en Linux; si hay saltos o el candidato se mueve, excluir `.compose` y centrar en la siguiente transacción. **Abierta.** |
| Touch | Mismo hook `touchend` / no centrar en touch | Mismo hook con guarda contra el `mouseup` sintético; validar en dispositivo. **Abierta hasta prueba real.** |
| Destinos explícitos | Respetar PageUp/PageDown/búsqueda / centrar siempre | PageUp/PageDown no marcan la bandera y no se tocan. Si un comando futuro marca `scrollIntoView` y añade un efecto `y: "start"`, el extender lo pisará: excluirlo por `userEvent` o no marcar la bandera. Revisar búsqueda si se añade. **Abierta para comandos futuros.** |
| Tema | Reemplazar top/bottom / sumarlos a los 16 px | Reemplazar: el padding del plugin es absoluto. Sumar descentra la primera línea y permite overscroll en la última. **Resuelta.** |
| Gutter futuro | Añadir `lineNumbers()` sin cambios / compensar el padding / centrar el clic en el gutter | Sin cambios en la alineación: CodeMirror ya compensa `documentPadding.top`; verificado con delta 0. El clic en el gutter no está cubierto por el hook actual. **Abierta si se añaden números de línea.** |
| Último bloque alto | Aceptar overscroll / calcular `Pb = H - W` | Aceptar en la primera versión: el editor es de texto y no hay widgets de bloque. El centrado usa `block.height`; revisar si se añaden widgets. **Abierta.** |
| Alcance | Story y Article / solo Article | Story y Article: comparten `TextEditor` y la experiencia de escritura es la misma. **Resuelta.** |
| Scrollbar en documentos cortos | Aceptar que aparezca / ocultarlo con CSS | Aceptar: es consecuencia del espacio finito. Ocultarlo daría una falsa sensación de que no hay scroll libre. **Abierta.** |

---

## 11. Inventario de archivos

### Producción (solo lectura en esta investigación)

| Archivo | Papel |
|---|---|
| `src/renderer/src/editor/TextEditor/TextEditor.tsx` | Editor CodeMirror compartido; consume `articleEditorExtensions` |
| `src/renderer/src/editor/extensions.ts` | Punto de entrada de extensiones; aquí se cablearía el typewriter |
| `src/renderer/src/editor/theme.ts` | Line height y padding actuales de `.cm-content` |
| `src/renderer/src/editor/commands.ts` | Comandos de toolbar que ya usan `scrollIntoView: true` |
| `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx` | Layout editor/preview; oculta el editor sin desmontarlo |
| `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx` | Editora de Story; usa `TextEditor` |
| `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx` | Editora de Article; usa `TextEditor` |
| `src/renderer/src/App.test.tsx` | Helpers de CodeMirror y tests de integración existentes |

### Archivos propuestos (no creados en esta investigación)

| Archivo | Papel |
|---|---|
| `src/renderer/src/editor/typewriter.ts` | `typewriterScroll`, `computeTypewriterPadding`, `typewriterPaddingStyle`, el plugin de padding, `TypewriterAnimation`, `typewriterCenterScroll` y `CenterOnPointer`; además, las funciones puras `computeCenterTarget`, `typewriterThreshold`, `shouldAnimateCenter` y `easeOutCubic` |
| `src/renderer/src/editor/typewriter.test.ts` | Tests puros del extender, padding, destino, umbral, easing y transacción de solo efectos |

### Documentación

- `.scratch/typewriter-scroll/research.md` — este informe.
- `.scratch/editor-linebreaks-scroll/spec.md` — precedente del layout acotado y de la verificación headless.
- `docs/agents/issue-tracker.md` — convenciones de `.scratch/`.
- `AGENTS.md` — stack, arquitectura del renderer y reglas de tests.

---

## 12. Fuentes principales consultadas

### Código del repo

- `src/renderer/src/editor/TextEditor/TextEditor.tsx:3-4,26-38`
- `src/renderer/src/editor/extensions.ts:1-8`
- `src/renderer/src/editor/theme.ts:5-36`
- `src/renderer/src/editor/commands.ts:29,60,78-85,97-105,111-120`
- `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx:17-19,25-40`
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:98-109`
- `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:116-127`
- `src/renderer/src/App.test.tsx:555-563,570-577`
- `src/renderer/src/test/setup.ts:4-29`
- `jest.config.js:24-35`
- `package.json:29-32,39`
- `.scratch/editor-linebreaks-scroll/spec.md:24-35,43-44,52-55,59-69`

### Paquetes instalados (fuentes primarias)

- `node_modules/@codemirror/view/dist/index.d.ts:430-521` — `PluginValue.update` y `ViewPlugin`.
- `node_modules/@codemirror/view/dist/index.d.ts:580-589` — `heightChanged` y `geometryChanged`.
- `node_modules/@codemirror/view/dist/index.d.ts:596-601` — `ViewUpdate.selectionSet`.
- `node_modules/@codemirror/view/dist/index.d.ts:609-635` — `MouseSelectionStyle`, `get` y `update`; no hay callback de fin de gesto.
- `node_modules/@codemirror/view/dist/index.d.ts:798,866-874,925-933,1045-1052,1071` — `scrollDOM`, `requestMeasure`, `lineBlockAt`, `coordsAtPos` y `defaultLineHeight`.
- `node_modules/@codemirror/view/dist/index.d.ts:1124-1156` — `EditorView.scrollIntoView`.
- `node_modules/@codemirror/view/dist/index.d.ts:1186-1204` — `EditorView.domEventHandlers`; se registra en el contenido.
- `node_modules/@codemirror/view/dist/index.d.ts:1234-1250` — `EditorView.scrollHandler`.
- `node_modules/@codemirror/view/dist/index.d.ts:1270-1274` — `updateListener`.
- `node_modules/@codemirror/view/dist/index.d.ts:1375-1383` — `scrollMargins`.
- `node_modules/@codemirror/view/dist/index.d.ts:1430-1434` — `contentAttributes`.
- `node_modules/@codemirror/view/dist/index.d.ts:1671-1680` — `scrollPastEnd`.
- `node_modules/@codemirror/view/dist/index.js:36-46` — combinación de atributos y estilos.
- `node_modules/@codemirror/view/dist/index.js:79-99` — `updateAttrs` y `cssText`.
- `node_modules/@codemirror/view/dist/index.js:543-642` — `scrollRectIntoView`; el cálculo de `"center"` está en `:578-584` y la escritura de `scrollTop` en `:609-618`.
- `node_modules/@codemirror/view/dist/index.js:1580-1597` — `getScrollMargins`.
- `node_modules/@codemirror/view/dist/index.js:3456-3501` — `docView.scrollIntoView`; el `scrollHandler` se consulta en `:3463-3466` y los snapshots se resuelven antes en `:3456-3462`.
- `node_modules/@codemirror/view/dist/index.js:4332-4341` — selección con puntero y `scrollIntoView: false`.
- `node_modules/@codemirror/view/dist/index.js:4443-4453` — transacción de escritura con `scrollIntoView: true`.
- `node_modules/@codemirror/view/dist/index.js:4767-4868` — `MouseSelection`: listeners documentales, `start`, `up`, `select` y `select.pointer`.
- `node_modules/@codemirror/view/dist/index.js:4959-4962,5234-5238` — pegar/cortar.
- `node_modules/@codemirror/view/dist/index.js:4964-4973` — observadores de scroll y wheel.
- `node_modules/@codemirror/view/dist/index.js:4968-5035` — `handlers.mousedown`, `mouseSelectionStyle`, `lastTouchTime` y origen `select.pointer`.
- `node_modules/@codemirror/view/dist/index.js:5046-5049` — `getClickType` a partir de `event.detail`.
- `node_modules/@codemirror/view/dist/index.js:6243,6416-6419` — `editorHeight` interno.
- `node_modules/@codemirror/view/dist/index.js:6378-6383` — medición de `paddingTop`/`paddingBottom` con `parseInt`.
- `node_modules/@codemirror/view/dist/index.js:6693-6695` — `contentHeight` incluye padding.
- `node_modules/@codemirror/view/dist/index.js:6856-6876` — CSS base de `.cm-scroller` y `.cm-content`.
- `node_modules/@codemirror/view/dist/index.js:6974-7000` — CSS de `.cm-gutters`/`.cm-gutter`.
- `node_modules/@codemirror/view/dist/index.js:7202-7208` — `ResizeObserver` sobre `scrollDOM`.
- `node_modules/@codemirror/view/dist/index.js:7231-7242` — `onScroll`.
- `node_modules/@codemirror/view/dist/index.js:7984-7986` — guarda de `EditorView.update`.
- `node_modules/@codemirror/view/dist/index.js:8031-8045` — procesamiento de `tr.scrollIntoView` y de los efectos.
- `node_modules/@codemirror/view/dist/index.js:8204-8238` — ciclo de medida, `ViewUpdate`, `updatePlugins` y `updateAttrs`.
- `node_modules/@codemirror/view/dist/index.js:8255-8261` — ejecución del `scrollTarget`.
- `node_modules/@codemirror/view/dist/index.js:8400-8408` — `documentTop` y `documentPadding`.
- `node_modules/@codemirror/view/dist/index.js:8455-8456` — `lineBlockAt` recorre el height map y devuelve `top`/`height` del bloque.
- `node_modules/@codemirror/view/dist/index.js:8602` — `defaultLineHeight`.
- `node_modules/@codemirror/view/dist/index.js:8713-8715` — construcción del efecto de scroll.
- `node_modules/@codemirror/view/dist/index.js:9061-9066` — `attrsFromFacet` en orden inverso.
- `node_modules/@codemirror/view/dist/index.js:10049-10075` — implementación de `scrollPastEnd`.
- `node_modules/@codemirror/view/dist/index.js:11464,11502-11507,11525,11633,11741` — alineación de gutters con `documentPadding.top`.
- `node_modules/@codemirror/state/dist/index.d.ts:887-891,938-942,953-959` — `scrollIntoView` en el spec, en la transacción y `newSelection`.
- `node_modules/@codemirror/state/dist/index.d.ts:984-989` — `Transaction.isUserEvent`.
- `node_modules/@codemirror/state/dist/index.d.ts:995-1021` — anotación `Transaction.userEvent`.
- `node_modules/@codemirror/state/dist/index.d.ts:1350-1363` — `transactionExtender`.
- `node_modules/@codemirror/state/dist/index.js:2395-2400,2416-2427,2469-2476` — merge, resolución y extensión de transacciones.
- `node_modules/@uiw/react-codemirror/esm/useCodeMirror.js:96-100,101-118,147-154` — concatenación, creación y reconfiguración de extensiones.
- `node_modules/.pnpm/@codemirror+commands@6.11.1/node_modules/@codemirror/commands/dist/index.js:527-558,581,822-830,1382` — historial, movimiento y PageUp/PageDown.

### Documentación oficial

- `https://codemirror.net/docs/ref/#view.EditorView^scrollIntoView`
- `https://codemirror.net/docs/ref/#view.EditorView^scrollHandler`
- `https://codemirror.net/docs/ref/#view.EditorView^domEventHandlers`
- `https://codemirror.net/docs/ref/#view.ViewUpdate.selectionSet`
- `https://codemirror.net/docs/ref/#view.EditorView.lineBlockAt`
- `https://codemirror.net/docs/ref/#view.EditorView^scrollMargins`
- `https://codemirror.net/docs/ref/#view.scrollPastEnd`
- `https://codemirror.net/docs/ref/#view.EditorView^contentAttributes`
- `https://codemirror.net/docs/ref/#view.EditorView.documentPadding`
- `https://codemirror.net/docs/ref/#state.EditorState^transactionExtender`
- `https://codemirror.net/docs/ref/#state.Transaction^scrollIntoView`
- `https://codemirror.net/docs/ref/#state.Transaction.isUserEvent`
- `https://codemirror.net/docs/ref/#state.Transaction^userEvent`
- `https://codemirror.net/docs/ref/#view.ViewPlugin`
- `https://codemirror.net/docs/ref/#view.EditorView^requestMeasure`
- `https://codemirror.net/docs/ref/#state.Compartment`
- `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior` — el suavizado CSSOM lo define el user agent; no garantiza 150 ms.
- `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion`
- `https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame`
- `https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop`
- `https://drafts.csswg.org/css-overflow/#smooth-scrolling` — especificación de `scroll-behavior`.
- `https://codemirror.net/examples/styling/` — el padding vertical va en `.cm-content`; el horizontal, en `.cm-line`.

### Fuentes first-party de Inkdrop (producto cerrado; no se usan como fuente técnica)

- `https://forum.inkdrop.app/t/scroll-past-end/169` — post 2 (2017-11-05), de Takuya Matsuyama (`craftzdog`, «App Author»): el scroll past end de Inkdrop era el addon `codemirror/addon/scroll/scrollpastend` de CodeMirror 5.
- `https://forum.inkdrop.app/t/scrolling-past-the-end-of-a-note/2538` — post 2: el autor explica que era un addon de CodeMirror y que el `-30` del addon no coincidía con el padding de Inkdrop; corregido en v5.4.0.
- `https://github.com/inkdropapp/version-history/blob/master/README-old.md` — línea 572: «New feature: Scroll-past-end» en v3.15.0.
- `https://github.com/inkdropapp/version-history/blob/master/README.md` — línea 1056: «Scroll past end should stop at the last line», v5.4.0 (2021-09-02).
- `https://forum.inkdrop.app/t/inkdrop-desktop-v6-0-0/5571` — post 1: la v6 reconstruyó el editor sobre CodeMirror 6. No hay detalles públicos de la implementación de scroll de la v6.

### Fuentes secundarias (comunidad)

- `https://discuss.codemirror.net/t/cm6-scroll-to-middle/2924` — hilo del foro. El post 4 (2021) propone el `ViewPlugin` con `requestMeasure`; el post 10 (2024), de Marijn, recomienda el `transactionExtender` con un efecto de scroll.
- `https://discuss.codemirror.net/t/line-numbers-alignment-when-changing-editor-top-padding/4405` — bug de alineación de gutters al cambiar el padding superior; corregido en CodeMirror con el commit `f953d5ae8b6827f1568e9240de391f4d0bc6c72e`.
- `https://zudo-codemirror-wisdom.takazudomodular.com/docs/recipes/typewriter-scrolling` — receta comunitaria con `ViewPlugin`, `requestAnimationFrame`, zona de tolerancia y `scrollPastEnd`.
- `https://www.npmjs.com/package/codemirror-typewriter-scrolling` — paquete 0.1.0 para CodeMirror 5; `devDependency: codemirror ^4.5.0`. No compatible con CM6.
