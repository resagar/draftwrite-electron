# Sincronización del preview con el caret del puntero

**Estado:** investigación de solo lectura. No se modificaron código de producción, tests, `package.json` ni historial de git. Los artefactos creados son este informe y las sondas descartables de `$COMMANDCODE_SCRATCHPAD/probe/` (fuera del repo).

**Fecha:** 2026-10-24.

**Feature:** `preview-caret-sync` (segunda iteración). Sustituye la recomendación «solo teclado» del informe previo (`.scratch/preview-caret-sync/research.md` §10.2), que queda obsoleta.

**Alcance:** renderer (`TextEditor`, `extensions`, `status-store`, `use-editor-status`, `MarkdownPreview`, `EditorPreviewLayout`). Sin cambios en IPC, preload, `src/main`, SQLite ni migraciones. Sin dependencias nuevas: `@codemirror/state` y `@codemirror/view` ya son dependencias directas (`package.json:31-32`).

---

## Convenciones de cita

| Alias | Ruta |
| --- | --- |
| `TE` | `src/renderer/src/editor/TextEditor/TextEditor.tsx` |
| `EXT` | `src/renderer/src/editor/extensions.ts` |
| `SS` | `src/renderer/src/state/status-store.ts` |
| `UES` | `src/renderer/src/state/use-editor-status.ts` |
| `MP` | `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx` |
| `EPL` | `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx` |
| `AE` | `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx` |
| `SE` | `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx` |
| `AT` | `src/renderer/src/App.test.tsx` |
| `SETUP` | `src/renderer/src/test/setup.ts` |
| `UCM` | `node_modules/.pnpm/@uiw+react-codemirror@4.25.12_@babel+runtime@7.29.10_@codemirror+autocomplete@6.20.3_@c_af6d6fd85eac2abaeccbbbfe81fa1367/node_modules/@uiw/react-codemirror/esm/useCodeMirror.js` |
| `CMV` | `node_modules/@codemirror/view/dist/index.js` |
| `CMVD` | `node_modules/@codemirror/view/dist/index.d.ts` |
| `CMSV` | `node_modules/@codemirror/state/dist/index.js` |
| `CMSD` | `node_modules/@codemirror/state/dist/index.d.ts` |
| `PREV` | `.scratch/preview-caret-sync/research.md` |
| `TW` | `.scratch/typewriter-scroll/research.md` |

Etiquetas: `[Hecho]` verificado en código instalado, documentación oficial o sonda reproducible; `[Inferencia]` consecuencia razonada; `[Decisión abierta]` requiere elección de producto o verificación en Electron.

Versiones resueltas: `@codemirror/view` 6.43.14, `@codemirror/state` 6.7.6, `@uiw/react-codemirror` 4.25.12, React 19, jsdom 30.1.3 (Jest) vía `jest-environment-jsdom` 30.5.2.

---

## 1. Objetivo y decisiones fijadas

El preview Markdown debe seguir el caret de CodeMirror cuando el writer escribe, mueve el cursor con el teclado **o hace clic con el ratón**. Se dan por fijadas, y este informe no reabre, estas decisiones de producto:

1. El preview sigue el caret con teclado, flechas y clic de ratón.
2. En un arrastre, el preview centra **una sola vez al soltar**; el texto no se mueve bajo el puntero durante el gesto.
3. El editor también centra su propio caret en clic y al soltar un arrastre.
4. Animación suave solo en saltos grandes; los ajustes pequeños son instantáneos (la del editor ya está investigada en `TW` §8.4).
5. Siempre activo, sin toggle. Story y Article comparten `TextEditor`.
6. El clic **en el preview** para mover el caret del editor queda fuera de alcance (no hay mapeo inverso).
7. Sin dependencias nuevas.

Lo que este informe decide: **cuándo** se entera el preview de un caret movido con puntero, **cómo** se transporta esa señal sin romper `@uiw/react-codemirror`, **quién** detecta el fin de gesto y **qué** política sigue el store.

---

## 2. Resumen ejecutivo y recomendación

- `[Hecho]` CodeMirror no expone ninguna señal de «fin de gesto de puntero». Un arrastre despacha una transacción `select.pointer` por cada `mousemove` (`CMV:4791-4812,4854-4861`) y `ViewUpdate` no tiene evento de final (`CMVD:596-601`; `TW` §8.1). Cualquier diseño que publique en cada transacción necesita un temporizador heurístico para no mover el preview durante el arrastre.
- `[Hecho]` El orden de listeners documentales hace que un listener permanente de `mouseup` corra **antes** que el `mouseup` de `MouseSelection`, que es el que fija la selección en el caso «clic dentro de una selección» (`CMV:4779-4780` vs. `CMV:4814-4822`). Medido: en ese caso el listener ve `head=10` y un `requestAnimationFrame` después ve `head=5` (sonda 03).
- `[Hecho]` `@uiw/react-codemirror` reconfigura la vista (`StateEffect.reconfigure`) cada vez que cambia la identidad de `onChange` u `onUpdate` (`UCM:147-154`), y hoy ambas son flechas inline (`TE:33-38`), así que **ya hoy se reconfigura en cada render de `TextEditor`**. Reconfigurar no remonta la vista y no pierde documento, selección ni historial, pero **destruye y recrea los `ViewPlugin` cuyo objeto de especificación cambie de identidad** (`CMV:8106-8125`). Medido: con un `ViewPlugin` constante de módulo, 3 reconfiguraciones producen 1 sola construcción y 0 destrucciones; con una especificación creada por render, 3 construcciones (sonda 01).
- **Recomendación (diseño D):** una única extensión `ViewPlugin` constante de módulo (`pointerGesture`) que detecta el fin de gesto con `mousedown` en `contentDOM` + `mouseup`/`touchend` en `document` y, tras un `requestAnimationFrame`, despacha **una sola transacción** con dos cargas: la anotación `pointerSelectionEnd` y el efecto `EditorView.scrollIntoView(head, { y: 'center' })` que ya preveía `TW` §8.2. El publicador (`TextEditor.onUpdate`) reconoce la anotación y publica `{ line, column, origin: 'pointer' }`; las transacciones `select.pointer` **sin** anotación se descartan (gesto en curso). No hay callbacks nuevos, ni props nuevas, ni temporizadores, ni estado de gesto en el store.
- `[Inferencia]` Con eso: un clic publica exactamente una vez (al soltar), un arrastre no publica nada hasta soltar, un clic sobre el mismo caret publica una vez (aunque CodeMirror no despache ninguna transacción), y el editor y el preview usan el **mismo** `head` final leído en el mismo tick.
- **Riesgo principal:** el fin de gesto depende de recibir `mouseup`/`touchend`. Si el writer suelta el botón fuera de la ventana, no hay publicación hasta el siguiente gesto o hasta el siguiente evento de teclado. Mitigación barata: tratar un `mousemove` con `buttons === 0` como fin de gesto (es lo que hace el propio CodeMirror, `CMV:4791-4792`).
- **Segundo riesgo:** durante un arrastre, `Ln`/`Col` de la barra de estado deja de actualizarse en vivo (se actualiza al soltar). Es la contrapartida de no tener estado de gesto en el store; se documenta y se acepta.

---

## 3. Evidencia

### 3.1 Qué hace exactamente CodeMirror con el puntero

`[Hecho]` `MouseSelection` se construye en el `mousedown` de `contentDOM` (`CMV:4996-5009`) y registra sus listeners en el **documento**, no en el contenido (`CMV:4779-4780`). Por eso un arrastre que termina fuera del editor sigue actualizando la selección.

`[Hecho]` El momento de la transacción depende del gesto:

| Gesto | Cuándo se despacha la selección | Fuente |
| --- | --- | --- |
| Clic fuera de la selección | en `mousedown` (`dragging === false` → `select(event)` en `start()`) | `CMV:4783,4785-4790` |
| Clic dentro de una selección existente | en el `mouseup` documental (`dragging === null` → `select()` en `up()`) | `CMV:4783,4814-4817` |
| Arrastre | una transacción colapsada al empezar y una por cada `mousemove` | `CMV:4791-4796` |
| Clic sobre el mismo caret | ninguna transacción | `CMV:4854-4857` (la selección no cambia y `mustSelect` es falso) |
| Doble / triple clic | selección no vacía; el tipo sale de `event.detail` | `CMV:5032-5052` |
| Shift+clic | selección extendida; `this.extend = startEvent.shiftKey` | `CMV:4781`, `CMV:5073` |
| Botón derecho / central | no se crea `MouseSelection` (`event.button == 0` es la condición); el observador puede sincronizar después un cambio nativo de selección como `select.pointer` | `CMV:5007-5008,4335-4347` |
| Touch | `touchstart` marca el origen `select.pointer`; el `mousedown` sintético posterior se ignora durante 2 s | `CMV:4979-4995,4997-4999` |

`[Hecho]` Todas esas transacciones llevan `userEvent: "select.pointer"` y `scrollIntoView: false` (`CMV:4854-4861`; `CMV:4335-4347` para la ruta del observador). En `@codemirror/state` 6.7.6 **no existe el getter `tr.userEvent`**: `Transaction.userEvent` es una `AnnotationType` (`CMSD:1021`) y la forma correcta de leerla es `tr.isUserEvent('select.pointer')` (`CMSD:984-991`) o `tr.annotation(Transaction.userEvent)` (`CMSD:882-886`). Medido: `tr.userEvent` devuelve `undefined` y `tr.annotation(Transaction.userEvent)` devuelve `"select.pointer"` para la misma transacción (sonda 03/04).

`[Hecho]` Los handlers de extensión (`domEventHandlers`, plugins) corren **antes** que el handler interno de CodeMirror para el mismo evento: `computeHandlers` concatena primero los handlers de los plugins y después los internos (`CMV:4725-4750`). No sirve para adelantar la lectura de la selección: el que fija la selección final en el caso «clic dentro de la selección» es el listener documental que `MouseSelection` registra en el `mousedown`, es decir, **después** que cualquier listener documental permanente.

`[Hecho]` `EditorView.domEventHandlers` y `domEventObservers` se registran en el **elemento de contenido** (`CMVD:1195-1212`), así que no ven un arrastre que termina fuera.

`[Hecho]` `EditorView.scrollHandler` es un facet público que puede suprimir el scroll nativo y que, por contrato, «no debe iniciar updates» (`CMVD:1234-1243`). Es el punto donde `TW` §8.3 integra la animación; nuestro plugin **no** lo toca: despacha el efecto de centrado como cualquier comando.

### 3.2 Ciclo de vida en `@uiw/react-codemirror`

`[Hecho]` La vista se crea una sola vez, en un `useLayoutEffect` con dependencias `[container, state]` (`UCM:101-126`). Cambiar `extensions` u `onUpdate` **no** remonta la vista.

`[Hecho]` Cambiar cualquiera de `theme, extensions, height, …, onChange, onUpdate` dispara `view.dispatch({ effects: StateEffect.reconfigure.of(getExtensions) })` (`UCM:147-154`). `onChange` y `onUpdate` son flechas inline en `TE:33-38`, luego su identidad cambia en cada render de `TextEditor` y **hoy hay una reconfiguración por render** (una por tecla, porque `AE:76-127` re-renderiza en cada cambio del borrador).

`[Hecho]` La reconfiguración no pierde estado del documento: `applyTransaction` resuelve una `Configuration` nueva pero arrastra la selección y los valores de los `StateField` del estado anterior (`CMSV:2605-2634`, `CMSV:1794-1805`). El historial de undo es un `StateField` y sobrevive.

`[Hecho]` Los `ViewPlugin` **no** son `StateField`: `updatePlugins` conserva la instancia solo si encuentra la **misma** especificación (`prevSpecs.indexOf(spec)`, `CMV:8106-8125`). Una especificación creada por render (`ViewPlugin.fromClass(...)` dentro del componente) se destruye y se recrea en cada reconfiguración; una constante de módulo se conserva.

`[Hecho]` Medición propia con la `@codemirror/view` instalada y jsdom (sonda 01, `$COMMANDCODE_SCRATCHPAD/probe/01-reconfigure.mjs`):

| Caso | Construcciones del plugin | Destrucciones | ¿Sobrevive el flag de gesto? |
| --- | ---: | ---: | --- |
| Constante de módulo, 3 `reconfigure` | 1 | 0 | sí (`gesture = 'in-progress'`) |
| Especificación nueva por render, 2 `reconfigure` | 3 | — | no |

`[Inferencia]` Consecuencia de diseño: **la detección de gesto debe vivir en un `ViewPlugin` constante de módulo**, y su estado (el flag `pointerDown`, el frame pendiente) debe ser independiente de cualquier prop de React. Así sobrevive incluso a una reconfiguración a mitad de arrastre (autosave → cambio de estado → render de `ArticleEditor` → reconfiguración de `@uiw`). Verificado: sonda 03, escenario «reconfigure during drag» → una sola publicación y la instancia del plugin es la misma antes y después.

### 3.3 El store y el publicador actuales

`[Hecho]` `SS:10` guarda `cursor: { line, column } | null`; no hay origen. `SS:31-34` publica un snapshot nuevo en cada `publishStatus` y notifica a todos los suscriptores; `SS:64-70` lee con `useSyncExternalStore` sin selector (devuelve el objeto `EditorStatus`, que cambia de identidad en cada publicación).

`[Hecho]` `UES:60-62` expone `publishCursor` y lo cablea tal cual a `publishStatus({ cursor })`; `AE:122` y `SE:104` lo pasan a `TextEditor` como `onCursorChange`.

`[Hecho]` `TE:34-38` publica **en cada update**, sin filtrar: también en updates de foco, viewport o geometría.

`[Hecho]` `resetStatus()` (`SS:50-54`) se llama en el cleanup de `useEditorStatus` (`UES:40-44`). `ArticlePane` monta `<ArticleEditor key={article.ID} …>` (`src/renderer/src/workspace/ArticlePane/ArticlePane.tsx:16`), así que cambiar de artículo remonta el editor y el cursor vuelve a `null`. Por tanto el cursor **nunca** viaja de un documento a otro.

`[Hecho]` Crear la vista no dispara ningún update: medido en las sondas 03/04 (el primer `update` registrado es el del primer gesto). Hoy no se publica ningún caret al abrir un documento, y `StatusBar` oculta `Ln`/`Col` mientras `cursor === null` (`src/renderer/src/shell/StatusBar/StatusBar.tsx:63-74`).

`[Hecho]` `EPL:18-19,29,36-40`: en modo `preview` el editor no se desmonta, se oculta con la clase `hidden`; en modo `edit` el preview **sí** se desmonta (`showsPreview = viewMode !== 'edit'`).

### 3.4 Qué se puede reproducir en jsdom

Sondas en `$COMMANDCODE_SCRATCHPAD/probe/` (jsdom 30.1.3 con `pretendToBeVisual: true`, `@codemirror/view` 6.43.14 real):

| Hecho medido | Sonda |
| --- | --- |
| Un `mousedown` sintético en `.cm-content` produce una transacción con `annotation(Transaction.userEvent) === "select.pointer"` y `selectionSet === true` | 04 |
| `Element.clientHeight` y `scrollHeight` son 0 y `getBoundingClientRect()` devuelve ceros; `posAtCoords` colapsa a 0, así que el caret **no** se mueve a la posición del clic | 02/04 |
| `ResizeObserver` no existe y `matchMedia` tampoco; `requestAnimationFrame` sí existe | sonda de entorno |
| En «clic dentro de la selección», el listener documental permanente ve el `head` **viejo** y el `rAF` ve el nuevo (`10 → 5`) | 03 |
| Un arrastre no publica nada hasta soltar; soltar fuera del contenido sí llega al listener documental | 03 |
| Un clic sobre el mismo caret no produce transacción pero sí una publicación del hook | 03 |
| Un clic con botón derecho no publica; un `mousedown` fuera de `contentDOM` tampoco | 03 |
| Un doble clic produce dos gestos y dos publicaciones | 03 |

`[Hecho]` Con un shim de `Range` equivalente al del repo (`SETUP:4-29`), el `mousedown` sintético **no lanza** y despacha `select.pointer` en la posición 0 (sonda 04). Con un shim que devuelve un rect no vacío, `posAtCoords` lanza dentro del handler interno de CodeMirror y la selección no se mueve (sonda 03, primera versión): jsdom sirve para probar **el cableado y el orden de eventos**, nunca la geometría.

---

## 4. Cuándo avisar al preview (pregunta 1)

### 4.1 Comparación de diseños

| # | Diseño | Cuándo publica | Clic fuera de selección | Clic dentro de selección | Arrastre | Jitter | Lag | Listeners duplicados | Acoplamiento |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **A** | `origin: 'pointer'` en cada `select.pointer` + debounce en el consumidor | en cada transacción de puntero | en `mousedown` (antes de soltar) | en `mouseup` | en cada `mousemove` (el debounce lo colapsa si el gesto es rápido) | **sí**: un arrastre lento con pausas > debounce recentra a mitad de gesto | sí: el clic espera el debounce (~120-200 ms) | no | bajo, pero mete un temporizador en el preview |
| **B** | Publicar solo al final del gesto desde el `ViewPlugin`, con un **callback** pasado a la fábrica de extensiones | una vez, al soltar | una vez, al soltar | una vez, al soltar (con el `head` final) | una vez, al soltar | no | un `rAF` (~16 ms) | no | medio: exige convertir `articleEditorExtensions` en fábrica y gestionar la identidad del callback |
| **C** | `mouseup` documental en el wrapper React de `TextEditor`, independiente del plugin | una vez, al soltar | una vez, al soltar | una vez, al soltar | una vez, al soltar | no | un `rAF` | **sí**: dos `mousedown`, dos `mouseup` documentales, dos flags, dos `rAF` | alto: dos detecciones de gesto que deben coincidir |
| **D** | Plugin constante + **anotación** en la misma transacción de fin de gesto; publica `onUpdate` | una vez, al soltar | una vez, al soltar | una vez, al soltar | una vez, al soltar | no | un `rAF` | no | **bajo**: cero props nuevas, cero callbacks, `articleEditorExtensions` sigue siendo constante |
| **E** | El preview se suscribe a la `EditorView` (ref compartida) y lee `update.transactions` | según su propia copia de la lógica | — | — | — | no | un `rAF` | no | **muy alto**: invierte el flujo de datos, el preview depende de la vista y reimplementa la política |
| **F** | `EditorView.domEventObservers({ mouseup })` | `mouseup` dentro de `contentDOM` | sí | sí | **no ve** un arrastre que termina fuera (`CMVD:1195-1212`) | parcial | 0 | no | bajo, pero incompleto | 

**Veredicto: D.** Es B sin su coste de cableado y sin su fragilidad, y sin el riesgo del temporizador de A.

### 4.2 Por qué pierde A (publicar cada `select.pointer` + debounce)

- `[Hecho]` Un arrastre despacha una transacción por `mousemove` (`CMV:4791-4796`). No existe señal de fin (`CMVD:596-601`), así que el consumidor solo puede adivinar con un temporizador.
- `[Inferencia]` Cualquier debounce finito se rompe con un arrastre lento: si el writer mantiene el botón pulsado quieto más que el debounce (algo normal al leer el texto mientras se selecciona), el preview recentra **con el botón aún pulsado** y el texto se mueve debajo del puntero. Es exactamente lo que la decisión 2 prohíbe. Un debounce más largo no arregla el problema, solo lo hace menos frecuente, y empeora el lag del clic.
- `[Hecho]` Un clic fuera de la selección despacha **en `mousedown`** (`CMV:4785-4790`): con A el preview se mueve antes de que el writer suelte, y si ese clic se convierte en arrastre ya habrá habido un salto.
- `[Inferencia]` A obliga a que el store contenga carets «no asentados» o a que el consumidor mantenga estado de gesto; en ambos casos la política se reparte entre dos capas. Y el selector deja de ser puro: depende de un temporizador.
- Ventaja real de A: no toca CodeMirror ni `@uiw`. No compensa: el plugin que hace falta para el centrado del editor ya existe en el diseño de `TW` §8.2.

### 4.3 Por qué pierde B (callback en la fábrica de extensiones)

- `[Hecho]` B funciona: el plugin ve el fin de gesto y publica una vez con el `head` final. Pero exige que `articleEditorExtensions` deje de ser una constante (`EXT:4-8`) y pase a ser una fábrica por editor, o que el callback viaje por un `Compartment`/facet mutable.
- `[Hecho]` Un callback con identidad inestable provoca `StateEffect.reconfigure` en cada render (`UCM:147-154`). No remonta la vista ni pierde documento/selección/historial (§3.2), pero sí destruye y recrea cualquier plugin cuya especificación se reconstruya (`CMV:8106-8125`). Habría que blindar el callback con `useRef` **y** mantener la especificación como constante, es decir, B acaba necesitando D por dentro más un callback por encima.
- `[Inferencia]` Un callback pasado a la extensión es una segunda vía de publicación paralela a `onCursorChange`, con su propio ciclo de vida (montaje, desmontaje, cambio de editor). Más superficie para el mismo resultado.

### 4.4 Por qué pierde C (listener en el wrapper React)

- `[Inferencia]` Duplica el mecanismo: para no reaccionar a cualquier `mouseup` de la aplicación necesita su propio flag armado por un `mousedown` en el contenido, su propio `rAF`, su propia guarda de botón y su propia gestión de `touchend` + `mouseup` sintético. Es el mismo código que el plugin, en una capa con menos información (no sabe si CodeMirror creó una `MouseSelection`) y con dos sitios que mantener sincronizados.
- `[Inferencia]` La publicación queda fuera del ciclo de update de CodeMirror: el store puede recibir el caret antes o después de que el editor aplique su propio centrado, y no hay forma barata de garantizar que ambos usen el mismo `head` si en el futuro alguien añade otra fuente de centrado.
- Ventaja real de C: no toca el editor, así que es inmune a las reconfiguraciones. Pero D también lo es (§3.2, sonda 01) sin duplicar el gesto.

### 4.5 El diseño elegido (D): una transacción de fin de gesto con anotación

`[Hecho]` Una anotación es metadato de transacción y no puede perderse ni mapearse (`CMSD:759-777`); `TransactionSpec.annotations` acepta una o varias (`CMSD:882`).

`[Inferencia]` Despachar **una sola** transacción con dos cargas —la anotación `pointerSelectionEnd` y el efecto `EditorView.scrollIntoView(head, { y: 'center' })`— da tres propiedades:

1. El editor centra su caret con el `head` final (el efecto lo intercepta el `scrollHandler` de `TW` §8.3, o lo aplica CodeMirror si el typewriter no está instalado).
2. El preview se entera en el mismo update, por `onUpdate`, con el mismo `head`: no hay dos lecturas que puedan discrepar.
3. No hay callbacks nuevos ni estado de gesto en el store: la transacción **es** la señal.

`[Inferencia]` Regla de publicación derivada: **una transacción `select.pointer` sin la anotación nunca se publica**. Eso elimina el jitter por construcción (no por temporizador) y deja el store con un único invariante fácil de enunciar y de testear: *el store solo contiene carets asentados*.

`[Decisión abierta]` Alternativa de menor latencia: sustituir el `requestAnimationFrame` por `queueMicrotask` (se ejecutaría después del despacho completo del `mouseup`, es decir, también después de `MouseSelection.up`). Ahorra un frame, pero no está medido en un navegador real y depende de que ningún `selectionchange`/mutación nativa llegue después. **Mantener `rAF`** (ya validado por `TW` §8.7) y no cambiarlo sin medir.

### 4.6 El hook, en código

```ts
// src/renderer/src/editor/pointer-selection.ts
import { Annotation } from '@codemirror/state'
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

// Marks the transaction that closes a pointer gesture. Carries the head CodeMirror
// settled on, for debugging; consumers read the selection from the update state.
export const pointerSelectionEnd = Annotation.define<number>()

export function isPointerGestureEnd(update: Pick<ViewUpdate, 'transactions'>): boolean {
  return update.transactions.some(
    (transaction) => transaction.annotation(pointerSelectionEnd) !== undefined
  )
}

class PointerGesture {
  private armedBy: 'mouse' | 'touch' | null = null
  private frame = 0

  constructor(private readonly view: EditorView) {
    view.contentDOM.addEventListener('mousedown', this.onMouseDown)
    view.contentDOM.addEventListener('touchstart', this.onTouchStart, { passive: true })

    const doc = view.contentDOM.ownerDocument
    doc.addEventListener('mouseup', this.onGestureEnd)
    doc.addEventListener('mousemove', this.onMouseMove)
    doc.addEventListener('touchend', this.onGestureEnd, { passive: true })
  }

  private onMouseDown = (event: MouseEvent): void => {
    // A non-primary button must not move the viewport (context menu, middle click).
    if (event.button === 0 && this.view.contentDOM.contains(event.target as Node)) {
      this.armedBy = 'mouse'
    }
  }

  private onTouchStart = (event: TouchEvent): void => {
    if (this.view.contentDOM.contains(event.target as Node)) {
      this.armedBy = 'touch'
    }
  }

  // The release can happen outside the window; a mouse move with no buttons
  // shows it. CodeMirror does the same in MouseSelection.move
  // (view/dist/index.js:4791-4792). Only for mouse gestures: the synthetic mouse
  // events of a touch gesture may report buttons === 0 while the finger is down.
  private onMouseMove = (event: MouseEvent): void => {
    if (this.armedBy === 'mouse' && event.buttons === 0) {
      this.finish()
    }
  }

  private onGestureEnd = (): void => {
    this.finish()
  }

  private finish(): void {
    if (this.armedBy === null) {
      return
    }

    this.armedBy = null
    const win = this.view.contentDOM.ownerDocument.defaultView ?? window

    if (this.frame) {
      win.cancelAnimationFrame(this.frame)
    }

    // MouseSelection registers its own document mouseup when the gesture starts,
    // so when a click happens inside an existing selection it collapses it after
    // this listener runs. One frame later the selection is final.
    this.frame = win.requestAnimationFrame(() => {
      this.frame = 0

      if (!this.view.dom.isConnected) {
        return
      }

      const head = this.view.state.selection.main.head

      // One transaction: the editor centres its own caret and the store is told
      // about the same head, in the same update.
      this.view.dispatch({
        annotations: [pointerSelectionEnd.of(head)],
        effects: EditorView.scrollIntoView(head, { y: 'center' })
      })
    })
  }

  destroy(): void {
    const win = this.view.contentDOM.ownerDocument.defaultView ?? window

    if (this.frame) {
      win.cancelAnimationFrame(this.frame)
      this.frame = 0
    }

    const doc = this.view.contentDOM.ownerDocument
    this.view.contentDOM.removeEventListener('mousedown', this.onMouseDown)
    this.view.contentDOM.removeEventListener('touchstart', this.onTouchStart)
    doc.removeEventListener('mouseup', this.onGestureEnd)
    doc.removeEventListener('mousemove', this.onMouseMove)
    doc.removeEventListener('touchend', this.onGestureEnd)
  }
}

// Module-level constant: @uiw/react-codemirror reconfigures on every render
// (useCodeMirror.js:147-154) and only a stable spec preserves the plugin
// instance and its in-flight gesture (verified: probe 01).
export const pointerGesture = ViewPlugin.fromClass(PointerGesture)
```

`[Inferencia]` `destroy()` debe cancelar el frame pendiente: si el editor se desmonta entre el `mouseup` y el `rAF`, un frame huérfano despacharía sobre una vista destruida.

`[Inferencia]` `armedBy` distingue el gesto de ratón del táctil porque la guarda de `mousemove` con `buttons === 0` solo es válida para ratón: en un gesto táctil, los `mousemove` sintéticos pueden informar `buttons === 0` con el dedo aún apoyado y cerrarían el gesto antes de tiempo, perdiendo la publicación final.

`[Inferencia]` No se pone guarda de `clientHeight` en el publicador: el store debe recibir el caret aunque el editor esté oculto, y las guardas de geometría pertenecen a los consumidores (el `scrollHandler` del editor y `PreviewCursorSync`). Eso es lo que hace la publicación testeable en jsdom, donde `clientHeight` siempre es 0 (§3.4).

---

## 5. Cableado sin romper `@uiw/react-codemirror` (pregunta 2)

`[Hecho]` `TextEditor` ya pasa una constante de módulo (`TE:31`); `articleEditorExtensions` es un array constante (`EXT:4-8`) con un solo consumidor (`grep`: solo `TE:4,31`).

**Con D no hace falta ningún callback.** La señal viaja por la anotación de la transacción, y el publicador ya existe (`onCursorChange` → `publishCursor`). Cambios:

1. `EXT:4-8`: añadir `pointerGesture` al array. La identidad del array **no cambia** (constante de módulo), así que este cambio no añade reconfiguraciones.
2. `TE:34-38`: leer el origen con `cursorOrigin(update)` y no publicar cuando devuelve `null`.

**Respuestas a las preguntas concretas de la pregunta 2:**

- **¿Puede `TextEditor` pasar un callback estable a `articleEditorExtensions(...)`?** Sí, pero no hace falta. Si se quisiera, el callback tendría que ser estable (`useCallback` con deps vacías que lea un `useRef`, o el propio ref como objeto estable).
- **¿Cambiar la identidad del callback reconfigura o remonta?** Reconfigura: `UCM:147-154` despacha `StateEffect.reconfigure`. No remonta: la vista se crea en un `useLayoutEffect` con deps `[container, state]` (`UCM:101-126`).
- **¿Se pierde estado al reconfigurar?** No se pierde el documento, la selección ni los `StateField` (historial incluido): `CMSV:2605-2634` y `CMSV:1794-1805`. Sí se pierden las instancias de `ViewPlugin` cuya especificación cambie de identidad (`CMV:8106-8125`). Por eso la especificación debe ser constante; el *argumento* puede variar.
- **Patrón de ref estable si se eligiera B:** `const onPointer = useRef(onCursorChange); onPointer.current = onCursorChange;` y una única llamada a la fábrica memorizada (`useMemo(() => articleEditorExtensions({ onPointerEnd: (view) => onPointer.current(...) }), [])`). Con D este patrón es innecesario, y esa es una de sus ventajas.

`[Hecho]` Hoy ya se reconfigura una vez por render porque `onChange`/`onUpdate` son flechas inline (`TE:33-38` + `UCM:154`). No se propone arreglarlo aquí (queda fuera del alcance), pero conviene saberlo: cualquier plugin con especificación inestable se recrearía en cada pulsación de tecla.

---

## 6. Un solo listener o dos (pregunta 3)

| Criterio | Un solo listener (D) | Dos listeners independientes (C o C+plugin) |
| --- | --- | --- |
| `mousedown` en `contentDOM` | 1 | 2 |
| `mouseup`/`touchend` en `document` | 1 | 2 |
| `requestAnimationFrame` por gesto | 1 | 2 |
| Lecturas del `head` | 2 (el plugin para el efecto, `onUpdate` para línea/columna) | 4 |
| Riesgo de discrepancia entre editor y preview | nulo: mismo `head`, mismo update | alto: dos flags y dos guardas que deben coincidir |
| Acoplamiento editor ↔ preview | ninguno: el preview solo lee el store | ninguno, pero la política está duplicada |
| Test de «un solo centrado por gesto» | una aserción por panel | hay que verificar también que no se dupliquen entre sí |

**Recomendación: un solo listener.** Las dos lecturas del `head` en D (plugin y `onUpdate`) son lecturas del mismo `EditorState` síncronas, triviales; no merecen coordinación. El desacoplamiento real que importa se mantiene: **el preview no importa nada del editor**, solo el store y el selector. Duplicar el listener no compra desacoplamiento, compra dos copias de la misma política.

`[Inferencia]` Si en el futuro el typewriter se desactivara con un toggle y el plugin de puntero se quitara con él, el preview dejaría de recibir eventos de puntero. Es un acoplamiento de *producto* aceptable y hay que dejarlo escrito: el `pointerGesture` no es opcional mientras el preview siga el puntero.

---

## 7. Política del store y selectores (pregunta 4)

### 7.1 Forma pública

```ts
// src/renderer/src/state/status-store.ts
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

`[Inferencia]` `origin` no lo consume nadie todavía (el selector devuelve la línea para ambos orígenes), y aun así se mantiene: es el punto único donde se puede añadir mañana una política distinta por origen, es lo que hace legibles los tests de política y evita re-inferir el origen en la UI.

### 7.2 Reglas de publicación

| Situación | `docChanged` | `selectionSet` | Anotación de fin de gesto | `cursorOrigin` |
| --- | --- | --- | --- | --- |
| Escribir, pegar, cortar, borrar | sí | — | — | `keyboard` |
| Undo / redo | sí | — | — | `keyboard` |
| Toolbar de formato (`src/renderer/src/editor/commands.ts`) | sí | — | — | `keyboard` |
| Flechas, Shift+flechas, Ctrl+A, Home/End | no | sí | — | `keyboard` |
| PageUp / PageDown | no | sí | — | `keyboard` |
| Composición IME | sí | — | — | `keyboard` |
| `replaceEditorText` de los tests (`AT:570-577`) | sí | sí | — | `keyboard` |
| Clic / arrastre, transacción intermedia | no | sí | no | `null` (no publica) |
| Clic / arrastre / clic sobre el mismo caret, al soltar | no | no | sí | `pointer` |
| Foco, scroll, geometría, resize | no | no | no | `null` |

`[Hecho]` «`docChanged` siempre significa teclado» se sostiene en la fuente: las transacciones de puntero nunca cambian el documento (`CMV:4854-4861`), y `applyDOMChangeInner` marca `input.type` para las ediciones de texto (`CMV:4443-4459`).

### 7.3 Dónde vive el estado de «fin de gesto»

| Opción | Qué implica | Re-renders | Test | Veredicto |
| --- | --- | --- | --- | --- |
| **En el store** (`pointerActive`, `settled`, tercer valor de `origin`, contador de revisión) | El store refleja un gesto transitorio que el editor conoce mejor | Un clic produce ≥2 emisiones; el estado puede quedar obsoleto si se pierde un `mouseup` | Hay que probar la máquina de estados del store | **No** |
| **En el componente de sincronización** (debounce / `setTimeout` de asentamiento) | El preview adivina cuándo terminó el gesto | 1 por gesto | Frágil: depende de tiempos | **No** (§4.2) |
| **En el publicador** (la transacción lleva la anotación; el resto de transacciones de puntero no se publican) | El store solo contiene carets asentados; el selector es trivial | 1 por gesto; 1 por tecla (la línea cambia o no) | `cursorOrigin` es una función pura del update | **Sí** |

`[Inferencia]` El invariante que se documenta en el código es: **`EditorStatus.cursor` es siempre un caret asentado**. Con eso, `selectPreviewLine` no necesita saber nada del gesto:

```ts
// src/renderer/src/state/status-store.ts
export function selectPreviewLine(status: EditorStatus): number | null {
  // The publisher only reports settled carets (see cursorOrigin), so both
  // origins are followable. Reading only the line keeps the snapshot primitive:
  // column-only changes do not re-render the preview.
  return status.cursor?.line ?? null
}

const getPreviewLine = (): number | null => selectPreviewLine(snapshot)

export function usePreviewLine(): number | null {
  return useSyncExternalStore(subscribe, getPreviewLine)
}
```

### 7.4 `cursorOrigin`, función pura

```ts
// src/renderer/src/editor/TextEditor/cursor-origin.ts
import type { CursorOrigin } from '../../state/status-store'

type CursorUpdate = {
  docChanged: boolean
  selectionSet: boolean
  pointerGestureEnd: boolean
  transactions: readonly { isUserEvent(event: string): boolean }[]
}

export function cursorOrigin(update: CursorUpdate): CursorOrigin | null {
  // A pointer gesture that ended: the preview follows the settled caret.
  if (update.pointerGestureEnd) {
    return 'pointer'
  }

  if (!update.docChanged && !update.selectionSet) {
    return null
  }

  // A pointer selection that has not settled yet (drag in progress, or a
  // pointer selection originated outside the editor): not published.
  const unsettledPointer =
    !update.docChanged &&
    update.selectionSet &&
    update.transactions.some((transaction) => transaction.isUserEvent('select.pointer'))

  return unsettledPointer ? null : 'keyboard'
}
```

`[Inferencia]` `pointerGestureEnd` se pasa ya calculado en lugar de leer la anotación dentro de la función: así la función no depende de `@codemirror/state` y se testea con objetos planos, igual que el resto de helpers puros del proyecto.

`[Hecho]` `update.state.doc.lineAt(head)` y `head - line.from + 1` ya se usan hoy para línea/columna 1-based (`TE:35-37`); no cambia.

### 7.5 Ráfagas de re-render

- `[Inferencia]` Escribir publica por tecla: la línea cambia cuando se añade una línea, y entonces el preview re-renderiza y recentra. Es el comportamiento esperado, y el coste está aislado en `PreviewCursorSync`, que devuelve `null` y no re-parsea el Markdown (`PREV` §4.5).
- `[Hecho]` Un arrastre no publica nada hasta soltar (§3.4, sonda 03), así que no hay re-render alguno durante el gesto.
- `[Inferencia]` Un clic publica una vez; si la línea no cambia, `selectPreviewLine` devuelve el mismo número y `useSyncExternalStore` no re-renderiza (compara con `Object.is`; `PREV` §3.6).
- `[Inferencia]` Cambiar solo la columna no re-renderiza el preview: el selector devuelve una primitiva que no cambió.
- **Consecuencia asumida:** si el writer hace scroll manual en el preview y luego hace clic en la **misma línea** (otra columna), el preview no se recentra, mientras el editor sí. Se acepta porque el bloque visible ya es el correcto. Si el producto quiere «todo evento de caret recentra», el cambio es local: añadir `cursorRevision: number` al snapshot, incrementarlo en `publishCursor`, exponer `useCursorRevision()` y leer la línea de forma imperativa dentro del efecto. Va contra la restricción «column-only changes must not re-render the preview» (una tecla sin cambio de línea re-renderizaría), así que **no se recomienda ahora** (`[Decisión abierta]`).

---

## 8. Scroll manual del preview y precedencia (pregunta 5)

- `[Hecho]` Arrastrar la barra de scroll del preview o girar la rueda sobre él no genera ninguna transacción en el editor (`CMV:4964-4973` para la rueda; la barra no toca `contentDOM`). Nuestro `mousedown` solo se arma dentro de `view.contentDOM`, así que un `mouseup` que llegue desde el preview no hace nada. Medido: sonda 03, «mousedown outside content» → 0 publicaciones.
- **Precedencia:** un evento de caret recentra siempre; el scroll manual es válido hasta el siguiente evento de caret. Sin pausa y sin temporizador (coincide con `PREV` §10.7).
- `[Inferencia]` El desplazamiento manual **debe cancelar** una animación en curso en el preview: `wheel`, `touchstart` y `pointerdown`/`mousedown` sobre el scroller del preview cancelan el frame pendiente. Si no, la animación seguiría escribiendo `scrollTop` contra la voluntad del writer.
- `[Hecho]` La rueda y el arrastre de la barra **no** deben pausar el seguimiento: el siguiente caret recentra y no hace falta más estado.
- `[Decisión abierta]` El arrastre de la barra de scroll puede no entregar `pointerdown` al documento en todos los navegadores (mismo riesgo residual que `TW` §8.6). Si se observa en Electron, añadir cancelación por desviación de `scrollTop`. No verificable en jsdom.

---

## 9. Cambio de modo, montaje y último origen (pregunta 6)

`[Hecho]` `EPL:18-19,29`: en `preview` el editor sigue montado y oculto; en `edit` el preview se desmonta. `[Hecho]` `resetStatus()` limpia el cursor al desmontar el editor (`UES:40-44`) y `ArticlePane` remonta por `key` al cambiar de artículo.

**Recomendación:**

1. **Al montar el preview con `cursor === null`** (primer arranque o editor recién montado): no centrar; calcular espaciadores y dejar `scrollTop` en 0. Con el espaciador superior de `PREV` §4.4, `scrollTop = 0` ya deja el primer bloque centrado, así que **no publicar un cursor inicial produce el mismo aspecto que publicarlo**: el primer evento de caret (línea 1) calculará `target = 0` y no habrá salto. Esto cierra la decisión abierta `PREV` §10.10 sin coste.
2. **Al montar el preview con un cursor asentado** (volver de `edit` a `split`/`preview`): centrar en esa línea. El store solo contiene carets asentados, así que el origen ya no importa: `PREV` §10.11 («si el último origen fue puntero, no centrar») queda obsoleto.
3. `[Inferencia]` Impacto de producto: activar el preview después de escribir muestra el párrafo donde está el writer, no el principio del documento. Es coherente con «siempre activo» y con el centrado del editor, que sí está centrado en ese momento.
4. **No publicar un cursor inicial en `onCreateEditor`.** Añadiría una emisión por montaje y un `Ln`/`Col` visible antes del primer gesto, pero ninguna diferencia visual en el preview. Si se quiere el `Ln`/`Col` inmediato, es un cambio independiente y de una línea.

`[Inferencia]` Ajuste necesario en `PreviewCursorSync`: la compensación de espaciadores de `PREV` §4.4 (`scrollTop += newTop - previousTop`) **no debe aplicarse en la primera sincronización**. Con `previousTop = 0` y `scrollTop = 0`, esa fórmula deja `scrollTop = T` y el artículo pegado arriba; luego el primer evento de caret lo devuelve a 0 y se ve un salto de `T` px hacia abajo. Basta con compensar solo cuando `previousTopHeight > 0`.

---

## 10. IME (pregunta 7)

`[Hecho]` `EditorView.composing` (`> 0`, al menos un cambio en la composición) y `EditorView.compositionStarted` (`>= 0`) existen y son públicos (`CMVD:770-783`; `CMV:7889,7896`).

`[Hecho]` Durante la composición, CodeMirror marca la transacción como `input.type.compose` (y `.start` en el primer cambio) y mantiene `scrollIntoView: true` (`CMV:4443-4459`). `observers.compositionstart` puede además despachar una transacción `userEvent: "input"` si había una selección multilínea (`CMV:5285-5300`).

`[Inferencia]` Con la política de §7, cada actualización de composición publica `origin: 'keyboard'`. El preview solo reacciona si cambia la **línea**, y una composición dentro de una palabra no cambia de línea: no hay re-render ni recentrado. Solo una composición que introduzca líneas nuevas mueve el preview, y debe hacerlo.

`[Inferencia]` El candidato del IME se ancla al caret del **editor**, no al preview, así que recentrar el preview no puede desplazar la ventana de candidatos. El riesgo de IME es del editor (`TW` §7.3, decisión abierta allí), no de este diseño.

**Recomendación:** no suprimir ni posponer nada por IME en la primera versión. Si en Electron se observa jitter (composición que crea líneas), la guarda es una línea en el publicador (`if (update.view.composing) return null`) y el recentrado ocurriría en la primera transacción posterior — pero **eso deja el caret del preview desactualizado durante la composición**, así que `[Decisión abierta]` a verificar con fcitx/ibus reales antes de añadirlo.

`[Hecho]` No hay ningún manejo de `compositionstart`/`compositionend` en el plugin de puntero, y no hace falta: durante una composición el writer no arrastra el ratón, y si lo hace, el gesto cierra la composición como cualquier `mousedown`.

---

## 11. Diagramas de secuencia

Notación: `tN` es orden temporal estricto dentro del mismo gesto. «Nuestro listener» = el `mouseup` documental permanente del `ViewPlugin`; «MsSelection» = los listeners que `MouseSelection` registra en el `mousedown` (`CMV:4779-4780`).

### 11.1 Clic fuera de la selección

```text
t0  mousedown en .cm-content
t1  handler del plugin: pointerDown = true
t2  handlers.mousedown de CodeMirror: new MouseSelection(...) → registra mousemove/mouseup en document
t3  MouseSelection.start() → dispatch({ selection, userEvent: 'select.pointer' })   [selección ya colapsada]
t4  onUpdate → cursorOrigin = null (pointer sin anotación) → NO publica
t5  mouseup en document → nuestro listener → pointerDown = false → programa rAF
t6  mouseup en document → MouseSelection.up() → no hay nada que despachar → destroy()
t7  rAF → head = selección final → dispatch({ annotations: [pointerSelectionEnd],
                                                effects: scrollIntoView(head, { y: 'center' }) })
t8  onUpdate → cursorOrigin = 'pointer' → publishCursor({ line, column, origin: 'pointer' })
t9  scrollHandler del editor → centra/anima con el mismo head
t10 usePreviewLine cambia (si cambió la línea) → PreviewCursorSync (useLayoutEffect) → mide y centra/anima
```

### 11.2 Clic dentro de una selección existente (el caso que exige el `rAF`)

```text
t0  mousedown dentro de la selección
t1  handler del plugin: pointerDown = true
t2  CodeMirror: new MouseSelection(...); dragging = null (clic simple dentro de la primaria)
t3  MouseSelection.start() → dragging !== false → NO despacha nada
t4  mouseup en document → nuestro listener → ve el head VIEJO (p. ej. 10) → programa rAF
t5  mouseup en document → MouseSelection.up() → dragging === null → select() → dispatch colapso (head 5)
    onUpdate intermedio: select.pointer sin anotación → NO publica
t6  rAF → lee head = 5 (el nuevo) → dispatch con anotación + efecto de centrado
t7  onUpdate → 'pointer' → publica línea/columna del head 5
```

Medido: sonda 03, «click inside selection» → `head at listener = 10`, `published head = 5`.

### 11.3 Arrastre

```text
t0  mousedown → pointerDown = true; MouseSelection registra sus listeners
t1  MouseSelection.start() → select() → select.pointer (colapsada) → NO publica
t2  mousemove ×N → MouseSelection.move() → select() → select.pointer por movimiento → NO publica
    (el preview y el editor no se mueven: cero transacciones con anotación)
t3  mouseup → nuestro listener → programa rAF
t4  MouseSelection.up() → dragging === false → no despacha
t5  rAF → dispatch único con el head final → publica una vez → editor centra una vez → preview centra una vez
```

### 11.4 Arrastre que termina fuera del contenido

```text
t0  mousedown en .cm-content → pointerDown = true
t1  mousemove sobre el documento (fuera del contenido) → MouseSelection.move() sigue actualizando
    (sus listeners están en el documento: view/dist/index.js:4779-4780)
t2  mouseup fuera del contenido → nuestro listener documental lo recibe igual → programa rAF
t3  rAF → head final → una publicación, un centrado
```

Medido: sonda 03, «drag ending outside content». `[Inferencia]` Si el `mouseup` ocurre **fuera de la ventana**, puede no llegar: sin publicación hasta el siguiente gesto. Mitigación: `mousemove` con `buttons === 0` como fin de gesto.

### 11.5 Doble clic

```text
t0  clic 1 (detail 1): gesto completo → una publicación al soltar (head del primer clic)
t1  clic 2 (detail 2): gesto completo → una publicación al soltar (selección de la palabra, head final)
```

`[Hecho]` Dos gestos, dos publicaciones (sonda 03). `[Inferencia]` El preview pide dos centrados separados ~200-300 ms; los destinos son casi el mismo bloque, así que el segundo delta es pequeño y, por el umbral de `TW` §8.4, será instantáneo. Triple clic: igual, tres gestos.

### 11.6 Shift+clic

```text
t0  mousedown con shiftKey → pointerDown = true; MouseSelection.extend = true
t1  MouseSelection.start() → select() → select.pointer con la selección extendida → NO publica
t2  mouseup → listener → rAF
t3  rAF → head = extremo activo de la selección extendida → una publicación, un centrado
```

`[Inferencia]` Mismo camino que un clic normal: el hook no distingue variantes, solo usa el `head` final. Coincide con `TW` §8.2.

### 11.7 Clic sobre el mismo caret (sin transacción)

```text
t0  mousedown sobre el caret actual → pointerDown = true
t1  CodeMirror: MouseSelection creada; select() no despacha porque la selección no cambia
t2  mouseup → listener → rAF
t3  rAF → head sin cambios → dispatch con anotación (no cambia selección ni documento)
t4  onUpdate → 'pointer' → publica (misma línea: el preview no re-renderiza; el editor sí recentra)
```

`[Hecho]` Es el único camino que produce un centrado del editor en un clic que no movió el caret (sonda 03). `[Inferencia]` Justifica por sí solo que la señal no pueda depender de `selectionSet`.

---

## 12. Plan de pruebas (pregunta 8)

`[Hecho]` El renderer corre en jsdom (`jest.config.js:24-35`) con el shim de `Range` y `cleanup` (`SETUP:4-29,31-33`); jsdom no mide layout y `AGENTS.md:62-63` prohíbe tests de layout en Jest. `[Hecho]` el entorno usa `pretendToBeVisual: true` (`node_modules/.pnpm/@jest+environment-jsdom-abstract@30.5.2_.../build/index.js:90`), así que `requestAnimationFrame` existe; `ResizeObserver` y `matchMedia` **no**.

### 12.1 Unit tests puros (jsdom, sin vista)

`src/renderer/src/editor/TextEditor/cursor-origin.test.ts`:

| Caso | Entrada | Esperado |
| --- | --- | --- |
| update irrelevante | `docChanged:false, selectionSet:false, pointerGestureEnd:false` | `null` |
| escritura | `docChanged:true`, `userEvent: 'input.type'` | `'keyboard'` |
| flecha | `selectionSet:true`, `userEvent: 'select'` | `'keyboard'` |
| arrastre en curso | `selectionSet:true`, `userEvent: 'select.pointer'`, sin anotación | `null` |
| fin de gesto | `pointerGestureEnd:true`, sin `selectionSet` | `'pointer'` |
| fin de gesto + cambio (defensivo) | `docChanged:true, pointerGestureEnd:true` | `'pointer'` |
| escritura con `select.pointer` (no ocurre; defensivo) | `docChanged:true, selectionSet:true, 'select.pointer'` | `'keyboard'` |
| composición | `docChanged:true`, `userEvent: 'input.type.compose'` | `'keyboard'` |

`src/renderer/src/state/status-store.test.ts`:

- `selectPreviewLine`: cursor `{line:3, column:1, origin:'keyboard'}` → `3`; `{line:3, origin:'pointer'}` → `3`; `null` → `null`.
- Sin re-render por columna: publicar `{line:3, column:1}` y luego `{line:3, column:9}` mantiene el valor del selector (`Object.is`), contando renders con un componente de prueba.
- Sin re-render por la misma línea y el mismo origen publicados dos veces.

`src/renderer/src/editor/pointer-selection.test.ts` (con `EditorState`/`EditorView` reales, como en `TW` §9.1):

- La anotación sobrevive a `tr.annotation(pointerSelectionEnd)` y `isPointerGestureEnd(update)` es `true` solo cuando está.
- La transacción del plugin no cambia documento ni selección: `tr.docChanged === false`, `tr.newSelection.eq(state.selection)`.

### 12.2 Integración en jsdom (cableado, no geometría)

Patrón: `renderApp(...)`, abrir un artículo, obtener la vista con `articleView()` (`AT:555-563`), disparar eventos con `fireEvent` y vaciar frames con

```ts
async function flushFrames(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}
```

```ts
// Emulates one of the transactions CodeMirror dispatches while the pointer is
// held down. The existing helper (App.test.tsx:565-568) dispatches without a
// userEvent, which counts as keyboard on purpose: that is why the current
// status-bar tests keep passing.
function dragTo(anchor: number, head: number): void {
  articleView().dispatch({ selection: { anchor, head }, userEvent: 'select.pointer' })
}
```

| Test | Pasos | Aserción |
| --- | --- | --- |
| Un clic publica una vez, con origen `pointer` | `fireEvent.mouseDown(.cm-content)` (jsdom despacha ya un `select.pointer` en la posición 0); `dragTo(0, 5)`; `fireEvent.mouseUp(document)`; `flushFrames()` | store: `cursor.origin === 'pointer'`, `cursor.line` = línea del head final; **exactamente una** emisión |
| Un arrastre no publica hasta soltar | `mouseDown`; `dragTo(0, 5)`, `dragTo(0, 9)`, `dragTo(0, 14)`; comprobar store antes de soltar | store sin cambios (o con el cursor anterior) |
| Un arrastre publica una vez al soltar | añadir `fireEvent.mouseUp(document)` + `flushFrames()` | una sola emisión, con el último head |
| Clic sobre el mismo caret | `selectEditorText(5, 5)`; `mouseDown`; `mouseUp`; `flushFrames()` | una emisión, misma línea |
| Botón derecho | `mouseDown(.cm-content, { button: 2 })` + `mouseUp` | ninguna emisión |
| `mousedown` fuera del editor (sidebar/preview) | `mouseDown(document.body)` + `mouseUp` | ninguna emisión |
| Touch | `fireEvent.touchStart(.cm-content)` + `fireEvent.touchEnd(document)`; `mouseUp` sintético después | una sola emisión (no dos) |
| Reconfiguración a mitad de gesto | `mouseDown`; `view.dispatch({ effects: StateEffect.reconfigure.of(articleEditorExtensions) })`; `dragTo(0, 5)`; `mouseUp`; `flushFrames()` | una sola emisión (el flag sobrevive) |
| Desmontaje | desmontar el editor; `mouseUp` + `flushFrames()` | ninguna emisión; sin errores de vista destruida |
| El preview no se mueve durante el arrastre | `PreviewCursorSync` montado; contar ejecuciones de su efecto entre `mouseDown` y `mouseUp` | 0 ejecuciones por caret (solo las de `markdown`) |
| `Ln`/`Col` no se actualiza durante el arrastre | `dragTo` entre `mouseDown` y `mouseUp` | el texto del status bar no cambia hasta soltar (documenta la consecuencia de §7.2) |

`[Inferencia]` Estos tests son honestos con el entorno: no afirman ninguna posición de caret ni `scrollTop`, solo **quién publica, cuándo y cuántas veces**. El test de «clic dentro de la selección» (orden `head` viejo → nuevo) **no** es fiable en Jest porque el shim de `Range` devuelve rects vacíos y `isInPrimarySelection` cae en la rama «fuera de la selección»; se prueba en el harness.

### 12.3 Verificación en Chromium/Electron (no en Jest)

Reutilizar el harness de `TW` §9.2 (CDP `Input.dispatchMouseEvent`, no `dispatchEvent` sintético):

1. Clic real → el preview centra el bloque de la línea clicada (±2 px) y el editor centra el caret.
2. Clic dentro de una selección existente → el preview usa el caret colapsado, no el extremo anterior.
3. Arrastre → `scrollTop` del preview **no cambia** durante el gesto; al soltar, un solo centrado.
4. Arrastre que suelta fuera del contenido y fuera de la ventana.
5. Doble y triple clic → 2 y 3 centrados, sin oscilación perceptible.
6. Shift+clic → el preview centra el extremo activo.
7. Clic sobre el mismo caret con el preview desplazado a mano → ambos recentran.
8. Scroll manual del preview (rueda y barra) → no recentra; el siguiente caret sí; la animación en curso se cancela.
9. `prefers-reduced-motion: reduce` → centrados instantáneos.
10. Compuerta de umbral: un salto grande en el preview anima ~150 ms; un ajuste de ≤ `max(24, H/6)` es instantáneo.
11. Cambio `edit → split` → el preview se monta centrado en la línea del store.
12. IME real (fcitx/ibus) → sin jitter perceptible; si lo hay, aplicar la guarda de §10.

### 12.4 Criterios de aceptación

1. Un clic en el editor (otra línea) mueve el caret y el preview centra ese bloque; `origin === 'pointer'` una sola vez.
2. Un arrastre no mueve ni el editor ni el preview hasta soltar; al soltar, ambos centran con el `head` final, una sola vez cada uno.
3. Un clic sobre el mismo caret recentra ambos paneles.
4. Un clic con el botón derecho, o un `mouseup` que empezó fuera del editor, no mueve nada.
5. Escribir, pegar, undo/redo, toolbar y flechas siguen publicando `origin: 'keyboard'` y recentrando.
6. Cambiar solo la columna no re-renderiza el preview; cambiar de línea sí.
7. `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan; los tests existentes (`AT:635-643,684-747`) no se tocan.
8. Al desmontar el editor no quedan listeners documentales ni frames pendientes (probar con dos montajes consecutivos y un `mouseup` huérfano).

---

## 13. Cambios por archivo

| Archivo | Cambio | Riesgo |
| --- | --- | --- |
| **nuevo** `src/renderer/src/editor/pointer-selection.ts` | `pointerSelectionEnd` (Annotation), `isPointerGestureEnd`, clase `PointerGesture`, constante `pointerGesture` | Medio: listeners documentales; limpiar en `destroy` |
| **nuevo** `src/renderer/src/editor/TextEditor/cursor-origin.ts` | `cursorOrigin(update)` puro | Ninguno |
| `EXT:4-8` | añadir `pointerGesture` al array constante | Bajo: no cambia la identidad del array |
| `TE:34-38` | calcular `origin`, no publicar si es `null`, publicar `{ line, column, origin }` | Bajo: deja de publicar en updates irrelevantes (foco/geometría) |
| `SS:5-19` | `CursorOrigin`, `EditorCursor`, `cursor` con `origin` | Bajo |
| `SS` (nuevo bloque) | `selectPreviewLine`, `getPreviewLine`, `usePreviewLine` | Bajo |
| `UES:11,60-62` | tipar `publishCursor` con `EditorCursor` | Bajo |
| `AE:122`, `SE:104` | sin cambios (el tipo se ensancha solo) | Ninguno |
| `MP` | pasar a ser el scroller, refs, espaciadores, `<PreviewCursorSync>` (según `PREV` §5.7) | Medio, ya especificado en `PREV` |
| **nuevo** `MP/PreviewCursorSync.tsx` | suscripción a `usePreviewLine`, `useLayoutEffect`, `ResizeObserver`, **animación y cancelación** | Medio; verificar en Electron |
| **nuevo** `MP/preview-sync.ts` | `readSourceBlocks`, `findBlockForLine`, matemática de espaciadores (según `PREV` §5.4-5.5) | Ninguno |
| **nuevo (recomendado)** `src/renderer/src/lib/scroll-motion.ts` | `SCROLL_DURATION`, `easeOutCubic`, `shouldAnimateCenter(delta, viewportHeight, minStep)`, `prefersReducedMotion()` con guarda de `matchMedia` | Bajo: funciones puras compartidas por editor y preview |
| `EPL:36-40` | eliminar el wrapper `overflow-y-auto` (el preview es dueño del scroll) | Bajo, ya especificado en `PREV` |

`[Inferencia]` Compartir `shouldAnimateCenter`/`easeOutCubic` entre `editor/typewriter.ts` y `MP/preview-sync.ts` evita que las dos features usen umbrales distintos: la decisión de producto «suave solo en saltos grandes» debe tener una sola implementación. Para el preview el `minStep` nominal es 24 px (una línea de `text-sm`), porque no hay `defaultLineHeight` de CodeMirror.

---

## 14. Casos límite

| Caso | Comportamiento esperado | Estado |
| --- | --- | --- |
| Clic en otra línea | Un publish `pointer`, editor y preview centran | `[Hecho]` fuente + sonda 03 |
| Clic dentro de una selección | El publish usa el caret colapsado (leído tras `rAF`) | `[Hecho]` sonda 03 (`10 → 5`) |
| Clic sobre el mismo caret | Un publish, ambos centran; no hay transacción de selección | `[Hecho]` sonda 03 |
| Arrastre dentro del editor | Cero publicaciones durante el gesto; una al soltar | `[Hecho]` sonda 03 |
| Arrastre que termina fuera del contenido | Igual, gracias al listener documental | `[Hecho]` sonda 03 |
| Arrastre que suelta fuera de la ventana | Sin publicación hasta el siguiente gesto; mitigado por `mousemove` con `buttons === 0` | `[Inferencia]` |
| Doble clic | Dos publicaciones (una por clic); el segundo delta es pequeño → instantáneo | `[Hecho]` sonda 03 + `[Inferencia]` umbral |
| Triple clic | Tres publicaciones | `[Inferencia]` mismo camino |
| Shift+clic | Una publicación con el extremo activo | `[Inferencia]` fuente (`CMV:4781`) |
| Botón derecho / central | Sin publicación; el contexto no mueve el viewport | `[Hecho]` sonda 03 |
| Clic derecho que mueve el caret (Chrome) | El caret se mueve sin publicar; el siguiente evento de caret corrige | `[Inferencia]` `[Decisión abierta]` |
| Touch | `touchend` publica una vez; el `mouseup` sintético no duplica | `[Inferencia]` (validar en dispositivo) |
| Reconfiguración de `@uiw` a mitad de gesto | El flag sobrevive; una publicación | `[Hecho]` sondas 01 y 03 |
| Editor desmontado con un frame pendiente | El frame se cancela en `destroy()`; no se despacha sobre una vista muerta | `[Inferencia]` |
| Editor oculto (`preview`) | No recibe clics; si llegara un gesto, publica y el consumidor ignora por `clientHeight = 0` | `[Inferencia]` |
| Modo `edit` (preview desmontado) | Las publicaciones no tienen suscriptor; al volver, el preview monta y centra con el cursor del store | `[Inferencia]` |
| Cambio de artículo | `key` remonta el editor → `resetStatus()` → `cursor: null` → preview sin centrar | `[Hecho]` `ArticlePane.tsx:16`, `UES:40-44` |
| Sin cursor al montar | Sin centrado; `scrollTop = 0` deja el primer bloque centrado | `[Inferencia]` `PREV` §4.4 |
| Columna distinta en la misma línea | Sin publish visible para el preview (misma línea) → sin re-render | `[Inferencia]` selector |
| Scroll manual del preview | No recentra; el siguiente caret sí; cancela la animación | `[Inferencia]` |
| `prefers-reduced-motion` | Centrados instantáneos | `[Hecho]` por `TW` §8.4 (editor); a replicar en el preview |
| jsdom (`clientHeight = 0`) | El publicador no depende de la geometría; los consumidores salen temprano | `[Hecho]` sondas 03/04 |
| Selección múltiple | Se publica `selection.main.head` | `[Hecho]` `TE:35` |
| Composición IME | Publica `keyboard`; el preview solo se mueve si cambia la línea | `[Inferencia]` `[Decisión abierta]` |

---

## 15. Secciones del informe de preview que quedan obsoletas (pregunta 9)

| Sección de `PREV` | Qué cambia |
| --- | --- |
| §1.3 | «No hay hoy ningún dato de origen» sigue siendo el punto de partida; añadir que el origen ya tiene política (esta sección no se invalida, se amplía). |
| §4.5 | El ejemplo «un clic de puntero cambia la línea en el store, pero `usePreviewLine()` sigue devolviendo `null`» **es falso** con la nueva política. El argumento de aislamiento (hijo que devuelve `null`) sigue siendo válido y ahora incluye clics. |
| §4.6 | `cursorOrigin` cambia: aparece la anotación de fin de gesto y `select.pointer` sin anotación pasa a `null`. El tipo `CursorOrigin` se mantiene. |
| §5.2 | `selectPreviewLine` deja de filtrar por origen: devuelve la línea para `keyboard` y para `pointer`. |
| §5.3 | El pseudocódigo del selector (`origin === 'keyboard' ? line : null`) queda obsoleto; sustituir por §7.3 de este informe. |
| §6 (tabla de casos) | Filas obsoletas: «Clic de mouse → No recentra», «IME → posponer hasta compositionend» (pasa a decisión abierta verificable) y la fila de montaje (ahora centra si hay cursor). |
| §7.1 | «`selectPreviewLine`: cursor pointer → `null`» obsoleto. Añadir los casos de `cursorOrigin` con `pointerGestureEnd`. |
| §7.3 (métrica 6) | «Puntero: clic en otra línea; el `scrollTop` del preview no cambia» se invierte: ahora **debe** cambiar. |
| §10.2 | Resuelta: el preview sigue ambos orígenes, el puntero solo al terminar el gesto. |
| §10.6 | «Instantáneo vs suave»: la decisión de producto (suave solo en saltos grandes) exige trasladar el umbral de `TW` §8.4 al preview; §4.4 de `PREV` no contempla animación. |
| §10.7 | Confirmada (sin pausa tras scroll manual), con el añadido de cancelar la animación en curso. |
| §10.10 | Cerrada: no se publica cursor inicial; el resultado visual es idéntico porque el espaciador superior ya centra el primer bloque. |
| §10.11 | Invertida: al montar el preview con un cursor asentado, se centra (el origen ya no importa). |
| §4.4 (compensación) | Matiz: no compensar en la primera sincronización (ver §9). |
| §9.1 (riesgo de carrera) | Sin cambios para teclado; añadir que el puntero no toca `markdown`, así que no hay carrera en clics. |

---

## 16. Decisiones abiertas y preguntas

1. `[Decisión abierta]` **`Ln`/`Col` en vivo durante el arrastre.** Con esta política se congela hasta soltar. Alternativa: publicar también los carets no asentados con un campo extra (`settled: boolean`) y que el selector filtre. Cuesta un campo más y dos emisiones por gesto. Recomendación: aceptar la congelación y medir la queja real.
2. `[Decisión abierta]` **Publicar un cursor inicial en `onCreateEditor`.** Sin impacto visual en el preview, arregla el `Ln`/`Col` tardío en la barra. Cambio independiente.
3. `[Decisión abierta]` **`queueMicrotask` en lugar de `requestAnimationFrame`** para el fin de gesto: un frame menos de latencia, sin medir en navegador real. No cambiar sin harness.
4. `[Decisión abierta]` **`mousemove` con `buttons === 0` como fin de gesto**: cubre el `mouseup` perdido, añade un listener documental más. Recomendación: incluirlo (CodeMirror ya lo hace, `CMV:4791-4792`).
5. `[Decisión abierta]` **IME**: no suprimir en la primera versión; verificar con fcitx/ibus en Electron.
6. `[Decisión abierta]` **Touch real**: el `touchend` + `mouseup` sintético no se puede validar sin dispositivo.
7. `[Decisión abierta]` **Selector de revisión** (`cursorRevision`) para recentrar en todo evento de caret, incluidos clics en la misma línea tras scroll manual. Va contra «column-only no re-renderiza».
8. `[Decisión abierta]` **Clic derecho que mueve el caret** (Chrome): hoy no recentra; decidir si debe.
9. `[Decisión abierta]` **Doble/triple clic**: 2-3 publicaciones seguidas. Si se percibe oscilación, coalescer los fines de gesto a <250 ms; no se propone ahora.
10. `[Decisión abierta]` **Arrastre de la barra** de scroll del preview: entrega de eventos variable por navegador (`TW` §8.6); validar en Electron.
11. `[Decisión abierta]` **Gutter futuro**: un clic en números de línea no pasa por `contentDOM` y no armaría el gesto; hoy no hay gutter.

---

## Sources

### Código de la aplicación

- `src/renderer/src/editor/TextEditor/TextEditor.tsx:7-10` — `EditorCursor` sin origen; `:26-31` — props de `CodeMirror`, `extensions={articleEditorExtensions}`; `:33-38` — `onChange`/`onUpdate` inline y publicación sin filtrar.
- `src/renderer/src/editor/extensions.ts:4-8` — array constante; único consumidor (`TextEditor.tsx:4,31`).
- `src/renderer/src/state/status-store.ts:10` — `cursor` sin origen; `:31-34` — `publishStatus`; `:50-54` — `resetStatus`; `:56-70` — `subscribe`/`getSnapshot`/`useEditorStatus`.
- `src/renderer/src/state/use-editor-status.ts:11` — tipo de `publishCursor`; `:38-41` — `resetStatus` en cleanup; `:60-62` — implementación.
- `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:76,116-127` — `useEditorStatus`, `TextEditor`, `EditorPreviewLayout`.
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:66,98-109` — mismo cableado.
- `src/renderer/src/workspace/ArticlePane/ArticlePane.tsx:16` — `key={article.ID}` (remonta el editor por artículo).
- `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx:18-19,29,36-40` — modos, `hidden`, wrapper `overflow-y-auto`.
- `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx:75-85` — `{ markdown }`, sección y artículo.
- `src/renderer/src/shell/StatusBar/StatusBar.tsx:63-74` — `Ln`/`Col` solo si `cursor !== null`.
- `src/renderer/src/App.test.tsx:555-563` — `articleView()`; `:565-568` — `selectEditorText`; `:570-577` — `replaceEditorText`; `:635-643` — test de `Ln`/`Col`; `:684-747` — tests de preview.
- `src/renderer/src/test/setup.ts:4-29` — shim de `Range`; `:31-33` — `cleanup`.
- `jest.config.js:24-35` — proyecto renderer en jsdom.
- `AGENTS.md:60-63` — tests como contrato; sin tests de layout en jsdom.
- `package.json:31-32` — `@codemirror/state`, `@codemirror/view` como dependencias directas.

### Dependencias instaladas

- `node_modules/.pnpm/@uiw+react-codemirror@4.25.12_.../esm/useCodeMirror.js:64-99` — listeners de `onChange` y `onUpdate`; `:101-126` — creación única de la vista; `:147-154` — `StateEffect.reconfigure` con `onChange`/`onUpdate` en las dependencias.
- `node_modules/@codemirror/state/dist/index.js:2605-2634` — `applyTransaction` y `reconfigure`; `:1794-1805` — `reconfigure` de `StateField` (conserva el valor); `:2308-2318` — `isUserEvent`; `:2349` — `Transaction.userEvent` como anotación; `:2405-2406` — `spec.userEvent`.
- `node_modules/@codemirror/state/dist/index.d.ts:759-777` — `Annotation`; `:882-886` — `annotations`/`userEvent` en `TransactionSpec`; `:984-991` — `isUserEvent`; `:1021` — `Transaction.userEvent`.
- `node_modules/@codemirror/view/dist/index.js:1407-1414` — facet `viewPlugin` (dedupe por plugin); `:1440-1495` — `ViewPlugin.fromClass`/`extension` cacheado; `:4767-4783` — constructor de `MouseSelection` y listeners documentales; `:4785-4790` — `start()`; `:4791-4812` — `move()`; `:4814-4822` — `up()`; `:4854-4861` — `select()` con `userEvent: "select.pointer"`; `:4878-4895` — `isInPrimarySelection`; `:4979-4995` — observadores de touch; `:4996-5035` — `handlers.mousedown`; `:5046-5052` — `getClickType`; `:4335-4347` — `select.pointer` desde el observador; `:4443-4459` — `input.type[.compose]`; `:4757-4772` — orden de handlers; `:5285-5310` — composición; `:7889,7896` — `composing`/`compositionStarted`; `:8106-8125` — `updatePlugins` (preserva instancias por identidad de especificación); `:8290-8293` — los `updateListener` corren al final de `measure`.
- `node_modules/@codemirror/view/dist/index.d.ts:596-601` — `docChanged`/`selectionSet`; `:609-635` — `MouseSelectionStyle` sin callback de fin; `:770-783` — `composing`/`compositionStarted`; `:1124-1156` — `EditorView.scrollIntoView`; `:1195-1212` — `domEventHandlers`/`domEventObservers` en el contenido; `:1234-1243` — `scrollHandler`.
- `node_modules/.pnpm/@jest+environment-jsdom-abstract@30.5.2_.../node_modules/@jest/environment-jsdom-abstract/build/index.js:90` — `pretendToBeVisual: true`.

### Sondas propias (descartables, fuera del repo)

En `$COMMANDCODE_SCRATCHPAD/probe/`:

- `setup-jsdom.mjs` — arranque de jsdom con globals y shims de `Range`/`Element`.
- `01-reconfigure.mjs` — un `ViewPlugin` constante sobrevive a `StateEffect.reconfigure` (1 construcción, 0 destrucciones, flag intacto); una especificación por render se recrea (3 construcciones).
- `02-mouse-jsdom.mjs` — jsdom no mide layout (`clientHeight = 0`, `posAtCoords → 0`); el listener documental permanente corre antes que el `mouseup` de `MouseSelection`.
- `03-hook.mjs` — orden y conteo de publicaciones por gesto (clic, clic dentro de selección, arrastre, arrastre fuera, mismo caret, botón derecho, doble clic, reconfiguración a mitad de gesto, `mousedown` fuera del contenido).
- `04-user-event.mjs` — un `mousedown` sintético produce `select.pointer` y `selectionSet: true`; `tr.userEvent` no existe como getter.
- `node -e` de entorno — `ResizeObserver` y `matchMedia` ausentes; `requestAnimationFrame` presente; `clientHeight`/`scrollHeight` = 0.

### Documentación oficial

- CodeMirror, `Transaction.isUserEvent`: https://codemirror.net/docs/ref/#state.Transaction^isUserEvent
- CodeMirror, `Annotation`: https://codemirror.net/docs/ref/#state.Annotation
- CodeMirror, `ViewPlugin`: https://codemirror.net/docs/ref/#view.ViewPlugin
- CodeMirror, `EditorView.composing`: https://codemirror.net/docs/ref/#view.EditorView^composing
- CodeMirror, `EditorView.domEventHandlers`: https://codemirror.net/docs/ref/#view.EditorView^domEventHandlers
- CodeMirror, `EditorView.scrollHandler`: https://codemirror.net/docs/ref/#view.EditorView^scrollHandler
- CodeMirror, `EditorView.scrollIntoView`: https://codemirror.net/docs/ref/#view.EditorView^scrollIntoView
- React, `useSyncExternalStore`: https://react.dev/reference/react/useSyncExternalStore
- React, `useLayoutEffect`: https://react.dev/reference/react/useLayoutEffect
- MDN, `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- MDN, `Element.scrollTop`: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop

### Informes previos del proyecto

- `.scratch/preview-caret-sync/research.md` §4.4, §4.5, §4.6, §5.2, §5.3, §5.6, §6, §7.1, §7.3, §10.2, §10.6, §10.7, §10.10, §10.11.
- `.scratch/typewriter-scroll/research.md` §7.1, §7.3, §8.1, §8.2, §8.4, §8.5, §8.6, §8.7, §9.1, §9.2, §10.
- `.scratch/editor-linebreaks-scroll/spec.md` (precedente de verificación headless).
