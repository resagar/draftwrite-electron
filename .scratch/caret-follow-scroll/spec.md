# Spec: typewriter scroll, scroll libre finito y sincronización caret→preview

**Status:** ready-for-agent
**Fecha:** 2026-10-24
**Feature:** caret-follow-scroll
**Informe de investigación:** `research.md` (misma carpeta)
**Implementación:** completa en `main` (`28872c3`) y `feat/caret-follow-scroll`; 34 suites / 560 tests. Correcciones post-review: animador del preview creado tras el ref del scroller y espaciadores anclados a la primera/última línea. Ajustes posteriores: caret anclado 9 líneas sobre el centro en editor y preview (con clamp en paneles bajos) y columna de lectura de 560 px centrada. QA manual de layout pendiente en Electron.

**Nota (2026-10-26):** el seguimiento del caret en el preview se retiró por decisión de producto. Se eliminaron los marcadores de línea, los espaciadores, el animador y `PreviewCursorSync`. El editor conserva solo el scroll inferior (última línea al borde superior) y editor/preview usan scroll proporcional; ver `.scratch/scroll-sync/spec.md`.

---

## Declaración del problema

Escribir en el editor de DraftWrite es incómodo en documentos largos: cuando el caret llega al final de la línea visible, se queda pegado al borde inferior. El escritor tiene que añadir líneas vacías o hacer scroll manual para recuperar contexto, y eso interrumpe la escritura.

El scroll tampoco permite leer con comodidad: la última línea no puede subir más allá del borde inferior, así que no hay espacio en blanco debajo para trabajar. El escritor quiere el comportamiento de herramientas como Inkdrop: poder llevar la última línea hasta arriba, con un espacio finito debajo, sin scroll infinito.

El preview Markdown tiene el mismo problema y además no sigue al caret. Cuando el escritor se mueve por el documento, el preview se queda donde estaba; no hay forma de mantener la vista sincronizada con el punto de escritura.

Los tres comportamientos están relacionados por la misma geometría —posición vertical del caret, padding del scroller y destino de scroll— pero tienen dueños distintos: CodeMirror en el editor y el scroller del preview en el Markdown renderizado. Resolverlos por separado produce parches incompatibles; en particular, combinar `scrollPastEnd()` con un padding superior no cumple «última línea al top».

## Solución

**Editor.** Un modo typewriter construido con tres piezas:

1. Un `transactionExtender` que convierte el scroll que ya pide la transacción en un centrado vertical del caret.
2. Un padding asimétrico en `.cm-content`: `padding-top = (H - L) / 2` y `padding-bottom = H - L`. Centra la primera línea, centra la última mientras se escribe y permite que la última llegue al top con `H - L` px en blanco debajo, con un máximo finito.
3. Una animación propia con `requestAnimationFrame` para los saltos grandes: 150 ms, ease-out cúbico, cancelable y retargeteable; los ajustes pequeños y `prefers-reduced-motion` son instantáneos.

Un `ViewPlugin` detecta el fin de un gesto de puntero (`mouseup`/`touchend` documental + `requestAnimationFrame`) y centra una sola vez al soltar. El mismo plugin publica una transacción anotada que el preview consume.

**Preview.** El preview pasa a ser dueño de su scroller, de dos espaciadores y de la medición. Para seguir el caret por línea de origen:

1. Un plugin de remark, colocado **antes** de `remark-breaks`, parte los nodos de texto y deja marcadores vacíos `<span data-source-line="N">` al inicio de cada línea. Un plugin de rehype hace lo mismo con el contenido de `pre > code`.
2. Las anclas de bloque existentes se mantienen como capa de respaldo para líneas sin marcador: blancas, cercas, delimitadores de tabla, subrayados setext, `hr` e imágenes solas.
3. `PreviewCursorSync` mide el span de la línea con `Range.getClientRects()`, calcula el `scrollTop` que lo centra y lo aplica con el mismo animador compartido con el editor.

El store publica `{ line, column, origin }`. El origen `pointer` solo se publica al terminar el gesto, así que el store contiene siempre carets asentados y el preview se mueve una vez por clic o arrastre, nunca durante el arrastre.

**Lo que no se promete:** precisión por columna dentro de una línea que reflowa. Se centra el span completo de la línea de origen, no la fila visual exacta del caret. Tampoco se implementa el mapeo inverso preview→editor.

## Historias de usuario

1. Como escritor, quiero que el caret se mantenga en el centro vertical mientras escribo, para no tener que añadir líneas vacías al llegar al final de la pantalla.
2. Como escritor, quiero que el texto suba solo mientras escribo, para mantener el contexto de lo que acabo de escribir.
3. Como escritor, quiero que la primera línea pueda quedar centrada al abrir el documento, para empezar a escribir en el mismo punto de confort.
4. Como escritor, quiero llevar la última línea hasta arriba con scroll manual, para leer y escribir con espacio en blanco debajo.
5. Como escritor, quiero que ese espacio inferior sea finito, para no perder la sensación de dónde termina el documento.
6. Como escritor, quiero que hacer clic en otra línea centre el caret, para reubicarme sin tocar el teclado.
7. Como escritor, quiero que arrastrar para seleccionar no mueva el texto bajo el ratón, para seleccionar con precisión.
8. Como escritor, quiero que al soltar el arrastre el caret quede centrado, para continuar escribiendo desde ahí.
9. Como escritor, quiero que los saltos grandes se animen brevemente, para no perder la referencia visual.
10. Como escritor, quiero que los ajustes pequeños sean instantáneos, para que el editor no vaya con retraso mientras escribo rápido.
11. Como escritor, quiero que el preview se desplace a la línea donde está el caret cuando escribo, para mantener la vista sincronizada.
12. Como escritor, quiero que el preview siga al caret cuando me muevo con las flechas, para revisar el documento sin buscar la posición a mano.
13. Como escritor, quiero que el preview siga al caret cuando hago clic en el editor, para inspeccionar el resultado de otra zona.
14. Como escritor, quiero que el preview mantenga la línea del caret cerca del centro, para leer el contexto anterior y posterior.
15. Como escritor, quiero poder llevar el último bloque del preview hasta arriba, para leer el final con espacio debajo.
16. Como escritor, quiero que el preview anime solo los saltos grandes, para que la lectura no tiemble en cada tecla.
17. Como usuario con movimiento reducido, quiero que todos los centrados sean instantáneos, para evitar animaciones que me molesten.
18. Como usuario de teclado, quiero que las flechas, Home/End, PageUp/PageDown y undo/redo mantengan el comportamiento esperado, para no perder atajos.
19. Como usuario de teclado, quiero que PageUp/PageDown conserven su salto de página, para navegar rápido sin que el typewriter lo pise.
20. Como usuario de ratón, quiero que el botón derecho y el central no recentren, para no mover la vista al abrir un menú.
21. Como usuario de touch, quiero que soltar un toque centre una sola vez, para no duplicar el movimiento.
22. Como escritor de Story, quiero el mismo comportamiento que en Article, para que la experiencia sea consistente.
23. Como escritor, quiero que el preview no arrastre el Workspace, para no perder la posición de la biblioteca.
24. Como escritor, quiero que al cambiar de modo (`edit`/`split`/`preview`) el editor y el preview sigan funcionando, para alternar sin saltos.
25. Como mantenedor, quiero que el editor y el preview compartan duración, curva y umbral, para que la sensación sea la misma.
26. Como mantenedor, quiero que la anotación de líneas sea byte a byte equivalente al render actual, para no cambiar el Markdown visible.
27. Como mantenedor, quiero que los tests existentes sigan siendo contrato, para no acomodar la implementación.
28. Como mantenedor, quiero que el cambio quede confinado al renderer, para no tocar dominio, IPC, preload ni SQLite.
29. Como mantenedor, quiero que el coste del render anotado sea acotado, para no degradar documentos largos.
30. Como mantenedor, quiero que los listeners y frames se limpien al desmontar, para no dejar trabajo huérfano.

## Decisiones de implementación

### Alcance

- Solo renderer: `src/renderer/src/editor/`, `src/renderer/src/state/`, `src/renderer/src/workspace/MarkdownPreview/`, `src/renderer/src/workspace/EditorPreviewLayout/` y un módulo nuevo `src/renderer/src/scroll/`.
- No se modifican dominio, servicios, repositorios, SQLite, migraciones, contrato IPC, preload ni `DataPort`.
- No se añaden dependencias. `react-markdown`, `remark-gfm`, `remark-breaks` y `@codemirror/*` ya están.
- Story y Article comparten `TextEditor` y `EditorPreviewLayout`; cualquier cambio en `articleEditorExtensions` afecta a los dos.
- El comportamiento queda siempre activo, sin toggle ni preferencia persistida.

### Editor: centrado y padding

- El centrado se añade en un `EditorState.transactionExtender` cuando `tr.scrollIntoView` es verdadero: `EditorView.scrollIntoView(tr.newSelection.main.head, { y: 'center' })`.
- No se despacha una transacción extra por tecla ni se usa un `updateListener`.
- El padding se aplica a `.cm-content` y **reemplaza** el padding del tema, no se suma.
- Fórmulas con `H = scrollDOM.clientHeight`, `L = view.defaultLineHeight`, `D = altura del documento`:
  - `padding-top = max(0, round((H - L) / 2))`
  - `padding-bottom = max(0, ceil(H - L))`
  - `maxScroll = D - L + (H - L) / 2`
- La primera línea queda centrada con `scrollTop = 0`; la última se centra al escribir; en el máximo la última queda en `top = 0` y debajo quedan `H - L` px.
- Si `clientHeight <= 0` (editor oculto en modo `preview`), el padding es `0/0` y no se centra.
- Se recalcula al cambiar la altura del scroller; no depende del ancho.
- `PageUp`/`PageDown` no marcan `scrollIntoView` y conservan su destino nativo `y: "start"`. No se centran.
- Documentos cortos y vacíos usan las mismas fórmulas; no hay caso especial.
- IME: no se excluye `.compose` en la primera versión. Se verifica en Electron con fcitx/ibus; si el candidato se mueve, se excluye y se centra en la transacción siguiente.

### Editor: puntero

- Se crea `src/renderer/src/editor/pointer-selection.ts` con una `ViewPlugin` constante de módulo.
- Escucha `mousedown` en `contentDOM` (solo `button === 0`) y `mouseup`/`touchend` en `document`.
- Al terminar el gesto, espera un `requestAnimationFrame`, lee `view.state.selection.main.head` y despacha una única transacción con:
  - la anotación `pointerSelectionEnd`,
  - `EditorView.scrollIntoView(head, { y: 'center' })`.
- No centra en `mousedown` ni en cada movimiento del arrastre.
- Cubre clic, clic sobre el mismo caret, clic dentro de una selección, doble/triple clic, shift+clic, arrastre y arrastre que termina fuera del contenido.
- Ignora botón derecho y central.
- Limpia listeners y frame en `destroy`.
- Guarda contra el `mouseup` sintético tras `touchend`: el flag de gesto se limpia en el primero.
- Si se pierde el `mouseup` (soltar fuera de la ventana), no se publica hasta el siguiente gesto; se evalúa añadir `mousemove` con `buttons === 0`.

### Editor: animación

- Se intercepta el centrado con `EditorView.scrollHandler`. Si las opciones no son `{ y: 'center', x: 'nearest' }`, cancela y devuelve `false`.
- Constantes: `DURATION = 150` ms, `easeOutCubic(t) = 1 - (1 - t) ** 3`.
- Umbral: `max(view.defaultLineHeight, clientHeight / 6)`, evaluado sobre `abs(target - scrollTop)`.
- Un solo `requestAnimationFrame` y un token `run`; una nueva petición cancela y retargetea desde el `scrollTop` actual.
- El primer frame se clampea a `t = 0`.
- `.cm-scroller` se fuerza a `scroll-behavior: auto`.
- Cancelan: `wheel`, `touchstart`, `pointerdown`/`mousedown` en el scroller, `PageUp`/`PageDown`, `resize`, editor oculto y cualquier destino distinto de `"center"`.
- `prefers-reduced-motion: reduce` asigna el destino sin programar frames.
- La animación no despacha transacciones ni mide por frame.

### Preview: anotación por línea de origen

- Se crea `remark-source-line-markers.ts`, colocado **antes** de `remarkBreaks` en `[remarkGfm, remarkSourceLineMarkers, remarkBreaks]`.
- Recorre el mdast con una recursión propia sobre `children`; no se importa `unist-util-visit`, `@types/mdast` ni `@types/hast` (no son dependencias directas).
- Para cada nodo `text` con `position`, parte su valor por `/\r?\n|\r/`, emite los `break` de `remark-breaks` e inserta `<span data-source-line="N"></span>` al inicio de cada línea.
- Un contador `lastLine` garantiza un solo marcador por línea aunque haya varios nodos.
- Los nodos sin `position` no se tocan y caen al respaldo.
- Se crea `rehype-code-line-markers.ts` para `pre > code`: parte el texto en líneas, conserva los `\n` e inserta un span por línea, incluidas las vacías.
- Se mantienen las anclas `data-source-start-line` / `data-source-end-line` como respaldo, con componentes para `h4`-`h6`, `li` y `tr`, y `node` en `hr`.
- El HTML sin marcadores debe ser byte a byte idéntico al actual; los marcadores no alteran `textContent` ni `getByText`.
- Los marcadores son `span` vacíos, sin `display: none` ni `visibility: hidden` (necesitan rect).

### Preview: scroller, espaciadores y sincronización

- `EditorPreviewLayout` deja de envolver el preview con `overflow-y-auto`; `MarkdownPreview` pasa a ser el scroller y recibe refs del contenedor, del `article` y de los espaciadores.
- `PreviewCursorSync` es un hijo que devuelve `null` y se suscribe a `usePreviewLine()`; así no re-renderiza `MarkdownPreview` ni re-parsea el Markdown.
- `usePreviewLine()` devuelve solo la línea; un cambio de columna no re-renderiza.
- Espaciadores con `H = container.clientHeight`, `A = altura del article`, `F`/`h` primer bloque, `L`/`hLast` último bloque:
  - `T = max(0, H/2 - F - h/2)`
  - `B = max(0, H - (A - L))`
- `findTarget` prioriza el marcador exacto `[data-source-line="line"]`; si no existe, usa el bloque que contiene la línea y hace *snap* al marcador más cercano; si el bloque no tiene marcadores, usa su rect.
- El rect de una línea es la unión de las filas de un `Range` desde su marcador hasta el siguiente marcador del mismo bloque (o el final del bloque), filtradas por `keepContiguousRows`.
- `target = top + height/2 - H/2`, clampeado a `[0, scrollHeight - clientHeight]`. Si el span supera el viewport, se centra su primera fila.
- En la primera sincronización sin cursor no se compensa el espaciador superior; el artículo no debe saltar al montar.
- `overflow-anchor: none`, `overscroll-behavior: contain` y `scroll-behavior: auto` en el scroller.
- `ResizeObserver` sobre contenedor y `article`; si no existe (jsdom), el efecto sale temprano.

### Preview: puntero

- `TextEditor` calcula el origen con `cursorOrigin(update)`: `docChanged` siempre es `keyboard`; una transacción `select.pointer` sin anotación devuelve `null`; la anotación `pointerSelectionEnd` devuelve `pointer`.
- No se publica en updates de foco, scroll, geometría o resize.
- `EditorStatus.cursor` es siempre un caret asentado.
- `selectPreviewLine` devuelve la línea para `keyboard` y `pointer`; deja de filtrar por origen.
- Un clic o un arrastre publican una sola vez, al soltar. El preview se mueve una vez.
- El preview no sigue al puntero durante el arrastre.
- Hacer clic en el preview no mueve el caret del editor; el mapeo inverso queda fuera de alcance.
- El scroll manual del preview no se cancela ni se pausa; el siguiente evento de caret recentra.

### Preview: animación

- Se reutiliza el animador compartido. `PreviewCursorSync` calcula el destino y llama a `request(target, { reason: 'caret' | 'layout' })`.
- Solo `reason === 'caret'` puede animar; resize, montaje, cambio de modo y carga de imagen son instantáneos.
- Umbral: `max(lineUnit, clientHeight / 6)`, con `lineUnit` = una fila visual del objetivo, luego el `line-height` resuelto del bloque, luego el del `article`, luego 22 px.
- La animación escribe `container.scrollTop`; nunca usa `scrollTo({ behavior: 'smooth' })`.
- Cancelan: rueda, touchstart, `pointerdown`/`mousedown` sobre el scroller, resize/`ResizeObserver`, cambio de modo o desmontaje, cambio de `markdown` (antes de reescribir espaciadores) y `scroll` con desviación > 2 px respecto al último valor escrito.
- Retargetea una nueva línea de caret desde el `scrollTop` actual.
- El guard de la barra compara el `scrollTop` real con el último escrito y aplica un clamp vivo para no cancelar en falso si `scrollHeight` encoge.
- `prefers-reduced-motion: reduce` se lee en cada petición; no se añade listener `change`.

### Módulo compartido

- Se crea `src/renderer/src/scroll/smooth-scroll.ts` con `DURATION`, `SCROLL_EPSILON`, `easeOutCubic`, `scrollThreshold`, `prefersReducedMotion`, `isForeignScroll` y `createScrollAnimator(scroller, scheduler)`.
- `Scroller = { scrollTop, clientHeight, scrollHeight }`; `FrameScheduler = { now, requestFrame, cancelFrame, reducedMotion }`.
- Se comparte «cómo se mueve»; **no** se comparte el cálculo del destino, la medición, los espaciadores, los listeners ni el ciclo de vida.
- El preview lo consume en esta feature. El editor puede adoptarlo en el mismo cambio o después; si no se adopta, las constantes del editor deben coincidir y quedar documentadas.

### CSS y accesibilidad

- Se usan tokens del tema; no se declaran colores nuevos.
- Los espaciadores son `aria-hidden` y no contienen texto.
- Los marcadores son `span` vacíos sin rol; no añaden nada al árbol accesible.
- `prefers-reduced-motion` se respeta en JS; el `@media` existente de `base.css` solo cubre `animation`/`transition` y no este caso.
- El scroller del preview no se hace enfocable con `tabindex` en este alcance.

### Rendimiento

- La anotación añade ~8-9 % al render de react-markdown (medido: ~70 ms → ~75-76 ms en 1041 líneas).
- `PreviewCursorSync` evita re-renders del árbol y re-parseo del Markdown por cada flecha.
- No se virtualiza el preview.
- La lectura de `scrollHeight`, `getClientRects` y `getBoundingClientRect` ocurre una vez por sincronización, no por frame.

## Decisiones de testing

### Seams

- **Seam principal, existente:** integración a nivel de `App` con `renderApp` y el fake del `DataPort`. Abre un Article y una Story, mueve el caret con teclado, clic y arrastre, y comprueba el estado del editor, el store y el preview. Es el punto más alto y cubre el flujo completo.
- **Seam unitario, nuevo:** funciones puras del editor (extender, padding, destino, umbral, easing), de la anotación (`splitTextIntoSourceLines`, `firstCodeLine`, `nearestMarkerLine`, `keepContiguousRows`, `centerScrollTop`), del origen (`cursorOrigin`) y del animador (con scheduler y scroller inyectados). Se prueban sin montar CodeMirror ni medir layout.
- **Seam de verificación de layout, existente en el proyecto:** harness headless de Chromium sobre el build de producción, con `clientHeight`, `scrollTop`, `getBoundingClientRect` y `getClientRects` reales. jsdom no calcula layout, así que el centrado real no se puede afirmar desde Jest. Se mantiene también la comprobación manual en Electron.
- **No se crea un seam nuevo de componente para `MarkdownPreview`.** La integración de `App` ya cubre el flujo y los tests de `MarkdownPreview` cubren la estructura de la anotación.

### Qué hace bueno a un test

- Verifica comportamiento observable: posición del caret, `scrollTop`, atributos de anotación, línea publicada, origen, frames programados, cancelación.
- No verifica detalles internos: nombres de clases CSS, estructura exacta del DOM más allá de los atributos que son contrato, ni el número exacto de renders de React.
- No modifica tests existentes para hacer pasar la implementación. Si un test existente falla, se investiga como regresión.
- Usa tolerancia ±2 px en las aserciones de geometría.
- En Jest, inyecta `now`, `requestFrame`, `cancelFrame` y `reducedMotion`; nunca depende de tiempos reales.

### Casos unitarios

**Editor**

- Extender: añade el efecto solo con `tr.scrollIntoView`; no lo añade en PageUp/PageDown.
- Padding: `H > L`, `H = L`, `H = 0`; clamping; `H - L` exacto.
- Destino: primera, intermedia, última y línea envuelta.
- Umbral: `max(L, H/6)`; delta por debajo y por encima.
- `easeOutCubic` en `t = 0`, `t = 1` y fuera de rango.

**Anotación**

- `splitTextIntoSourceLines("a\nb", 3)` → `[{3,'a'},{4,'b'}]`; CRLF; recorte de espacio inicial.
- `firstCodeLine` con cerca cerrada, sin cierre e indentado.
- `nearestMarkerLine`: 9 → 8; 36 → 35; 26 → 27; 30 → 29.
- `keepContiguousRows`: filas a 22,8 px se conservan; un grupo separado se descarta.
- `centerScrollTop`: clamp inferior/superior y span mayor que el viewport.
- Transformer mdast: una línea, multilínea, dos nodos en la misma línea, hermano `break`, nodo sin `position`.

**Puntero y store**

- `cursorOrigin`: sin cambios → `null`; `docChanged` → `keyboard`; `select` → `keyboard`; `select.pointer` sin anotación → `null`; anotación → `pointer`; `docChanged` + `select.pointer` → `keyboard`.
- `selectPreviewLine`: línea para ambos orígenes; `null` solo si no hay cursor.
- Publicar la misma línea dos veces no re-renderiza; publicar otra línea sí.

**Animador**

- Delta bajo el umbral → instantáneo, cero frames.
- Delta alto → frames hasta el destino exacto.
- Retarget a mitad de vuelo.
- Cancelación por rueda y por `scroll` ajeno.
- `reducedMotion()` → cero frames.
- `clientHeight = 0` → no mide ni anima.

### Casos de integración (jsdom)

- `MarkdownPreview` anota `[data-source-line="1"]` dentro del `h1`; el párrafo de dos líneas tiene marcadores 3 y 4 con `<br>` entre ellos.
- La tabla anota el `div` y cada `tr`; el delimitador no produce marcador.
- El bloque de código tiene tres spans con el texto de cada línea y conserva `textContent`.
- Las footnotes conservan la línea original.
- `getByText('sturdy').tagName === 'STRONG'` y `getByText('world')` siguen pasando.
- Un clic en el editor publica `origin: 'pointer'` una sola vez al soltar; un arrastre no publica durante el gesto.
- El editor y el preview no lanzan con `clientHeight === 0`, sin `ResizeObserver` y sin `matchMedia`.
- Al desmontar no quedan listeners documentales ni frames pendientes.

### Verificación headless / Electron

- Editor: salto grande ~150 ms, ajuste pequeño instantáneo, retarget, reduced motion, rueda, `y: "start"`, clic real, arrastre, doble clic, editor oculto, destinos 0/1176/2376.
- Preview: cobertura de marcadores, una fila por línea, rect del marcador, centrado por línea ±2 px, línea reflowada, línea vacía de código, fila de tabla, footnote, espacio finito, animación/cancelación, `Workspace.scrollTop === 0`, sin warnings.
- Paridad visual: con `[data-source-line] { display: none }`, `scrollHeight` igual ±1 px.

### Validación

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- Comprobación manual en la app Electron con Story y Article, incluido IME y touch si están disponibles.

## Fuera de alcance

- Precisión por columna dentro de una línea que reflowa.
- Mapeo inverso: hacer clic en el preview para mover el caret del editor.
- Centrado exacto de bloques o líneas más altos que el viewport más allá de su primera fila.
- Toggle o preferencia persistida para activar/desactivar el typewriter o el scroll libre.
- Números de línea o gutter en el editor y centrado al hacer clic en ellos.
- Virtualización del preview.
- Cambios en dominio, IPC, preload, SQLite o migraciones.
- Dependencias nuevas.
- Restauración de foco o cambios de accesibilidad no descritos.
- Animación de los recentrados por layout (resize, montaje, carga de imagen): son instantáneos.
- Pausa del seguimiento tras scroll manual del preview.

## Notas adicionales

- El informe `research.md` consolida la evidencia y enlaza los informes detallados: `../typewriter-scroll/research.md`, `../preview-caret-sync/research.md`, `../preview-caret-sync/line-mapping.md`, `../preview-caret-sync/pointer-sync.md` y `../preview-caret-sync/smooth-scroll.md`.
- El baseline es `main` en `fe9cd6b`.
- No hay conflicto con las reglas de dependencias del proyecto: todo queda en el renderer.
- Los tests existentes de `App.test.tsx` (`Ln`/`Col`, preview en `split`/`preview`, `getByText`) son contrato.
- La decisión de producto sobre el rect de una línea reflowada mayor que el viewport es centrar su primera fila; se documenta como límite conocido.
- IME, touch y arrastre de la barra de scroll quedan como verificación en Electron, no como bloqueantes de implementación.
