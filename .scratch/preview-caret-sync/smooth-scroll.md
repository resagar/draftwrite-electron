# Scroll suave en el preview: animación de saltos grandes del caret

**Estado:** investigación de solo lectura. No se modificó código de producción, tests, `package.json` ni el historial de git.
**Fecha:** 2026-10-25.
**Predecesores:** `.scratch/typewriter-scroll/research.md` (`TW`), `.scratch/preview-caret-sync/research.md` (`PREV`), `.scratch/preview-caret-sync/line-mapping.md` (`LM`), `.scratch/preview-caret-sync/pointer-sync.md` (`PS`).

## Convenciones de cita

- **[Hecho]**: verificado leyendo código del repo, tests, las fuentes de los paquetes instalados, una medición propia del proyecto ya registrada, o una especificación/MDN consultada.
- **[Inferencia]**: consecuencia razonable de los hechos, pero no una regla escrita en el repo ni en una especificación.
- **[Decisión abierta]**: ni el repo ni el producto la resuelven; requiere que la persona usuaria elija.
- **[Sin verificar aquí]**: el dato depende de un navegador real y esta sesión no puede ejecutar Chromium/Electron (intento previo con denegación de permiso). Se etiqueta explícitamente.

Rutas abreviadas: `MP` = `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx`, `EPL` = `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx`, `THEME` = `src/renderer/src/editor/theme.ts`, `SS` = `src/renderer/src/state/status-store.ts`, `UES` = `src/renderer/src/state/use-editor-status.ts`, `SETUP` = `src/renderer/src/test/setup.ts`.

---

## 1. Objetivo y decisiones ya fijadas

El preview del panel derecho sigue el caret de CodeMirror línea de fuente a línea de fuente (`LM` §6.4). Hasta ahora ese seguimiento era **instantáneo** (`PREV` §10.6, hoy obsoleto). El producto ha decidido que los **saltos grandes** se animen ~150 ms con ease-out cúbico y que los **ajustes pequeños o casi-en-destino** sigan siendo instantáneos, con cancelación por gesto del usuario y retarget si llega un caret nuevo a mitad de vuelo.

Decisiones **cerradas** (no se reabren en este informe):

| # | Decisión |
|---|---|
| D1 | El preview sigue el caret por **línea de fuente**; la geometría del objetivo la fija `LM` §6.4. |
| D2 | Scroll libre **finito**: el último bloque puede llegar arriba y debajo queda espacio en blanco finito (`PREV` §4.4). |
| D3 | Suavizado **solo** para saltos que superan un umbral; ajustes pequeños, instantáneos. |
| D4 | ~**150 ms**, ease-out cúbico, cancelable y retargetable. |
| D5 | `prefers-reduced-motion: reduce` ⇒ instantáneo. |
| D6 | El editor ya usa el mismo contrato (`TW` §8.3–8.4): bucle `rAF` que escribe `scrollTop`, `DURATION = 150`, `easeOutCubic`, umbral `max(defaultLineHeight, clientHeight/6)`, cancelar en rueda/PageDown/resize/oculto, retarget en petición nueva. |
| D7 | Siempre activo, sin toggle. Sin dependencias nuevas. |

---

## 2. Resumen ejecutivo y veredicto

- **[Hecho]** El bucle del editor ya está medido en Chromium 150 headless y funciona: salto `0 → 2136` en 10 frames / 150 ms; ajuste de 24 px instantáneo con 0 frames; retarget de `2136 → 0` a los ~60 ms que cancela y termina en `0`; `prefers-reduced-motion` con 0 frames; rueda que cancela en `1531`; editor oculto que no anima ni lanza (`TW` §8.7, tabla completa). El bucle del preview es **el mismo** (misma duración, misma curva, mismo estado, distinto `scroller` y distinto cálculo de destino), así que esos números son la evidencia base de este informe.
- **[Hecho]** `scrollTop = x` **no** es instantáneo si el scroller tiene `scroll-behavior: smooth`: en el mismo harness, `scrollTop = 500` quedaba en `0` de inmediato y en `304` a los 120 ms, y el centrado nativo hacia `2376` estaba en `44` a los 100 ms y en `1775` a los 350 ms (`TW` §8.4). Por eso el bucle propio exige `scroll-behavior: auto`.
- **[Hecho]** El preview no tiene hoy animación alguna: `MP` no lee el store, y el boceto de `PREV` §5.6 escribe `container.scrollTop = centerScrollTop(...)` de una vez (`PREV:862-867`). El scroller real es hoy el `div` con `overflow-y-auto` de `EPL:37`.
- **[Hecho]** El preview no tiene `defaultLineHeight`: esa cifra es propiedad de `EditorView` en CodeMirror (`TW` §8.4). En el preview la unidad tipográfica hay que derivarla del CSS resuelto o del rect medido; el bloque `p` del preview mide `21.125 px` de `line-height` (`--text-sm: 13px` × `--leading-relaxed: 1.625`, `global.css:21`, `node_modules/tailwindcss/theme.css:394`) y el `h1` mide `32 px` (`text-2xl`), así que no hay una sola cifra.
- **[Inferencia]** El umbral del preview debe ser **el mismo** `max(lineUnit, H/6)`, con `lineUnit` acotado a **una fila** (no al span completo del bloque). Con la tipografía actual, `H/6` domina para todo `H > ~127 px`, de modo que el comportamiento por defecto queda gobernado por una sola regla estable y el término `lineUnit` solo protege paneles muy bajos.
- **[Inferencia]** El trozo que hay que compartir con el editor es pequeño y tiene un límite claro: `DURATION`, `easeOutCubic`, la fórmula del umbral, la lectura de `prefers-reduced-motion` y el **bucle** (cancelar/retargetear/epsilon). Lo que **no** se comparte: cálculo de destino, medición, espaciadores, listeners y ciclo de vida (facet de CodeMirror vs efecto de React).
- **[Inferencia]** Todo el mecanismo es testeable en Jest sin layout si el bucle recibe `now`, `requestFrame`, `cancelFrame`, `reducedMotion` y un `Scroller` de tres campos. `SETUP:4-29` confirma que jsdom no mide: no hay tests de geometría posibles ahí.

**Veredicto:** viable y de bajo riesgo, con un matiz importante: **la animación no introduce ninguna técnica nueva** respecto del editor; el único trabajo de diseño real es (a) el umbral sin `defaultLineHeight`, (b) el guard de la barra de scroll, y (c) decidir la frontera del módulo compartido. **[Inferencia]** Recomendación: un módulo puro `src/renderer/src/scroll/smooth-scroll.ts` con las cinco primitivas y un `createScrollAnimator(scroller, scheduler)`, consumido por el preview ahora y por el editor cuando se implemente `TW` (o en el mismo cambio, si ambos aterrizan juntos).

---

## 3. Evidencia

### 3.1 Por qué un bucle `rAF` propio y no `scrollTo({ behavior: 'smooth' })` ni `scroll-behavior: smooth`

| Vía | Qué controla | Por qué no sirve |
|---|---|---|
| `scrollTo({ behavior: 'smooth' })` / `scroll-behavior: smooth` | Nada del producto: duración y curva las elige el user agent (MDN, `scroll-behavior`: «the user agent defines the time»; los scrolls iniciados por el usuario no se ven afectados, `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior`) | (1) No hay 150 ms garantizados: medido en Chromium 150 a ~500 ms y sin terminar a los 350 ms (`TW` §8.4). (2) Anima **todas** las asignaciones programáticas del elemento, incluidos los ajustes que el producto quiere instantáneos; habría que alternar `scroll-behavior` por llamada, con recálculo de estilo añadido. (3) No hay umbral: no se puede decir «si el delta es pequeño, salta». (4) No hay cancelación real: solo se puede pedir otro scroll, y el estado «¿está animando?» no es legible, así que el guard de la barra de scroll no tendría contra qué comparar. (5) No respeta `prefers-reduced-motion` por sí solo: hace falta un `@media` extra. (6) No hay callback de finalización. |
| Bucle `rAF` que escribe `scrollTop` | Duración, curva, umbral, cancelación, retarget, reduced motion y finalización | Es la vía del editor, ya medida (`TW` §8.7). Escribe `scrollTop` directamente, que «equivale a `scroll()` con `behavior: auto`» (MDN, `Element.scrollTop`: `https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop`) |

- **[Hecho]** El bucle del editor solo escribe `scrollTop` por frame; no despacha transacciones ni mide por frame (`TW` §8.4, «la lectura de `scrollHeight` y `lineBlockAt` ocurre una vez por petición»).
- **[Hecho]** El harness confirmó el detalle que hay que copiar: **el primer frame se clampea a `t = 0`** porque el timestamp de `requestAnimationFrame` puede ser anterior al `performance.now()` de la petición (`TW` §8.7, fila «Salto grande programático»). MDN documenta que el callback recibe el timestamp *del inicio del frame*, no el de la programación (`https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame`), de modo que `now - start` puede ser negativo. `Math.max(0, ...)` no es cosmético: sin él, `easeOutCubic` de un `t` negativo da un valor negativo grande y el primer frame saltaría hacia atrás.

### 3.2 El scroller del preview y su geometría

- **[Hecho]** Hoy el scroller es el `div` exterior: `<div className="min-h-0 min-w-0 flex-1 overflow-y-auto"><MarkdownPreview … /></div>` (`EPL:37-39`); el `article` interno es `mx-auto max-w-[560px] p-8 select-text` (`MP:78`).
- **[Hecho]** `PREV` §4.7 (`PREV:432`) ya propone que `EPL` deje de envolver y que el propio `MarkdownPreview` sea el scroller. Este informe **asume** ese cambio: el animador recibe un único `HTMLElement` que scrollea, sea la `section` del preview o el `div` de `EPL`.
- **[Hecho]** `scrollHeight` y `clientHeight` son enteros redondeados y `scrollTop` puede ser subpíxel (`PREV` §3.2, `PREV:183`); de ahí que todas las comparaciones de aceptación usen ±1–2 px.
- **[Hecho]** La fórmula de destino no cambia: `blockTop = rect.top - (containerRect.top + container.clientTop) + container.scrollTop`, `target = top + height/2 - H/2`, `clamp(0, scrollHeight - clientHeight)` (`LM:567-579`, `PREV:352-356`). La animación consume **un `scrollTop` ya calculado**; no participa en la medición (`LM` §6.5, `LM:597`).

### 3.3 CSS que el animador necesita del scroller

| Propiedad | Valor | Motivo | Cita |
|---|---|---|---|
| `scroll-behavior` | `auto` | El bucle escribe `scrollTop` cada frame; con `smooth`, cada escritura arrancaría además un suavizado nativo y la animación se sentiría con retraso | `TW` §8.8 (`TW:1011`); MDN `scroll-behavior` |
| `overflow-anchor` | `none` | Los espaciadores cambian de alto en cada sincronización; el scroll anchoring ajustaría `scrollTop` por su cuenta y **emitiría eventos `scroll`** que el guard de la §5 leería como «arrastre de barra» | `PREV` §3.3 (`PREV:196`); MDN `overflow-anchor` |
| `overscroll-behavior` | `contain` | Evita que el scroll del preview encadene al `Workspace` al llegar al final (el scroll libre finito hace que el final sea alcanzable a menudo) | `PREV` §3.3 (`PREV:198`); MDN `overscroll-behavior` |
| `scrollbar-gutter` | `stable` (opcional) | Que la aparición de la barra no cambie el ancho disponible ni provoque un reflow que dispare otra medición | `PREV` §3.3 (`PREV:199`) |

- **[Hecho]** La app no declara `scroll-behavior` en ninguna hoja (`src/renderer/src/styles/base.css` y `global.css` no lo mencionan; la única coincidencia de `prefers-reduced-motion` es `base.css:33-41`, que solo toca `animation-duration` y `transition-duration`). **[Inferencia]** Aun así hay que **fijarlo explícitamente a `auto`**, porque un `smooth` accidental puede llegar por un tema, una hoja futura o un `scroll-behavior` global.
- **[Inferencia]** `base.css:33-41` **no** cubre este caso: la animación no es una `animation` ni una `transition` de CSS, así que el `@media` existente no la desactiva. La única forma de respetar la preferencia es leer `matchMedia` en JS (§6).

---

## 4. Umbral en el preview: comparación y fórmula

En el editor el umbral es `max(defaultLineHeight, clientHeight / 6)` con `defaultLineHeight` = 24 px y `H = 430` → `71.67 px` (`TW` §8.4, `TW:815-818`). En el preview no existe esa propiedad. Candidatos:

| Candidato | Valor con la app actual | Problemas | Veredicto |
|---|---|---|---|
| **(a)** `getComputedStyle(article).lineHeight` | `normal` (el `article` no declara `line-height`; `MP:78` solo pone `p-8`) | `normal` no es un número; además el `article` **no tiene nodos de texto propios**: todo el texto vive en hijos con su propio `line-height` (`p` = 21.125 px, `h1` = 32 px, `code` = 21.125 px). Medir el contenedor miente en ambos sentidos | Solo como *fallback*, nunca como fuente primaria |
| **(b)** altura medida del objetivo | `p` de una fila: 21.125 px; `p` de 8 filas: 169 px; `h1`: 32 px | Si se usa el **span completo**, un párrafo de 8 filas da un umbral de 169 px y se animarían ajustes de 5 líneas; si se usa **una fila**, es exactamente la «unidad tipográfica» que el editor representa con `defaultLineHeight` | **Primaria, pero acotada a una fila** |
| **(c)** solo `clientHeight / 6` | `H = 700` → 116.7 px; `H = 430` → 71.7 px | No depende de la tipografía: en un panel muy bajo (`H = 100`) daría 16.7 px, menos que una línea del propio contenido | **Sí, como término dominante** |
| **(d)** constante de tipografía | `13 × 1.625 = 21.125 px` (o 22 redondeado) | Ignora los encabezados (`h1` 32 px, `h2`/`h3` 13 px con `leading-normal`), `pre` (11.5 px) y el zoom del usuario | Solo como último recurso |

### 4.1 Fórmula recomendada

```text
lineUnit  = rowHeightOfTarget                      // una fila visual, no el span del bloque
            ?? readLineUnit(targetBlockElement)    // CSS resuelto del bloque que contiene el objetivo
            ?? readLineUnit(article)
            ?? FALLBACK_LINE_UNIT                  // 22 px

threshold = max(lineUnit, clientHeight / 6)
```

Reglas de implementación:

1. **`rowHeightOfTarget`**: `LM` §6.4 ya devuelve las filas del objetivo (`Range.getClientRects()` agrupadas; `LM:548-553`). Si el objetivo es una línea con una sola fila, `rowHeight = rect.height`; si tiene `n` filas, `rect.height / n`; si el objetivo es un **bloque** (`kind: 'block'`, imagen/`hr`/`pre` sin marcadores), usar la altura de **una** fila del bloque si se conoce, y si no caer al paso 2. **Nunca** usar la altura total de un bloque como `lineUnit`.
2. **`readLineUnit(el)`**: hay que parsear, porque `getComputedStyle().lineHeight` no es uniforme:
   - `'normal'` → `NaN` → no sirve; MDN dice que «depende del user agent» y que los navegadores de escritorio usan ~1.2 (`https://developer.mozilla.org/en-US/docs/Web/CSS/line-height`), así que multiplicar por 1.2 sería una imitación, no una medida.
   - Número sin unidad (`1.625`): el valor computado sigue siendo el número; hay que multiplicarlo por el `font-size` computado.
   - Longitud en `px`: se usa tal cual. Un porcentaje se computa a longitud, así que llega ya en `px` (`https://developer.mozilla.org/en-US/docs/Web/CSS/line-height#values`).
   - Heurística de desambiguación: `parsed < 4` ⇒ es un factor, multiplicar por `fontSize`; en otro caso es una longitud. Un `line-height` en `px` nunca baja de 4 px.
   - **[Sin verificar aquí]** El valor exacto que devuelve Chromium para `line-height: normal` y para el número sin unidad no se pudo comprobar en esta sesión (no hay Chromium). Verificación de 1 línea en la app: `console.log(getComputedStyle(document.querySelector('article p')).lineHeight)`. Si devuelve `'21.125px'`, el parser se simplifica a `parseFloat`; si devuelve `'1.625'`, hace falta el factor. El parser propuesto cubre ambos casos, así que **[Inferencia]** no bloquea la implementación.
3. **`FALLBACK_LINE_UNIT = 22`**: `13 px × 1.625 = 21.125`, redondeado. Coincide con el `p` real del preview (`MP:24` con `text-sm leading-relaxed`) y con `--text-sm: 13px` / `--leading-relaxed: 1.625` (`global.css:21-22`, `node_modules/tailwindcss/theme.css:394`).

### 4.2 Por qué `H / 6` domina en la práctica

- **[Inferencia]** El término `lineUnit` solo gana cuando `lineUnit > H/6`, es decir `H < 6 × 22 = 132 px`. Un panel de preview por debajo de 132 px de alto es un caso degenerado (ventana mínima); ahí el mínimo evita un umbral sub-línea, exactamente la justificación que `TW` §8.4 da para el `max(L, H/6)` del editor (`TW:816`).
- **[Inferencia]** A la inversa, con un panel alto (`H = 900`, escritorio 4K) el umbral es 150 px ≈ 7 líneas de `p`. Es una banda generosa pero coherente: por debajo de ella el objetivo ya está prácticamente en el centro, y animar 40 px se percibe como un temblor, no como un desplazamiento. **[Decisión abierta]** Si en Electron se ve «demasiado pegajoso», la alternativa es `H/8` o `min(H/6, 96)`; se recomienda **no** cambiarlo hasta medirlo, para mantener la paridad con el editor (D6).
- **[Hecho]** El umbral se evalúa sobre `abs(target - scrollTop)`, no sobre la distancia del caret al centro (`TW` §8.4, `TW:818`); con padding redondeado o bloques altos el delta es la medida robusta. En el preview la razón es aún más fuerte: el objetivo se clampa a `[0, max]` y en los extremos la distancia al centro no significa nada.

### 4.3 Casos en los que el umbral no debe decidir nada

| Situación | Regla |
|---|---|
| `target` ya alcanzado (`|delta| < 1`) | No escribir y no animar |
| `clientHeight === 0` (panel oculto, jsdom) | Cancelar con `'hidden'` y salir; no medir |
| Sincronización provocada por **layout** (resize, cambio de modo, montaje, carga de una imagen) | **Siempre instantáneo**: el caret no se ha movido, lo que cambió es el viewport; animar ahí se siente como un desplazamiento gratuito **[Inferencia]** |
| Sincronización provocada por **caret** (tecla, comando, undo) | Umbral normal |

Por eso la petición lleva un `reason: 'caret' | 'layout'` y solo `'caret'` puede animar. Es la única diferencia funcional con el editor, donde toda petición nace de un gesto.

---

## 5. Máquina de estados: `idle` / `animating`

```text
                 request(target, 'caret') && |delta| > threshold && !reducedMotion
   ┌────────┐ ────────────────────────────────────────────────────────────────► ┌───────────┐
   │  idle  │                                                                    │ animating │
   └────────┘ ◄─────────────────────────────────────────────────────────────── └───────────┘
        ▲        t >= 1 (completion)  ·  cancel(reason)  ·  retarget con |delta| <= threshold
        │
        └── request(...) con |delta| <= threshold, reason === 'layout', reducedMotion u oculto
```

- **[Hecho]** El editor mantiene **un solo** `requestAnimationFrame` y un **token de ejecución** (`run`); cada petición invalida el token anterior, así que un frame viejo que llegue tarde no escribe (`TW` §8.4, `TW:829-830,882-911`). El preview copia esa forma: no hay cola ni `Promise`, y el retraso máximo es ~150 ms independientemente de la velocidad de escritura (`TW:832`).

### 5.1 Eventos que CANCELAN

| Evento | Por qué | Dónde se engancha | Estado |
|---|---|---|---|
| `wheel` | El writer manda; si el bucle siguiera escribiría contra su voluntad | `container`, `{ passive: true }` | **[Hecho]** harness del editor: cancela en `1531` y permanece (`TW` §8.7) |
| `touchstart` (y `touchmove`) | Equivalente táctil de la rueda | `container`, `{ passive: true }` | **[Inferencia]** mismo razonamiento |
| `pointerdown` / `mousedown` sobre el scroller | Inicio de clic o de arrastre de la barra; también un clic de selección de texto | `container` | **[Inferencia]** en Chromium el `mousedown` de la barra nativa se entrega al elemento dueño del scroller; `TW` §8.6 lo deja como **[Decisión abierta]** (`TW:970`) |
| `scroll` con desviación > epsilon | Red de seguridad para la barra cuando el `pointerdown` no llega | `container` | Ver §5.3 |
| `resize` de la ventana | Cambia la geometría del destino a mitad de vuelo | `window` | **[Inferencia]** |
| `ResizeObserver` sobre contenedor o `article` | Cambia `H`, el alto del artículo o los espaciadores | observer existente (`PREV:904-921`) | **[Inferencia]** |
| Cambio de `viewMode` / desmontaje del preview | El scroller desaparece (`EPL:18-19,29`: en `edit` el preview se desmonta) | cleanup del efecto | **[Hecho]** `PREV` §4.7 |
| Cambio de `markdown` (los espaciadores se reescriben) | Escribir los espaciadores durante el vuelo invalida el destino y `scrollHeight` | la propia sincronización: **cancelar antes de escribir los espaciadores** | **[Inferencia]** |
| `prefers-reduced-motion` pasa a `reduce` | Coherencia con D5 | sin listener; se aplica en la siguiente petición | **[Decisión abierta]** §6.3 |
| `PageUp`/`PageDown`/`Home`/`End` | Desplazamiento por teclado | solo si el scroller es enfocable | **[Decisión abierta]**: hoy el scroller del preview no es un `tabindex`, así que no se engancha nada; el siguiente caret recentra |

### 5.2 Eventos que RETARGETEAN

| Evento | Comportamiento |
|---|---|
| Nueva línea de caret con el efecto re-ejecutándose (tecla, flecha, undo, comando) | Cancelar el frame actual, recalcular el destino desde el `scrollTop` **actual** y, si el nuevo `|delta|` supera el umbral, empezar un vuelo nuevo; si no, escribir el destino y quedar en `idle` |
| Ráfaga de flechas (`ArrowDown` mantenido) | Cada petición cancela la anterior; el resultado es un único vuelo que persigue el objetivo, sin acumulación (`TW` §8.4, `TW:832`) |
| Vuelta al mismo destino dentro del vuelo | `|delta|` tiende a 0 ⇒ se vuelve instantáneo y termina |
| `markdown` cambia a mitad de vuelo | Se cancela (§5.1) y la sincronización decide de nuevo; **no** es un retarget con delta, porque el destino se recalcula desde cero |

- **[Inferencia]** Retargetear desde el `scrollTop` actual (no desde el destino anterior) es lo que evita el «latigazo»: la curva se reinicia con un delta menor, así que la velocidad percibida no se duplica.

### 5.3 Guard del arrastre de la barra de scroll

- **[Hecho]** `PS` §8 (`PS:477-479`) y `TW` §8.6 (`TW:970`) dejan este caso como decisión abierta: la entrega de eventos de puntero de la barra varía por navegador, y no es verificable en jsdom.
- **[Inferencia]** El guard es la única defensa que no depende de esa entrega: mientras `animating`, cada evento `scroll` compara el `scrollTop` real con el último valor **escrito por nosotros**.

```ts
// Epsilon, in CSS pixels: absorbs sub-pixel scrollTop, Chromium's 1/64 px
// layout quantisation and the integer rounding of scrollHeight/clientHeight.
const SCROLL_EPSILON = 2

function isForeignScroll(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) > SCROLL_EPSILON
}
```

Estado necesario en el animador:

| Campo | Tipo | Uso |
|---|---|---|
| `run` | `number` | Token de ejecución; invalida frames viejos |
| `frame` | `number \| null` | Handle del `rAF` pendiente |
| `lastWrittenTop` | `number` | Último `scrollTop` escrito por nosotros (por frame o de una vez) |
| `animating` | `boolean` (`run` válido) | Puerta del guard: fuera del vuelo, el `scroll` del usuario no nos importa |

Reglas anti-falso-positivo:

1. **Solo comparar mientras `animating`.** Fuera de un vuelo no escribimos nada, así que cualquier `scroll` es del usuario y no hay nada que cancelar.
2. **Comparar contra el valor escrito, no contra el predicho.** Nuestra escritura es síncrona: leer `scrollTop` justo después devuelve el valor escrito salvo cuantización (< 0.02 px), muy por debajo del epsilon.
3. **`overflow-anchor: none`** (§3.3): sin él, el scroll anchoring puede mover `scrollTop` por su cuenta y **emitir `scroll`** que se leería como arrastre.
4. **Clamp vivo en el guard**: si el valor real coincide con `clamp(lastWrittenTop, 0, scrollHeight - clientHeight)` dentro del epsilon, es nuestro (o un reajuste del máximo por la aparición de la barra), no del usuario. Sin esta comprobación, un `scrollHeight` que encoge a mitad de vuelo produce una cancelación falsa.
5. **`scroll` es coalescido**: puede llegar un único evento con el último valor de varios frames. Como siempre comparamos contra el último escrito, el coalescing no cambia la decisión.

- **[Inferencia]** El epsilon es 2 px por dos razones: `scrollHeight`/`clientHeight` son enteros redondeados (`PREV:183`) y la tolerancia de aceptación del proyecto ya es ±2 px (`PREV` §7.3, `PREV:1102`). Un epsilon de 1 px arriesga falsos positivos en el clamp; uno de 8 px dejaría pasar arrastres lentos de la barra sin cancelar.

---

## 6. Orden dentro del `useLayoutEffect` de `PreviewCursorSync`

### 6.1 Secuencia

```text
1. refs present?                      -> no: return (nothing to measure)
2. H = container.clientHeight         -> 0: animator.cancel('hidden'), return
3. animator.cancel('resync')          -> state only, no DOM write
4. read previousTopHeight             -> 1 forced layout read (pre-write)
5. write topSpacer.style.height       -> DOM write
6. write bottomSpacer.style.height    -> DOM write
7. read scrollHeight, target rect,
        container rect                -> 1 forced synchronous layout (post-write)
8. if line === null: compensate scrollTop (only if previousTopHeight > 0), return
9. target = clamp(centerScrollTop(...), 0, scrollHeight - clientHeight)
10. animator.request(target, { reason })  -> writes scrollTop or schedules rAF
```

- **[Hecho]** React ejecuta `useLayoutEffect` después de las mutaciones del DOM y antes de que el navegador repinte (`https://react.dev/reference/react/useLayoutEffect`), que es justo lo que hace falta para que el usuario no vea el estado intermedio.
- **[Hecho]** Escribir `topSpacer.style.height` directamente evita un `setState` y un render extra (`PREV` §3.5, `PREV:211`).
- **[Inferencia]** El paso 4 es la única lectura **antes** de escribir, y existe porque `previousTopHeight` no se puede reconstruir después. Alternativa sin lectura previa: guardar `lastTopHeight` en un `ref` del componente. Es preferible: elimina una lectura de layout y un posible error si el espaciador lo modifica otro código. **[Decisión abierta]** menor (ref vs lectura).

### 6.2 Coste del reflow síncrono

- **[Hecho]** Intercalar escrituras y lecturas de layout fuerza al navegador a recalcular el layout de forma síncrona (`getBoundingClientRect` y compañía lo documentan como «layout thrashing» cuando se alternan; MDN, `Element.getBoundingClientRect`: `https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect`).
- **[Inferencia]** En esta secuencia hay **como mucho dos** pasadas: una lectura previa (paso 4) y una tras las dos escrituras (paso 7). La clave es agrupar: **ambas** alturas se escriben antes de cualquier lectura. El error a evitar es escribir el espaciador superior, medir, escribir el inferior, medir: eso duplica el coste.
- **[Inferencia]** El coste por sincronización es proporcional al subárbol del artículo (no a la app): cambiar la altura de un espaciador solo invalida el layout del scroller, y la lectura del rect del objetivo reutiliza ese mismo cálculo. Con un artículo de ~100 bloques es una pasada de milisegundos de un solo dígito; **[Sin verificar aquí]** sin perfilado no se puede dar una cifra.
- **[Inferencia]** No hay reflow por frame: el bucle de animación **solo escribe `scrollTop`** y no lee nada (`TW` §8.4, `TW:918`). Escribir `scrollTop` sí provoca un repintado por frame, que es inherente a cualquier scroll animado.
- **[Inferencia]** `ResizeObserver` sobre contenedor y artículo puede disparar una sincronización por cambio de tamaño; como la sincronización es idempotente y los espaciadores no se observan, no hay bucle de notificaciones (`PREV` §3.7, `PREV:223`).

### 6.3 Garantías de React 19 que sostienen el orden

| Garantía | Consecuencia aquí | Fuente |
|---|---|---|
| Los efectos de layout corren tras las mutaciones del commit y antes del pintado | Los espaciadores ya están en el DOM cuando se mide el objetivo | `https://react.dev/reference/react/useLayoutEffect` |
| Un `setState` dentro de un efecto de layout se procesa **antes** del pintado | No se usa: la sincronización no hace `setState`; si algún día lo hiciera, añadiría un segundo commit | React docs |
| Los efectos se ejecutan de hijo a padre | `PreviewCursorSync` (hijo de `MarkdownPreview`) mide con el artículo ya montado | React docs |
| `StrictMode` duplica setup/cleanup en desarrollo | La sincronización debe ser idempotente: mismas alturas, mismo `scrollTop`, listeners sin acumularse | `PREV` §3.8 (`PREV:229-231`), `src/renderer/src/main.tsx:25-29` vía `PREV:229` |
| React **no** garantiza que el layout esté calculado | Cada medición fuerza el cálculo; no se puede asumir «el navegador ya midió» | `[Inferencia]` |

- **[Inferencia]** React 19 no aporta nada nuevo para este caso respecto de 18: sigue sin existir un «efecto post-layout garantizado» más fuerte que `useLayoutEffect`. Lo que sí aporta es el batching automático, de modo que un `line` nuevo y un `markdown` nuevo del mismo tick llegan en **un solo commit** y por tanto en **una sola** sincronización; sin batching habría dos mediciones.
- **[Inferencia]** Consecuencia visible del orden: si el `scrollTop` viejo corresponde a otro punto del documento, el primer frame pintado tras un salto grande muestra **la posición antigua** y a partir de ahí la animación avanza. Es el comportamiento esperado de un scroll suave; si se quisiera pintar ya el destino no habría animación.

---

## 7. Frontera del módulo compartido con el editor

### 7.1 Comparación de las tres opciones

| Opción | Qué comparte | Ventajas | Riesgos | Veredicto |
|---|---|---|---|---|
| **(a)** Módulo de primitivas (`DURATION`, `easeOutCubic`, `scrollThreshold`, `prefersReducedMotion`) y **bucle duplicado** | Constantes y fórmulas | Duplicación mínima; cada consumidor conserva su bucle | El bucle es justo la parte con más semántica (cancelar, retarget, epsilon, clamp); dos copias divergen y el bug solo aparece en movimiento | Insuficiente |
| **(b)** Duplicar ~40 líneas | Nada | Cero acoplamiento; cada uno evoluciona libre | Dos contratos que el producto quiere idénticos (D4, D6); un cambio de duración o de epsilon hay que hacerlo dos veces y acordarse | Rechazada |
| **(c)** `ScrollAnimator` genérico reutilizado por el `scrollHandler` de CodeMirror y por el preview | Constantes, fórmulas **y bucle** | Un único lugar donde viven las invariantes que el producto exige idénticas; testeable de una vez | Riesgo de abstracción prematura si la clase crece (herencia, eventos, medición) | **Recomendada, como factoría mínima** |

- **[Hecho]** `AGENTS.md:71` («no introducir abstracciones sin necesidad») y `AGENTS.md:69-73` (cambios pequeños, sin ampliar el alcance). La necesidad aquí está justificada por **dos consumidores reales en el mismo producto**, no por uno hipotético.
- **[Inferencia]** La opción (c) se degrada a abstracción prematura si el módulo conoce React, CodeMirror o el DOM del preview. La forma segura es una **factoría con dependencias inyectadas** (`createScrollAnimator(scroller, scheduler)`), sin clases heredables, sin `extends`, sin tocar el DOM más allá de `scroller.scrollTop`.

### 7.2 Qué se comparte

`src/renderer/src/scroll/smooth-scroll.ts` — módulo nuevo, sin dependencias:

| Export | Firma | Por qué se comparte |
|---|---|---|
| `DURATION` | `150` | D4/D6: la duración es una decisión de producto, no de cada panel |
| `easeOutCubic` | `(t: number) => number` | La curva define la sensación; dos curvas distintas se notarían |
| `SCROLL_EPSILON` | `2` | Mismo criterio de redondeo en ambos scrollers |
| `isForeignScroll` | `(actual, expected) => boolean` | Guard idéntico (§5.3) |
| `scrollThreshold` | `(viewportHeight: number, lineUnit: number) => number` | `max(lineUnit, H/6)`, la misma fórmula de §4.1 |
| `prefersReducedMotion` | `(win?: Window \| null) => boolean` | D5 y D7 se aplican igual en los dos paneles |
| `createScrollAnimator` | `(scroller: Scroller, scheduler?: FrameScheduler) => ScrollAnimator` | El bucle con cancelación/retarget/completado |

Las firmas de `Scroller`, `FrameScheduler`, `ScrollRequest` y `ScrollAnimator` (nueve líneas en total, todas en inglés) están en el pseudocódigo de §8. `Scroller` son **tres campos** —`scrollTop`, `clientHeight`, `scrollHeight`—, y ahí está la clave de la testeabilidad: el animador nunca toca el DOM del preview, solo ese contrato.

### 7.3 Qué **no** se comparte

| Pieza | Se queda en | Motivo |
|---|---|---|
| Cálculo del destino | `ScrollAnimator.request` lo recibe; el editor lo hace con `documentPadding.top + lineBlockAt(head).top + block.height/2 - H/2` (`TW` §8.4); el preview con `rect` + `Range` (`LM:567-579`) | Dominios de medición distintos; unificarlos obligaría a un adaptador por consumidor |
| Clamp `[0, scrollHeight - clientHeight]` | Cada consumidor, en su función pura | En el editor el máximo ya está medido con `scrollHeight` del scroller; en el preview depende de los espaciadores recién escritos |
| Medición (`getBoundingClientRect`, `Range`, `lineBlockAt`) | Cada consumidor | Es lo que más difiere y lo que no se puede probar en Jest |
| Espaciadores (`computeTopSpacer`, `computeBottomSpacer`, `overflow-anchor`) | `preview-sync.ts` (`PREV` §5.5) | No existen en el editor: allí el padding es del `ViewPlugin` (`TW` §4.2) |
| Listeners y ciclo de vida (`wheel`, `pointerdown`, `resize`, `ResizeObserver`, cleanup) | Cada consumidor | El editor vive en un `ViewPlugin` con `destroy()`; el preview en un `useLayoutEffect`/`useEffect` de React |
| `EditorView.scrollHandler` y el `transactionExtender` | `src/renderer/src/editor/` | API de CodeMirror; el preview no tiene transacciones |
| Umbral **por panel** | `scrollThreshold` recibe `lineUnit`; cada consumidor lo calcula (`defaultLineHeight` en el editor, §4.1 en el preview) | La unidad tipográfica es la única entrada legítimamente diferente |

- **[Inferencia]** Este límite se puede resumir en una frase: **se comparte «cómo se mueve», no «a dónde ni cuándo»**. La factoría no importa React, ni CodeMirror, ni `preview-sync`, y por eso se puede probar entera en Jest.
- **[Decisión abierta]** Si el editor adopta el módulo **en el mismo cambio** que el preview o en su propia tarea. Recomendación: escribirlo como módulo compartido desde el primer día y hacer que **solo el preview** lo consuma ahora; el editor lo adopta al implementar `TW` §8.3–8.4. Adoptarlo en ambos a la vez amplía el alcance y `AGENTS.md:73` pide aprobación para eso. Riesgo de la etapa intermedia: dos implementaciones conviviendo; se mitiga porque la del editor aún **no existe** en el repo (hoy `MP` y el editor no tienen animación alguna).

---

## 8. Pseudocódigo del animador (inglés)

```ts
// src/renderer/src/scroll/smooth-scroll.ts

export const DURATION = 150
export const SCROLL_EPSILON = 2
const MIN_DELTA = 1

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function scrollThreshold(viewportHeight: number, lineUnit: number): number {
  return Math.max(lineUnit, viewportHeight / 6)
}

export function prefersReducedMotion(win: Window | null = defaultWindow()): boolean {
  // jsdom has no matchMedia; a missing API must never throw.
  if (!win || typeof win.matchMedia !== 'function') return false
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createScrollAnimator(
  scroller: Scroller,
  scheduler: FrameScheduler = browserScheduler()
): ScrollAnimator {
  let run = 0
  let frame: number | null = null
  let lastWritten = scroller.scrollTop

  function write(value: number): void {
    lastWritten = value
    scroller.scrollTop = value
  }

  function stop(): void {
    if (frame !== null) {
      scheduler.cancelFrame(frame)
      frame = null
    }
    run++
  }

  function request({ target, lineUnit, reason }: ScrollRequest): 'instant' | 'animated' | 'ignored' {
    const viewportHeight = scroller.clientHeight
    if (viewportHeight <= 0) {
      stop()
      return 'ignored'
    }

    // Cancel before deciding: a retarget must never leave the old frame alive.
    stop()

    // Read the live position, not `lastWritten`: after a manual gesture the
    // last value we wrote is stale, and the delta must start from reality.
    const from = scroller.scrollTop
    const delta = target - from
    if (Math.abs(delta) < MIN_DELTA) return 'ignored'

    const threshold = scrollThreshold(viewportHeight, lineUnit)
    if (reason === 'layout' || scheduler.reducedMotion() || Math.abs(delta) <= threshold) {
      write(target)
      return 'instant'
    }

    const start = scheduler.now()
    const currentRun = run

    const step = (time: number): void => {
      if (currentRun !== run) return          // stale frame, never write
      if (scroller.clientHeight <= 0) { stop(); return }

      // The rAF timestamp is the frame start and can precede `start`.
      const t = Math.min(1, Math.max(0, (time - start) / DURATION))
      write(from + delta * easeOutCubic(t))

      if (t < 1) frame = scheduler.requestFrame(step)
      else frame = null
    }

    frame = scheduler.requestFrame(step)
    return 'animated'
  }

  function cancel(_reason: string): void {
    stop()
  }

  function onScroll(): void {
    if (frame === null) return                 // not animating: nothing to guard
    const actual = scroller.scrollTop
    const clamped = Math.min(
      Math.max(lastWritten, 0),
      Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    )
    // Ours, or the max scroll shrank under us (scrollbar appearing).
    if (!isForeignScroll(actual, lastWritten) || !isForeignScroll(actual, clamped)) return
    stop()
  }

  return {
    request,
    cancel,
    isAnimating: () => frame !== null,
    lastWrittenTop: () => lastWritten,
    onScroll
  }
}
```

Notas del pseudocódigo:

- **[Inferencia]** `from = scroller.scrollTop` se lee **después** de `stop()`, para arrancar desde la posición real en un retarget (no desde `lastWritten`, que puede estar un frame por detrás o desfasado tras un gesto manual).
- **[Inferencia]** `onScroll` forma parte del animador (no del consumidor) porque necesita `lastWritten` y `frame`; así el guard es el mismo en los dos paneles y se puede testear con un `scroller` falso.
- **[Inferencia]** El campo `reducedMotion()` inyectado en `FrameScheduler` evita leer `matchMedia` en Jest y permite testear D5 sin jsdom.
- **[Inferencia]** `request` devuelve `'instant' | 'animated' | 'ignored'` para que los tests y el consumidor distingan «no había nada que hacer» de «se ha movido». Es la única concesión a la observabilidad.

---

## 9. Tabla comparativa de enfoques (resumen)

| Enfoque | Duración controlada | Umbral | Retarget | Cancelación | Reduced motion | Complejidad | Veredicto |
|---|---|---|---|---|---|---|---|
| `scroll-behavior: smooth` | No (UA) | No | Parcial (nuevo scroll) | No legible | Vía `@media` extra | Mínima | Rechazado |
| `scrollTo({ behavior: 'smooth' })` | No (UA) | No | Parcial | No legible | Manual | Mínima | Rechazado |
| `transition`/`transform` | Sí | Sí | Sí | Sí | Sí | Baja, pero rompe el scroller real | Rechazado (`TW` §8.4, opción D) |
| `rAF` propio, duplicado en cada panel | Sí | Sí | Sí | Sí | Sí | Media, duplicada | Rechazado por deriva |
| `rAF` propio en módulo compartido (factoría) | Sí | Sí | Sí | Sí | Sí | Media, una sola vez | **Recomendado** |
| Librería externa de scroll animado | Sí | Configurable | Sí | Sí | Manual | Dependencia nueva | Rechazado por D7 |

- **[Hecho]** `TW` §8.4 ya descartó las opciones equivalentes en el editor con los mismos argumentos y con la medición de `scroll-behavior: smooth` (`TW:801-808`). **[Inferencia]** El preview no aporta ningún matiz nuevo: su scroller es un `div` normal, no un `EditorView`, de modo que todas las vías genéricas siguen siendo las mismas.

---

## 10. Tabla de edge cases

| Caso | Comportamiento esperado | Estado |
|---|---|---|
| Salto grande por teclado (p. ej. 30 líneas) | Anima 150 ms; termina exactamente en el destino | **[Inferencia]** desde `TW` §8.7 (10 frames, final exacto) |
| Ajuste pequeño (delta ≤ umbral) | Instantáneo, 0 frames | **[Hecho]** `TW` §8.7 (`1176 → 1200`, delta 24) |
| Destino ya alcanzado | No escribe, no anima | **[Inferencia]** regla `MIN_DELTA` |
| Retarget a mitad de vuelo (flecha atrás) | Cancela, recalcula desde el `scrollTop` actual, termina en el nuevo destino | **[Hecho]** `TW` §8.7 (`2136 → 0` a los 60 ms) |
| Rueda durante el vuelo | Cancela y deja el valor actual; el scroll nativo sigue | **[Hecho]** `TW` §8.7 (cancelado en `1531`) |
| Arrastre de la barra durante el vuelo | Cancela por `pointerdown` y, si no llega, por desviación de `scrollTop` | **[Inferencia]** + `[Decisión abierta]` de entrega de eventos (`TW:970`, `PS:479`) |
| `pointerdown` dentro del texto del preview | Cancela (el usuario está leyendo/seleccionando) | **[Inferencia]** |
| Resize durante el vuelo | Cancela; la siguiente sincronización es `reason: 'layout'` ⇒ instantánea | **[Inferencia]** |
| Cambio de modo (split → preview) | El preview se monta y centra sin animar | **[Inferencia]** + `PS` §9 (`PS:489-492`) |
| Desmontaje a mitad de vuelo | Cleanup: `cancel` + listeners fuera; ningún frame escribe | **[Inferencia]** |
| Espaciadores reescritos a mitad de vuelo | Cancelación previa obligatoria (§5.1) | **[Inferencia]** |
| `clientHeight === 0` (panel oculto, jsdom) | `cancel('hidden')`, sin frames, sin excepción | **[Hecho]** `TW` §8.7 (editor oculto) |
| `prefers-reduced-motion: reduce` | Instantáneo, 0 frames | **[Hecho]** `TW` §8.7 (emulación) |
| La preferencia cambia **durante** el vuelo | El vuelo actual termina (≤150 ms); el siguiente salto es instantáneo | **[Decisión abierta]** §11 |
| Bloque más alto que el viewport (`p` de 40 líneas) | Se centra el bloque y el caret puede quedar fuera; el umbral no cambia porque `lineUnit` es de una fila | **[Hecho]** límite conocido (`PREV:358`, `LM:573-575`) |
| Imagen que carga y cambia la altura | `ResizeObserver` resincroniza (instantáneo) y el objetivo se recoloca | **[Inferencia]** |
| Documento corto (todo cabe en el viewport) | `maxScroll` pequeño; la mayoría de peticiones son `ignored`; los espaciadores siguen creando recorrido si `T > 0` | **[Inferencia]** |
| Borrar hasta dejar el destino sin marcador | `findTarget` cae al bloque; si no hay ninguno, no se mueve | **[Inferencia]** (`LM:512-528`) |
| Ráfaga de `ArrowDown` mantenido | Un solo vuelo persecutorio; sin cola | **[Inferencia]** `TW:832` |
| Zoom / `devicePixelRatio` ≠ 1 | `scrollTop` sigue en px CSS; el epsilon de 2 px cubre la cuantización | **[Sin verificar aquí]** |
| Barra de scroll que aparece a mitad de vuelo | El clamp del guard evita la cancelación falsa (§5.3) | **[Inferencia]** |

---

## 11. Plan de pruebas

### 11.1 Jest: diseño puro (sin layout)

El módulo de §8 se prueba entero en jsdom porque **no mide nada**: recibe un `Scroller` de tres campos y un `FrameScheduler` falso. Nada de `getBoundingClientRect`, nada de `ResizeObserver`.

```ts
// Manual clock: no timers, no jsdom layout, fully deterministic.
function fakeScheduler() {
  let time = 0
  let next = 1
  const queue = new Map<number, (time: number) => void>()
  return {
    now: () => time,
    requestFrame: (cb: (time: number) => void) => (queue.set(next, cb), next++),
    cancelFrame: (handle: number) => void queue.delete(handle),
    reducedMotion: () => false,
    pending: () => queue.size,
    advance(ms: number) {
      time += ms
      const due = [...queue.values()]
      queue.clear()
      for (const cb of due) cb(time)
    }
  }
}

function fakeScroller(scrollTop = 0, clientHeight = 430, scrollHeight = 3009) {
  return { scrollTop, clientHeight, scrollHeight }
}
```

Casos concretos:

| # | Test | Aserción |
|---|---|---|
| T1 | `easeOutCubic(0 / 0.5 / 1)` | `0`, `0.875`, `1`; monótona en 0…1 |
| T2 | `scrollThreshold(700, 21.125)` | `116.66…` (domina `H/6`) |
| T3 | `scrollThreshold(100, 21.125)` | `21.125` (domina `lineUnit`, panel bajo) |
| T4 | `scrollThreshold(0, 22)` | `22`: nunca 0, nunca negativo |
| T5 | delta 24 ≤ umbral | `request` devuelve `'instant'`, `pending() === 0`, `scrollTop === target` |
| T6 | delta 1200 > umbral | `'animated'`, `pending() === 1`, `scrollTop` aún en el origen |
| T7 | `advance(0)` en el primer frame | `scrollTop` sin cambios (clamp `t = 0`) |
| T8 | `advance(150)` tras el primer frame | `scrollTop === target` exacto (no ±1) y `pending() === 0` |
| T9 | Avanzar en pasos de 16 ms hasta 160 ms | 10–11 frames, monótono creciente, sin sobrepasar el destino |
| T10 | Retarget a mitad: `advance(60)`, `request(target2)` | `cancelFrame` llamado, un solo frame pendiente, termina en `target2` |
| T11 | Frame viejo tras retarget | Invocar el callback cancelado no escribe (`run` invalida) |
| T12 | `cancel('wheel')` a mitad | `pending() === 0`, `scrollTop` se queda donde estaba, `isAnimating() === false` |
| T13 | `reducedMotion: () => true` | `'instant'`, `pending() === 0`, `scrollTop === target` |
| T14 | `reason: 'layout'` con delta grande | `'instant'` (el resize no anima) |
| T15 | `clientHeight === 0` | `'ignored'`, sin escritura, sin frames |
| T16 | `request` con el destino actual | `'ignored'`, sin escritura |
| T17 | `prefersReducedMotion` sin `matchMedia` | `false`, no lanza (jsdom) |
| T18 | `isForeignScroll(100, 101)` / `(100, 105)` | `false` / `true` (epsilon 2) |
| T19 | `onScroll` con el valor que escribimos | No cancela |
| T20 | `onScroll` con desviación de 40 px mientras anima | Cancela, `pending() === 0` |
| T21 | `onScroll` fuera del vuelo | No cancela nada (no hay vuelo) |
| T22 | `onScroll` con `scrollHeight` encogido (clamp) | No cancela |

- **[Inferencia]** T1–T22 cubren easing, umbral, retarget, cancelación, reduced motion y guard **sin una sola medición de layout**, que es exactamente lo que `AGENTS.md:63` permite en Jest.
- **[Hecho]** `SETUP:4-29` solo parchea `Range.getClientRects`/`getBoundingClientRect` para que CodeMirror no explote; no hay `ResizeObserver` ni `matchMedia` en jsdom (`PREV` §3.7, `PREV:225`). Por eso el módulo recibe `reducedMotion` inyectado y **no** se prueba el componente con geometría.
- **[Hecho]** Lo que sí se puede probar en jsdom del cableado: que `PreviewCursorSync` no lanza con `clientHeight === 0` y que no registra listeners dos veces bajo `StrictMode` (contando `addEventListener` con espías). **[Inferencia]** Son pruebas de cableado, no de layout; encajan en `AGENTS.md:62-63`.
- **[Inferencia]** Un test de integración del umbral con la tipografía real (`getComputedStyle` de un `p`) **no** debe ir a Jest: jsdom devuelve `''` para `lineHeight`. Va al harness.

### 11.2 Headless / Electron (no en Jest)

Reutilizar el patrón del precedente del proyecto (`.scratch/editor-linebreaks-scroll/spec.md:43-44,59-69`, citado en `PREV` §7.3). Con un artículo largo con título, párrafos, lista, blockquote, código, tabla, imagen, `hr` y footnotes:

1. **Salto de N líneas centra:** cursor al principio y luego 40 líneas abajo con `PageDown`/`Ctrl+End`; el centro del objetivo queda a ±2 px del centro del scroller **al terminar**, y durante el vuelo el `scrollTop` pasa por valores intermedios (≥ 3 muestras distintas).
2. **Delta pequeño instantáneo:** dos líneas consecutivas del mismo párrafo; el `scrollTop` cambia en el mismo frame, sin intermedios (o no cambia).
3. **Rueda cancela:** provocar un salto grande y hacer `WheelEvent` a los ~60 ms; el `scrollTop` deja de moverse hacia el destino y permanece donde estaba.
4. **Arrastre de barra cancela:** iniciar un salto grande y arrastrar la barra con `Input.dispatchMouseEvent` (press/move/release sobre el canal de la barra); verificar cancelación por `pointerdown` **o** por desviación de `scrollTop`; registrar cuál de las dos se disparó.
5. **Resize recalcula:** con el cursor centrado, cambiar el ancho/alto del panel; el objetivo vuelve al centro **sin** animación (`reason: 'layout'`).
6. **Último bloque llega arriba:** llevar el cursor al último bloque y hacer scroll manual hasta el máximo; su `top` queda a ±2 px de 0 y el hueco inferior es `H - hLast` (`PREV` §7.3, punto 4).
7. **Espacio finito:** `scrollHeight - clientHeight` deja de crecer al hacer scroll repetido (no hay overscroll acumulativo).
8. **Workspace quieto:** `Workspace.scrollTop === 0` durante y después de la animación.
9. **Reduced motion:** con `Emulation.setEmulatedMedia` en `prefers-reduced-motion: reduce`, el salto grande no produce frames intermedios.
10. **Sin warnings:** ningún aviso de bucle de `ResizeObserver` ni de `useLayoutEffect` en consola.
11. **Umbral real:** imprimir `getComputedStyle(p).lineHeight`, `fontSize` y `H` del panel para fijar el valor de `lineUnit` y cerrar la incógnita de §4.1 (punto 2).

Tolerancia: ±2 px (`PREV:1102`), salvo el destino final del animador, que debe ser **exacto** (el bucle escribe el valor calculado, `TW` §8.7).

### 11.3 Criterios de aceptación

1. Un salto de ≥ 6 líneas de `p` se anima ~150 ms con desaceleración visible; un ajuste de ≤ 1 línea es instantáneo.
2. `DURATION`, `easeOutCubic`, el umbral y el epsilon **no** aparecen duplicados en el repo (una sola definición, en `src/renderer/src/scroll/smooth-scroll.ts`).
3. La rueda y el arrastre de barra cancelan; no queda ningún frame vivo tras el gesto (`isAnimating() === false`).
4. `prefers-reduced-motion: reduce` no programa ningún `requestAnimationFrame`.
5. El scroll libre finito de `PREV` §4.4 sigue cumpliéndose con la animación activa.
6. El desmontaje del preview (cambio a modo `edit`) no deja listeners ni frames.
7. `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde, sin cambios en tests existentes (`AGENTS.md:61`).

---

## 12. Qué queda obsoleto y qué sigue válido en `PREV`

| Sección de `PREV` | Estado | Motivo |
|---|---|---|
| §10.6 «Instantáneo vs suave» (`PREV:1158`) | **Obsoleto** | El producto decide animación de 150 ms para saltos grandes; la decisión se reemplaza por la §4 y §5 de este informe |
| §5.6 `syncPreview`, escritura directa `container.scrollTop = centerScrollTop(...)` (`PREV:862-867`) | **Obsoleto** | Sustituido por `animator.request(target, { lineUnit, reason })` |
| §5.5 `centerScrollTop` (`PREV:764-772`) | **Válido** | Sigue calculando el destino; solo cambia quién lo consume |
| §10.1 «Centrado estricto vs banda de tolerancia» (`PREV:1153`) | **Resuelto** | El umbral `max(lineUnit, H/6)` es la banda; por debajo, instantáneo |
| §3.3 `scroll-behavior: auto` (`PREV:197`) | **Válido, con motivo nuevo** | Sigue siendo obligatorio, pero ya no «para no animar» sino «para que nuestras escrituras sean instantáneas y el bucle mande» |
| §3.1 «`scrollIntoView` no es la herramienta» (`PREV:169-177`) | **Válido, reforzado** | Además de los contenedores anidados, `scrollIntoView` no se puede cancelar ni retargetear |
| §3.2 coordenadas y ±1–2 px (`PREV:179-191`) | **Válido** | Base del epsilon y de las tolerancias |
| §3.5 `useLayoutEffect` (`PREV:207-211`) | **Válido** | Es el sitio del orden de §6 |
| §3.7–3.8 `ResizeObserver` y `StrictMode` (`PREV:219-231`) | **Válido, ampliado** | Ahora también definen la cancelación en resize y la idempotencia del animador |
| §4.4 espaciadores y compensación (`PREV:297-368`) | **Válido** | La animación no toca los espaciadores (`LM` §6.5) |
| §4.5 aislamiento de re-renders (`PREV:370-392`) | **Válido** | El animador vive dentro del mismo efecto; no añade suscripciones |
| §7.1–7.3 plan de pruebas (`PREV:1037-1102`) | **Parcialmente obsoleto** | Se mantiene todo lo geométrico; los puntos 1–2 y 8 cambian de «instantáneo» a «animado/instantáneo según umbral» y se añaden los casos 3–4 de §11.2 |
| §8 tabla de alternativas (`PREV:1120-1133`) | **Válido** | No aparece la animación como alternativa; se añade en §9 de este informe |
| §9 riesgos (`PREV:1136-1147`) | **Válido** | El riesgo 6 pasa de «mitigar el smooth global» a «prohibirlo activamente» |
| `PS` §8 (`PS:473-479`) | **Válido, cerrado en parte** | La cancelación por gesto manual se concreta en §5; el arrastre de barra deja de ser decisión abierta «sin mecanismo»: hay un guard con epsilon |

- **[Hecho]** `LM` §6.5 (`LM:597`) ya anticipaba este informe: «la animación consume un `scrollTop` objetivo y no le importa si vino de una línea o de un bloque; durante la animación el efecto puede recalcular el objetivo (retarget) sin reiniciar los espaciadores». **[Inferencia]** Eso confirma que el reparto de responsabilidades de §7.3 no exige cambios en `LM`.

---

## 13. Decisiones abiertas

1. **[Decisión abierta]** **Fracción del umbral.** `H/6` por paridad con el editor, frente a `H/8` o `min(H/6, 96)` si en paneles altos se percibe pegajoso. Recomendación: `H/6` hasta medir en Electron.
2. **[Decisión abierta]** **Adopción del módulo por el editor**: ahora o en la tarea de `TW` §8.3–8.4. Recomendación: ahora solo el preview; el editor cuando se implemente.
3. **[Decisión abierta]** **Listener de `change` en `matchMedia`.** Recomendación: **no** añadirlo; se lee `matches` en cada petición y una ventana de 150 ms no justifica ciclo de vida extra. Si se añadiera, el cleanup va en el mismo `useEffect` que los listeners de gesto.
4. **[Decisión abierta]** **Animar también los recentrados por layout** (resize, montaje, carga de imagen). Recomendación: no; instantáneo (§4.3).
5. **[Decisión abierta]** **Scroller enfocable por teclado** (`tabindex="0"` en la `section` del preview). Cambia el foco del writer y la accesibilidad; fuera de alcance aquí.
6. **[Decisión abierta]** **`previousTopHeight` por `ref` o por lectura de layout** (§6.1, paso 4). Recomendación: `ref`.
7. **[Decisión abierta]** **Valor real de `lineHeight` computado en Chromium** para `normal` y para el número sin unidad (§4.1). Se cierra con la sonda de §11.2, punto 11.
8. **[Decisión abierta]** **`scrollbar-gutter: stable`** en el scroller. Mejora el reflow pero cambia el ancho útil; medir antes.
9. **[Decisión abierta]** **Cancelar en `pointerdown` sobre el texto** del preview (no solo sobre la barra). Recomendación: sí, es intención de lectura; confirmar que no molesta al seleccionar texto durante una animación.

---

## 14. Fuentes

### Código del repo (rutas y líneas exactas)

- `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx:24` (`p` con `text-sm leading-relaxed`), `:54` (`pre` con `text-xs leading-relaxed`), `:78` (`article` con `p-8`, sin `line-height` propio).
- `src/renderer/src/workspace/EditorPreviewLayout/EditorPreviewLayout.tsx:18-19,29` (modos), `:37-39` (wrapper con `overflow-y-auto`).
- `src/renderer/src/editor/theme.ts:8-13` (`line-height: 1.7` en `.cm-scroller`, `padding: 16px 20px` en `.cm-content`).
- `src/renderer/src/global.css:18-33` (`--text-sm: 13px`, `--font-sans`, `--font-mono`).
- `src/renderer/src/styles/base.css:33-41` (`@media (prefers-reduced-motion: reduce)` que solo afecta a `animation`/`transition`).
- `src/renderer/src/test/setup.ts:4-29` (shims de `Range`; jsdom sin layout).
- `src/renderer/src/state/status-store.ts`, `src/renderer/src/state/use-editor-status.ts`, `src/renderer/src/editor/TextEditor/TextEditor.tsx` (sin `scrollTop`, sin `rAF`, sin `matchMedia`: el renderer no tiene hoy ninguna animación de scroll).
- `node_modules/tailwindcss/theme.css:391-394` (`--leading-tight/snug/normal/relaxed`).
- `AGENTS.md:60-63` (tests como contrato; nada de tests de layout en jsdom), `:69-73` (cambios pequeños, sin abstracciones ni alcance extra), `:78` (código en inglés).

### Informes previos del proyecto

- `.scratch/typewriter-scroll/research.md` §8.3 (`TW:768-795`), §8.4 (`TW:797-918`), §8.6 (`TW:952-978`), §8.7 (`TW:980-1004`), §8.8 (`TW:1006-1014`), §10 (`TW:1206-1234`).
- `.scratch/preview-caret-sync/research.md` §3.2-3.5 (`PREV:179-231`), §4.4 (`PREV:297-368`), §5.5-5.6 (`PREV:745-924`), §7.1-7.3 (`PREV:1037-1102`), §9 (`PREV:1136-1147`), §10.6 (`PREV:1158`).
- `.scratch/preview-caret-sync/line-mapping.md` §6.4-6.6 (`LM:500-608`).
- `.scratch/preview-caret-sync/pointer-sync.md` §8 (`PS:473-479`), §9 (`PS:483-492`), §10 (`PS:498-508`).

### Documentación oficial

- MDN, `scroll-behavior`: `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior` (duración/easing definidos por el user agent; los scrolls del usuario no se ven afectados). `Element.scrollTop`: `https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop` (asignar equivale a `scroll()` con `behavior: auto`; valor subpíxel). `Element.scrollTo`: `https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo`.
- MDN, `Window.requestAnimationFrame`: `https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame` (el callback recibe el timestamp del inicio del frame).
- MDN, `Element.clientHeight`, `Element.scrollHeight`, `Element.getBoundingClientRect` (enteros redondeados / coordenadas de viewport): `https://developer.mozilla.org/en-US/docs/Web/API/Element/clientHeight`, `…/scrollHeight`, `…/getBoundingClientRect`.
- MDN, `overflow-anchor`, `overscroll-behavior`, `line-height`, `prefers-reduced-motion`: `https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor`, `…/overscroll-behavior`, `…/line-height` (`normal` depende del user agent, ~1.2 en escritorio; el número sin unidad se hereda como factor), `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion`.
- MDN, `Window.matchMedia` y `MediaQueryList.change`: `https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia`, `https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change`.
- React, `useLayoutEffect` y `useSyncExternalStore`: `https://react.dev/reference/react/useLayoutEffect`, `https://react.dev/reference/react/useSyncExternalStore`.

### Medición propia

No se ejecutó ninguna medición nueva en esta sesión: el entorno no permite lanzar Chromium/Electron (intento previo con denegación de permiso) y la instrucción de la tarea es basarse en `TW` §8.7. Todas las cifras de tiempo, frames y cancelación citadas son las del harness de `TW` §8.7 (Chromium 150 headless, `H = 430`, `L = 24`, 100 líneas, `scrollHeight = 3009`, `maxScroll = 2579`), que ejecuta **el mismo bucle** que aquí se propone. Lo que **no** está medido y se etiqueta como `[Sin verificar aquí]`: el valor computado de `line-height` en la app real (§4.1), el coste del reflow (§6.2) y la entrega de `pointerdown` de la barra de scroll en Electron (§5.1, §11.2 punto 4).
