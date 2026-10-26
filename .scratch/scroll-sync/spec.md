# Spec: scroll sync por línea de origen editor ↔ preview

**Status:** implemented
**Fecha:** 2026-10-26
**Feature:** scroll-sync

---

## Declaración del problema

El preview seguía al caret por línea de origen, así que un clic en un bloque movía el preview a otra zona. Al sustituirlo por un scroll proporcional, apareció un desfase: la proporción de píxeles no respeta las líneas del documento, sobre todo cuando el Markdown de origen y el render tienen alturas muy distintas.

El escritor quiere el scroll sync tradicional, pero alineado por línea: al hacer scroll en el editor, la primera línea visible del editor debe ser la primera línea visible del preview; al hacer scroll en el preview, el editor debe mostrar esa misma línea arriba. El caret deja de mandar sobre el preview.

Además, al llegar al máximo en el editor la última línea queda en el borde superior. El preview debe permitir lo mismo.

## Solución

- Se conservan los marcadores `<span data-source-line="N">` que ya genera `remarkSourceLineMarkers` y las anclas de bloque como respaldo.
- `buildPreviewLineIndex` lee una vez la posición de cada marcador y de cada bloque, en coordenadas de contenido del preview.
- `anchorForLine` resuelve la línea de origen a un top del preview: marcador exacto, marcador más cercano del bloque que la contiene, o marcador más cercano del documento.
- `entryAtTop` resuelve el top del preview a la última línea renderizada en o por encima del viewport (búsqueda binaria sobre los marcadores ordenados).
- `editorToPreview` usa la línea superior del editor como referencia e interpola dentro de ella: desde el padding superior hasta la primera línea, y desde el top de la línea de referencia hasta el top de la siguiente. Así el movimiento es continuo y en cada frontera el preview cae exacto sobre la misma línea.
- `previewToEditor` es la inversa: resuelve la última línea renderizada en o por encima del viewport e interpola dentro de su bloque del editor.
- `bindLineScrollSync` conecta ambos scrollers en las dos direcciones. El lado conducido se mueve con una animación de catch-up de 150 ms (`SmoothTarget`, ease-out cúbico) que se retargetea desde la posición viva, así que la rueda no produce saltos. `prefers-reduced-motion` escribe el destino de golpe.
- Los eventos del scroller animado se ignoran mientras la animación está activa, y el eco final se consume con el último valor escrito. `wheel`/`touchstart`/`pointerdown` cancelan la animación del lado que el usuario toma.
- El índice se reconstruye con `ResizeObserver` y cuando cambia el Markdown, nunca en cada evento `scroll`.

### Scroll inferior

- El editor conserva `padding-bottom = H − L` (`scroll-past-end.ts`).
- El preview mide el espaciador inferior con el **último marcador `data-source-line` renderizado**, el mismo ancla que usa el sync. Con `line-height` del último bloque el espaciador podía quedar corto y la última línea se quedaba abajo.
- `PreviewBottomSpace` avisa cuando cambia la altura y `MarkdownPreview` reaplica la alineación (`binding.realign()`), de modo que un editor ya en el máximo sube su última línea al top sin volver a scrollear.
- No hay espaciador superior: el preview empieza arriba como el editor.

### Caret

- El caret sigue publicándose al status store para la barra de estado (línea/columna).
- El preview ya no consume el caret: solo el scroll mueve el preview.
- Se eliminó `pointer-selection`; las selecciones de puntero se publican en vivo como origen `pointer`.

## Archivos

- `src/renderer/src/workspace/MarkdownPreview/source-line-sync.ts` y su test.
- `src/renderer/src/workspace/MarkdownPreview/preview-space.ts` y su test.
- `MarkdownPreview.tsx`: índice de líneas, sync y espaciador inferior.
- `EditorPreviewLayout.tsx`: prop `view`.
- `ArticleEditor.tsx`, `StoryEditor.tsx`, `PostEditor.tsx`: pasan `view`.
- `TextEditor/cursor-origin.ts`: publica también las selecciones de puntero.
- Eliminados: `PreviewCursorSync`, `preview-sync`, `preview-scroll-animator`, `smooth-scroll` y `pointer-selection`.

## Tests

- `source-line-sync.test.ts`: resolución línea→top, top→línea, índice DOM, binding bidireccional, animación por frames, retarget, cancelación y eco.
- `preview-space.test.ts`: altura del espaciador inferior.
- `MarkdownPreview.test.tsx`: render, marcadores, scroller y espaciador inferior.
- `App.cursor-origin.test.tsx`: publicación en vivo del caret del puntero.
- Suite completa, `pnpm typecheck` y `pnpm lint`.
