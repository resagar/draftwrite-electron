# Investigación: preview de Markdown en la creación de Story

**Estado:** investigación de solo lectura. No se modificó código de producción ni tests.
**Fecha:** 2026-10-20.
**Objetivo:** explicar por qué el editor de Story no muestra preview de Markdown, reconstruir cómo se implementó en Article y determinar si el componente usado allí puede reutilizarse en Story.

Convenciones de este informe:

- **[Hecho]**: verificado leyendo código, tests, configuración o historial git del repo.
- **[Inferencia]**: consecuencia razonable de los hechos, pero no una regla escrita en el repo.
- **[Decisión abierta]**: el repo no la resuelve; requiere que la persona usuaria elija.

---

## Resumen ejecutivo

- **[Hecho]** Sí existe un componente específico y reutilizable: `MarkdownPreview`, en `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx:74`. Recibe únicamente `{ markdown: string }`, no tiene estado ni imports de dominio, datos o servicios.
- **[Hecho]** `MarkdownPreview` solo se usa en `ArticleEditor` (`src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:18,128`). `StoryEditor` no lo importa ni usa el estado `viewMode` (`src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:1-16,94-103`).
- **[Hecho]** El modo de vista (`'edit' | 'split' | 'preview'`) vive en el reducer global del workspace, no en el estado del Article: `src/renderer/src/state/workspace-context.tsx:14,26,43,59,92-93`. Su valor inicial es `'split'` (`:59`).
- **[Hecho]** El layout de Article alterna editor y preview con dos flags derivados de `viewMode` (`ArticleEditor.tsx:89-90`) y un contenedor de dos columnas (`:110-131`). La toolbar de formato se oculta cuando solo se muestra el preview (`:108`).
- **[Hecho]** El conmutador Edit/Split/Preview (`ViewModeSwitcher`) solo se renderiza en `ArticleHeader` (`src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx:6,34`), que a su vez solo se monta para un Article almacenado (`ArticlePane.tsx:13`).
- **[Hecho]** Durante la **creación** de Article tampoco hay conmutador visible, porque `Workspace` monta `ArticleEditor` directamente sin `ArticleHeader` (`Workspace.tsx:24-30`). El preview se ve igual porque `viewMode` inicia en `'split'`. Es decir: el preview no depende de la presencia del switcher, sino del estado global.
- **[Hecho]** `StoryEditor` se usa tanto para crear (`Workspace.tsx:16-22`) como para editar (`:53-58`), así que el diagnóstico y la reutilización aplican a ambos flujos.
- **[Hecho]** Todo el preview nació en un único commit, `656e46f feat(renderer): port the real React frontend`; no hubo un commit posterior que lo agregara y quitara en Story. La ausencia es una omisión del port, no una decisión documentada.
- **[Inferencia]** La reutilización es mecánica: importar `MarkdownPreview` en `StoryEditor`, leer `viewMode`, replicar el layout de dos columnas y condicionar la toolbar. No requiere dependencias nuevas (`react-markdown` y `remark-gfm` ya están en `package.json:46-47`).
- **[Decisión abierta]** La única pieza sin hogar en Story es el `ViewModeSwitcher`: `StoryEditor` no tiene header. Hay que decidir si se monta en `StoryBand`, en una toolbar/header nuevo o si no se monta en creación.

---

## 1. Mapa de la UI de Story y Article

### Story (creación y edición)

- **[Hecho]** `Workspace` monta `<StoryEditor stored={null} />` cuando `creating === 'story'` (`src/renderer/src/workspace/Workspace/Workspace.tsx:16-22`, montaje en `:19`).
- **[Hecho]** Para una Story existente monta `<StoryEditor key={story.ID} stored={story} />` (`Workspace.tsx:53-58`, montaje en `:56`).
- **[Hecho]** `StoryEditor` decide creación con `const creating = stored === null` (`src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:36`).
- **[Hecho]** Los metadatos viven en `StoryBand` (Topic, Titles, Tags, Discard): `src/renderer/src/workspace/StoryBand/StoryBand.tsx:63-99`.
- **[Hecho]** No existe un `StoryHeader` ni equivalente a `ArticleHeader` en el repo.

### Article (creación y edición)

- **[Hecho]** Creación: `Workspace` monta `<ArticleEditor stored={null} initialStoryId={creatingStoryId ?? ''} />` (`Workspace.tsx:24-30`, montaje en `:27`). No se monta `ArticlePane` ni `ArticleHeader`.
- **[Hecho]** Edición: `Workspace` monta `<ArticlePane article={article} story={story} />` (`Workspace.tsx:34-49`, montaje en `:46`).
- **[Hecho]** `ArticlePane` monta `ArticleHeader` y luego `<ArticleEditor key={article.ID} stored={article} />` (`src/renderer/src/workspace/ArticlePane/ArticlePane.tsx:13,16`).
- **[Hecho]** `ArticleHeader` es el único host del `ViewModeSwitcher` (`ArticleHeader.tsx:6,34`).

### Editor y toolbar compartidos

- **[Hecho]** El editor de texto es CodeMirror 6 vía `@uiw/react-codemirror`: `src/renderer/src/editor/TextEditor/TextEditor.tsx:23-39`.
- **[Hecho]** `EditorToolbar` es compartido por Story y Article (`StoryEditor.tsx:15,94`; `ArticleEditor.tsx:17,108`).
- **[Hecho]** Las extensiones del editor fijan `aria-label: 'Article text'` de forma global (`src/renderer/src/editor/extensions.ts:7`), por lo que el editor de Story también expone un textbox llamado «Article text». Los tests de Story no lo consultan por nombre: usan `.cm-content` mediante `replaceEditorText` (`App.test.tsx:428-450`).

---

## 2. Cómo está implementado el preview en Article

### 2.1 Componente `MarkdownPreview`

Archivo: `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx`.

```tsx
// MarkdownPreview.tsx:1-6
import type { Components } from 'react-markdown'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const PLUGINS = [remarkGfm]
```

```tsx
// MarkdownPreview.tsx:74-84
export function MarkdownPreview({ markdown }: { markdown: string }): JSX.Element {
  return (
    <section aria-label="Preview" className="min-w-0 flex-1">
      <article className="mx-auto max-w-[560px] p-8 select-text">
        <ReactMarkdown remarkPlugins={PLUGINS} components={COMPONENTS}>
          {markdown}
        </ReactMarkdown>
      </article>
    </section>
  )
}
```

| Aspecto | Valor | Fuente |
|---|---|---|
| Nombre | `MarkdownPreview` | `MarkdownPreview.tsx:74` |
| Export | Named export; no hay `export default` | `MarkdownPreview.tsx:74` |
| Props | `{ markdown: string }` inline; no hay tipo/interface exportada | `MarkdownPreview.tsx:74` |
| Estado interno | Ninguno; sin hooks | `MarkdownPreview.tsx:1-84` |
| Dependencias | `react-markdown ^10.1.0`, `remark-gfm ^4.0.1` | `package.json:46-47` |
| Render | `ReactMarkdown` con `remarkGfm` y un mapa `Components` de estilos | `MarkdownPreview.tsx:6,82-84` |
| Estilos | Tailwind 4 + tokens semánticos daisyUI (`text-secondary`, `bg-base-300`, `marker:text-primary`, `border-line`, etc.) | `MarkdownPreview.tsx:8-72`; `src/renderer/src/global.css:20` |
| Accesibilidad | Región con `aria-label="Preview"`; el artículo interno usa `select-text` | `MarkdownPreview.tsx:76-77` |

**[Hecho]** El mapa `COMPONENTS` estiliza `h1`, `h2`, `h3`, `p`, `a`, `strong`, `em`, `blockquote`, `ul`, `ol`, `code`, `pre`, `table`, `th`, `td`, `del` y `hr` (`MarkdownPreview.tsx:8-72`). No se usa `@tailwindcss/typography`; los estilos son explícitos.

### 2.2 Estado del modo de vista

```ts
// workspace-context.tsx:14
export type ViewMode = 'edit' | 'split' | 'preview'
```

- **[Hecho]** `viewMode` forma parte de `WorkspaceState` (`workspace-context.tsx:26`).
- **[Hecho]** La acción es `{ type: 'viewMode/select'; viewMode: ViewMode }` (`:43`).
- **[Hecho]** El valor inicial es `'split'` en `initialWorkspaceState` (`:53,59`).
- **[Hecho]** El reducer solo reemplaza el modo: `return { ...state, viewMode: action.viewMode }` (`:92-93`).
- **[Hecho]** El estado es global y compartido por todo el workspace; no hay `viewMode` por entidad ni por editor.
- **[Hecho]** `story/select` y `article/select` no resetean `viewMode` (`workspace-context.tsx:68-83`).

### 2.3 Cableado en `ArticleEditor`

```tsx
// ArticleEditor.tsx:39
const { viewMode } = useWorkspace()

// ArticleEditor.tsx:89-90
const showsEditor = viewMode !== 'preview'
const showsPreview = viewMode !== 'edit'
```

```tsx
// ArticleEditor.tsx:108
{showsEditor ? <EditorToolbar view={view} /> : null}

// ArticleEditor.tsx:110-131
<div className="flex min-h-0 flex-1">
  <div
    className={cn(
      'min-h-0 min-w-0',
      showsEditor ? 'flex-1' : 'hidden',
      showsEditor && showsPreview ? 'border-r border-base-300' : ''
    )}
  >
    <TextEditor
      value={draft.Text}
      onChange={(text) => change({ ...draft, Text: text })}
      onCursorChange={publishCursor}
      onCreate={setView}
    />
  </div>

  {showsPreview ? (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <MarkdownPreview markdown={draft.Text} />
    </div>
  ) : null}
</div>
```

Consecuencias del cableado:

| `viewMode` | Editor | Toolbar | Preview |
|---|---|---|---|
| `'edit'` | Visible (`flex-1`) | Visible | Oculto |
| `'split'` | Visible (`flex-1`, con `border-r`) | Visible | Visible (`flex-1`, scroll propio) |
| `'preview'` | Oculto (`hidden`) | Oculto | Visible (`flex-1`) |

Fuente: `ArticleEditor.tsx:89-90,108,110-131`.

### 2.4 `ViewModeSwitcher`

- **[Hecho]** Renderiza un grupo `role="group"` con `aria-label="View mode"` (`ViewModeSwitcher.tsx:16-18`).
- **[Hecho]** Tres botones: `Edit`, `Split`, `Preview` (`:5-9`).
- **[Hecho]** Cada botón despacha `viewMode/select` y expone `aria-pressed` (`:28-29`).
- **[Hecho]** Solo se monta en `ArticleHeader` (`ArticleHeader.tsx:34`). En la creación de Article no se monta, pero el modo inicial `'split'` hace visible el preview igualmente.

---

## 3. Por qué Story no tiene preview

### Evidencia

- **[Hecho]** `StoryEditor` importa y reutiliza `TextEditor`, `EditorToolbar`, `useDraftPersistence`, `useEditorStatus`, `registerSave` y `EditorError` (`StoryEditor.tsx:1-16`), pero **no** importa `MarkdownPreview` ni `useWorkspace`.
- **[Hecho]** En `StoryEditor` el cuerpo es de una sola columna:

```tsx
// StoryEditor.tsx:94-103
<EditorToolbar view={view} />

<div className="min-h-0 flex-1">
  <TextEditor
    value={draft.Text}
    onChange={(text) => change({ ...draft, Text: text })}
    onCursorChange={publishCursor}
    onCreate={setView}
  />
</div>
```

- **[Hecho]** Una búsqueda de `MarkdownPreview|viewMode|ViewModeSwitcher` en `src/renderer/src` devuelve referencias solo en `workspace-context.tsx`, `ArticleEditor.tsx`, `ArticleHeader.tsx`, `ViewModeSwitcher.tsx` y `App.test.tsx`. No hay ninguna en `StoryEditor.tsx` ni en `StoryBand.tsx`.
- **[Hecho]** `git log --oneline --` sobre `MarkdownPreview.tsx`, `ViewModeSwitcher.tsx`, `ArticleEditor.tsx` y `StoryEditor.tsx` devuelve un único commit: `656e46f feat(renderer): port the real React frontend`. `git log -S"MarkdownPreview"` y `git log -S"viewMode"` también apuntan solo a ese commit.
- **[Hecho]** No existe un commit que haya introducido y luego eliminado el preview de Story. La rama tiene 18 commits y no hay intento previo implementado.
- **[Hecho]** No hay ADR, nota ni ticket sobre el preview: `grep -rni "preview" docs/ .scratch/ README.md` no devuelve resultados (salvo el uso genérico de «vista» en la navegación).

### Diagnóstico

**[Inferencia]** El preview se implementó junto con el layout de Article y el editor de Story se portó como una variante simplificada de una sola columna, reutilizando el editor y la toolbar pero omitiendo el bloque de preview y el conmutador. No hay evidencia de una restricción deliberada: `MarkdownPreview` no tiene acoplamientos a Article y `viewMode` es estado del workspace, no del Article.

En una frase: **no se perdió nada; nunca se cableó en Story.**

---

## 4. ¿Es reutilizable `MarkdownPreview`?

### Lo que no lo acopla

- **[Hecho]** No importa `data/types`, `state/*`, `data/port*` ni servicios: solo `react-markdown`, `remark-gfm` y tipos de React (`MarkdownPreview.tsx:1-4`).
- **[Hecho]** Recibe un `string` plano. Tanto `Story.Text` como `Article.Text` son `string` (`src/renderer/src/data/types.ts:6-14,16-25`).
- **[Hecho]** No tiene estado ni efectos; es un componente de presentación puro.

### Acoplamientos reales (cosméticos/semánticos)

1. **[Hecho]** `aria-label="Preview"` está hardcodeado (`MarkdownPreview.tsx:76`) y es el ancla de los tests (`App.test.tsx:555,563,576,586`).
2. **[Hecho]** El layout asume un panel lateral: `flex-1` en la sección y `max-w-[560px] p-8` en el artículo (`MarkdownPreview.tsx:76-77`).
3. **[Inferencia]** Si alguna vez se montaran dos previews a la vez, `getByRole('region', { name: 'Preview' })` sería ambiguo. Hoy Story y Article no coexisten (`Workspace.tsx:16-58`), por lo que no ocurre.

Ninguno de estos impide reutilizarlo en Story.

---

## 5. Diferencias Story vs Article

| Aspecto | Article | Story | Evidencia |
|---|---|---|---|
| Preview Markdown | Sí, panel lateral | **No** | `ArticleEditor.tsx:126-130`; `StoryEditor.tsx:96-103` |
| Lee `viewMode` | Sí (`useWorkspace`) | **No** (solo `useWorkspaceDispatch`) | `ArticleEditor.tsx:14,39`; `StoryEditor.tsx:13` |
| Conmutador Edit/Split/Preview | Sí, en `ArticleHeader` | **No existe** | `ArticleHeader.tsx:6,34`; `ViewModeSwitcher` sin otros usos |
| Toolbar condicionada al modo | Sí (`showsEditor`) | Siempre visible | `ArticleEditor.tsx:108`; `StoryEditor.tsx:94` |
| Layout del cuerpo | Dos columnas con `border-r` | Una columna | `ArticleEditor.tsx:110-131`; `StoryEditor.tsx:96-103` |
| Banda de metadatos | `ArticleBand` (Story, Title, Subtitle, Target) | `StoryBand` (Topic, Titles, Tags) | `ArticleEditor.tsx:94-106`; `StoryEditor.tsx:84-92` |
| Header con acciones | `ArticleHeader` (switcher, borrar, panel fuente) | No hay header | `ArticlePane.tsx:13`; `StoryEditor.tsx:82-106` |
| Persistencia | `useDraftPersistence<Article>`; `canPersist` = StoryID + Title | `useDraftPersistence<Story>`; `canPersist` = Topic | `ArticleEditor.tsx:52-70`; `StoryEditor.tsx:47-64` |
| Render de la story fuente | `StoryPane` la muestra como `<pre>` crudo | — | `StoryPane.tsx:107-108` |

Matices importantes:

- **[Hecho]** En la **creación** de Article no hay `ArticleHeader`, así que no hay switcher visible; el preview aparece por el valor inicial `'split'` (`workspace-context.tsx:59`).
- **[Hecho]** `viewMode` no se resetea al cambiar de Story o Article (`workspace-context.tsx:68-83`). Si el usuario dejó un Article en `'preview'`, ese modo se heredaría al abrir o crear una Story si `StoryEditor` empieza a leerlo. Es el mismo comportamiento que ya existe entre dos Articles.
- **[Hecho]** `StoryPane` (la Story fuente de un Article) muestra el texto como `<pre>` crudo, no como Markdown (`StoryPane.tsx:107-108`). Eso es otra superficie distinta de la editora de Story.

---

## 6. Pasos concretos para reutilizar el componente en Story

No requieren dependencias nuevas ni cambios de dominio, IPC o `DataPort`.

1. **Importar `MarkdownPreview`** en `StoryEditor.tsx`, copiando `ArticleEditor.tsx:18`:
   `import { MarkdownPreview } from '../MarkdownPreview/MarkdownPreview'`.

2. **Leer el modo de vista.** Cambiar el import de `useWorkspaceDispatch` por `useWorkspace, useWorkspaceDispatch` (`StoryEditor.tsx:13`; patrón en `ArticleEditor.tsx:14`) y añadir `const { viewMode } = useWorkspace()` (`ArticleEditor.tsx:39`).

3. **Replicar los flags y el contenedor de dos columnas** de `ArticleEditor.tsx:89-90,110-131` dentro de `StoryEditor.tsx:96-103`, usando `markdown={draft.Text}`. El `WorkspaceProvider` ya envuelve el árbol (`App.tsx:119-123`), así que el hook funciona sin cambios de provider.

4. **Condicionar la toolbar:** envolver `<EditorToolbar view={view} />` (`StoryEditor.tsx:94`) en `showsEditor ? ... : null`, como `ArticleEditor.tsx:108`. Hay un test que exige ese comportamiento en Article (`App.test.tsx:657-663`).

5. **Dar acceso al cambio de modo.** Es la única pieza sin hogar, porque `StoryEditor` no tiene header. Opciones consistentes con el código existente:
   - montar `<ViewModeSwitcher />` dentro de `StoryBand`, o
   - crear un header de Story análogo a `ArticleHeader.tsx:33-49`, o
   - no montarlo en creación y dejar que el modo inicial `'split'` muestre el preview, igual que ocurre hoy al crear un Article.
   
   **[Decisión abierta]** El repo no evidencia cuál prefiere el diseño. Nótese que `ViewModeSwitcher` tiene `aria-label="View mode"` (`ViewModeSwitcher.tsx:18`); si en el futuro conviviera con el de Article en la misma pantalla, habría dos grupos con el mismo nombre accesible. Hoy no coexisten.

6. **Ambos flujos quedan cubiertos gratis:** creación (`Workspace.tsx:19`) y edición (`:56`) usan el mismo `StoryEditor`.

7. **Riesgo de regresión a vigilar:** los tests de preview consultan `getByRole('region', { name: 'Preview' })` sin `within` (`App.test.tsx:555,563,576,586`), asumiendo un único preview. Como Story y Article nunca se montan a la vez, añadir preview a Story no rompe esas aserciones, siempre que los nuevos tests de Story no abran un Article en el mismo render. Lo mismo aplica a `getByRole('group', { name: 'Formatting' })` (`App.test.tsx:640`).

---

## 7. Tests relevantes

Proyecto Jest `renderer` (jsdom + Testing Library): `jest.config.js:28-39`; shim de `Range` para CodeMirror: `src/renderer/src/test/setup.ts:4-29`; helper `renderApp`: `src/renderer/src/test/render-app.tsx:6-13`.

### Cobertura del preview (toda en Article)

| Test | Líneas | Qué fija |
|---|---|---|
| `describe('view modes')` | `App.test.tsx:536-590` | Bloque completo; su helper `openArticle` abre solo Article |
| `starts in split view with the rendered preview beside the editor` | `:550-558` | `Split` con `aria-pressed=true` y región `Preview` con `h1 "Calm"` |
| `renders gfm tables, emphasis and strikethrough` | `:560-568` | `table`, `STRONG` y `DEL` → valida `remark-gfm` |
| `hides the preview in edit mode` | `:570-577` | Tras `Edit`, no existe la región `Preview` |
| `keeps the document and the editor when switching modes` | `:579-589` | El textbox conserva el texto y el preview re-renderiza |
| `hides the tools when only the preview is shown` | `:657-663` | Toolbar ausente en modo `preview` |

### Cobertura de Story (sin preview)

- **[Hecho]** `describe('the story editor')` (`App.test.tsx:1190-1341`) cubre cambio de Story, guardado al salir, no crear al abrir/cerrar, edición y guardado del texto, títulos y tags, guarda de navegación por topic vacío, no duplicar guardado en vuelo y topic vacío que no guarda.
- **[Hecho]** Ningún test de Story consulta `viewMode` ni la región `Preview`, ni siquiera para afirmar su ausencia. No hay contrato que romper al agregarla.

### Huecos

- **[Hecho]** No existe archivo de test propio para `MarkdownPreview`; se prueba de forma indirecta vía `App.test.tsx`.
- **[Hecho]** No hay tests de Story para `viewMode` ni para el layout de dos columnas.
- **[Inferencia]** Los nuevos tests de Story pueden replicar el bloque `view modes` con una Story y su `Text` en Markdown, verificando split por defecto, GFM y ocultamiento del preview en `edit`.

---

## 8. Edge cases y decisiones abiertas

### 8.1 ¿Dónde se monta el `ViewModeSwitcher` para Story?

| Opción | Comportamiento | Ventajas | Costes |
|---|---|---|---|
| **A. En `StoryBand`** | El switcher aparece junto a Topic/Titles/Tags | No crea un header nuevo; visible en creación y edición | Mezcla metadatos con control de vista; la banda ya es densa |
| **B. Header de Story nuevo** | Header análogo a `ArticleHeader` | Consistencia visual con Article; espacio para acciones futuras | Añade un componente y cambia el layout; más alcance |
| **C. Sin switcher en creación** | Solo se ve el preview por el modo inicial `'split'` | Cambio mínimo; replica exactamente lo que ocurre al crear un Article | El usuario no puede pasar a `edit` o `preview` desde la UI durante la creación |
| **D. Switcher en `EditorToolbar`** | Compartido por Story y Article | Un solo lugar para ambas editoras | Cambia la toolbar compartida y afecta a Article; hoy el switcher vive en el header |

**[Decisión abierta]** El repo no resuelve cuál preferir. La opción C es la más fiel a «idéntico a la creación de Article»; A o B añaden control explícito.

### 8.2 `viewMode` global y persistente

- **[Hecho]** El modo no se resetea al cambiar de entidad (`workspace-context.tsx:68-83`).
- **[Hecho]** Si se elige `'edit'` en un Article y luego se abre/crea una Story, esta heredará `'edit'` y no mostrará preview.
- **[Inferencia]** Es coherente con el comportamiento actual entre Articles y con que el modo sea una preferencia del workspace. Si se quisiera «preview por defecto en Story», habría que resetear `viewMode` en `story/select`/`create/start`, lo que también afectaría a Article salvo que se distinga por tipo.

### 8.3 Ambigüedad de nombres accesibles

- **[Hecho]** `MarkdownPreview` usa `aria-label="Preview"` fijo (`MarkdownPreview.tsx:76`).
- **[Hecho]** `ViewModeSwitcher` usa `aria-label="View mode"` fijo (`ViewModeSwitcher.tsx:18`).
- **[Hecho]** El editor de Story hereda `aria-label="Article text"` de `extensions.ts:7`.
- **[Inferencia]** Ninguno de estos nombres distingue Story de Article. No rompe los tests actuales porque Story y Article no coexisten y los tests de Story no usan esos nombres, pero conviene tenerlo presente si se añaden aserciones por nombre accesible.

### 8.4 Toolbar en modo preview

- **[Hecho]** En Article, la toolbar se oculta cuando `viewMode === 'preview'` (`ArticleEditor.tsx:108`) y hay un test que lo fija (`App.test.tsx:657-663`).
- **[Inferencia]** Al replicar el layout en Story, hay que aplicar la misma condición para que el comportamiento sea idéntico; de lo contrario, la toolbar quedaría visible sin editor al que aplicar los comandos (los `IconButton` dependen de `view`, que seguiría existiendo aunque el editor esté oculto).

### 8.5 Preview y edición en Story

- **[Hecho]** `StoryEditor` usa el mismo componente para crear y editar.
- **[Inferencia]** Al agregar el preview, ambos flujos lo obtienen sin trabajo extra; no hace falta duplicar lógica ni crear un `StoryPane` distinto.

### 8.6 Texto vacío

- **[Hecho]** `MarkdownPreview` renderiza el `string` que reciba; no valida ni muestra placeholder (`MarkdownPreview.tsx:74-84`).
- **[Inferencia]** Con `Story.Text === ''` el preview quedará vacío, igual que en un Article sin texto. No requiere manejo especial.

---

## 9. Inventario de archivos relevantes

### Producción (solo lectura en esta investigación)

| Archivo | Papel |
|---|---|
| `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx` | Componente reutilizable de preview |
| `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx` | Implementación de referencia del layout edit/split/preview |
| `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx` | Editor de Story; hoy sin preview ni `viewMode` |
| `src/renderer/src/workspace/Workspace/Workspace.tsx` | Decide creación/edición de Story y Article |
| `src/renderer/src/workspace/ArticlePane/ArticlePane.tsx` | Monta `ArticleHeader` + `ArticleEditor` |
| `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx` | Único host actual del `ViewModeSwitcher` |
| `src/renderer/src/workspace/ViewModeSwitcher/ViewModeSwitcher.tsx` | Control Edit/Split/Preview |
| `src/renderer/src/workspace/StoryBand/StoryBand.tsx` | Banda de metadatos de Story; posible host del switcher |
| `src/renderer/src/workspace/EditorToolbar/EditorToolbar.tsx` | Toolbar compartida; se condiciona al modo en Article |
| `src/renderer/src/state/workspace-context.tsx` | `ViewMode`, `viewMode` inicial y reducer |
| `src/renderer/src/editor/TextEditor/TextEditor.tsx` | Editor CodeMirror compartido |
| `src/renderer/src/editor/extensions.ts` | Extensiones; fija `aria-label: 'Article text'` |
| `src/renderer/src/data/types.ts` | `Story.Text` y `Article.Text` son `string` |

### Tests

| Archivo / bloque | Relevancia |
|---|---|
| `src/renderer/src/App.test.tsx:536-590` | Contrato actual del preview, solo Article |
| `src/renderer/src/App.test.tsx:657-663` | Toolbar oculta en modo preview |
| `src/renderer/src/App.test.tsx:1190-1341` | Tests de Story; no cubren preview |
| `src/renderer/src/App.test.tsx:428-450` | Helpers de CodeMirror usados por Story y Article |

### Documentación

- `docs/adr/0004-frontend-state-without-global-store.md` — el modo de vista forma parte del reducer de workspace.
- `docs/adr/0007-design-tokens-from-daisyui-theme.md` — por qué los estilos usan tokens semánticos de daisyUI.
- `AGENTS.md` — stack (`react-markdown` + `remark-gfm`), arquitectura del renderer y convenciones de tests.
- No existe ADR ni nota específica sobre el preview.

---

## 10. Fuentes principales consultadas

**Código**

- `src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx:1-84`
- `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:1-18,39,52-70,89-90,94-106,108,110-131`
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:1-16,31,36,47-64,84-92,94-103`
- `src/renderer/src/workspace/Workspace/Workspace.tsx:16-30,34-49,53-58`
- `src/renderer/src/workspace/ArticlePane/ArticlePane.tsx:13,16`
- `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx:6,33-49`
- `src/renderer/src/workspace/ViewModeSwitcher/ViewModeSwitcher.tsx:5-9,11-18,21-29`
- `src/renderer/src/workspace/StoryBand/StoryBand.tsx:63-99`
- `src/renderer/src/workspace/EditorToolbar/EditorToolbar.tsx:20-64`
- `src/renderer/src/workspace/StoryPane/StoryPane.tsx:107-108`
- `src/renderer/src/state/workspace-context.tsx:14,26,43,53,59,68-83,92-93`
- `src/renderer/src/editor/TextEditor/TextEditor.tsx:23-39`
- `src/renderer/src/editor/extensions.ts:7`
- `src/renderer/src/data/types.ts:6-14,16-25`
- `src/renderer/src/App.tsx:119-123`
- `src/renderer/src/global.css:20`

**Tests y configuración**

- `src/renderer/src/App.test.tsx:428-450,536-590,657-663,1190-1341`
- `jest.config.js:28-39`
- `src/renderer/src/test/setup.ts:4-29`
- `src/renderer/src/test/render-app.tsx:6-13`
- `package.json:46-47`

**Git**

- `656e46f feat(renderer): port the real React frontend` — único commit de `MarkdownPreview`, `ViewModeSwitcher`, `ArticleEditor` y `StoryEditor`; líneas del bloque de preview con blame en ese commit.
- `git log -S"MarkdownPreview"` y `git log -S"viewMode"` — sin commits posteriores.
- `feat/better-preview-story` apunta al mismo commit que `feat/preview-story`; no hay implementación previa.
