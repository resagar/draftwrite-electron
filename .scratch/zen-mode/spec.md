# Spec: modo Zen (ocultar sidebar y lista, con animación)

**Status:** approved
**Fecha:** 2026-10-24
**Feature:** zen-mode
**Investigación:** [research.md](./research.md)

---

## Problema

Hoy no existe ninguna forma de ocultar la sidebar ni la lista de stories/articles:

- `sidebarCollapsed` colapsa la sidebar a un rail de 56 px (`w-14 min-w-14`), no la oculta.
- `storyPaneExpanded` colapsa el panel de la Story fuente a un rail de 40 px (no es la lista).
- `ListColumn` no tiene estado de ocultado en absoluto.

La app de referencia (Inkdrop) resuelve esto con **Distraction Free Mode**: oculta sidebar y note list, dejando sólo el editor, y se alterna con `Cmd/Ctrl+Shift+D` [research.md §Qué hace la app de referencia]. El usuario pide además que la transición sea **suave** (los paneles se cierran animados, no de golpe).

## Solución

Cuatro piezas pequeñas, sin tocar dominio ni IPC.

### 1. Estado

En `src/renderer/src/state/workspace-context.tsx`:

- `WorkspaceState` gana `zenMode: boolean` (`initialWorkspaceState` → `false`).
- `WorkspaceAction` gana `| { type: 'zen/toggle' }`.
- `workspaceReducer` responde con `{ ...state, zenMode: !state.zenMode }`.

`zenMode` **no** modifica `sidebarCollapsed` ni `storyPaneExpanded`: al salir del modo vuelve exactamente el layout anterior (rail o expandido, story pane abierto o cerrado).

### 2. Render animado (sin desmontar)

Los paneles **siguen montados**; el modo se expresa animando su ancho a 0 y recortando el contenido:

- `Sidebar`: `style` añade `{ width: 0, minWidth: 0 }` cuando `zenMode`; el resto del tiempo conserva su ancho actual (rail de 56 px o `--sidebar-width`).
- `ListColumn`: recibe `collapsed: boolean`; `style` pasa de `size` a `{ width: 0, minWidth: 0 }`. `StoryList` y `ArticleList` le pasan el `zenMode` que ya pueden leer de `useWorkspace()` (cada uno construye 4 `ListColumn`, uno por estado de carga/error/vacío/lista).
- Ambos paneles: `overflow-hidden` para recortar en lugar de reflowar el texto mientras se estrechan, y una capa interior con el ancho de reposo (`size`) para que el contenido se deslice fuera de la vista en vez de comprimirse. En la sidebar esa capa usa `lg:w-[var(--sidebar-width)]`; por debajo de `lg` el rail se cierra con su contenido natural.
- El borde derecho del panel se retira cuando el ancho es 0 (`border-r-0`) para que no quede una línea de 1 px.
- El `Resizer` no se renderiza en modo Zen (dejaría un separador enfocable dentro de un panel invisible).

Transición, alineada con la que ya usa `StoryPane` para colapsar la Story fuente:

```text
transition-[width,min-width] duration-200 ease-out motion-reduce:transition-none
```

La clase se aplica siempre **salvo mientras se arrastra el `Resizer`** (`!isResizing`): así el arrastre sigue siendo 1:1 con el puntero y el resto de cambios de ancho se animan.

`AppShell` y `App.tsx` no cambian: siguen pasando `sidebar`, `list` y `workspace` siempre montados.

### 3. Accesibilidad del panel cerrado

Con ancho 0 los paneles seguirían en el árbol de accesibilidad y en el orden de tabulación. Mientras `zenMode`:

```tsx
aria-hidden={zenMode || undefined}
inert={zenMode || undefined}
```

React 19 escribe `inert` como atributo nativo: saca el subárbol del foco y de la navegación por teclado, y `aria-hidden` lo saca del árbol accesible. Es también lo que permite que los tests de integración comprueben la desaparición con `queryByRole` sin depender de `inert`.

### 4. Botón y atajo

- **Botón** en `src/renderer/src/shell/TitleBar/TitleBar.tsx`, en el cluster derecho junto a «Toggle sidebar»:
  `IconButton` con `aria-pressed={zenMode}`, iconos lucide `Expand` (inactivo) / `Shrink` (activo) y label `Zen mode (${modifier} Shift D)`, mismo patrón que el botón «New …» de la sidebar.
- **Atajo** en `src/renderer/src/state/use-shortcuts.ts`: el hook gana `onToggleZen`; el handler añade `if (event.shiftKey && key === 'd')`. `preventDefault()` al reconocer la combinación. `event.key` para `Shift+D` llega como `'D'` y el hook ya hace `toLowerCase()`.
- **Sin `Escape`**: ya lo consumen los diálogos (`ConfirmDialog`), y con el botón en la TitleBar no hace falta un tercer camino de salida.
- **Sin pantalla completa**: en Inkdrop es un comando aparte (`window:toggle-full-screen`); no se mezcla con este modo.

## Decisiones

- **Ocultar de verdad, no reaprovechar el rail.** Es lo que hace la referencia y lo que el usuario pidió; el rail sigue existiendo como comportamiento independiente del botón «Toggle sidebar».
- **Mantener montados y animar el ancho**, no desmontar: desmontar no se puede animar, y además tiraría la posición de scroll de la lista y reiniciaría el índice de tabulación de `OptionList`. Con ancho 0 el scroll se conserva y los datos no se recargan (viven en `LibraryProvider`, por encima de `AppShell`).
- **Capa interior de ancho fijo** en vez de dejar que el contenido se comprima: el texto no reflowa durante los 200 ms; el panel se percibe como un telón que se corre.
- **Animación solo de ancho**, sin fundidos: es la que ya habla el resto de la app (`StoryPane`) y evita dos mecanismos de animación distintos.
- **El modo es estado de sesión, no preferencia.** No se persiste en `localStorage`: arrancar la app sin sidebar ni lista sorprendería más de lo que ayuda, y en DraftWrite no hay menú de preferencias donde deshacerlo. Inkdrop sí lo persiste desde v5.5.1, pero allí es una preferencia de producto consolidada.
- **No oculta chrome.** `TitleBar` y `StatusBar` se quedan por decisión explícita del usuario; además el StatusBar lleva palabras/caracteres/minutos y Ln/Col, información útil mientras se escribe.
- **El atajo replica la referencia** (`Cmd/Ctrl+Shift+D`) en vez de inventar uno; no colisiona con `Cmd/Ctrl+N` ni `Cmd/Ctrl+S`, ni con los keymaps por defecto de CodeMirror 6.
- **`zenMode` no se sincroniza con `ViewModeSwitcher`**: `edit`/`split`/`preview` describen el editor, no los paneles laterales.

## Testing

- **Reducer** (`workspaceReducer`, nuevo `workspace-context.test.ts`): `zen/toggle` alterna; no altera `sidebarCollapsed`, `storyPaneExpanded`, selección ni diálogos.
- **`ListColumn.test.tsx`**: con `collapsed` el ancho inline es `0px`, la región queda `aria-hidden` y no se renderiza el separador; sin `collapsed`, el test de redimensionado existente sigue pasando.
- **`App.test.tsx`** (contrato de integración):
  - al pulsar «Zen mode», la región `Library` y el `listbox` (`Stories`/`Articles`) desaparecen del árbol accesible, el panel de la lista queda con ancho `0px` (prueba de que se anima, no se desmonta) y el editor de la story/artículo seleccionado sigue visible;
  - `aria-pressed` del botón refleja el estado y un segundo clic restaura ambos paneles con la selección intacta;
  - `Ctrl+Shift+D` hace lo mismo que el botón, y `Ctrl+D` sin `Shift` no hace nada;
  - el toggle de sidebar sigue siendo independiente: colapsar el rail, entrar y salir del modo deja el rail como estaba.
- **Manual/headless en Electron**: el editor y el split se re-miden al ocupar el ancho completo (CodeMirror los re-mide por `ResizeObserver`), la animación dura 200 ms y `prefers-reduced-motion` la desactiva.

## Fuera de alcance

- Pantalla completa o kiosco.
- Ocultar `TitleBar`, `StatusBar` o el toolbar de formato.
- Mostrar la lista en overlay al pasar el ratón por el borde.
- Persistir el modo entre reinicios.
- Fundidos o animación del contenido del editor mientras el workspace crece.
- Atenuar texto alrededor del cursor (eso es *focus mode*, otra familia de features).
- Modo por ventana (DraftWrite abre una sola ventana).
