# Spec: columna de lectura más ancha (editor y preview)

**Status:** implemented
**Fecha:** 2026-10-24
**Feature:** wider-reading-column
**Implementación:** `main` — `9a44cb6` (+20 %), `5eadf27` (+30 %), `c021bbf` (−20 %)

---

## Problema

El espacio libre a los lados del texto («padding de centrado») seguía pareciendo excesivo comparado con Obsidian. En el código ese espacio no lo produce el padding CSS, sino la columna de lectura centrada con márgenes automáticos:

| Superficie | Columna original | Padding interno | Archivo |
|---|---|---|---|
| Editor | `maxWidth: 680px` con `marginRight: auto` y gutters con `marginLeft: auto` | `16px 20px` | `src/renderer/src/editor/theme.ts:9-18,25-32` |
| Preview | `max-w-[560px]` con `mx-auto` | `p-8` (32 px) | `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx:179` |

Con una ventana de 1400 px de ancho útil, el editor dejaba 360 px por lado y el preview 420 px. Ese es el hueco que molesta y el que se ha ido ajustando por incrementos.

## Solución

Cuatro pasos sobre la columna, sin tocar nunca el padding interno (el usuario pidió reducir el hueco de centrado, no el aire entre el texto y el borde de su columna).

| Superficie | Original | +20 % (`9a44cb6`) | +30 % (`5eadf27`) | −20 % (`c021bbf`) | **Neto** |
|---|---|---|---|---|---|
| Editor | `680px` | `816px` | `1061px` | **`849px`** | **+24,9 %** |
| Preview | `560px` | `672px` | `874px` | **`699px`** | **+24,8 %** |

Cálculo del último paso: 1061 × 0.8 = 848.8 → **849 px**; 874 × 0.8 = 699.2 → **699 px**. Redondeo a enteros para evitar subpíxeles. La proporción entre ambas superficies se conserva (849/699 = 1.215, igual que 816/672 = 1.214 y 1061/874 = 1.214).

Cambios concretos (estado final):

- `src/renderer/src/editor/theme.ts`: `maxWidth: '849px'`. Se mantienen `marginLeft: '0'` en `.cm-content` y `marginLeft: 'auto'` en `.cm-gutters`, que son los que hacen que los números de línea viajen con el texto.
- `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx`: `max-w-[699px]` en el `<article>`. `mx-auto` y `p-8` se quedan.
- El padding interno (`16px 20px` del editor y `p-8` del preview) **no cambia** en ninguno de los pasos.

Efecto esperado:

- El cambio solo se ve cuando el panel es más ancho que la columna (`max-width` solo recorta por encima de ese valor). En el split estrecho no cambia nada.
- A 1400 px de ancho útil: el hueco lateral del editor pasa de 360 px (original) a 292 px (+20 %), 169,5 px (+30 %) y **275,5 px** (−20 %); el del preview de 420 px a 364 px, 263 px y **350,5 px**. Neto: el hueco baja ~23 % en el editor y ~17 % en el preview.
- La relación exacta es `hueco = (ancho − columna) / 2`: cuanto más se acerca la columna al ancho de la ventana, más rápido se recorta el hueco.
- La medida de texto final es de ~96 columnas de mono a 16 px en el editor y ~80 en el preview. El pico intermedio (~120 y ~100) se descartó por ancho.

## Decisiones

- **Se toca `maxWidth`, no el padding.** El pedido es «menos hueco para centrar el texto»; el padding CSS es el aire interior y no es lo que se percibe como sobrante.
- **Cada porcentaje se aplica sobre el valor vigente, no sobre el original.** Por eso el neto no es la suma algebraica (+20 +30 −20) sino ×1.2 ×1.3 ×0.8 = ×1.248. Los cuatro valores quedan registrados para que el resultado sea auditable.
- **El −20 % se pidió después de ver el +30 %.** No reescribe los pasos anteriores: la spec documenta la secuencia real de ajustes.
- **Redondeo a enteros.** Los tres pasos parten de productos con decimales; se redondea al píxel y se conserva la proporción editor/preview (≈1.215) en cada uno.
- **El editor sigue más ancho que el preview.** La proporción se conserva en todos los pasos.
- **No se toca la tipografía.** Tamaño (16 px), altura de línea (2.0) y familia monoespaciada se quedan. Si la medida final sigue sin convencer, el siguiente ajuste debería decidir entre columna o tamaño de fuente, no seguir sumando porcentajes.
- **No es configurable por el usuario.** Sigue siendo un valor del tema, no una preferencia.
- **El modo Zen no necesita cambios.** Al ocultar los paneles laterales el workspace se ensancha y la columna aprovecha ese espacio con el mismo centrado automático.

## Testing

- No hay tests que fijen estos anchos (`grep` de `680`/`560`/`max-w` en `src/` no devuelve aserciones sobre ellos), así que la suite no cambia. Contrato respetado en los tres commits: `pnpm test` (590/590), `pnpm typecheck` y `pnpm lint` verdes.
- La verificación del efecto es de layout, no de jsdom (`AGENTS.md`: los bugs de layout/scroll no se prueban en Jest). Harness headless o app Electron:
  - con la ventana ancha (o en modo Zen), medir el ancho renderizado de `.cm-content` (849 px cuando el panel lo permite) y del `<article>` del preview (699 px);
  - en split con paneles estrechos, ambas superficies siguen ocupando el ancho disponible sin cambios;
  - el centrado del editor mantiene los números de línea pegados al texto;
  - typewriter, sincronización de caret y scroll del preview siguen funcionando (ninguno depende del ancho de la columna).

## Fuera de alcance

- Cambiar el padding interno del editor o del preview.
- Tamaño de fuente, altura de línea o familia tipográfica.
- Igualar a Obsidian en todo (tema, gutter, ancho configurable).
- Hacer configurable el ancho de la columna o persistirlo.
- El panel de la Story fuente (usa su propio ancho de panel, no una columna centrada).
