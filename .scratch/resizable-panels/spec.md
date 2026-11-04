# Spec: paneles redimensionables con el ratón

**Status:** implemented
**Fecha:** 2026-10-24
**Feature:** resizable-panels
**Implementación:** `main` (`c35d6e3`)

---

## Problema

Los anchos de la sidebar, la lista, el panel de la Story fuente y el split editor/preview estaban fijados en clases (`w-[220px]`, `w-[280px]`, `w-[360px]` y dos `flex-1`). El escritor no podía adaptar el espacio a su monitor, a la longitud del texto o a la lectura en columnas.

## Solución

Un primitivo compartido en `src/renderer/src/ui/Resizer/`:

- `panel-size.ts`: matemática pura (clamp, delta→tamaño, delta→ratio, límites del split, persistencia y teclas).
- `use-resizer.ts`: `usePanelResizer` (ancho en píxeles) y `useSplitResizer` (ratio con mínimos por panel).
- `Resizer.tsx`: separador vertical accesible.

Los paneles existentes consumen el primitivo:

| Panel | Modo | Persistencia |
|---|---|---|
| Sidebar | Ancho en px; solo redimensionable en `lg` y cuando está expandida | `draftwrite.panel.sidebar` |
| Lista | Ancho en px | `draftwrite.panel.list` |
| Story fuente | Ancho en px; oculto al colapsar | `draftwrite.panel.story` |
| Editor / Preview | Ratio 0.2–0.8 con mínimo de 160 px por panel | `draftwrite.panel.editorSplit` |

## Decisiones

- **Pointer Events + `setPointerCapture`**, no solo `mousemove`: el gesto sobrevive a salir del separador y cubre touch/pen.
- **Ratio para el split y píxeles para los laterales**: el ratio mantiene la proporción al cambiar el tamaño de la ventana; los laterales conservan un ancho estable.
- **Límites**: sidebar 160–320, lista 200–420, Story 240–560. El split se oculta si el contenedor no puede sostener dos paneles de 160 px.
- **Sidebar con breakpoint**: por debajo de `lg` sigue siendo el rail de 56 px; el separador se oculta. El ancho expandido se aplica con una variable CSS.
- **Persistencia**: `localStorage` con el prefijo `draftwrite.panel.`. No hay IPC ni cambios de dominio.
- **Accesibilidad**: `role="separator"`, `aria-orientation="vertical"`, `aria-valuemin/max/now/text`, `tabIndex=0`, flechas izquierda/derecha, Home/End y doble clic para volver al valor por defecto.
- **Arrastre**: `user-select: none` en `body` mientras dura y restauración al soltar o desmontar.
- **CodeMirror y preview**: el redimensionado no necesita cambios en el typewriter ni en la sincronización; CodeMirror mide al cambiar el ancho y el preview ya re-mide con su `ResizeObserver`.

## Testing

- Tests puros de la matemática, límites, persistencia y teclas.
- Tests del hook de panel y del hook del split: ARIA, flechas, doble clic, arrastre con puntero y bloqueo de selección.
- Integración de `ListColumn` y `EditorPreviewLayout` (separador presente solo en split, estilo de ancho y persistencia).
- `App.test.tsx` sigue siendo contrato.
- Verificación manual/headless en la app: arrastre y teclado en los cuatro paneles, y persistencia tras recargar.

## Fuera de alcance

- Persistencia por Story o Article: los anchos son globales.
- Colapsar paneles arrastrando más allá del mínimo.
- Redimensionado vertical de la toolbar o del StatusBar.
- Sincronizar la anchura entre ventanas.
