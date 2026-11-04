# Research: modo Zen / ocultar sidebar y lista

- **Estado:** nota de investigación (previa a cualquier spec/plan). No implementa nada.
- **Fecha:** 2026-10-24
- **Pregunta:** el usuario vio en una app de notas de referencia un botón que llamó "ZEM mode" (probablemente "Zen mode") que oculta la sidebar y la lista de notas dejando sólo el editor. ¿Qué app es, cómo se llama exactamente la función, qué oculta, cómo se activa/sale, y qué encaje tendría en DraftWrite?
- **Aviso importante:** **las capturas de referencia no llegaron**. La identificación de la app es una **inferencia** a partir del layout descrito (sidebar + lista + editor) y del contexto del usuario (tiene herramientas MCP de Inkdrop configuradas). Todo lo que sigue separa explícitamente lo verificado en fuentes de primera parte de lo inferido.

## Qué hace la app de referencia

### Identificación (inferido)

La app es, con alta probabilidad, **Inkdrop**. Razones: su interfaz son exactamente tres secciones — *sidebar*, *note list* y *editor* [2] — y el usuario ya usa Inkdrop (MCP). Además, Inkdrop **sí** tiene una función que oculta sidebar + lista de notas y deja sólo el editor, que es lo que describen las capturas.

Matiz sobre el nombre: Inkdrop **no llama "Zen"** a esa función en ninguna fuente de primera parte. El nombre oficial es **"Distraction Free Mode"** [1][2][3]. La lectura "ZEM" es casi seguro una lectura errónea del rótulo o del icono del botón (o de la palabra "Zen" en otra app). Si la captura mostraba literalmente "Zen" en un botón, entonces no sería Inkdrop y habría que reabrir la identificación.

### Verificado (fuentes de primera parte)

- **Nombre exacto:** *Distraction Free Mode* (en la documentación aparece entre comillas simples: 'Distraction Free Mode') [2][3].
- **Qué oculta:** la **sidebar** y la **note list** [1][2][3]. Es una definición literal en tres documentos distintos.
- **Atajo:** `Command+Shift+D` en macOS, `Ctrl+Shift+D` en Windows/Linux; la misma combinación entra y sale [2][3][1].
- **Comando interno:** `view:toggle-distraction-free` — "Toggles distraction-free mode" [4].
- **Es distinto del toggle de sidebar:** existe un comando separado `view:toggle-sidebar` — "Toggles the side bar" [4], documentado con su propio atajo `Command+/` / `Ctrl+/` [2].
- **Punto de activación en la UI:** el *editor header* incluye "a distraction-free toggle" (botón) [1]. La documentación de usuario sólo documenta el atajo y ese botón; **no** describe una entrada de menú con nombre propio.
- **Toolbar de formato:** el modo no la oculta. Se oculta aparte, en **Preferences → Editing → desmarcar "Toolbar"** [3].
- **Persistencia:** desde **v5.5.1** Inkdrop recuerda el estado al arrancar. Release note: *"Improvement — Remember distraction free mode on next launch"* [5]; confirmado por el autor en el hilo que lo pidió: *"As of v5.5.1, it remembers the distraction-free mode"* [6].
- **No implica pantalla completa:** `window:toggle-full-screen` es un comando independiente [4], y ni la doc del modo ni la de la interfaz mencionan fullscreen al describirlo [2][3].
- **Uso en ventanas separadas:** el autor explica que las ventanas "detached" son ventanas normales "except the sidebar and note list are hidden by default (Distraction free mode). You can display them by pressing Cmd-Shift-D" [7] — es decir, es un estado por ventana y el atajo funciona igual ahí.
- **La app no documenta barra de estado:** la interfaz se describe como tres secciones (sidebar, note list, editor) [2]; no hay tercera/cuarta barra que el modo pudiera ocultar.

### Inferido / no verificado

- **No verificado:** si el modo oculta además la *title bar* nativa de la ventana. La definición canónica del modo sólo menciona sidebar + note list [1][2][3]; ninguna fuente dice que se oculte el chrome del sistema.
- **No verificado:** cómo comunica la UI el estado activo (icono resaltado, `pressed`, check en menú). Lo único documentado es que existe un toggle en el editor header [1]; no hay captura ni descripción del estado.
- **No verificado:** el nombre exacto de la entrada de menú (View → …), si existe. La doc sólo cita el atajo [2][3] y el botón del header [1].
- **No verificado:** la ubicación exacta del flag persistido. El directorio de datos contiene `config.json`, `keymap.json`, `state-cache/` ("cached app state for faster startup") [9], pero **no hay documentación pública del key**. Para confirmarlo haría falta inspeccionar `config.json` / `state-cache/` en una instalación real.
- **Inferido:** Inkdrop no tiene un "focus mode" de atenuación de texto tipo Ulysses. Cuando se pidió uno, el autor respondió que la app "ya tiene Distraction Free Mode para concentrarse en escribir" y que un modo como el de Ulysses "sería mejor como plugin" [10]. Es decir: en Inkdrop, *distraction free* = ocultar paneles, nada más.
- **Inferido:** el botón de las capturas es el del editor header [1] o el atajo; no se puede afirmar el icono.

## Comportamiento esperado

| Aspecto | Inkdrop (verificado) | Fuente |
| --- | --- | --- |
| Qué se oculta | Sidebar y note list. El editor pasa a ocupar el ancho restante | [1][2][3] |
| Qué NO se oculta | El editor (obviamente), el toolbar de formato (se oculta aparte en Preferences → Editing) y el chrome de la ventana | [3] |
| ¿Pantalla completa? | No. Es un comando separado (`window:toggle-full-screen`) | [4] |
| Cómo se activa | Botón "distraction-free toggle" en el editor header + atajo | [1] |
| Atajo exacto | macOS `Cmd+Shift+D`; Windows/Linux `Ctrl+Shift+D` (comando `view:toggle-distraction-free`) | [2][3][4] |
| Cómo se sale | La misma combinación / el mismo botón (es un toggle) | [2][3] |
| Persistencia | Sí, desde v5.5.1 ("Remember distraction free mode on next launch") | [5][6] |
| Dónde persiste | No documentado. Candidatos: `config.json` o `state-cache/` del directorio de datos | [9] — **no verificado** |
| Relación con sidebar toggle | Funciones distintas: `view:toggle-sidebar` (`Cmd/Ctrl+/`) vs `view:toggle-distraction-free` (`Cmd/Ctrl+Shift+D`) | [2][4] |
| Estado activo en la UI | Existe un toggle en el header; el indicador visual concreto no está documentado | [1] — **no verificado** |

## Comparativa con otras apps

Sólo filas con respaldo en documentación de primera parte. "Chrome" = title bar / barra de estado / controles de ventana.

| App | Mecanismo documentado | Qué oculta / atenúa | Atajo | ¿Afecta al chrome? | Fuente |
| --- | --- | --- | --- | --- | --- |
| **Inkdrop** | *Distraction Free Mode* (+ *sidebar toggle* aparte) | Oculta sidebar y note list | `Cmd/Ctrl+Shift+D` (sidebar: `Cmd/Ctrl+/`) | No documentado; no hay barra de estado en su UI | [1][2][3][4] |
| **Typora** | *Focus Mode* (no oculta paneles) + *Toggle Sidebar* + *Toggle Fullscreen* | Focus Mode desvanece todo salvo la línea/bloque actual; el sidebar se oculta con su propio toggle | Focus `F8`; sidebar `Ctrl/Cmd+Shift+L`; fullscreen `F11` / `Cmd+Opt+F` | Focus no toca el chrome; fullscreen sí | [11][12] |
| **Ulysses** | *Hide Interface*, *Hide Toolbar*, `⌘3`, *Enter Full Screen* | `Hide Interface` oculta incluso los botones de control de la ventana; `Hide Toolbar` desvanece la toolbar; `⌘3` oculta library y sheet list | `⌘1`–`⌘4` para paneles (la doc no fija atajo para Hide Interface) | **Sí**: Hide Interface oculta los controles de ventana; fullscreen es una opción separada | [13] |
| **iA Writer (Mac)** | *Focus Mode* (+ *Typewriter*) | Resalta la frase/párrafo activo y atenúa el resto; no oculta sidebar | `⌘D` (menú `Focus` → `Enable Focus Mode`, o botón en la title bar) | No: no se documenta ocultación de chrome | [14] |
| **Obsidian** | Sin modo zen/focus nativo documentado | El equivalente documentado son plugins de la comunidad; p. ej. *Ultra Zen Mode* oculta sidebars, propiedades, título y barra de estado | Depende del plugin | Sí, en el caso del plugin (título y barra de estado) | [15] — verificación negativa: la búsqueda en `help.obsidian.md` no devuelve nada para "zen"/"distraction free" |

Lectura de la comparativa: **"modo zen" no es un estándar**. Hay dos familias de features que suelen confundirse:

1. **Ocultar estructura** (Inkdrop, Ulysses `Hide Interface`, el plugin de Obsidian): desaparecen paneles y, a veces, chrome.
2. **Atenuar texto** (Typora Focus Mode, iA Writer Focus Mode, Ulysses `Highlight`): no desaparece nada, sólo se resalta la línea/frase/párrafo actual.

La referencia del usuario ("oculta la sidebar y la lista, queda sólo el editor") pertenece a la familia 1, igual que Inkdrop.

## Encaje en DraftWrite

### Lo que ya existe (y por qué no basta)

| Pieza | Estado actual | Archivo |
| --- | --- | --- |
| Sidebar | `sidebarCollapsed` **colapsa a un rail de 56 px**, no la oculta (`w-14 min-w-14`; por debajo de `lg` es rail siempre) | `src/renderer/src/sidebar/Sidebar/Sidebar.tsx`, `src/renderer/src/state/workspace-context.tsx:28,47,105` |
| Lista ("subsidebar") | **Sin estado de ocultado**: ancho 280 px con `usePanelResizer({ storageKey: 'list' })` y `Resizer` siempre renderizado | `src/renderer/src/list/ListColumn/ListColumn.tsx` |
| StoryPane | `storyPaneExpanded` ya colapsa a rail de 40 px (`w-10 min-w-10`) | `src/renderer/src/workspace/StoryPane/StoryPane.tsx:97`, `workspace-context.tsx:29,48,107` |
| Composición | `TitleBar` (h-9) + `<main>` con {sidebar}{list}{workspace} + `StatusBar` (h-6) | `src/renderer/src/shell/AppShell/AppShell.tsx:14-24` |
| Toggle de sidebar | `IconButton` "Toggle sidebar" con `aria-pressed={sidebarCollapsed}` en el TitleBar | `src/renderer/src/shell/TitleBar/TitleBar.tsx` |
| Header del workspace | `StoryHeader` / `ArticleHeader` contienen `ViewModeSwitcher` (equivalente al "editor header" de Inkdrop) | `src/renderer/src/workspace/StoryHeader/StoryHeader.tsx`, `.../ArticleHeader/ArticleHeader.tsx` |
| Atajos | Sólo `Cmd/Ctrl+N` y `Cmd/Ctrl+S`; el handler ya filtra por `metaKey/ctrlKey` y baja a minúsculas, así que `Shift+D` llega como `d` | `src/renderer/src/state/use-shortcuts.ts` |
| Persistencia | Única convención existente: `draftwrite.panel.<key>` para tamaños de panel (`STORAGE_PREFIX`) | `src/renderer/src/ui/Resizer/panel-size.ts:3` |
| Estado global | `useReducer` + contexto, acción `type` string; no hay store de preferencias de UI | `src/renderer/src/state/workspace-context.tsx` |

Consecuencia: **no existe hoy ningún mecanismo que oculte de verdad la sidebar o la lista**; ambos "colapsos" dejan un rail visible.

### Cambios concretos que implicaría

1. **Estado** — `src/renderer/src/state/workspace-context.tsx`:
   - añadir `zenMode: boolean` (nombre alternativo: `chromeHidden`) a `WorkspaceState`, con `initialWorkspaceState` → `false`;
   - añadir `| { type: 'zen/toggle' }` a `WorkspaceAction` y su `case` en `workspaceReducer`.
   - Recomendación: en `zenMode` **no** mutar `sidebarCollapsed` ni `storyPaneExpanded`; el render los ignora y al salir se recupera exactamente el layout anterior.
2. **Render** — `src/renderer/src/shell/AppShell/AppShell.tsx`: decidir qué pasa a `null` cuando `zenMode`:
   - mínimo (paridad Inkdrop): `{sidebar}` y `{list}` → `null`;
   - extendido: `TitleBar` y/o `StatusBar` → `null`.
3. **Botón** — junto a `ViewModeSwitcher` en `StoryHeader`/`ArticleHeader` (paridad con el editor header de Inkdrop) o en el `TitleBar` junto al de sidebar. Con `aria-pressed={zenMode}`, `IconButton` y `Kbd` para mostrar el atajo.
4. **Atajo** — `src/renderer/src/state/use-shortcuts.ts`: nuevo handler `'d' + shiftKey` → `dispatch({ type: 'zen/toggle' })`. El hook hoy recibe sólo `onNew`/`onSave`; habría que añadir `onToggleZen`.
5. **Persistencia** — nuevo módulo (p. ej. `src/renderer/src/state/zen-preference.ts`) leyendo/escribiendo `localStorage` bajo el prefijo `draftwrite.*` (p. ej. `draftwrite.ui.zenMode`), siguiendo el patrón defensivo de `panel-size.ts` (JSON/valor inválido → default) y con test al estilo de `panel-size.test.ts`. Sólo si se decide persistir.
6. **Salida accesible** — si el botón vive en un header que el modo oculta, hace falta un punto de salida garantizado: `Escape` y/o el mismo atajo. `Escape` es delicado: ya lo consumen diálogos y menús (`dialog/open`), así que el handler debe ignorarlo cuando hay un diálogo abierto.
7. **Tests** — el patrón del repo es test de reducer + test de componente con `window.localStorage.clear()` en `beforeEach` (`ListColumn.test.tsx`, `EditorPreviewLayout.test.tsx`).

### Decisiones que debe tomar el usuario

1. **Ocultar de verdad vs. rail.** ¿`zenMode` oculta sidebar/lista por completo (paridad Inkdrop) o se reutiliza/declara el rail de 56 px como "suficiente"? Si se quiere control independiente del rail, `zenMode` debe ser un flag nuevo y no reescribir `sidebarCollapsed`.
2. **Alcance del chrome.** ¿Se ocultan también `TitleBar` (h-9) y `StatusBar` (h-6)? El `StatusBar` lleva palabras/caracteres/minutos de lectura y Ln/Col — es información que un escritor puede querer conservar, y en Inkdrop no hay equivalente documentado que sirva de precedente.
3. **Atajo.** `Cmd/Ctrl+Shift+D` (paridad literal con Inkdrop), `Cmd/Ctrl+.`, u otro; y si `Escape` también sale del modo.
4. **Persistencia.** ¿Recordar el modo entre reinicios (Inkdrop lo hace desde v5.5.1) o entrar siempre en layout normal? Si se persiste, ¿bajo `draftwrite.ui.zenMode` en `localStorage` (convención `draftwrite.*` del repo) — y el modo debe aplicarse antes del primer paint para no parpadear?

## Fuentes

1. [Inkdrop — Features](https://www.inkdrop.app/features/) — página oficial de features: "Distraction Free Mode — Cmd/Ctrl+Shift+D hides the sidebar and note list"; el *editor header* incluye "a distraction-free toggle".
2. [Inkdrop User Manual — Get acquainted with Inkdrop interface](https://docs.inkdrop.app/reference/main-user-interface) — las tres secciones (sidebar, note list, editor); `Cmd/Ctrl+/` toggle de sidebar; `Cmd+Shift+D` / `Ctrl+Shift+D` para entrar y salir de 'Distraction Free Mode'.
3. [Inkdrop User Manual — Write notes](https://docs.inkdrop.app/reference/write-notes) — sección "Distraction Free Mode": oculta sidebar y note list; el toolbar se oculta aparte en Preferences → Editing.
4. [Inkdrop API Reference — List of commands](https://developers.inkdrop.app/guides/list-of-commands) — comandos `view:toggle-distraction-free`, `view:toggle-sidebar` y `window:toggle-full-screen` como comandos separados.
5. [Inkdrop Forum — Inkdrop Desktop v5.5.1 (release notes)](https://forum.inkdrop.app/t/inkdrop-desktop-v5-5-1/3057) — "Improvement: Remember distraction free mode on next launch".
6. [Inkdrop Forum — Remember 'Distraction free' status on launch](https://forum.inkdrop.app/t/remember-distraction-free-status-on-launch/2508) — petición del usuario y respuesta aceptada del autor: "As of v5.5.1, it remembers the distraction-free mode".
7. [Inkdrop Forum — Telescope en ventanas separadas (canary v10)](https://forum.inkdrop.app/t/canary-v-10-issue-with-notebook-tag-search-in-telescope-when-using-a-separate-window/5498) — el autor: las ventanas detached ocultan sidebar y note list por defecto (distraction free mode) y se muestran con `Cmd-Shift-D`.
8. [Inkdrop User Manual — What is Markdown and how to write it](https://docs.inkdrop.app/start-guide/how-to-write-markdown-notes) — repite la definición ("the sidebar and note list are hidden... 'Distraction Free Mode'") con captura; mismo atajo.
9. [Inkdrop User Manual — User data directory](https://docs.inkdrop.app/reference/user-data-directory) — contenido del directorio de datos: `config.json`, `keymap.json`, `state-cache/`.
10. [Inkdrop Forum — Focus Mode (2018)](https://forum.inkdrop.app/t/focus-mode/760) — el autor: la app "ya tiene Distraction Free Mode"; un focus mode tipo Ulysses encajaría mejor como plugin.
11. [Typora Support — Focus Mode and Typewriter Mode](https://support.typora.io/Focus-and-Typewriter-Mode/) — Focus Mode desvanece todo salvo la línea/bloque actual; se activa desde el menú View.
12. [Typora Support — Shortcut Keys](https://support.typora.io/Shortcut-Keys/) — `F8` Focus Mode, `F9` Typewriter, `Ctrl/Cmd+Shift+L` Toggle Sidebar, `F11` / `Cmd+Opt+F` Toggle Fullscreen.
13. [Ulysses Help — Customize the Editor](https://help.ulysses.app/dive-into-editing/editor-customization-guide) — **Hide Interface** (oculta incluso los botones de control de ventana), **Hide Toolbar**, `⌘3` para ocultar library y sheet list, **Enter Full Screen**.
14. [iA Writer Support — Focus Mode](https://ia.net/writer/support/editor/focus-mode) — `⌘D`, menú `Focus` → `Enable Focus Mode`, botón en la title bar; modos Sentence / Paragraph / Typewriter (atenúan, no ocultan paneles).
15. [Obsidian Community Plugins — Ultra Zen Mode](https://community.obsidian.md/plugins/ultra-zen-mode) — plugin que "hides sidebars, properties, title and status bar"; evidencia de que en Obsidian el equivalente no viene de fábrica.
