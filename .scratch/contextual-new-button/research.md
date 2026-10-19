# Investigación: botón contextual «New Story» / «New Article»

**Estado:** investigación de solo lectura. No se modificó código de producción ni tests.
**Fecha:** 2026-10-19.
**Objetivo:** reunir la evidencia necesaria para planificar que el botón inferior del sidebar cree una Story o un Article según la biblioteca activa, y que muestre el atajo correspondiente.

Convenciones de este informe:

- **[Hecho]**: verificado leyendo el código, los tests, la configuración o la documentación del repo.
- **[Inferencia]**: consecuencia razonable de los hechos, pero no una regla escrita en el repo.
- **[Decisión abierta]**: el repo no la resuelve; requiere que la persona usuaria elija.

---

## Resumen ejecutivo

- **[Hecho]** El botón inferior del sidebar está hardcodeado a Story: texto `New Story`, `aria-label`/`title` `New Story (${modifier} N)`, icono `PlusCircle` y `navigate({ type: 'create/start', kind: 'story' })`. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:40-55`.
- **[Hecho]** La biblioteca activa ya existe en el reducer como `library: 'stories' | 'articles'`, con `'stories'` como valor inicial, y `App` decide la lista con `library === 'stories' ? <StoryList /> : <ArticleList />`. `src/renderer/src/state/workspace-context.tsx:12,53-65`; `src/renderer/src/App.tsx:55`.
- **[Hecho]** El reducer ya soporta crear un Article con una Story preseleccionada: `create/start` acepta `kind: CreateKind` y `storyId?: string`. No hace falta cambiar el contrato IPC ni el dominio para el cambio del botón. `src/renderer/src/state/workspace-context.tsx:16,46,98-99`.
- **[Hecho]** `ArticleList` ya contiene la lógica canónica de contexto y de habilitación: deriva `openStory` del Article abierto o de la Story seleccionada, y usa `storiesTotal > 0` como condición para crear. `src/renderer/src/list/ArticleList/ArticleList.tsx:30-48`.
- **[Hecho]** El atajo global actual es `Ctrl/Cmd+N` y **siempre** crea una Story, independientemente de la biblioteca. No existe un atajo para New Article. `src/renderer/src/state/use-shortcuts.ts:8-24`; `src/renderer/src/App.tsx:34-37`.
- **[Hecho]** El botón del sidebar es la única entrada de creación que no depende del estado de carga, error o vacío de la lista; en `ArticleList` las entradas de creación desaparecen o se deshabilitan según el estado, y en `StoryList` la entrada de creación solo existe en el estado vacío. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:40-55`; `src/renderer/src/list/ArticleList/ArticleList.tsx:61-116`; `src/renderer/src/list/StoryList/StoryList.tsx:47-70`.
- **[Hecho]** Si no hay ninguna Story seleccionada ni Story abierta, el formulario de Article se abre con `StoryID: ''`, permite elegir una Story si existe alguna y no persiste hasta tener Story + título. Si no existe ninguna Story, el Article no se puede crear y el dominio lo rechazaría. `src/renderer/src/data/drafts.ts:7-17`; `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:46-47`; `src/main/article/model.ts:90-99`.
- **[Riesgo de tests]** Cuatro llamadas existentes usan `getByRole('button', { name: 'New Article' })` sin ámbito. Si el nuevo botón del sidebar tuviera exactamente ese nombre accesible, esos tests pasarían a encontrar dos botones y fallarían. Si el `aria-label` incluye el atajo, como el actual (`New Story (Ctrl N)`), el nombre exacto no colisiona. `src/renderer/src/App.test.tsx:676,724,756,770`.
- **[Decisión abierta principal]** No está decidido si `N` debe ser contextual, si New Article debe tener otro atajo, ni qué debe hacer el botón/atajo cuando la biblioteca activa es Articles y no hay ninguna Story.

---

## 1. Implementación actual del botón inferior del sidebar

### Componente y anatomía

El componente exacto es `Sidebar`, en `src/renderer/src/sidebar/Sidebar/Sidebar.tsx`. No recibe props; lee `sidebarCollapsed` del workspace, `navigate` del hook de navegación y `modifier` del hook de plataforma. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:1-14`.

```tsx
<button
  type="button"
  aria-label={`New Story (${modifier} N)`}
  title={`New Story (${modifier} N)`}
  onClick={() => navigate({ type: 'create/start', kind: 'story' })}
  className="flex h-8 w-full items-center justify-center gap-2 rounded border border-line-strong bg-neutral text-xs font-medium text-base-content transition hover:bg-neutral/80"
>
  <PlusCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
  <span className={cn('items-center gap-2', sidebarCollapsed ? 'hidden' : 'hidden lg:flex')}>
    New Story
    <Kbd>{`${modifier} N`}</Kbd>
  </span>
</button>
```

Fuente: `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:40-55`.

| Aspecto | Valor actual | Fuente |
|---|---|---|
| Elemento | `<button type="button">` dentro de un `<div className="border-t border-base-300 p-3">` al final del `<aside>` | `Sidebar.tsx:40-55` |
| Texto visible | `New Story` | `Sidebar.tsx:52` |
| Atajo visible | `<Kbd>{`${modifier} N`}</Kbd>` | `Sidebar.tsx:53` |
| `aria-label` | `` `New Story (${modifier} N)` `` | `Sidebar.tsx:43` |
| `title` | `` `New Story (${modifier} N)` `` | `Sidebar.tsx:44` |
| Icono | `PlusCircle`, `aria-hidden="true"`, `h-3.5 w-3.5`, `text-primary` | `Sidebar.tsx:48` |
| Handler | `navigate({ type: 'create/start', kind: 'story' })` | `Sidebar.tsx:45` |
| Estado `disabled` | No existe; el botón siempre está habilitado | `Sidebar.tsx:41-46` |
| Props | Ninguna; el componente no recibe `library`, `storiesTotal` ni callbacks | `Sidebar.tsx:11-14` |
| Estilos del botón | `flex h-8 w-full items-center justify-center gap-2 rounded border border-line-strong bg-neutral text-xs font-medium text-base-content transition hover:bg-neutral/80` | `Sidebar.tsx:46` |
| Estilos del bloque visible | `items-center gap-2`; si el sidebar está colapsado `hidden`; en caso contrario `hidden lg:flex` | `Sidebar.tsx:50` |
| Accesibilidad | El nombre accesible lo aporta el `aria-label`; el icono está oculto a lectores de pantalla; no hay `aria-keyshortcuts` | `Sidebar.tsx:43,48`; búsqueda global sin coincidencias de `aria-keyshortcuts` |

### Contenedor y comportamiento con el sidebar colapsado

- El `<aside>` tiene `aria-label="Library"` y clases `flex w-14 min-w-14 shrink-0 flex-col justify-between ...`; solo cuando **no** está colapsado añade `lg:w-[220px] lg:min-w-[220px]`. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:17-23`.
- El estado `sidebarCollapsed` vive en el reducer del workspace, empieza en `false` y se alterna con `sidebar/toggle`. `src/renderer/src/state/workspace-context.tsx:27,60,94-95`.
- El botón que alterna el sidebar está en la barra de título, con `aria-pressed={sidebarCollapsed}`. `src/renderer/src/shell/TitleBar/TitleBar.tsx:27-34`.
- **[Hecho]** El texto y el `<Kbd>` se ocultan en dos situaciones: (a) `sidebarCollapsed === true`, y (b) el ancho de viewport está por debajo del breakpoint `lg`, incluso si el sidebar no está colapsado, porque la clase es `hidden lg:flex`. En ambos casos queda visible solo el icono `PlusCircle`. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:49-54`.
- **[Hecho]** Aunque el texto esté oculto, el `aria-label` y el `title` siguen diciendo `New Story (${modifier} N)`; por eso el botón conserva nombre accesible y tooltip en estado colapsado. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:43-44`.
- **[Inferencia]** Si el botón pasa a ser contextual, el `aria-label`/`title` deberán cambiar también en estado colapsado; de lo contrario un usuario de lector de pantalla o de tooltip seguiría oyendo/leyendo «New Story» cuando la biblioteca activa es Articles.

### Modificador mostrado

`usePlatformModifier()` deriva el texto del modificador del `navigator.userAgent`: `⌘` si contiene `Mac|iPhone|iPad|iPod`, y `Ctrl` en cualquier otro caso. `src/renderer/src/state/use-platform.ts:3-8`.
El test unitario de esa función cubre macOS, Linux y Windows. `src/renderer/src/state/use-platform.test.ts:4-20`.

---

## 2. Representación y lectura de la biblioteca activa

### Estado

- El tipo canónico es `Library = 'stories' | 'articles'`. `src/renderer/src/state/workspace-context.tsx:12`.
- `WorkspaceState` incluye `library: Library`, además de `selectedStoryId`, `selectedArticleId`, `creating`, `creatingStoryId`, etc. `src/renderer/src/state/workspace-context.tsx:20-35`.
- El estado inicial es `library: 'stories'`. `src/renderer/src/state/workspace-context.tsx:53-65`.
- La acción `library/select` cambia la biblioteca, y además limpia `creating` y `creatingStoryId`; **no** limpia `selectedStoryId` ni `selectedArticleId`. `src/renderer/src/state/workspace-context.tsx:70-71`.

```ts
case 'library/select':
  return { ...state, library: action.library, creating: null, creatingStoryId: null }
```

Fuente: `src/renderer/src/state/workspace-context.tsx:70-71`.

### Lectura en la UI

- `LibraryNav` lee `library` con `useWorkspace()`, calcula `active = library === value` y expone `aria-current="page"` cuando corresponde; al hacer clic despacha `library/select`. `src/renderer/src/sidebar/LibraryNav/LibraryNav.tsx:11-25`.
- `AppLayout` lee `library` del workspace y decide la lista:

```tsx
list={library === 'stories' ? <StoryList /> : <ArticleList />}
```

Fuente: `src/renderer/src/App.tsx:53-57`.

- **[Hecho]** `Sidebar` **no** lee `library` actualmente: solo destructura `sidebarCollapsed` de `useWorkspace()`. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:12`.
- **[Hecho]** `Sidebar` está dentro de `WorkspaceProvider` y `LibraryProvider`, porque `App` envuelve `AppLayout` con ambos providers. Por tanto puede leer `library`, `storiesTotal` o `storyById` sin cambiar la jerarquía. `src/renderer/src/App.tsx:117-123`.
- **[Hecho]** No hay router, URL ni persistencia de la biblioteca activa: es estado en memoria del reducer. `src/renderer/src/state/workspace-context.tsx:116-125`.
- **[Hecho]** Las selecciones sobreviven al cambio de biblioteca. Esto es relevante para New Article: si se seleccionó una Story y luego se cambia a Articles, `selectedStoryId` sigue disponible. `src/renderer/src/state/workspace-context.tsx:70-71`; el test de preselección lo verifica en `src/renderer/src/App.test.tsx:717-729`.

### Punto exacto donde se decide la lista

`App.tsx:53-57` es el único punto que decide qué lista se renderiza. `StoryList` y `ArticleList` no se renderizan simultáneamente. `src/renderer/src/App.tsx:51-57`.

---

## 3. Puntos de entrada existentes para crear Story y Article

### Tabla de entradas

| # | Punto de entrada | Archivo:línea | Etiqueta / icono | Acción despachada | ¿Muestra `Kbd`? | Condiciones |
|---|---|---|---|---|---|---|
| 1 | Botón inferior del sidebar | `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:40-55` | `New Story`; `PlusCircle` | `create/start`, `kind: 'story'` | Sí: `${modifier} N` | Siempre visible y habilitado; pasa por `useWorkspaceNavigation` |
| 2 | Empty state de StoryList | `src/renderer/src/list/StoryList/StoryList.tsx:47-70` | `New Story`; sin icono | `create/start`, `kind: 'story'` | No | Solo si `stories.length === 0` y `filtered === false` (sin filtro, o biblioteca vacía); `ListEmpty` muestra `Clear filter` en lugar de la acción si `filtered` es true |
| 3 | Empty state de ArticleList | `src/renderer/src/list/ArticleList/ArticleList.tsx:81-102` | `New Article`; sin icono | `create/start`, `kind: 'article'`, `storyId: openStory?.ID` | No | Solo si `articles.length === 0` y `filtered === false` (sin filtro, o biblioteca vacía); `disabled={!canCreate}` |
| 4 | Header de ArticleList | `src/renderer/src/list/ArticleList/ArticleList.tsx:104-116` | `New Article`; `Plus` | `create/start`, `kind: 'article'`, `storyId: openStory?.ID` | No | Solo cuando hay Articles y la lista está lista; `disabled={!canCreate}`; si no hay Stories muestra además `No story yet` |
| 5 | Atajo global `Ctrl/Cmd+N` | `src/renderer/src/state/use-shortcuts.ts:8-24`; `src/renderer/src/App.tsx:34-37` | No aplica | `create/start`, `kind: 'story'` | Sí, indirectamente en el sidebar (`Ctrl N`) | Siempre que la ventana reciba el `keydown` con `metaKey` o `ctrlKey`; no mira la biblioteca activa |
| 6 | Formularios de creación (StoryBand / ArticleBand) | `src/renderer/src/workspace/StoryBand/StoryBand.tsx:72-115`; `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx:40-130` | Campos de edición, no botones de alta | No despachan `create/start`; `onDiscard` despacha `create/cancel` | No | Se muestran cuando `creating` ya está activo; no son puntos de entrada |

### Condiciones de `StoryList`

`StoryList` calcula `filtered = tagFilter !== null && storiesTotal > 0`; si la lista está vacía y `filtered` es true, `ListEmpty` renderiza `Clear filter` en lugar de la acción `New Story`. `src/renderer/src/list/StoryList/StoryList.tsx:25,47-70`; `src/renderer/src/list/ListEmpty/ListEmpty.tsx:27-37`.

### Condiciones de `ArticleList`

`ArticleList` calcula el contexto y la posibilidad de crear así:

```ts
const openStory =
  selectedArticleId === null
    ? storyById(selectedStoryId)
    : storyById(articleById(selectedArticleId)?.StoryID ?? null)

const canCreate = storiesTotal > 0
```

Fuente: `src/renderer/src/list/ArticleList/ArticleList.tsx:30-38`.

- `storiesTotal` es el número de **todas** las Stories cargadas, no el número de Stories visibles tras el filtro. `src/renderer/src/state/library-context.tsx:52-54`.
- `canCreate` no comprueba `storiesStatus`; si las Stories aún están cargando o fallaron, el valor puede ser `0` y la creación aparece deshabilitada. `src/renderer/src/state/use-list.ts:12-38`; `src/renderer/src/list/ArticleList/ArticleList.tsx:38`.
- `ArticleEditor` recibe `allStories` para el selector, no la lista filtrada. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:38,95`.
- En el estado vacío, si no hay Stories, la descripción es `A story is required before you can write an article.`; si hay Stories pero ninguna en contexto, `Write your first article and pick its story in the band.`; si hay una Story en contexto, `Write the first article from “${openStory.Topic}”.` `src/renderer/src/list/ArticleList/ArticleList.tsx:87-96`.

### Otras búsquedas

- Búsqueda de `create/start` en todo `src`: solo aparece en `Sidebar`, `StoryList`, `ArticleList`, el reducer y `App` (no hay menús, command palette ni toolbar de creación). Resultados citados en la tabla.
- Búsqueda de `Plus` / `FileText` / `New Story` / `New Article` en `src/renderer/src`: no hay más botones de alta en `workspace/` ni en `shell/`.
- **[Hecho]** No existe un atajo de teclado para New Article; el único atajo de creación es el `N` que crea Story. `src/renderer/src/state/use-shortcuts.ts:8-24`.

---

## 4. Flujo completo de creación de un Article

### Secuencia actual desde `ArticleList`

1. **Se calcula la Story en contexto.** `openStory` es el Article abierto (su `StoryID`) si hay uno; si no, la Story seleccionada. `src/renderer/src/list/ArticleList/ArticleList.tsx:30-35`.
2. **Se despacha la creación** con la Story opcional:

```ts
const startNew = (): void =>
  navigate({ type: 'create/start', kind: 'article', storyId: openStory?.ID })
```

Fuente: `src/renderer/src/list/ArticleList/ArticleList.tsx:47-48`.

3. **El reducer guarda el tipo y la Story preseleccionada:**

```ts
case 'create/start':
  return { ...state, creating: action.kind, creatingStoryId: action.storyId ?? null }
```

Fuente: `src/renderer/src/state/workspace-context.tsx:98-99`. El comentario del estado explica que `creatingStoryId` es «The Story a new Article is pre-selected with, taken from whatever story is in context when «New Article» is pressed.» `src/renderer/src/state/workspace-context.tsx:29-32`.

4. **`Workspace` decide renderizar el editor de creación** antes que cualquier selección existente:

```tsx
if (creating === 'article') {
  return (
    <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
      <ArticleEditor stored={null} initialStoryId={creatingStoryId ?? ''} />
    </section>
  )
}
```

Fuente: `src/renderer/src/workspace/Workspace/Workspace.tsx:24-30`.

5. **`ArticleEditor` construye el borrador.** `creating = stored === null`; el estado inicial es `stored ?? emptyArticle(initialStoryId)`. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:36-44`; `emptyArticle` deja `ID: ''`, `StoryID: storyId`, título/subtítulo/target/texto vacíos. `src/renderer/src/data/drafts.ts:7-17`.
6. **El formulario se renderiza en la banda del editor.** `ArticleBand` recibe `stories={allStories}`, `storyId`, `title`, `subtitle`, `target`, `creating`, y los callbacks de edición. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:92-106`.
7. **Validación de UI.** `ArticleBand` marca `missingStoryId = storyId.trim() === ''` y `missingTitle = title.trim() === ''`; si falta cualquiera, muestra `role="status"` con «A story and a title are required before this article can be saved.» `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx:34-35,97-101`. El selector tiene la opción `Choose a story…` y permanece habilitado mientras `creating` es true. `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx:49-67`.
8. **Validación de persistencia.** `ArticleEditor.canPersist` exige `StoryID.trim() !== ''` y `Title.trim() !== ''`. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:46-47`. Mientras no se cumpla, `useDraftPersistence.schedule` deja el estado en `incomplete` y no programa escritura. `src/renderer/src/state/use-draft-persistence.ts:93-111`.
9. **Escritura diferida.** Cuando el borrador es persistible, `schedule` espera `DELAY_MS = 700` y llama a `write`. `src/renderer/src/state/use-draft-persistence.ts:5,93-111`. La primera escritura usa `create`; las siguientes usan `update`. `src/renderer/src/state/use-draft-persistence.ts:45-67`.
10. **Creación en el puerto.** `ArticleEditor` llama a `port.createArticle({ storyId, title, subtitle, target, text })`. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:49-60`.
11. **Al guardar por primera vez**, `onStored` hace `upsertArticle(value)`, `publishUnsavedDraft(false)`, actualiza el draft local, despacha `create/cancel` y navega a `article/select` con el ID recién creado. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:61-70`.
12. **Después de creado**, el Article se abre como entidad almacenada; `ArticleBand` recibe `creating={false}` y el selector de Story queda deshabilitado, porque el `StoryID` es inmutable. `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx:36-38,49-54`; `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:42,100`.

### Qué pasa si no hay Story seleccionada

- Si no hay Article abierto ni Story seleccionada, `openStory` es `null`; se despacha `create/start` sin `storyId`; el reducer deja `creatingStoryId: null`; `Workspace` pasa `initialStoryId=''`; `emptyArticle('')` deja `StoryID: ''`. `src/renderer/src/list/ArticleList/ArticleList.tsx:30-48`; `src/renderer/src/state/workspace-context.tsx:98-99`; `src/renderer/src/workspace/Workspace/Workspace.tsx:24-30`; `src/renderer/src/data/drafts.ts:7-17`.
- El selector muestra `Choose a story…`, la advertencia de campos requeridos aparece y no se escribe nada hasta elegir Story y escribir título. `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx:49-67,97-101`.
- Esto solo es posible si existe al menos una Story para elegir. `ArticleList` deshabilita el botón cuando `storiesTotal === 0`. `src/renderer/src/list/ArticleList/ArticleList.tsx:37-38,50-59,111-113`.
- Si no hay ninguna Story, el dominio también rechazaría la creación: `validateArticle` exige `storyID` no vacío y `title` no vacío. `src/main/article/model.ts:90-99`; el contrato lo documenta en `docs/api/ipc-contract.md:136-143`. Además, el servicio comprueba que la Story exista (`errStoryNotFound`), que el título no se repita dentro de esa Story (`errTitleTaken`) y que título/subtítulo/target no superen 255 bytes. `docs/api/ipc-contract.md:136-143`; `src/main/article/model.ts:17-37,100-108`.

### Qué pasa si hay un Article abierto

- `ArticleList.openStory` usa primero el `StoryID` del Article abierto, y solo si no hay Article usa `selectedStoryId`. `src/renderer/src/list/ArticleList/ArticleList.tsx:30-35`.
- `App` contiene una derivación equivalente para el diálogo de borrado:

```ts
const openStory =
  selectedArticle === null ? storyById(selectedStoryId) : storyById(selectedArticle.StoryID)
```

Fuente: `src/renderer/src/App.tsx:25-27`.

- Si el Article abierto apunta a una Story que ya no existe, `storyById` devuelve `null`, `openStory?.ID` es `undefined` y el nuevo Article se abre sin Story preseleccionada. `src/renderer/src/list/ArticleList/ArticleList.tsx:30-35`; `src/renderer/src/state/library-context.tsx:58-59`.
- **Matiz importante:** `article/select` no limpia `selectedStoryId`; por eso no basta con leer `selectedStoryId` en el sidebar cuando hay un Article abierto. El orden Article → Story seleccionada es el que usa `ArticleList`. `src/renderer/src/state/workspace-context.tsx:81-87`; `src/renderer/src/list/ArticleList/ArticleList.tsx:30-35`.

### Caso concreto: crear desde el sidebar estando en Articles sin selección

Hoy el sidebar no puede producir ese caso porque siempre despacha `kind: 'story'`. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:45`. Si se cablea a Article, hay dos subcasos:

1. **Hay Stories cargadas, pero ninguna seleccionada/abierta:** el Article se abre con `StoryID: ''`; el usuario elige la Story en la banda y escribe el título. Es el flujo que ya cubre el test de creación sin Story preseleccionada. `src/renderer/src/App.test.tsx:701-715`.
2. **No hay ninguna Story:** el botón de `ArticleList` está deshabilitado, pero el reducer/Workspace **no** tienen una guarda equivalente. Si el sidebar despacha la creación, se abre un formulario sin opciones de Story y sin posibilidad de guardar; el dominio rechazaría el `storyID` vacío. `src/renderer/src/list/ArticleList/ArticleList.tsx:37-38,50-59,111-113`; `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx:49-67`; `src/main/article/model.ts:90-99`.
3. **Hay Stories pero `storiesTotal` aún es 0 porque están cargando:** `canCreate` es false aunque luego lleguen Stories; `ArticleList` no consulta `storiesStatus`. `src/renderer/src/list/ArticleList/ArticleList.tsx:38`; `src/renderer/src/state/use-list.ts:12-38`. Es una decisión abierta si el sidebar debe esperar al estado `ready` o replicar el mismo comportamiento.

---

## 5. Atajos de teclado actuales

### Hook y teclas

`useShortcuts` registra un listener global sobre `window`:

```ts
export function useShortcuts({ onNewStory, onSave }: ShortcutHandlers): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!event.metaKey && !event.ctrlKey) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'n') {
        event.preventDefault()
        onNewStory()
      } else if (key === 's') {
        event.preventDefault()
        onSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewStory, onSave])
}
```

Fuente: `src/renderer/src/state/use-shortcuts.ts:3-30`.

| Atajo | Tecla | Condición | Acción | `preventDefault` | Fuente |
|---|---|---|---|---|---|
| New Story | `N` | `metaKey` **o** `ctrlKey`; `event.key.toLowerCase() === 'n'` | `onNewStory()` → `navigate({ type: 'create/start', kind: 'story' })` | Sí | `use-shortcuts.ts:11-19`; `App.tsx:34-37` |
| Force save | `S` | `metaKey` **o** `ctrlKey`; `event.key.toLowerCase() === 's'` | `onSave()` → `requestSave()` | Sí | `use-shortcuts.ts:20-23`; `App.tsx:34-37`; `save-registry.ts:9-15` |
| New Article | — | No existe | — | — | Búsqueda sin coincidencias; `use-shortcuts.ts` solo tiene `onNewStory` y `onSave` |

### Modificador por plataforma

- La UI muestra `⌘` en macOS y `Ctrl` en el resto mediante `modifierFor()`/`usePlatformModifier()`. `src/renderer/src/state/use-platform.ts:3-8`.
- El handler real acepta **ambos** `metaKey` y `ctrlKey` en cualquier plataforma; por ejemplo, en Linux `Meta+N` también dispara New Story, y en macOS `Ctrl+N` también. `src/renderer/src/state/use-shortcuts.ts:11-19`.
- El test unitario solo cubre la función de presentación del modificador, no el handler. `src/renderer/src/state/use-platform.test.ts:4-20`.

### Comportamiento del listener

- No comprueba `event.shiftKey` ni `event.altKey`: `Ctrl+Shift+N` y `Ctrl+Alt+N` también entran en la rama `n`. `src/renderer/src/state/use-shortcuts.ts:11-19`.
- No comprueba `event.defaultPrevented`, `event.repeat` ni si el foco está en un `input`, `textarea`, `select`, `contenteditable` o CodeMirror. El listener está en `window`, así que un `Ctrl+N` dentro de un campo de texto también crea una Story. `src/renderer/src/state/use-shortcuts.ts:10-28`.
- Las dependencias del efecto son `[onNewStory, onSave]`; en `App` los callbacks se crean inline en cada render, por lo que el listener se vuelve a registrar en cada render. `src/renderer/src/state/use-shortcuts.ts:29`; `src/renderer/src/App.tsx:34-37`.
- `useShortcuts` no tiene archivo de test propio; se prueba indirectamente en `App.test.tsx`. `src/renderer/src/state/use-shortcuts.ts` no aparece en la lista de `*.test.ts(x)`; los casos están en `src/renderer/src/App.test.tsx:869-919`.

### ¿Hay conflicto si `N` se vuelve contextual?

- **No hay otro listener global de `keydown` en el renderer.** Las otras apariciones de `onKeyDown` son locales a `TagInput`, `use-option-list` (listas), `Modal` (Escape/Tab) y los `<ul>` de las listas; ninguna usa `N`. `src/renderer/src/forms/TagInput/TagInput.tsx:23-59`; `src/renderer/src/list/use-option-list.ts:25-52`; `src/renderer/src/ui/Modal/Modal.tsx:25-58`; búsquedas de `keydown`/`accelerator` en `src/main` sin coincidencias.
- **No hay menú de aplicación ni aceleradores definidos en el repo.** La única referencia relevante es `autoHideMenuBar: true` en la ventana. `src/main/main.ts:12-26`. No hay `Menu`, `globalShortcut` ni `before-input-event` en `src/main`.
- **[Inferencia]** Si `N` pasa a significar «crear el elemento de la biblioteca activa», el conflicto principal no es técnico sino de modelo mental: hoy `Ctrl/Cmd+N` es universalmente New Story, y pasaría a depender del contexto. Además, si se elige un atajo separado como `Ctrl/Cmd+Shift+N`, el handler actual lo interpretaría como New Story porque no mira `shiftKey`; habría que distinguirlo explícitamente.
- **[Inferencia]** El atajo contextual también debe decidir qué hacer cuando no hay Stories: `preventDefault` ya se ejecuta antes de saber si la acción es viable. Si se convierte en no-op, hay que decidir si aun así se consume la tecla.
- **No hay documentación de atajos** en `README.md`, `docs/` ni en la UI más allá del `Kbd` del sidebar y el `Kbd` de `Ctrl S` de la barra de estado. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:53`; `src/renderer/src/shell/StatusBar/StatusBar.tsx:40-43`; búsqueda de `shortcut|keyboard|Ctrl|⌘` en Markdown sin resultados.

---

## 6. Textos visibles/ARIA «New Story» / «New Article» y tests asociados

### Inventario de textos

| Texto | Tipo | Fuente |
|---|---|---|
| `New Story` | Texto visible del botón del sidebar | `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:52` |
| `New Story (${modifier} N)` | `aria-label` del botón del sidebar | `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:43` |
| `New Story (${modifier} N)` | `title` del botón del sidebar | `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:44` |
| `${modifier} N` | Texto visible del `<Kbd>` del sidebar | `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:53` |
| `New Story` | Texto visible del botón del empty state de StoryList | `src/renderer/src/list/StoryList/StoryList.tsx:66` |
| `New Article` | Texto visible del botón del empty state de ArticleList | `src/renderer/src/list/ArticleList/ArticleList.tsx:57` |
| `New Article` | `aria-label` y `title` del `IconButton` del header de ArticleList | `src/renderer/src/list/ArticleList/ArticleList.tsx:112`; `src/renderer/src/ui/IconButton/IconButton.tsx:17-19` |
| «New Article» | Comentario del reducer, no texto de UI | `src/renderer/src/state/workspace-context.tsx:31` |
| `No story yet` | Texto visible del header de ArticleList | `src/renderer/src/list/ArticleList/ArticleList.tsx:111` |
| `A story is required before you can write an article.` | Texto visible del empty state de ArticleList | `src/renderer/src/list/ArticleList/ArticleList.tsx:91-92` |

No se encontraron textos «New Story»/«New Article» en `main`, `preload`, docs ni configuración; son etiquetas del renderer. Búsqueda global limitada a esos literales.

### Tests que fijan el comportamiento actual

| Test / helper | Archivo:líneas | Qué fija |
|---|---|---|
| `library` | `src/renderer/src/App.test.tsx:26-44` | Al cambiar a Articles, `aria-current="page"` pasa al botón `Articles` y se renderiza la región `Articles`; es la prueba existente de la biblioteca activa |
| `creating a story` + `sidebarNewStoryButton` | `src/renderer/src/App.test.tsx:260-278` | El botón del sidebar se encuentra con `name: /New Story/` dentro del `complementary` «Library»; el empty state de Stories tiene un botón exacto `New Story`; al hacer clic en el sidebar se abre el `Story editor` |
| `saves the story as soon as it has a topic...` | `src/renderer/src/App.test.tsx:280-300` | El botón del sidebar inicia una Story y su guardado |
| `writes nothing while the topic is missing, and asks before discarding` | `src/renderer/src/App.test.tsx:302-323` | La creación desde el sidebar pasa por la guarda de navegación |
| `reports a failed write without losing what was typed` | `src/renderer/src/App.test.tsx:325-336` | La creación desde el sidebar conserva el draft ante error |
| `creating an article` + `openNewArticle` | `src/renderer/src/App.test.tsx:666-699` | En Articles, el botón exacto `New Article` del empty state abre el `Article editor`; el Article se crea con Story elegida |
| `writes nothing until it has both a story and a title` | `src/renderer/src/App.test.tsx:701-715` | La validación Story + título y la no escritura |
| `pre-selects the story already in context` | `src/renderer/src/App.test.tsx:717-729` | Una Story seleccionada antes de cambiar a Articles se preselecciona |
| `locks the story selector once the article exists` | `src/renderer/src/App.test.tsx:731-743` | El selector queda deshabilitado tras crear |
| `the New Article button` | `src/renderer/src/App.test.tsx:746-773` | El botón `New Article` se deshabilita sin Stories y muestra `No story yet` / explicación |
| `keyboard shortcuts` | `src/renderer/src/App.test.tsx:869-919` | `Ctrl+N` (con `ctrlKey: true`) abre `Story editor`; `Ctrl+S` fuerza guardado; sin documento no hay error; el sidebar muestra `Ctrl N` |
| `the story editor` + `startNewStory` | `src/renderer/src/App.test.tsx:921-1072` (helper `932-937`) | El botón /New Story/ del sidebar se usa repetidamente como entrada de creación de Story |

### Riesgo de colisión de nombres accesibles

Los siguientes tests buscan `New Article` **sin ámbito**:

- `src/renderer/src/App.test.tsx:676` (helper `openNewArticle`)
- `src/renderer/src/App.test.tsx:724` (preselección)
- `src/renderer/src/App.test.tsx:756` (botón deshabilitado)
- `src/renderer/src/App.test.tsx:770` (empty list)

Hoy el sidebar se llama `New Story (Ctrl N)`, por lo que el único `New Article` es el de la lista. Si el nuevo sidebar usa un `aria-label` exacto `New Article` (sin atajo), esas cuatro búsquedas encontrarían dos botones cuando la biblioteca activa sea Articles: el del sidebar y el de la lista. Si el `aria-label` incluye el atajo, por ejemplo `New Article (Ctrl N)`, el match exacto de Testing Library sigue siendo único. **[Hecho]** El patrón actual del sidebar incluye el atajo en el `aria-label`; **[decisión abierta]** si se conserva ese patrón.

También conviene notar:

- `src/renderer/src/App.test.tsx:917` espera que el texto `Ctrl N` esté dentro del sidebar en la biblioteca Stories. Si el atajo de Articles usa otro texto, este test sigue pasando en Stories, pero no cubre el nuevo caso.
- `src/renderer/src/App.test.tsx:880-886` prueba `Ctrl+N` con la biblioteca por defecto (`stories`). No prueba el comportamiento con Articles activo.
- No hay ningún test del `title` del botón del sidebar ni de su estado colapsado. `src/renderer/src/App.test.tsx:915-917` solo comprueba el texto `Ctrl N`.
- `src/renderer/src/App.test.tsx:263` usa regex `/New Story/` dentro del sidebar; si el nombre contextual conserva `New Story` en Stories, sigue funcionando.

---

## 7. Contrato de tests del renderer

### Configuración

Jest corre en dos proyectos: `main` (node) y `renderer` (jsdom). El proyecto renderer usa `setupFilesAfterEnv` con `src/renderer/src/test/setup.ts` y `ts-jest` con `tsconfig.renderer-test.json`. `jest.config.js:11-36`.
`setup.ts` instala polyfills de `Range` para CodeMirror y hace `cleanup()` después de cada test. `src/renderer/src/test/setup.ts:1-33`.

### Helper de render

`renderApp(port)` monta `DataPortProvider` + `App`, sin router y sin providers adicionales (los providers de estado están dentro de `App`). `src/renderer/src/test/render-app.tsx:1-12`.

### Fake port y factorías

- `createFakePort(options)` devuelve `{ port, calls, createdStories, updatedStories, createdArticles, updatedArticles, deletedStoryIds, deletedArticleIds }`. `src/renderer/src/data/fake/fake-port.ts:21-39,65-103`.
- Opciones relevantes: `stories`, `articles`, fallos de listado/escritura, y gates (`listStoriesGate`, `listArticlesGate`, `updateStoryGate`) para controlar cuándo resuelven las promesas. `src/renderer/src/data/fake/fake-port.ts:5-19`.
- `listStories`/`listArticles` devuelven copias; `createStory`/`createArticle` insertan en el array y devuelven una entidad con ID generado por la factoría; `update` reemplaza; `delete` elimina (y Story elimina sus Articles). `src/renderer/src/data/fake/fake-port.ts:103-196`.
- `makeStory`/`makeArticle` rellenan todos los campos con valores por defecto y permiten overrides. `src/renderer/src/data/fake/factories.ts:3-27`.
- `createDeferred` permite resolver manualmente un gate. `src/renderer/src/test/deferred.ts:1-18`.

### Cómo se simulan teclados y navegación

- Atajos globales: `fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })`. `src/renderer/src/App.test.tsx:880-886`; también `key: 's'` en `897` y `906`.
- Navegación por biblioteca: `fireEvent.click(screen.getByRole('button', { name: 'Articles' }))`. `src/renderer/src/App.test.tsx:35,188,227,250,385,469,545,600,674,754,767,781,892`.
- Selección de entidades: `fireEvent.click(await screen.findByRole('option', { name: /.../ }))`. `src/renderer/src/App.test.tsx:119,353,386,470,546,601,721,782,893,948,971`.
- Listas con teclado: `fireEvent.keyDown(first, { key: 'ArrowDown' })`, `Enter`, `' '`. `src/renderer/src/App.test.tsx:142-156`.
- Edición de CodeMirror: `articleView()`, `selectEditorText()`, `replaceEditorText()` usando `EditorView.findFromDOM`. `src/renderer/src/App.test.tsx:428-450`.
- Los tests de artículos abren la biblioteca Articles y hacen clic en una opción; no usan `userEvent`. `src/renderer/src/App.test.tsx:463-474`.
- No hay un helper específico para el sidebar: `sidebarNewStoryButton` es local al `describe('creating a story')`. `src/renderer/src/App.test.tsx:261-264`.

### Convenciones observadas

- Los tests usan `findBy...`/`waitFor` para la carga asíncrona y los guards, y `act(...)` para dispatch directo de CodeMirror. `src/renderer/src/App.test.tsx:139-156,291-297,443-449,490-494`.
- Se verifica el nombre accesible (`getByRole('button', { name: ... })`), no clases CSS. `src/renderer/src/App.test.tsx:273,676,756`.
- No se testea el sidebar colapsado ni el `title`; no hay test unitario de `useShortcuts`.

---

## 8. Restricciones de arquitectura/estilo relevantes

| Fuente | Regla / hecho | Impacto para este cambio |
|---|---|---|
| `AGENTS.md:45` | El renderer nunca importa el dominio ni los adapters; solo consume `window.draftwrite` a través de `DataPort`. | El cambio debe quedarse en componentes/hooks/estado del renderer; no requiere tocar `src/main`, preload ni `DataPort`. |
| `AGENTS.md:47-52` | Dominio no anémico, IDs generados por constructores, `storyID` inmutable, errores centinela. | La creación sigue pasando por `createArticle`; no se debe construir un Article en el renderer ni asignar IDs. |
| `AGENTS.md:54-64` | Tests existentes son contrato; no modificarlos para hacer pasar una implementación; usar fakes; renderer con Jest/jsdom/Testing Library. | Los tests actuales que colisionen deberán tratarse con cuidado; el plan debe justificar cualquier actualización y añadir regresiones. |
| `AGENTS.md:66-72` | Cambios pequeños y enfocados; no introducir abstracciones sin necesidad; no modificar APIs sin justificar; no ampliar alcance. | Evitar extraer un «creation service» o un store nuevo; reutilizar `create/start` y la lógica existente. |
| `AGENTS.md:76-78` | Comunicación en español; código/identificadores/comentarios en inglés; planificación en español. | El informe y el futuro plan van en español; los nombres nuevos (`NewArticleButton`, etc.) en inglés. |
| `src/renderer/src/state/use-navigation.ts:5-21` | «Every navigation goes through here»; si hay un draft no persistido, la acción espera en `pendingNavigation` y el usuario confirma en `App`. | El nuevo botón/atajo debería seguir usando `useWorkspaceNavigation` si se quiere conservar el guard actual; despachar `create/start` directamente lo saltaría. |
| `GLOSSARY.md:7-12` | `Story` es la unidad padre; `Article` se deriva de exactamente una Story. | No se puede crear un Article sin Story; el flujo sin Story debe bloquearse o redirigirse. |
| `docs/adr/0004-frontend-state-without-global-store.md:3-9` | Estado en reducer de workspace + provider de biblioteca + store mínimo de estado; sin Redux/Zustand/React Query. | La biblioteca activa y la creación ya viven en el reducer; no hace falta un store nuevo. |
| `docs/adr/0005-entity-born-from-identifiers.md:3-7` | Story nace con `topic`; Article nace con `storyID` + `title`; el resto es opcional; vacío = `""`; `storyID` inmutable. | El formulario de Article debe exigir Story + título; no se puede guardar un Article con Story vacía. |
| `docs/adr/0007-design-tokens-from-daisyui-theme.md:3-7` | Los colores salen del tema dracula de daisyUI; no se declaran hex propios; hay tokens semánticos. | Cualquier ajuste visual del botón debe reutilizar clases existentes (`bg-neutral`, `text-primary`, `border-line-strong`, etc.), no nuevos colores. |
| `src/renderer/src/ui/IconButton/IconButton.tsx:4-19` | `IconButton` exige `label` y lo usa como `aria-label` y `title`; los iconos van `aria-hidden`. | Si se usa `IconButton` para el nuevo botón, el nombre accesible se controla con `label`. |
| Código del renderer | Todos los textos de UI están hardcodeados en inglés; no hay librería de i18n en `package.json` ni archivos de traducción. | **[Hecho]** El cambio debe mantener textos en inglés; no hay infraestructura de i18n que actualizar. |
| Código del renderer | Convención observada: `aria-label` + `title` en botones icon-only, `aria-current` en navegación, `aria-pressed` en toggles, `role="status"` para validación. | **[Inferencia]** Conviene preservar nombre accesible y tooltip contextuales, sobre todo en sidebar colapsado. No hay una política de accesibilidad escrita en `AGENTS.md`. |

---

## 9. Edge cases y decisiones abiertas

### 9.1 ¿El atajo debe ser el mismo `N` contextual o uno distinto por tipo?

| Opción | Ventajas | Costes / riesgos | Evidencia relevante |
|---|---|---|---|
| **A. `Ctrl/Cmd+N` contextual** (Story en Stories, Article en Articles) | Un solo atajo coherente con el botón; el `Kbd` del sidebar siempre puede mostrar `N`; no hay que añadir otra combinación | Cambia el significado de un atajo ya establecido; el usuario puede crear un Article sin querer; hay que decidir qué hacer sin Stories; los tests actuales de `Ctrl+N` solo cubren Stories | `use-shortcuts.ts:8-24`; `App.tsx:34-37`; `App.test.tsx:880-886` |
| **B. `N` sigue siendo New Story + otro atajo para New Article** | Conserva la memoria muscular; el atajo de Story es predecible; el `Kbd` contextual puede mostrar uno u otro | Hay que elegir una combinación; el handler actual no distingue `shift`/`alt`; el botón contextual mostraría un atajo distinto según biblioteca; más superficie de test | `use-shortcuts.ts:11-19` (hoy `Ctrl+Shift+N` también cae en Story) |
| **C. Dos atajos fijos, ambos visibles según contexto** | Comportamiento estable por tipo; no hay ambigüedad de significado | Más carga de aprendizaje; el `Kbd` cambia con la biblioteca; puede chocar con convenciones del sistema/navegador (fuera del repo) | No hay infraestructura de atajos más allá de `useShortcuts` |
| **D. Sin atajo para New Article por ahora** | Cambio mínimo; solo botón contextual | Incumple la petición de «mostrar su atajo» si se interpreta que Article debe tener uno; inconsistencia entre botones | `Sidebar.tsx:53`; no existe atajo de Article |

Preguntas abiertas:

- ¿`N` debe conservar el significado de New Story y añadirse otra tecla para Article, o debe ser contextual?
- Si es contextual, ¿qué debe pasar cuando la biblioteca es Articles y no hay ninguna Story?
- ¿El `Kbd` del sidebar debe mostrar siempre el atajo del tipo activo, o solo cuando hay una acción posible?

### 9.2 ¿Qué hacer si la biblioteca activa es Articles pero no hay Story?

Hechos:

- `ArticleList` deshabilita sus dos botones cuando `storiesTotal === 0` y muestra `No story yet` en el header o la explicación en el empty state. `src/renderer/src/list/ArticleList/ArticleList.tsx:37-38,88-96,111-113`.
- El reducer y `Workspace` no tienen una guarda equivalente: aceptarían `create/start` con `kind: 'article'` y abrirían un formulario sin Story. `src/renderer/src/state/workspace-context.tsx:98-99`; `src/renderer/src/workspace/Workspace/Workspace.tsx:24-30`.
- El dominio rechaza `storyID` vacío. `src/main/article/model.ts:90-99`.

Opciones:

| Opción | Comportamiento | Ventajas | Costes |
|---|---|---|---|
| **A. Deshabilitar el botón y el atajo** | En Articles sin Stories, `New Article` aparece deshabilitado (o con explicación); `N` no crea nada | Coherente con `ArticleList`; evita un formulario muerto | Un `disabled` no siempre muestra tooltip; el atajo debe consumir o no la tecla; el sidebar deja de ser una vía para crear una Story desde Articles |
| **B. Fallback a New Story** | Si no hay Stories, `New Article`/`N` crea una Story (y quizá cambia la biblioteca a Stories) | Desbloquea al usuario; siempre hay una acción útil | Sorprende: el botón dice New Article pero crea Story; hay que decidir si cambia la biblioteca activa; rompe la semántica del botón contextual |
| **C. Abrir el formulario de Article sin Story y dejar que el usuario elija** | Se abre `ArticleBand` con `Choose a story…` | Útil si hay Stories pero aún no se cargaron o no hay selección | Si no hay ninguna Story, el formulario no se puede completar; el dominio rechaza el guardado; no resuelve el caso sin Stories |
| **D. Mantener el botón de Story en el sidebar y añadir New Article solo en la lista** | El sidebar sigue creando Story; Article se crea desde ArticleList | No requiere decidir el caso sin Story | No cumple el requisito de botón contextual; duplica entradas |

Preguntas abiertas:

- ¿El botón debe deshabilitarse, ocultarse, cambiar a New Story o mostrar un estado de error?
- ¿El atajo debe hacer lo mismo que el botón o simplemente no hacer nada?
- ¿Debe considerarse `storiesStatus === 'loading'` como «todavía no hay Stories» o esperar a `ready`?
- ¿La comprobación debe usar `storiesTotal` (todas) o `allStories.length` (equivalente en `LibraryData`) para no depender del filtro? `src/renderer/src/state/library-context.tsx:52-54`.

### 9.3 ¿Qué Story debe preseleccionarse?

Hechos: `ArticleList` usa Article abierto → Story seleccionada → `null`. `src/renderer/src/list/ArticleList/ArticleList.tsx:30-35`. `App` usa la misma precedencia para el borrado. `src/renderer/src/App.tsx:25-27`.

Opciones:

| Opción | Comportamiento | Ventajas | Costes |
|---|---|---|---|
| **A. Replicar la precedencia de `ArticleList`** | Article abierto (su `StoryID`) → Story seleccionada → sin preselección | Consistente con el resto de la app; cubre el caso de Article abierto con `selectedStoryId` obsoleto | Duplica lógica si no se extrae un helper; requiere que el sidebar lea `selectedArticleId`, `selectedStoryId`, `articleById` y `storyById` |
| **B. Usar solo `selectedStoryId`** | La Story seleccionada, aunque haya un Article abierto | Más simple | Puede preseleccionar una Story distinta a la del Article abierto; contradice el comportamiento actual de `ArticleList` |
| **C. No preseleccionar nunca desde el sidebar** | Siempre `Choose a story…` | Obliga a decidir explícitamente | Peor UX cuando ya hay contexto; difiere de `ArticleList` |

Preguntas abiertas:

- ¿El botón del sidebar debe compartir exactamente la misma resolución de contexto que `ArticleList`?
- Si hay un Article abierto cuya Story ya no existe, ¿debe caer a `selectedStoryId`, a ninguna, o mostrar un aviso?
- ¿Debe extraerse la resolución a un helper común (nuevo módulo) o mantenerse duplicada para evitar una abstracción? `AGENTS.md:68-72`.

### 9.4 ¿Debe cambiar el botón si el sidebar está colapsado?

Hechos: colapsado (o por debajo de `lg`) solo se ve el icono; el `aria-label`/`title` siguen siendo la fuente del nombre accesible. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:43-54`.

Opciones:

| Opción | Comportamiento | Ventajas | Costes |
|---|---|---|---|
| **A. Cambiar siempre el nombre accesible y el tooltip** | `aria-label`/`title` = `New Article (…)` cuando Articles, aunque solo se vea el icono | Correcto para lectores de pantalla; el tooltip explica la acción | El icono visual no distingue Story de Article; un usuario vidente con sidebar colapsado no sabe qué creará |
| **B. Cambiar también el icono** | `PlusCircle` para Story y, por ejemplo, `FileText`/`Plus` para Article | La pista visual sobrevive al colapso | Hay que elegir icono y color; puede romper la consistencia con el `PlusCircle` actual; más cambios visuales |
| **C. No cambiar nada cuando está colapsado** | Mantiene `New Story` y crea Story | Mínimo cambio | Contradice el requisito de botón contextual y confunde a usuarios de lector de pantalla/tooltip |
| **D. Ocultar el botón o mostrar un menú al colapsar** | El icono abre un menú con ambas acciones | Evita ambigüedad | Añade un patrón de UI nuevo; más alcance del pedido |

Preguntas abiertas:

- ¿El icono debe seguir siendo `PlusCircle` o cambiar según el tipo?
- ¿El `Kbd` debe seguir dentro del texto oculto o mostrarse de otra forma cuando el sidebar está colapsado?
- ¿El nombre accesible debe incluir el atajo, como hoy?

### 9.5 Drafts sin guardar y `use-navigation`

Hechos:

- Todas las entradas de creación usan `useWorkspaceNavigation`, que intercepta la acción si `hasUnsavedDraft()` es true y guarda la acción en `pendingNavigation`; el diálogo de `App` la despacha solo al confirmar `Discard and leave`. `src/renderer/src/state/use-navigation.ts:5-21`; `src/renderer/src/App.tsx:59-70`.
- `hasUnsavedDraft` es un singleton de módulo que el editor publica; el ArticleEditor lo pone a true solo cuando `hasContent(next) && !canPersist(next)`, es decir, cuando hay contenido pero falta Story o título. `src/renderer/src/state/status-store.ts:36-48`; `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:81-86`.
- Si el draft es persistible pero todavía no se escribió, `hasUnsavedDraft` es false y el `flush` de `useDraftPersistence` escribe al desmontar. `src/renderer/src/state/use-draft-persistence.ts:122-137`.
- `library/select` limpia `creating` y `creatingStoryId`, pero no las selecciones; si hay un draft inválido, el cambio de biblioteca también pasa por el guard. `src/renderer/src/state/workspace-context.tsx:70-71,98-101`.
- **[Inferencia]** Abrir New Article con una Story preseleccionada y no tocar ningún campo no publica el draft como «unsaved»: `publishUnsavedDraft` solo se llama desde `change`, no en el montaje inicial. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:81-86`. Por eso un cambio inmediato de biblioteca no abriría el diálogo si no se editó nada.

Consecuencias:

- **[Hecho]** Un clic en el nuevo botón contextual o un `Ctrl/Cmd+N` mientras hay un draft inválido no cambia de inmediato: aparece el `ConfirmDialog` existente. `src/renderer/src/App.tsx:59-70`.
- **[Hecho]** Si el draft es válido pero está pendiente de guardar, la creación navega y el desmontaje dispara el guardado pendiente; no hay diálogo. `src/renderer/src/state/use-draft-persistence.ts:122-137`.
- **[Decisión abierta]** ¿El atajo contextual debe seguir usando `navigate` (y por tanto el guard) o debe tener un comportamiento especial cuando la biblioteca activa es Articles? Lo coherente con el resto es usar `navigate`, pero el caso sin Story puede hacer que el guard se muestre antes de saber que la creación no es viable.

### 9.6 Otros edge cases

- **[Hecho]** `Ctrl+N` se dispara aunque el foco esté dentro del editor o de un campo; no hay filtro de target. `src/renderer/src/state/use-shortcuts.ts:10-28`. ¿Se mantiene ese comportamiento para New Article?
- **[Hecho]** El listener global no se desactiva cuando hay un `ConfirmDialog` abierto; el modal solo maneja Escape/Tab localmente. `src/renderer/src/ui/Modal/Modal.tsx:25-58`; `src/renderer/src/state/use-shortcuts.ts:26-28`. ¿Puede un atajo crear algo detrás del diálogo?
- **[Hecho]** `useShortcuts` no comprueba `event.repeat`; mantener pulsada la tecla puede disparar la acción varias veces. `src/renderer/src/state/use-shortcuts.ts:10-24`. ¿Es aceptable para Article?
- **[Hecho]** El `Kbd` del sidebar se oculta con el texto; el de la barra de estado (`Ctrl S`) se muestra dentro de `showingDocument`. `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:49-54`; `src/renderer/src/shell/StatusBar/StatusBar.tsx:20,38-43`. ¿Debe el atajo de Article tener un indicador fuera del sidebar?
- **[Hecho]** `LibraryNav` no tiene atajos para Stories/Articles. `src/renderer/src/sidebar/LibraryNav/LibraryNav.tsx:16-36`. No existe un patrón de «cambiar biblioteca con teclado» que reutilizar.

---

## 10. Inventario de archivos probablemente afectados

### Producción (solo lectura en esta investigación)

| Archivo | Papel actual | Por qué podría cambiar |
|---|---|---|
| `src/renderer/src/sidebar/Sidebar/Sidebar.tsx` | Botón inferior hardcodeado a Story; lee `sidebarCollapsed`, `navigate`, `modifier` | Es el componente que debe volverse contextual; necesita leer `library` y, si se decide, el contexto de Story y `storiesTotal`/`storiesStatus` |
| `src/renderer/src/state/use-shortcuts.ts` | Listener global `Ctrl/Cmd+N` → Story | Debe aceptar una acción contextual o un callback distinto; si se elige un atajo separado, debe distinguir `shift`/`alt` y documentar la combinación |
| `src/renderer/src/App.tsx` | Cablea `onNewStory` y `onSave`; ya lee `library` y deriva `openStory` | Es el punto natural para pasar la biblioteca activa al hook de atajos y/o reutilizar la resolución de contexto; no necesita cambios de contrato |
| `src/renderer/src/list/ArticleList/ArticleList.tsx` | Contiene `openStory`, `canCreate` y `startNew` | Fuente de la lógica que el sidebar debe replicar o compartir; sus botones ya implementan las condiciones que el sidebar necesitaría |
| `src/renderer/src/state/workspace-context.tsx` | Define `Library`, `CreateKind`, `creatingStoryId` y `create/start` | Probablemente no necesita cambios funcionales: la acción ya soporta `kind: 'article'` y `storyId`; quizá solo un comentario o un helper de derivación |
| `src/renderer/src/state/library-context.tsx` | Expone `storiesTotal`, `allStories`, `storyById`, `articleById` | Ya tiene los datos necesarios para el sidebar; no parece requerir cambios |
| `src/renderer/src/workspace/Workspace/Workspace.tsx` | Renderiza `ArticleEditor` cuando `creating === 'article'` | No necesitaría cambios si el sidebar usa `create/start`; sí es el punto donde se ve el caso sin Story |
| `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx` | Construye el draft y valida Story + título | No necesitaría cambios si recibe `initialStoryId`; podría necesitar un aviso o comportamiento distinto si se decide otro flujo sin Story |
| `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx` | Selector de Story y validación visible | No necesitaría cambios para el botón contextual; es relevante para el caso sin Story |
| `src/renderer/src/sidebar/LibraryNav/LibraryNav.tsx` | Fuente de `library` activa en la navegación | No parece requerir cambios; sirve como referencia de cómo se lee la biblioteca |
| `src/renderer/src/ui/Kbd/Kbd.tsx` | Renderiza el atajo | Reutilizable; no necesita cambios salvo que se decida otro formato visual |
| `src/renderer/src/state/use-platform.ts` | Modificador mostrado (`⌘`/`Ctrl`) | Reutilizable; no necesita cambios |

### Tests (no modificados en esta investigación)

| Archivo / bloque | Por qué podría necesitar actualización |
|---|---|
| `src/renderer/src/App.test.tsx:260-337` | Usa el botón del sidebar como `New Story` con regex dentro del `complementary`; en la biblioteca Stories debería seguir funcionando, pero conviene revisar el nombre si se cambia el patrón de `aria-label` |
| `src/renderer/src/App.test.tsx:666-744` | `openNewArticle` y el test de preselección buscan `New Article` exacto sin ámbito; riesgo de colisión con el nuevo botón del sidebar si su nombre accesible no incluye el atajo |
| `src/renderer/src/App.test.tsx:746-773` | `getByRole('button', { name: 'New Article' })` sin ámbito en los dos casos de botón deshabilitado |
| `src/renderer/src/App.test.tsx:869-919` | Los tests de atajos solo cubren `Ctrl+N` en Stories y el texto `Ctrl N` del sidebar; faltaría el caso Articles y el caso sin Story |
| `src/renderer/src/App.test.tsx:921-1072` | `startNewStory` usa el sidebar con `/New Story/`; sigue siendo válido en Stories, pero no cubre el botón contextual |
| `src/renderer/src/state/use-platform.test.ts` | Probablemente no necesita cambios; solo cubre el texto del modificador |
| Posible nuevo test de `use-shortcuts` | Hoy no existe; si el contrato del hook cambia, puede ser útil un test unitario, pero los tests de integración de `App` ya cubren el comportamiento observable |

### Backend / contrato

- **[Hecho]** No hace falta cambiar `DataPort`, preload, handlers IPC, servicios ni modelos: `createArticle` ya existe y `create/start` ya acepta `kind: 'article'` con `storyId` opcional. `src/renderer/src/data/port.ts:10-27`; `src/renderer/src/state/workspace-context.tsx:16,46,98-99`; `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:49-60`.
- **[Hecho]** No hay cambios de base de datos ni migraciones asociados a este cambio.
- **[Hecho]** No hay documentación de atajos que actualizar; si se decide documentar la combinación, no existe hoy una sección canónica en `README.md` ni en `docs/`. `README.md:1-34`; búsqueda de `shortcut|keyboard` en Markdown sin resultados.

---

## Preguntas para cerrar antes de planificar

1. **Atajo:** ¿`Ctrl/Cmd+N` contextual (Story/Article según biblioteca), o `N` sigue siendo Story y New Article usa otra combinación? Si es otra, ¿cuál y cómo se muestra en el `Kbd`?
2. **Sin Story:** con la biblioteca Articles y cero Stories, ¿el botón se deshabilita, se convierte en New Story, abre un Article incompleto o no hace nada? ¿Y el atajo?
3. **Preselección:** ¿el sidebar debe replicar exactamente `ArticleList` (Article abierto → Story seleccionada → ninguna), o usar solo la Story seleccionada?
4. **Sidebar colapsado:** ¿basta con cambiar `aria-label`/`title`, o también el icono/color para que la acción sea distinguible sin texto?
5. **Nombre accesible:** ¿se mantiene el patrón actual `New Article (Ctrl N)` en `aria-label` y `title`, o se usa `New Article` exacto? Esto determina si los tests existentes colisionan.
6. **Carga de Stories:** ¿el botón debe esperar a `storiesStatus === 'ready'` antes de decidir que no hay Stories, o replicar el comportamiento actual de `ArticleList` (solo `storiesTotal > 0`)?
7. **Drafts:** ¿el nuevo botón/atajo debe seguir pasando por `useWorkspaceNavigation` y el `ConfirmDialog` actual, incluso cuando la creación de Article no sea viable por falta de Story?
8. **Alcance:** ¿se acepta que el cambio sea solo renderer (sidebar + hook + tests), sin tocar `DataPort` ni el dominio?

---

## Fuentes principales consultadas

- `src/renderer/src/sidebar/Sidebar/Sidebar.tsx`
- `src/renderer/src/sidebar/LibraryNav/LibraryNav.tsx`
- `src/renderer/src/list/StoryList/StoryList.tsx`
- `src/renderer/src/list/ArticleList/ArticleList.tsx`
- `src/renderer/src/list/ListEmpty/ListEmpty.tsx`
- `src/renderer/src/state/workspace-context.tsx`
- `src/renderer/src/state/library-context.tsx`
- `src/renderer/src/state/use-navigation.ts`
- `src/renderer/src/state/use-shortcuts.ts`
- `src/renderer/src/state/use-platform.ts`
- `src/renderer/src/state/use-draft-persistence.ts`
- `src/renderer/src/state/status-store.ts`
- `src/renderer/src/workspace/Workspace/Workspace.tsx`
- `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx`
- `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx`
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx`
- `src/renderer/src/data/drafts.ts`
- `src/renderer/src/data/port.ts`
- `src/renderer/src/data/fake/fake-port.ts`
- `src/renderer/src/data/fake/factories.ts`
- `src/renderer/src/test/render-app.tsx`
- `src/renderer/src/test/setup.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/App.test.tsx`
- `src/main/article/model.ts`
- `docs/adr/0004-frontend-state-without-global-store.md`
- `docs/adr/0005-entity-born-from-identifiers.md`
- `docs/adr/0007-design-tokens-from-daisyui-theme.md`
- `docs/api/ipc-contract.md`
- `AGENTS.md`
- `GLOSSARY.md`
- `jest.config.js`
- `package.json`
