# Investigación: panel «Source story» en la sección de Articles

**Estado:** investigación de solo lectura. No se modificó código de producción ni tests.
**Fecha:** 2026-10-20.
**Rama:** `feat/better-preview-story` (parte de `main`, sin commits propios).
**Objetivo:** reunir la evidencia necesaria para planificar que el panel «Source story» se abra al crear un Article, permanezca vacío hasta que exista información de la Story, y pueda minimizarse y restaurarse.
**Actualización (2026-10-20):** las decisiones abiertas de la sección 5 quedaron cerradas en `spec.md` (misma carpeta).

Convenciones de este informe:

- **[Hecho]**: verificado leyendo el código, los tests, la configuración, el historial o la documentación del repo.
- **[Inferencia]**: consecuencia razonable de los hechos, pero no una regla escrita en el repo.
- **[Recomendación]**: propuesta derivada de fuentes primarias o de las restricciones del repo; no es una norma existente.
- **[Decisión abierta]**: el repo no la resuelve; requiere que la persona usuaria elija.

---

## Resumen ejecutivo

- **[Hecho]** El «preview de la Story» en la sección de Articles es el panel `Source story` (`StoryPane`), un panel de solo lectura con Topic, Titles, Tags y Text de la Story de origen. `src/renderer/src/workspace/StoryPane/StoryPane.tsx:27-110`.
- **[Hecho]** Durante la creación de un Article **no se monta ningún panel ni el botón de toggle**. `Workspace` devuelve solo `ArticleEditor` cuando `creating === 'article'`. `src/renderer/src/workspace/Workspace/Workspace.tsx:24-30`.
- **[Hecho]** El panel aparece recién cuando el Article se guarda: a los 700 ms de tener Story + título, `onStored` hace `create/cancel` y `article/select`, y el workspace cambia de rama. `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:61-70`; `src/renderer/src/state/use-draft-persistence.ts:5,93-111`; `src/renderer/src/workspace/Workspace/Workspace.tsx:32-48`.
- **[Hecho]** El salto se explica por tres cosas juntas: antes no hay panel; al guardar se monta un panel de ancho fijo (360 px, 420 px en `xl`) que reduce el espacio del editor; y no hay ninguna transición de layout. `src/renderer/src/workspace/StoryPane/StoryPane.tsx:30`; `src/renderer/src/workspace/Workspace/Workspace.tsx:39-43`.
- **[Hecho]** `storyPaneVisible` empieza en `false`, es global a la sesión y no se persiste. El botón `Toggle source pane` solo existe en `ArticleHeader`, es decir, solo con un Article ya guardado. `src/renderer/src/state/workspace-context.tsx:28,45,61,96-97`; `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx:41-47`.
- **[Hecho]** La clase `hidden xl:flex` hace que en pantallas ≥1280 px el panel se vea **aunque `storyPaneVisible` sea `false`**. En una ventana cuyo viewport alcance `xl`, el toggle no cambia nada visualmente. `src/renderer/src/workspace/Workspace/Workspace.tsx:41`; `src/main/main.ts:14-18`.
- **[Hecho]** La información de la Story suele estar disponible antes de guardar: `creatingStoryId` puede resolverla al primer render, y el `StoryID` que el writer elige en `ArticleBand` existe en el estado local de `ArticleEditor`. El problema es que `Workspace` no ve ese estado local. `src/renderer/src/state/use-story-in-context.ts:13-22`; `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:43,101`.
- **[Hecho]** `story === null` es ambiguo: hoy significa «no hay Story», «la Story se borró», «las Stories están cargando» o «la carga falló», y `StoryPane` siempre muestra «The story this article came from no longer exists.». `src/renderer/src/workspace/StoryPane/StoryPane.tsx:83-86`; `src/renderer/src/state/library-context.tsx:55`.
- **[Hecho]** No existe un estado «panel abierto y vacío»; el panel o está montado con contenido/mensaje de error, o está oculto por CSS. `src/renderer/src/workspace/Workspace/Workspace.tsx:39-45`; `src/renderer/src/workspace/StoryPane/StoryPane.tsx:83-111`.
- **[Hecho]** Los tests actuales fijan que la región `Source story` exista al seleccionar un Article y que `aria-pressed` empiece en `false`. Como jsdom no aplica Tailwind, el panel debe seguir montado para que esos tests pasen. `src/renderer/src/App.test.tsx:351-356,404-415`; `jest.config.js:24-35`.
- **[Hecho]** La semántica actual del toggle no es la de un disclosure: usa `aria-pressed` y el nombre `Toggle source pane`; la APG recomienda `aria-expanded` en un botón que controla una región. `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx:41-47`; W3C, [Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
- **[Inferencia]** La solución no es solo animar: para que el panel esté abierto «al crearse» hay que decidir si se monta durante el borrador, cómo sigue el `StoryID` que se elige en la banda, qué placeholder muestra cuando no hay Story, y cómo se minimiza en `xl`, donde hoy no se puede.
- **[Hecho]** La rama `feat/better-preview-story` parte de `main` sin trabajo previo. La feature `preview-story` anterior es sobre el preview Markdown del **editor de Story**, no sobre este panel, y no está fusionada. `feat/delete-story` también toca `StoryPane` y el reducer, así que puede conflictuar. Fuente: `git log --all --oneline`, `git branch -a`; `261cf00:.scratch/preview-story/spec.md`.
- **[Decisión abierta principal]** No está definido qué significa exactamente «abierto al crearse»: ¿durante el borrador (antes de guardar) o justo después de guardar? Tampoco está decidido el placeholder, la ubicación del control de minimizar, el comportamiento en `xl` ni si la preferencia debe persistir.

---

## 1. Historial y estado del repo

### 1.1 La rama actual no tiene trabajo previo

- **[Hecho]** `feat/better-preview-story` apunta al mismo commit que `main` (`f776130`, `docs(tracker): resolve contextual new button tickets`). `git log main..HEAD` y `git log HEAD..main` están vacíos. El reflog muestra que la rama se creó desde `main` el 2026-10-20. Fuente: `git log main..HEAD`, `git reflog`.
- **[Hecho]** No hay stash ni cambios en archivos versionados; solo existe un directorio no versionado `.commandcode/`. Fuente: `git status`, `git stash list`.
- **[Inferencia]** Cualquier cambio de esta feature parte de `main` y no puede apoyarse en código ya presente en la rama.

### 1.2 El panel nació en el port inicial y no evolucionó

- **[Hecho]** `StoryPane`, `storyPaneVisible` y el botón `Toggle source pane` se introdujeron en `656e46f feat(renderer): port the real React frontend` (2026-10-19). `git log --all -S storyPaneVisible` y `-S "Toggle source pane"` devuelven solo ese commit. Fuente: `git log --all -S`.
- **[Hecho]** `StoryPane` solo tiene tres commits en total: `656e46f`, `d324f1b` y `72a8f8e`. Los dos últimos pertenecen a la rama no fusionada `feat/delete-story` y añaden el `storyId` explícito al diálogo de borrado y el tono de error del botón. Fuente: `git log --all -- src/renderer/src/workspace/StoryPane/StoryPane.tsx`.
- **[Hecho]** No hay ningún commit que cambie el layout de `Workspace` ni el comportamiento de `storyPaneVisible` después del port inicial. Fuente: `git log --all -- src/renderer/src/workspace/Workspace/Workspace.tsx` y `git log --all -S storyPaneVisible`.

### 1.3 La feature `preview-story` previa es otra cosa

- **[Hecho]** La feature `preview-story` (commits `261cf00`, `878c5c3`, `4d1d15b`, `6bf4038`) agrega preview Markdown al **editor de Story**, no al panel `StoryPane`. Está en la rama `feat/preview-story-integration`, no fusionada, y no está presente en esta rama. Fuente: `git log --all --oneline`; `git show 4d1d15b --stat`.
- **[Hecho]** Su spec deja explícitamente fuera de alcance «renderizar Markdown en el panel `StoryPane`», que hoy muestra el texto como `<pre>` crudo. Fuente: `261cf00:.scratch/preview-story/spec.md`.
- **[Hecho]** El ticket 03 de `preview-story` (header de Story con `ViewModeSwitcher`) no está implementado: no existe rama `ticket/03` y sigue en `ready-for-agent`. Fuente: `261cf00:.scratch/preview-story/issues/03-story-header-view-switcher.md`; `git branch -a`.
- **[Inferencia]** El nombre de esta rama (`feat/better-preview-story`) no está definido por ningún documento. La única discusión previa relacionada es la spec de `preview-story`, que excluye `StoryPane`; esta feature debe definir su propio alcance.

### 1.4 Trabajo paralelo que puede conflictuar

- **[Hecho]** La rama `feat/delete-story` (`d324f1b`, `72a8f8e`) modifica `StoryPane` y `workspace-context.tsx`. Fuente: `git show d324f1b --stat`; `git show 72a8f8e --stat`.
- **[Inferencia]** Si el nuevo trabajo toca el header de `StoryPane` o el reducer, es probable que haya conflictos con `feat/delete-story`; conviene decidir el orden de integración antes de editar.

### 1.5 Restricciones documentales vigentes

- **[Hecho]** `docs/adr/0004-frontend-state-without-global-store.md` establece que el estado del workspace vive en un reducer con dos contextos (estado y dispatch); no hay store global tipo Redux/Zustand. Fuente: `docs/adr/0004-frontend-state-without-global-store.md:3-9`.
- **[Hecho]** `docs/adr/0007-design-tokens-from-daisyui-theme.md` fija el uso de tokens semánticos de daisyUI para estilos. Fuente: `docs/adr/0007-design-tokens-from-daisyui-theme.md:3-9`.
- **[Hecho]** `GLOSSARY.md` define Story, Article, Topic, Titles, Tags, Text, Subtitle y Target, pero no define «Source story» ni «panel». Fuente: `GLOSSARY.md:1-40`.
- **[Hecho]** `docs/agents/issue-tracker.md` define `.scratch/<feature>/spec.md` y tickets numerados; `docs/agents/triage-labels.md` define los estados de triage. Fuente: `docs/agents/issue-tracker.md:5-11`.
- **[Hecho]** No existe una spec de `better-preview-story` en `.scratch` antes de este informe. Fuente: `find .scratch -maxdepth 2 -type f`.

### 1.6 Vacíos del historial

- **[Hecho]** No hay commits, issues, specs, ADRs ni TODOs sobre minimización real, persistencia de visibilidad, creación de Article desde `StoryPane` o un layout alternativo del workspace. Fuente: `git log --all -G "StoryPane|storyPane|Source story"`; búsqueda de `TODO|FIXME|HACK|XXX` en `src`, `docs` y `.scratch`.
- **[Hecho]** El único test del toggle comprueba `aria-pressed`, no la visibilidad real del panel. Fuente: `src/renderer/src/App.test.tsx:404-415`.
- **[Inferencia]** Esta feature abre un área sin decisiones previas; la investigación debe proponer opciones explícitas en lugar de asumir un diseño ya acordado.

---

## 2. Código actual y comportamiento observado

### 2.1. Árbol de componentes

```text
Workspace
├─ creating === 'story'   → StoryEditor
├─ creating === 'article' → ArticleEditor          (sin ArticlePane ni StoryPane)
├─ Article seleccionado   → [wrapper de visibilidad] StoryPane + ArticlePane
│                           └─ ArticlePane → ArticleHeader + ArticleEditor(stored)
├─ Story seleccionada     → StoryEditor
└─ nada seleccionado      → EmptyState
```

**[Hecho]** El árbol se decide en `src/renderer/src/workspace/Workspace/Workspace.tsx:16-69`. Las dos ramas de creación hacen un `return` temprano antes de resolver cualquier Article o Story (`:16-30`).

| Componente | Papel | Evidencia |
|---|---|---|
| `Workspace` | Decide la rama y compone el layout | `src/renderer/src/workspace/Workspace/Workspace.tsx:11-69` |
| `ArticlePane` | Región `Article`; contiene `ArticleHeader` y el editor almacenado | `src/renderer/src/workspace/ArticlePane/ArticlePane.tsx:11-18` |
| `ArticleHeader` | Título, provenance, `ViewModeSwitcher`, borrar Article y toggle del panel | `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx:13-50` |
| `ArticleEditor` | Banda de metadatos, editor y preview Markdown; también es el formulario de creación | `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx:36-135` |
| `ArticleBand` | Selector de Story, título, subtítulo, target, descarte y validación | `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx:19-131` |
| `StoryPane` | Panel lateral de solo lectura con la Story de origen | `src/renderer/src/workspace/StoryPane/StoryPane.tsx:14-113` |

### 2.2. `StoryPane`: props, anatomía y acciones

**[Hecho]** `StoryPane` recibe exactamente dos props:

```ts
type StoryPaneProps = {
  story: Story | null
  storyId: string
}
```

Fuente: `src/renderer/src/workspace/StoryPane/StoryPane.tsx:9-12`.

| Zona | Contenido / comportamiento | Evidencia |
|---|---|---|
| Contenedor | `<section aria-label="Source story">`; ancho fijo `w-[360px] min-w-[360px]` y `xl:w-[420px] xl:min-w-[420px]`; `shrink-0`; borde derecho | `StoryPane.tsx:27-31` |
| Cabecera | `Lock`, título `Source story`, chip `Read-only`; acciones a la derecha | `StoryPane.tsx:32-39` |
| Abrir Story | `aria-label`/`title` `Open story in editor`; deshabilitado si `story === null`; navega a `story/select` con el `storyId` recibido | `StoryPane.tsx:46-55` |
| Copiar | `aria-label`/`title` `Copy source text`; siempre habilitado; si `story === null`, `copy()` retorna sin feedback | `StoryPane.tsx:19-25,56-64` |
| Borrar Story | `aria-label`/`title` `Delete story`; siempre habilitado; despacha `dialog/open` con `delete-story` | `StoryPane.tsx:65-73` |
| Provenir del ID | Fila con `#${storyId}` en mono | `StoryPane.tsx:77-81` |
| `story === null` | Párrafo fijo: «The story this article came from no longer exists.» | `StoryPane.tsx:83-86` |
| `story !== null` | Topic, títulos, tags y texto en un `<pre>`; contenido scrolleable y seleccionable | `StoryPane.tsx:88-110` |

- **[Hecho]** `copyState` es estado local (`idle | copied | failed`) y no está indexado por Article. `StoryPane` no tiene `key`, así que al cambiar de Article en la misma posición del árbol el componente se reutiliza y `copyState` podría conservarse. `StoryPane.tsx:15`; `Workspace.tsx:44`.
- **[Hecho]** `StoryPane` no decide su visibilidad: siempre devuelve la `<section>`; el display lo controla el wrapper de `Workspace`. `StoryPane.tsx:27-31`; `Workspace.tsx:39-45`.
- **[Hecho]** El panel no renderiza Markdown: muestra el texto de la Story como `<pre>` crudo. `StoryPane.tsx:107-109`.

### 2.3. Cuándo se monta y por qué se siente como una apertura brusca

| Estado del workspace | ¿`StoryPane` montado? | Evidencia |
|---|---|---|
| `creating === 'story'` | No | `Workspace.tsx:16-22` |
| `creating === 'article'` | **No**; solo `ArticleEditor` | `Workspace.tsx:24-30` |
| Article seleccionado | Sí, siempre; la visibilidad es CSS | `Workspace.tsx:32-48` |
| Story seleccionada | No | `Workspace.tsx:51-59` |
| Nada seleccionado | No | `Workspace.tsx:61-69` |
| Se cambia de un Article a otro | Sigue montado; solo cambian las props | `Workspace.tsx:44` |
| Se borra el Article | Se desmonta al quedar `selectedArticleId` en `null` | `src/renderer/src/App.tsx:74-91` |
| Se cambia de biblioteca con un Article seleccionado | Sigue montado; `library/select` no limpia `selectedArticleId` | `workspace-context.tsx:70-71` |

Razones concretas del efecto «se abre de golpe»:

1. **[Hecho]** Antes de guardar no hay panel; después de guardar aparece porque la rama de creación se reemplaza por la rama de Article. `Workspace.tsx:24-30,32-48`.
2. **[Hecho]** El panel tiene ancho fijo (360 px; 420 px en `xl`) y borde propio; al montarse reduce el espacio del `ArticlePane` y desplaza el layout. `StoryPane.tsx:30`; `ArticlePane.tsx:13`.
3. **[Hecho]** No hay transición de entrada/salida; el cambio es instantáneo. `Workspace.tsx:39-43`.
4. **[Hecho]** En `xl` el panel se muestra aunque el estado sea `false`; el botón puede indicar «no presionado» mientras el panel está visible, y al pulsarlo no cambia nada visualmente. `ArticleHeader.tsx:41-47`; `Workspace.tsx:41`.
5. **[Inferencia]** El guardado ocurre 700 ms después de que el borrador pasa a ser persistible (Story + título), no cuando el usuario pulsa un botón de guardar; el panel puede saltar mientras el writer todavía está escribiendo el título. `src/renderer/src/state/use-draft-persistence.ts:5,93-111`.
6. **[Inferencia]** Al guardar, `ArticlePane` monta un `ArticleEditor` nuevo con `key={article.ID}`, por lo que también se remonta el editor; el cambio de layout coincide con el reemplazo del editor de creación por el editor almacenado. `ArticlePane.tsx:16`; `ArticleEditor.tsx:43`.
7. **[Inferencia]** Si las Stories tardan en cargar o fallan, el panel puede aparecer primero con «ya no existe» y luego cambiar al contenido cuando llegan los datos; es otro cambio brusco de contenido. `library-context.tsx:55-59`; `StoryPane.tsx:83-86`.

### 2.4. `storyPaneVisible`, el toggle y el breakpoint `xl`

| Aspecto | Valor actual | Evidencia |
|---|---|---|
| Tipo | `boolean` dentro de `WorkspaceState` | `workspace-context.tsx:20-35` |
| Valor inicial | `false` | `workspace-context.tsx:53-66` (línea 61) |
| Acción | `{ type: 'storyPane/toggle' }` | `workspace-context.tsx:45` |
| Reducer | `storyPaneVisible: !state.storyPaneVisible` | `workspace-context.tsx:96-97` |
| Persistencia | Ninguna; vive en el `useReducer` del provider | `workspace-context.tsx:116-126` |
| Reset al cambiar biblioteca | No; `library/select` no toca `storyPaneVisible` | `workspace-context.tsx:70-71` |
| Reset al seleccionar Story/Article | No | `workspace-context.tsx:72-87` |
| Reset al crear/cancelar | No | `workspace-context.tsx:98-101` |
| Ámbito | Global a la sesión y a todos los Articles; no es por Article | `workspace-context.tsx:116-126` |

El wrapper exacto:

```tsx
<div
  className={
    storyPaneVisible ? 'flex min-h-0 min-w-0 flex-1 xl:flex-none' : 'hidden xl:flex'
  }
>
  <StoryPane story={story} storyId={article.StoryID} />
</div>
```

Fuente: `src/renderer/src/workspace/Workspace/Workspace.tsx:39-45`.

| `storyPaneVisible` | Menos de `xl` | `xl` o más | Efecto del toggle |
|---|---|---|---|
| `false` | `display: none` (`hidden`) | `display: flex` (`xl:flex` gana) | Sí oculta/muestra por debajo de `xl`; **no** cambia nada en `xl` |
| `true` | `display: flex` (`flex`) | `display: flex` + `xl:flex-none` | Visible en todos los anchos |

- **[Hecho]** Tailwind 4 define `xl` en `80rem` (1280 px) por defecto; el repo no redefine `--breakpoint-*` en `@theme`. `src/renderer/src/global.css:18-33`; `package.json:48`.
- **[Hecho]** La ventana de Electron se crea con `width: 1280` y `minWidth: 900`. `src/main/main.ts:14-18`.
- **[Inferencia]** El tamaño inicial de la ventana está exactamente en el breakpoint; según el marco, el zoom o el área de contenido, el viewport puede quedar justo por encima o por debajo de `xl`. En cualquier caso, en pantallas anchas el panel se muestra aunque `storyPaneVisible` sea `false`; en pantallas de 900–1279 px queda oculto por defecto.
- **[Hecho]** El wrapper no tiene transición ni animación de layout; las clases `transition` del proyecto están en botones y hovers, no en el ancho o display del panel. `Workspace.tsx:39-43`; búsqueda de `transition` en `src/renderer` sin clases de layout en el wrapper.
- **[Hecho]** `hidden` no desmonta: el `<section>` y sus acciones siguen en el DOM; en un navegador real `display:none` lo saca del render y del árbol de accesibilidad, pero en jsdom —sin CSS— sigue siendo encontrable. `src/renderer/src/test/render-app.tsx:6-11`; `jest.config.js:24-35`.
- **[Hecho]** No hay `localStorage`, `sessionStorage`, `electron-store` ni una pantalla de preferencias en el renderer. `package.json:28-82`; `workspace-context.tsx:116-126`.
- **[Hecho]** La preferencia sobrevive a cambios de Article, Story y biblioteca dentro de la misma ejecución, porque el provider no se desmonta y el reducer no la reinicia. Se pierde al reiniciar la app. `workspace-context.tsx:70-87,116-126`.

### 2.5. La condición para tener información de la Story

| Dato / función | Definición | Evidencia |
|---|---|---|
| `allStories` | Todas las Stories cargadas, sin filtro de tag | `library-context.tsx:51` |
| `storiesTotal` | `storyList.items.length` | `library-context.tsx:53` |
| `storiesStatus` | `'loading' | 'ready' | 'error'` del listado de Stories | `library-context.tsx:55`; `use-list.ts:3` |
| `articleById(id)` | Búsqueda lineal en `articleList.items`; `null` si no está | `library-context.tsx:58` |
| `storyById(id)` | Búsqueda lineal en `storyList.items`; `null` si no está | `library-context.tsx:59` |
| `useList` | Arranca con `items: []` y `status: 'loading'`; carga una vez; `ready` o `error` | `use-list.ts:12-38` |
| `upsert` | Agrega al principio o reemplaza por `ID` | `use-list.ts:47-55` |

En la rama de Article, `Workspace` hace:

```ts
const article = articleById(selectedArticleId)
const story = storyById(article.StoryID)
```

Fuente: `Workspace.tsx:32-35`.

Para la creación existe otra derivación, `useStoryInContext`:

```ts
const story =
  selectedArticleId === null
    ? storyById(selectedStoryId)
    : storyById(articleById(selectedArticleId)?.StoryID ?? null)

return { story, hasStories: storiesTotal > 0 }
```

Fuente: `src/renderer/src/state/use-story-in-context.ts:13-22`.

| Entrada | Cómo obtiene la Story | Evidencia |
|---|---|---|
| `ArticleList.startNew` | `useStoryInContext` → `openStory?.ID` | `src/renderer/src/list/ArticleList/ArticleList.tsx:25,34-35` |
| Botón del sidebar | `useContextualCreate` → `useStoryInContext` | `src/renderer/src/state/use-contextual-create.ts:17-38` |
| Atajo global `N` | `useContextualCreate` → `useStoryInContext` | `src/renderer/src/App.tsx:33-37`; `use-shortcuts.ts:20-22` |
| `Workspace` con Article abierto | `articleById` → `article.StoryID` → `storyById` | `Workspace.tsx:32-35` |

**[Hecho]** `useStoryInContext` **no** considera `creatingStoryId`; solo mira `selectedArticleId` y `selectedStoryId`. `use-story-in-context.ts:14-21`.

Momentos durante la creación:

| Momento | StoryID que conoce el editor | ¿La Story está en `allStories`? | ¿Hay panel? |
|---|---|---|---|
| `create/start` con Story preseleccionada | `creatingStoryId` → `emptyArticle(initialStoryId)` | Normalmente sí, porque la Story venía de la biblioteca | **No** |
| `create/start` sin Story en contexto | `''` | No aplica | **No** |
| El writer elige Story en `ArticleBand` | `draft.StoryID` local (solo dentro de `ArticleEditor`) | Sí, el `<select>` se llena con `allStories` | **No** |
| El writer escribe el título | El mismo `draft.StoryID` | Sí | **No** |
| 700 ms después, `create` resuelve | `value.StoryID` del Article almacenado | Sí (salvo borrado/error) | **Sí**, recién ahí |
| Article ya abierto | `article.StoryID` | Depende de `storiesStatus` y de que la Story exista | **Sí** |

Evidencia: `workspace-context.tsx:98-99`; `Workspace.tsx:27`; `src/renderer/src/data/drafts.ts:7-17`; `ArticleEditor.tsx:43,95,101`; `ArticleBand.tsx:60-66`.

- **[Inferencia]** Si el Article se inicia con una Story preseleccionada, `storyById(creatingStoryId)` ya devolvería la Story al primer render de la creación; no hay que esperar al guardado. Si no hay preselección, la información existe en cuanto el writer elige una Story en la banda, pero `Workspace` no se entera porque el cambio vive solo en el estado local de `ArticleEditor`.
- **[Hecho]** `ArticleBand` usa `knownStory` para agregar una opción extra si el `storyId` recibido no está en `allStories`; esto permite mostrar un ID obsoleto en el selector. `ArticleBand.tsx:36-38,60-66`.

«Abierto y vacío» no es un estado actual:

| Estado | ¿Existe hoy? | Cómo se representa | Evidencia |
|---|---|---|---|
| **No montado** | Sí | Ramas de creación, Story editor, nada seleccionado | `Workspace.tsx:16-30,51-69` |
| **Montado y oculto** | Sí | Article seleccionado, `storyPaneVisible === false`, viewport < `xl`; el wrapper tiene `display:none` | `Workspace.tsx:41` |
| **Montado y visible con Story** | Sí | Article seleccionado, `story !== null`, estado `true` o viewport ≥ `xl` | `Workspace.tsx:41-46` |
| **Montado y visible sin Story** | Sí, pero con mensaje de error | `story === null` → «The story this article came from no longer exists.» | `StoryPane.tsx:83-86` |
| **Abierto y vacío a la espera de una Story** | **No** | No hay rama de placeholder; `null` se interpreta como «la Story desapareció» | `StoryPane.tsx:83-111` |

**[Hecho]** El `null` de `StoryPane` es ambiguo: puede significar «el Article no tiene Story todavía», «la Story se borró», «las Stories están cargando» o «la carga falló». El componente no recibe `storiesStatus` ni un motivo, así que no puede distinguirlos. `StoryPane.tsx:9-12,83-86`; `library-context.tsx:55`.

Casos concretos:

| Caso | `story` / `storyId` | Comportamiento actual | Evidencia |
|---|---|---|---|
| Borrador sin Story elegida | `null` / `''` | No hay panel. La banda muestra `Choose a story…` y la advertencia de Story + título | `ArticleBand.tsx:49-67,97-101` |
| Borrador con Story elegida | `Story` / `ID` | No hay panel hasta guardar; si se montara, tendría contenido | `ArticleEditor.tsx:43,101`; `Workspace.tsx:24-30` |
| Article guardado con Story existente | `Story` / `ID` | Panel con Topic, Titles, Tags y Text | `StoryPane.tsx:88-110` |
| Article con Story inexistente | `null` / `ID` | Mensaje de «ya no existe»; `Open story in editor` deshabilitado; `Copy` no hace nada; `Delete story` despacha el diálogo | `StoryPane.tsx:46-73,83-86` |
| Stories cargando con Article seleccionado | `null` / `ID` | Se muestra «ya no existe» hasta que lleguen las Stories; no hay skeleton ni estado de carga en el panel | `use-list.ts:13-27`; `StoryPane.tsx:83-86` |
| Stories con error de carga | `null` / `ID` | Igual que el caso anterior; el botón de reintento solo existe en `StoryList`/`ErrorState`, no en el panel | `use-list.ts:28-33`; `src/renderer/src/ui/ErrorState/ErrorState.tsx:10-26` |
| Article con `StoryID: ''` | `null` / `''` | No ocurre en un Article persistido: el dominio exige `storyID` no vacío; solo puede darse en un borrador | `docs/api/ipc-contract.md:135-143`; `docs/adr/0005-entity-born-from-identifiers.md:3-7` |
| Story borrada en cascada | No debería existir el Article | El borrado de Story elimina sus Articles; el caso «huérfano» se simula en tests y el panel lo tolera | `docs/api/ipc-contract.md:115-123`; `src/renderer/src/App.test.tsx:378-389` |

**[Inferencia]** Si se reutiliza `StoryPane` durante la creación para previsualizar `creatingStoryId`, el botón `Delete story` podría apuntar a la Story seleccionada o a la del Article anterior, no a la Story que se está previsualizando. Además, si `openStory` es `null`, el botón no abre ningún diálogo. Es un motivo para decidir si el panel de creación debe tener acciones destructivas. `StoryPane.tsx:65-73`; `src/renderer/src/App.tsx:25-26,94-113`.

### 2.6. El toggle durante la creación

- **[Hecho] No existe.** La creación de Article hace un `return` temprano con solo `ArticleEditor`; no renderiza `ArticlePane`, y por tanto no renderiza `ArticleHeader` ni su botón. `Workspace.tsx:24-30`; `ArticlePane.tsx:11-18`.
- **[Hecho]** Tampoco existe el panel: `Workspace` no pasa ninguna Story a `StoryPane` durante la creación; `ArticleEditor` solo usa `allStories` para el `<select>` de la banda. `ArticleEditor.tsx:94-101`; `ArticleBand.tsx:49-67`.
- **[Hecho]** No hay un atajo de teclado para el panel; los únicos atajos globales son `N` (creación contextual) y `S` (guardar). `src/renderer/src/state/use-shortcuts.ts:11-32`.

### 2.7. Tests y contrato del renderer

| Test / helper | Archivo:líneas | Qué contrato fija |
|---|---|---|
| `source story pane` (describe) | `src/renderer/src/App.test.tsx:339-426` | Comportamiento del panel cuando hay un Article seleccionado |
| `openArticle` (helper) | `App.test.tsx:351-356` | Al cambiar a Articles y seleccionar un Article, la región `Source story` existe de inmediato |
| `shows the story the article comes from, with its provenance` | `App.test.tsx:358-376` | Topic, títulos, texto, `#s1`, `Read-only`, `derived from`; el selector de Story del Article vale `s1` |
| `says the source story is gone instead of breaking` | `App.test.tsx:378-389` | Con Stories vacías y un Article huérfano, se muestra `/no longer exists/` |
| `copies the source text and confirms it` | `App.test.tsx:391-402` | `Copy source text` copia `Raw thoughts.` y muestra `Copied` |
| `lets the writer toggle the source pane` | `App.test.tsx:404-415` | `Toggle source pane` existe; `aria-pressed` empieza en `false` y pasa a `true` al hacer clic |
| `opens the source story in its editor from the pane header` | `App.test.tsx:417-425` | `Open story in editor` navega al `Story editor` de la Story |
| `creating an article` (describe) | `App.test.tsx:666-744` | Flujo de creación y guardado del Article |
| `openNewArticle` (helper) | `App.test.tsx:672-678` | `New Article` abre la región `Article editor` |
| `creates the article from the story the writer picks, and opens it` | `App.test.tsx:680-699` | Se crea con la Story elegida y el Article aparece en la lista |
| `writes nothing until it has both a story and a title, and says so` | `App.test.tsx:701-715` | La validación Story + título bloquea la escritura; el guardado ocurre después |
| `pre-selects the story already in context` | `App.test.tsx:717-729` | La Story seleccionada se preselecciona al crear |
| `locks the story selector once the article exists` | `App.test.tsx:731-743` | El selector queda deshabilitado después de guardar |
| `the sidebar new action` (describe) | `App.test.tsx:746-910` | El botón contextual y el atajo crean Articles con la Story en contexto |
| `the New Article button` (describe) | `App.test.tsx:912-939` | Sin Stories, el botón de la lista está deshabilitado y explica el motivo |
| `deleting` (describe) | `App.test.tsx:941-1033` | Borrado de Article y de Story; el diálogo de Story advierte que arrastra sus Articles |
| `keyboard shortcuts` (describe) | `App.test.tsx:1035-1178` | `Ctrl/Cmd+N` contextual; `Ctrl/Cmd+S` guarda; sin Story no crea nada |

Detalle crítico: jsdom no aplica Tailwind.

- **[Hecho]** El proyecto `renderer` de Jest usa `testEnvironment: 'jsdom'`. `jest.config.js:24-35`.
- **[Hecho]** `renderApp` renderiza `DataPortProvider` + `App` directamente; no importa `main.tsx` ni `global.css`. `src/renderer/src/test/render-app.tsx:6-11`; `src/renderer/src/main.tsx:17`.
- **[Hecho]** Por eso, en los tests la clase `hidden` no produce `display:none`. Testing Library encuentra la región `Source story` aunque `storyPaneVisible` sea `false`. `Workspace.tsx:41`; `App.test.tsx:351-356`.
- **[Hecho]** El test del toggle verifica solo `aria-pressed`, no clases ni visibilidad real. `App.test.tsx:404-415`.

Riesgos si se cambia el montaje o el estado inicial:

1. **[Hecho]** Si `storyPaneVisible` empieza en `true`, el test `lets the writer toggle the source pane` falla en `:410`, que espera `false` antes del clic.
2. **[Hecho]** Si el panel se renderiza condicionalmente (`{visible ? <StoryPane .../> : null}`) y el estado inicial sigue en `false`, el helper `openArticle` falla en `:355` y con él los tests de contenido, copia, Story inexistente y apertura en el editor (`:358-425`), porque la región no estaría en el DOM.
3. **[Inferencia]** Para preservar ambos tests sin modificarlos, el panel debe seguir **montado** para un Article seleccionado y `storyPaneVisible` debe seguir empezando en `false`. La apertura durante la creación tendría que resolverse con un estado derivado o separado, no cambiando el valor inicial global ni desmontando el panel almacenado.
4. **[Hecho]** Si se cambia el nombre accesible `Toggle source pane` o se reemplaza `aria-pressed` por `aria-expanded`, el test de `:408-414` falla.
5. **[Hecho]** Si el panel con Story inexistente se oculta o se desmonta, el test `says the source story is gone instead of breaking` falla en `:388`, que busca el texto `/no longer exists/`.
6. **[Hecho]** Si el nuevo placeholder usa exactamente `No story yet`, colisiona con `screen.getByText('No story yet')` de `App.test.tsx:925`.
7. **[Inferencia]** Si el panel de creación incluye otro `<select>` con etiqueta `Story`, colisiona con `screen.getByLabelText('Story')`, usado en `App.test.tsx:685,708,728,736,801,819,837,893,1065,1098,1116`.
8. **[Inferencia]** Si el panel de creación agrega textos o regiones nuevos, conviene revisar las búsquedas no acotadas (`getByText`, `getByRole`) de los tests de creación y de la lista; hoy no hay una aserción de ausencia del panel durante la creación, pero sí varias búsquedas globales.
9. **[Hecho]** La suite `App.test.tsx` tiene 75 tests y pasó completa en la verificación de esta investigación (2026-10-20). Es la línea base que no debería romperse sin justificación.

Lo que los tests actuales no cubren:

- **[Hecho]** No hay test de visibilidad real por breakpoint; no se simula `xl` ni se inspeccionan clases.
- **[Hecho]** No hay test de que el panel exista o no durante `creating === 'article'`.
- **[Hecho]** No hay test de persistencia de `storyPaneVisible`.
- **[Hecho]** No hay test de que el panel siga el selector de Story de la banda en vivo.
- **[Hecho]** No hay test de un estado de carga o error de Stories dentro del panel.
- **[Hecho]** No hay test unitario del reducer de `workspace-context`; la cobertura es de integración vía `App.test.tsx`.

### 2.8. Restricciones de arquitectura y estilo

| Fuente | Regla / hecho | Implicación para este cambio |
|---|---|---|
| `AGENTS.md:45` | El renderer nunca importa el dominio ni los adapters; solo usa `DataPort`. | El cambio debe quedarse en componentes, hooks y estado del renderer. No tocar `src/main`, preload, IPC ni SQLite. |
| `AGENTS.md:47-52` | Dominio no anémico, IDs generados por constructores, `storyID` inmutable, errores centinela. | No se construye un Article en el renderer ni se asigna `ID`; el panel solo muestra datos ya cargados. |
| `AGENTS.md:54-64` | Tests existentes son contrato; no modificarlos para hacer pasar una implementación; renderer con Jest/jsdom/Testing Library. | Cualquier cambio que rompa `App.test.tsx:404-415` o el helper `openArticle` necesita una justificación explícita y revisión, no un ajuste mecánico del test. |
| `AGENTS.md:66-72` | Cambios pequeños y enfocados; no introducir abstracciones sin necesidad; no modificar APIs sin justificar; no ampliar alcance. | Evitar un store nuevo o un contexto solo para el panel; reutilizar `WorkspaceState` y los componentes existentes. |
| `AGENTS.md:76-78` | Documentación/planificación en español; código, identificadores, comentarios y textos de UI en inglés. | El informe y el futuro spec van en español; el placeholder y los labels nuevos van en inglés. |
| `docs/adr/0004-frontend-state-without-global-store.md:3-9` | Sin Redux/Zustand/React Query. Estado en reducer de workspace + provider de biblioteca + store mínimo; estado y dispatch separados; el texto del editor vive local para no re-renderizar el árbol en cada tecla. | `storyPaneVisible` pertenece al reducer. Si el panel debe seguir el `StoryID` del borrador, hay que decidir cómo compartirlo sin mover todo el draft al workspace ni provocar renders innecesarios. |
| `docs/adr/0005-entity-born-from-identifiers.md:3-7` | Article nace con `storyID` + `title`; el resto es opcional; vacío = `""`; `storyID` inmutable. | Un borrador puede tener `StoryID: ''`; un Article persistido no. El panel debe distinguir «sin Story todavía» de «Story inexistente». |
| `docs/adr/0007-design-tokens-from-daisyui-theme.md:3-9` | Los colores salen del tema `dracula` de daisyUI; no se declaran hex propios; hay tokens semánticos. | Cualquier placeholder, borde o fondo nuevo debe usar `bg-base-*`, `text-*`, `border-*`, `text-warning`, etc., no colores nuevos. |
| `src/renderer/src/workspace/StoryPane/StoryPane.tsx:30-38` | El panel ya usa `border-base-300`, `bg-base-200/50`, `bg-base-200/80`, `text-warning/80`, `bg-warning/15`, `text-warning`. | Mantener esos tokens si se agrega una cabecera o un estado vacío. |
| `src/renderer/src/styles/base.css:28-41` | Foco visible global y `prefers-reduced-motion`. | Si se anima el panel, la animación debe respetar `prefers-reduced-motion`; el foco debe seguir visible. |
| Código del renderer | Todos los textos de UI están hardcodeados en inglés; no hay i18n. | El placeholder debe ser inglés; no hay archivos de traducción que actualizar. |

### 2.9. Mecanismos existentes reutilizables

| Mecanismo | Cómo está hecho | Estado / accesibilidad | Persistencia | ¿Sirve para minimizar el panel? |
|---|---|---|---|---|
| Sidebar colapsable | `sidebarCollapsed` en el reducer; `sidebar/toggle`; ancho `w-14` vs `lg:w-[220px]`; textos con `hidden`/`lg:flex` | `IconButton` con `aria-pressed={sidebarCollapsed}` en `TitleBar` | No; solo sesión | Es el patrón más cercano: colapsa por ancho, no desmonta, conserva el contenido |
| `ViewModeSwitcher` | Grupo `role="group"` con `aria-label="View mode"`; tres botones con `aria-pressed` | Estado `viewMode` en el reducer | No | Sirve como precedente de toggle con `aria-pressed`, no como minimizar/restaurar |
| `IconButton` | `label` obligatorio → `aria-label` + `title`; iconos `aria-hidden` | Buen nombre accesible y tooltip | No aplica | Sirve para el botón de minimizar/restaurar; el `label` tendría que ser estático o cambiar con el estado |
| `Modal` / `ConfirmDialog` | Overlay `fixed`, `role="dialog"`, `aria-modal`, foco inicial, trampa de Tab y Escape | Foco gestionado; no animación | No | No es un panel persistente; atraparía el foco y taparía el editor. No es adecuado para minimizar |
| `SkeletonList` | `role="status"`, `aria-label`, `aria-busy`, filas `animate-pulse` | Anuncia carga | No aplica | Sirve como precedente para un estado de carga; su forma es de lista, no de preview |
| `EmptyState` | Icono, título y descripción; `h-full` centrado | Sin `role` propio | No aplica | Sirve como placeholder visual, pero no tiene acción ni variante compacta |
| `ListEmpty` | Empty state de lista con `filtered`, `onClearFilter` y `action` | Sin `role` propio | No aplica | Tiene acción, pero su API es específica de listas |
| `ErrorState` | `role="alert"`, título, descripción y `Try again` | Anuncia error y permite reintentar | No aplica | Serviría si el panel distingue un error de carga de Stories |
| Transiciones globales | `transition` en botones/hovers; `animate-pulse` en skeletons; `prefers-reduced-motion` global | `@media (prefers-reduced-motion: reduce)` acorta animaciones y transiciones | No aplica | No hay transición de layout existente; si se anima el panel, hay que respetar esa media query |

Evidencia: `workspace-context.tsx:27,60,94-95`; `src/renderer/src/shell/TitleBar/TitleBar.tsx:27-34`; `src/renderer/src/sidebar/Sidebar/Sidebar.tsx:22-25,30-33,56-61`; `src/renderer/src/workspace/ViewModeSwitcher/ViewModeSwitcher.tsx:11-42`; `src/renderer/src/ui/IconButton/IconButton.tsx:4-29`; `src/renderer/src/ui/Modal/Modal.tsx:15-75`; `src/renderer/src/ui/Skeleton/Skeleton.tsx:8-16`; `src/renderer/src/ui/EmptyState/EmptyState.tsx:9-18`; `src/renderer/src/list/ListEmpty/ListEmpty.tsx:12-39`; `src/renderer/src/ui/ErrorState/ErrorState.tsx:10-27`; `src/renderer/src/styles/base.css:28-41`.

Lo que no existe:

- **Persistencia de preferencias de UI:** no hay `localStorage`, `sessionStorage`, `electron-store` ni settings. `package.json:28-82`; `workspace-context.tsx:116-126`.
- **Animación de layout:** no hay transición de ancho, altura, grid ni opacidad para paneles; solo hovers y `animate-pulse`. `Workspace.tsx:39-43`; búsqueda de `transition` en `src/renderer`.
- **Disclosure accesible:** no hay `aria-expanded`/`aria-controls`. Búsqueda global sin coincidencias.
- **Hook de media queries:** no hay `window.matchMedia`, `useMediaQuery` ni `ResizeObserver`. Búsqueda global en `src/` sin coincidencias.
- **Estado por Article:** `storyPaneVisible` es global; no hay un mapa de visibilidad por Article ni una clave por ID.
- **Estado de «panel vacío»:** no hay un placeholder para «todavía no hay Story»; `null` se usa para todos los casos.
- **Internacionalización:** todos los textos están hardcodeados en inglés; no hay librería ni archivos de traducción. `StoryPane.tsx:35`; `package.json:28-82`.

## 3. Marco de UX y accesibilidad

Esta sección resume la investigación contra fuentes primarias (W3C/WAI, MDN, web.dev, React, Tailwind y daisyUI). La tabla 3.10 recoge las principales; las citas inline identifican la sección concreta de cada fuente.

### 3.1 El panel es un *disclosure*, no un *toggle*

- **[Hecho]** La APG define el patrón *Disclosure (Show/Hide)* con un botón que controla la visibilidad de una sección. Cuando el contenido es visible, el botón lleva `aria-expanded="true"`; cuando está oculto, `aria-expanded="false"`. `aria-controls` es opcional. Fuente: W3C, [Disclosure (Show/Hide) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), § “WAI-ARIA Roles, States, and Properties”.
- **[Hecho]** Enter y Space deben alternar el panel; es el comportamiento nativo de `<button>`. Fuente: W3C, *Disclosure*, § “Keyboard Interaction”.
- **[Hecho]** `aria-pressed` convierte el botón en un *toggle button* y representa el estado del propio control; MDN desaconseja cambiar la etiqueta al alternar. Fuente: MDN, [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed), § “Description”.
- **[Inferencia]** El `aria-pressed={storyPaneVisible}` actual describe el panel como si fuera una propiedad del botón («presionado»), no como una región que se expande o colapsa. Para un disclosure corresponde `aria-expanded`.
- **[Recomendación]** Usar un `<button type="button">` real, visible en ambos estados, con nombre accesible estable («Source story») y `aria-expanded`; el chevron o icono va `aria-hidden="true"`. No usar `aria-pressed` ni ambos atributos a la vez.
- **[Hecho]** La APG considera `aria-controls` opcional; una referencia rota es peor que omitirlo. Fuente: W3C, *Disclosure*, § “WAI-ARIA Roles, States, and Properties”; MDN, [`aria-controls`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-controls).
- **[Recomendación]** Si el contenido se desmonta al cerrar, apuntar `aria-controls` a un wrapper estable que permanezca en el DOM, u omitirlo.

### 3.2 Foco y semántica del contenedor

- **[Hecho]** En un disclosure no modal, la APG no exige mover el foco al contenido; el botón conserva el foco y `aria-expanded` anuncia el cambio. El patrón de mover el foco al abrir y devolverlo al cerrar es propio de un diálogo modal. Fuente: W3C, [Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/); [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
- **[Recomendación]** Al abrir, no robar el foco al editor. Si se cierra con el foco dentro del panel, devolverlo al botón antes de ocultar el contenido. Si el panel se anima al cerrar, aplicar `inert` de inmediato para que el contenido deje de ser tabulable.
- **[Hecho]** `inert` retira el elemento y sus descendientes del orden de tabulación y del árbol de accesibilidad. Fuente: MDN, [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert), § “Description”.
- **[Hecho]** Un `aside` mapea a `complementary` y debe ser un landmark de nivel superior; un `section` con nombre accesible mapea a `region`, y un `region` sin etiqueta no se anuncia como landmark. Fuente: W3C, [Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/), § “General Principles of Landmark Design” y § “Region”.
- **[Inferencia]** El `StoryPane` actual es un `<section aria-label="Source story">` dentro del `main` del workspace, por lo que hoy se expone como `region`. Si se mantiene esa estructura, lo correcto es conservar `section` + nombre accesible; usar `aside` dentro de `main` produciría un `complementary` anidado.
- **[Recomendación]** Mantener un encabezado visible (`Source story`) y usarlo como `aria-labelledby` de la región; no dejar la región sin nombre.

### 3.3 Colapsado, vacío, cargando y error son estados distintos

- **[Recomendación]** Modelar `expanded` (intención del usuario) separado de `status` (`idle | loading | ready | empty | error`). `aria-expanded` describe si el panel está desplegado, no si hay datos.
- **[Hecho]** Un panel abierto sin contenido debe seguir siendo `aria-expanded="true"`; si se marcara `false` porque no hay Story, el usuario vería un panel abierto mientras el lector anuncia «contraído». Fuente: W3C, *Disclosure*; MDN, [`aria-expanded`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded).
- **[Recomendación]** Para el estado vacío: mostrar un mensaje explícito y una acción («Choose a story», «Link a story»), sin skeleton ni spinner, y sin `aria-live` agresivo. El estado vacío no es un error.
- **[Hecho]** `aria-busy="true"` indica que el contenido se está modificando y que las tecnologías de asistencia pueden esperar antes de anunciar cambios. Fuente: MDN, [`aria-busy`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy), § “Description”.
- **[Recomendación]** Usar `aria-busy` solo mientras hay una carga real y retirarlo al terminar; no usarlo de forma permanente. Para una lectura local de SQLite, un skeleton puede producir un parpadeo peor que renderizar directamente; si se usa, retrasarlo 150–300 ms y reservar el tamaño final.
- **[Hecho]** `role="status"` es una región viva `polite` para información advisory; no se debe mover el foco al actualizar. Fuente: MDN, [`status` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role), § “Description”.
- **[Recomendación]** Reservar `role="status"` para hitos («Source story updated»), no para cada tecla ni para todo el panel.

### 3.4 Evitar el salto visual

- **[Hecho]** web.dev recomienda reservar espacio para contenido que carga tarde para evitar layout shifts. Fuente: web.dev, [Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls), § “Reserve space for late-loading content”.
- **[Hecho]** Las animaciones compuestas con `translate` no afectan al layout de otros elementos y no cuentan para CLS. Fuente: web.dev, *Optimize CLS*, § “Animations”.
- **[Hecho]** Los desplazamientos provocados por una interacción del usuario se excluyen del CLS si ocurren dentro de los 500 ms siguientes; los que ocurren después o sin interacción sí cuentan. Fuente: web.dev, *Optimize CLS*, § “Understand the causes of layout shifts”.
- **[Inferencia]** En una app Electron no se reporta CLS como Core Web Vital, pero el renderer es Chromium y el salto se percibe igual; la métrica sirve como heurística.
- **[Recomendación]** Si el panel empuja el editor, animar el track del layout o reservar el ancho final; si se superpone, usar `transform`. No dejar que el panel pase de 0 a un ancho grande de golpe tras guardar el Article.

### 3.5 Animación y movimiento reducido

- **[Hecho]** Animar `width`, `height`, `top`, `left` o `box-shadow` provoca re-layout, pintado y composición; `transform` evita el re-layout. Fuente: web.dev, *Optimize CLS*, § “Animations”.
- **[Inferencia]** Animar `width` en un panel que contiene CodeMirror puede producir jank y saltos de scroll; es preferible animar `grid-template-columns` en el shell o `transform` si el panel se superpone.
- **[Recomendación]** Para el panel inline: `grid-template-columns: 0fr ↔ 1fr` en el wrapper, `min-width: 0` y `overflow: hidden` en el hijo, y `inert` en el contenido colapsado. Para overlay: `transform: translateX()` + `opacity`. No usar `transition-all`.
- **[Hecho]** `prefers-reduced-motion` detecta si el usuario pidió minimizar el movimiento no esencial; las animaciones pueden provocar incomodidad vestibular. Fuente: MDN, [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), § “Description”.
- **[Hecho]** WCAG 2.2 SC 2.3.3 (AAA) exige que la animación de movimiento activada por interacción pueda desactivarse, salvo que sea esencial. Fuente: W3C, [Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- **[Recomendación]** Usar `motion-safe:` / `motion-reduce:transition-none`; bajo `reduce`, el cambio debe ser instantáneo. La animación es un extra: el estado debe ser comprensible sin ella.
- **[Hecho]** React destruye el estado de un componente cuando lo elimina del árbol; para conservar scroll o estado local hay que mantenerlo montado y ocultarlo con CSS. Fuente: React, [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state), § “State is tied to a position in the render tree”.
- **[Recomendación]** Si se desmonta con animación de salida, mantener un estado `closing`, desmontar tras `transitionend` (con timeout de respaldo) y cancelar si se vuelve a abrir. No desmontar inmediatamente al cerrar o no habrá animación.
- **[Hecho]** `@starting-style` permite transiciones en el primer render o al pasar de `display:none` a visible. Fuente: MDN, [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style), § “Description”.
- **[Recomendación]** No usar `@starting-style` en el montaje inicial: haría que el panel «se abriera» animadamente al arrancar, justo el efecto que se quiere evitar. Reservarlo para acciones del usuario.

### 3.6 Persistencia de abierto/minimizado

- **[Recomendación]** Persistir solo la intención del usuario (`expanded`), no `loading`, `error` ni el contenido. Si se quiere recordar el ancho, persistirlo aparte y validarlo.
- **[Recomendación]** Resolver la precedencia: estado por Article; default `true` al crear; al volver a un Article existente, restaurar su valor; si no hay entrada, `true`. Un único booleano global haría que una nota nueva herede «minimizado» de otra.
- **[Hecho]** `localStorage` guarda datos entre sesiones del navegador, pero para documentos `file:` el comportamiento es indefinido y puede lanzar `SecurityError`. Fuente: MDN, [`Window.localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), § “Description”.
- **[Inferencia]** En desarrollo, electron-vite sirve el renderer por HTTP; en producción suele cargarse desde `file://`. Confiar en `localStorage` crea una diferencia dev/prod difícil de diagnosticar.
- **[Recomendación]** Persistir desde el proceso principal (SQLite/preferencias) a través del puerto IPC existente. Si se usa `localStorage` como fallback, envolverlo en `try/catch`, validar el valor y asumir `true` si falla.
- **[Inferencia]** Esta recomendación amplía el alcance: hoy `storyPaneVisible` es estado en memoria del reducer y no hay un canal IPC de preferencias. Si se decide persistir, hay que justificar el cambio de contrato y el trabajo en main/preload/DataPort; si no, el alcance se limita a la sesión.

### 3.7 daisyUI 5 y Tailwind 4

- **[Hecho]** `collapse` de daisyUI tiene tres modos: foco (se cierra al perder foco), checkbox (estado en un `<input type="checkbox">`) y `details`/`summary` (no acepta `collapse-open/close`). Fuente: daisyUI, [Collapse](https://daisyui.com/components/collapse/), § “Collapse”.
- **[Inferencia]** Ninguno es un buen control principal para este panel: el modo foco usa un `div` enfocable y se cierra inesperadamente; el checkbox no expone un botón con `aria-expanded`; `details` no está pensado para un panel lateral animado.
- **[Hecho]** `drawer` de daisyUI es un layout de grid con checkbox oculto/overlay; no es un disclosure accesible por sí mismo. Fuente: daisyUI, [Drawer sidebar](https://daisyui.com/components/drawer/), § “Structure” y § “Functionality”.
- **[Recomendación]** No usar `collapse` ni `drawer` como toggle principal; usar un `<button>` + región con `aria-expanded` y un layout propio de grid/flex. `collapse` podría servir para secciones secundarias dentro del panel.
- **[Hecho]** Tailwind 4 ofrece `transition-[grid-template-columns]`, `grid-cols-[<value>]`, `motion-safe` y `motion-reduce`. Fuente: Tailwind CSS, [transition-property](https://tailwindcss.com/docs/transition-property) y [grid-template-columns](https://tailwindcss.com/docs/grid-template-columns).
- **[Recomendación]** Usar tokens semánticos de daisyUI (`bg-base-200`, `border-base-300`, `text-base-content`, `text-primary`) y verificar el contraste de las variantes con opacidad en el tema dracula. Fuente: daisyUI, [Themes](https://daisyui.com/docs/themes/); `docs/adr/0007-design-tokens-from-daisyui-theme.md`.

### 3.8 Implicaciones concretas para este panel

- **[Recomendación]** El botón de minimizar/restaurar debe existir también durante la creación del Article; si el panel se abre al crear, el usuario necesita poder cerrarlo antes de guardar.
- **[Recomendación]** Si el panel está abierto y aún no hay Story seleccionada, mostrar un estado vacío explícito; no ocultar el panel ni fingir que está colapsado. Cuando se elija una Story, el contenido se actualiza en sitio sin autoexpandir ni mover el foco.
- **[Recomendación]** Si la Story se elige antes de guardar (`creatingStoryId` o el selector de `ArticleBand`), el panel puede mostrar la información de inmediato; si no hay Story, el estado vacío debe explicar que hace falta elegir una.
- **[Recomendación]** No animar el panel en el montaje inicial ni al cambiar de Article; animar solo cuando el usuario pulsa minimizar/restaurar.
- **[Recomendación]** Si se opta por persistir, hacerlo por Article y con default abierto; si no, documentar que la preferencia dura lo que dura la sesión.

### 3.9 Criterios de aceptación y pruebas sugeridas

Criterios derivados de las fuentes anteriores:

1. El toggle es un `<button>` nativo, visible en ambos estados, con nombre accesible «Source story» y `aria-expanded` correcto.
2. El panel es un landmark con nombre (`region` o `complementary`) y encabezado visible.
3. Enter y Space alternan el panel; el foco permanece en el botón al abrir; si se cierra con el foco dentro, vuelve al botón.
4. El contenido colapsado no es tabulable ni expuesto a tecnologías de asistencia (`inert`, `hidden` o `visibility`).
5. No se usa `aria-pressed` ni `aria-hidden` sobre contenido enfocable.
6. El estado vacío se muestra con el panel abierto y `aria-expanded="true"`.
7. La carga usa `aria-busy` solo si es real y reserva espacio; no hay skeleton para lecturas locales instantáneas.
8. Los datos que llegan no autoexpanden el panel.
9. La animación es solo para acciones del usuario; no hay animación en el primer render; `prefers-reduced-motion` la desactiva.
10. El layout no salta al cargar contenido; el foco no queda oculto por el panel.
11. Si se persiste: por Article, default abierto, sobrevive al reinicio y un fallo de almacenamiento no rompe la UI.
12. En 200 % de zoom y ventana estrecha, el botón y el contenido siguen siendo utilizables; si el panel se vuelve modal, usa semántica de diálogo.

Pruebas sugeridas con Jest + Testing Library:

- `getByRole('button', { name: /source story/i })` existe y tiene `aria-expanded`.
- Click/Enter/Space alternan `aria-expanded` y la visibilidad.
- El contenido colapsado no está en el orden de tabulación (en jsdom, `inert` puede no aplicarse; verificar el atributo o usar `hidden`).
- Al cerrar con el foco dentro, `document.activeElement` es el botón.
- Al cargar datos, `aria-expanded` no cambia.
- Estado vacío visible con `aria-expanded="true"`.
- `aria-busy` presente durante la carga y ausente al terminar.
- Si hay persistencia: nueva nota → abierto; nota con estado guardado → restaurado; error de almacenamiento → abierto.
- No hay `aria-pressed` ni `aria-hidden` en el panel con elementos enfocables.

**[Inferencia]** Las pruebas de animación y `prefers-reduced-motion` son difíciles en jsdom; conviene verificarlas con inspección visual, Playwright o integración en Electron. El contrato debe ser el estado accesible y la ausencia de movimiento cuando se solicita, no una clase CSS concreta.

### 3.10 Fuentes principales

| Fuente | URL | Uso |
|---|---|---|
| W3C APG — Disclosure | https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ | Botón, `aria-expanded`, teclado |
| W3C APG — Landmark Regions | https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/ | `aside`/`complementary`, `section`/`region` |
| W3C APG — Dialog Modal | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | Contraste con panel modal; foco |
| MDN — `aria-expanded` | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded | Estado del control |
| MDN — `aria-pressed` | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed | Por qué no usarlo aquí |
| MDN — `inert` | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert | Contenido colapsado no tabulable |
| MDN — `aria-busy` | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy | Carga |
| MDN — `prefers-reduced-motion` | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion | Movimiento reducido |
| MDN — `Window.localStorage` | https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | Persistencia y `file:` |
| web.dev — Optimize CLS | https://web.dev/articles/optimize-cls | Reserva de espacio, `transform`, 500 ms |
| React — Preserving and Resetting State | https://react.dev/learn/preserving-and-resetting-state | Montaje/desmontaje |
| Tailwind — transition-property | https://tailwindcss.com/docs/transition-property | `motion-safe`/`motion-reduce` |
| daisyUI — Collapse | https://daisyui.com/components/collapse/ | Límites del componente |
| daisyUI — Drawer | https://daisyui.com/components/drawer/ | Límites del componente |
| daisyUI — Themes | https://daisyui.com/docs/themes/ | Tokens semánticos |

---

## 4. Opciones de diseño (sin plan de implementación)

Las opciones siguientes no son una recomendación cerrada; comparan coste, impacto visual y compatibilidad con el contrato actual.

### 4.1. Cuándo abrir el panel

| Opción | Qué vería el writer | Ventajas | Costes / riesgos | Evidencia |
|---|---|---|---|---|
| **A. Abrirlo durante el borrador** (`creating === 'article'`) | El panel aparece al pulsar `New Article`, antes de guardar | Evita el salto al guardar; cumple literalmente «al crearse» si se interpreta como empezar la nota | Hay que componer el panel en la rama de creación, que hoy solo tiene `ArticleEditor`; hay que decidir si muestra la Story preseleccionada o un placeholder | `Workspace.tsx:24-30` |
| **B. Abrirlo justo después de guardar** | El panel aparece cuando el Article ya existe | Es el comportamiento actual en `xl`; el cambio sería solo hacerlo también por debajo de `xl` | No evita el salto: el panel sigue sin existir durante la creación y aparece al guardar | `Workspace.tsx:32-48` |
| **C. Abrirlo durante el borrador y mantener la misma instancia al guardar** | El panel ya está abierto y solo cambia su contenido | Continuidad visual completa; no hay montaje/desmontaje ni salto | Requiere un layout y un estado compartidos entre borrador y Article guardado; es la opción con más cambios | `Workspace.tsx:24-48`; `ArticleEditor.tsx:61-70` |

**[Inferencia]** Si el objetivo es eliminar la sensación de apertura brusca, C es la opción más coherente: el panel existe antes y después del guardado, y el guardado solo actualiza datos. A es una versión más simple que también evita el salto al guardar, pero puede remontar el panel al cambiar de rama.

### 4.2. Qué Story muestra durante el borrador

| Opción | Comportamiento | Ventajas | Costes / riesgos | Evidencia |
|---|---|---|---|---|
| **A. Solo la Story preseleccionada** (`creatingStoryId`) | Si `New Article` trae Story, se muestra; si no, queda el placeholder | Cambio pequeño; no toca el estado local de `ArticleEditor` | No sigue el selector de la banda: si el writer cambia de Story, el panel queda desactualizado | `Workspace.tsx:27`; `workspace-context.tsx:98-99` |
| **B. Seguir el `draft.StoryID`** | El panel se actualiza al elegir Story en la banda | Es lo más coherente con «la Story de este Article» | Hay que compartir el `StoryID` del borrador con el panel: elevarlo al workspace o renderizar el panel dentro de `ArticleEditor`; cuidar el re-render del editor | `ArticleEditor.tsx:43,101` |
| **C. No mostrar Story hasta guardar** | El panel queda como shell vacío durante todo el borrador | Evita el problema de sincronización | No cumple «vacío hasta que se cumpla la condición» si la condición es tener una Story elegida | `Workspace.tsx:24-30` |

**[Recomendación]** B: el panel debe reflejar la Story que el writer elige, no solo la preselección. Si se opta por A, el placeholder debe explicar que la Story preseleccionada es la única que se muestra hasta guardar.

### 4.3. Placeholder y estados del panel

| Estado | Opción de presentación | Evidencia / riesgo |
|---|---|---|
| Sin Story elegida (`StoryID === ''`) | Texto tipo «Choose a story to preview its source.» | Hoy no existe; `StoryPane` mostraría `no longer exists` y `#` si se montara con `null`/`''` (`StoryPane.tsx:77-86`) |
| Story cargando (`storiesStatus === 'loading'`) | Skeleton o mensaje de carga | `SkeletonList` existe, pero su forma es de lista (`Skeleton.tsx:8-16`); `StoryPane` no recibe el status |
| Story con error (`storiesStatus === 'error'`) | Mensaje de error y reintento | `ErrorState` existe y acepta `onRetry` (`ErrorState.tsx:10-26`), pero hoy el panel no tiene `reloadStories` |
| Story inexistente | Mantener «The story this article came from no longer exists.» | Es el texto que fija el test `App.test.tsx:378-389` |
| Story existente | Contenido actual (Topic, Titles, Tags, Text) | `StoryPane.tsx:88-110` |

**[Recomendación]** Distinguir explícitamente «sin Story todavía» de «Story inexistente». Un borrador sin Story no es un error; el mensaje actual sería incorrecto. Para una lectura local de SQLite, evitar skeleton y mostrar el resultado directamente; si se usa, retrasarlo y reservar espacio.

### 4.4. Minimizar / restaurar

| Opción | Comportamiento | Ventajas | Costes / riesgos |
|---|---|---|---|
| **A. Ocultar por completo** | `display:none` o no renderizar; se restaura desde un botón | Es el patrón actual del panel por debajo de `xl` | Si no se renderiza, se pierde `copyState`/scroll y los tests que esperan la región fallan; si se oculta con CSS, sigue montado y los tests la encuentran |
| **B. Colapsar a una franja** | Ancho reducido con un botón de expandir, como el sidebar | Da un affordance visible para restaurar; no pierde el contenido | Hay que diseñar la franja, el ancho y el estado; el sidebar usa `w-14` como referencia (`Sidebar.tsx:22-25`) |
| **C. Overlay en pantallas angostas** | El panel se superpone al editor | Aprovecha el espacio | No hay patrón de panel overlay; `Modal` atrapa el foco y no sirve (`Modal.tsx:15-75`) |

Dónde vive el control:

- **En `ArticleHeader`** (actual): solo existe con un Article guardado; no sirve durante la creación. `ArticleHeader.tsx:41-47`.
- **En la cabecera de `StoryPane`**: visible también durante la creación, pero agrega un cuarto botón a una cabecera de 360 px y puede duplicar el control de `ArticleHeader`. `StoryPane.tsx:32-74`.
- **En `ArticleBand` o en una barra del workspace**: visible en creación y edición, pero es un lugar nuevo para un control de layout. `ArticleBand.tsx:40-101`.
- **En una franja colapsada**: el propio panel minimizado contiene el botón de restaurar.

**[Recomendación]** El control debe estar fuera del contenido colapsado y existir tanto en creación como en edición. Una cabecera de panel con un botón `aria-expanded` y, si se quiere una franja, un botón visible en esa franja. No usar `aria-pressed` para este disclosure.

### 4.5. Comportamiento en `xl`

| Opción | Comportamiento en pantallas anchas | Ventajas | Costes / riesgos |
|---|---|---|---|
| **A. Mantener `xl:flex`** | El panel se ve siempre en `xl`, aunque el estado sea `false`; no se puede minimizar ahí | Conserva el comportamiento actual en pantallas anchas | El toggle sigue siendo un no-op visual en `xl`; no cumple «minimizar» si el viewport de la ventana por defecto alcanza `xl` (1280) |
| **B. Quitar `xl:flex`** | El estado `storyPaneVisible` manda en todos los anchos | El toggle funciona siempre; el estado y `aria-expanded` coinciden | Cambia el comportamiento actual: en `xl` el panel ya no se muestra por defecto si el estado es `false` |
| **C. Abierto por defecto en `xl`, pero con override** | Se muestra por defecto en `xl` y el usuario puede ocultarlo | Conserva la intención de «pantalla ancha muestra el preview» y permite minimizar | Hay que distinguir el valor por defecto del override del usuario; más estado |

Evidencia: `Workspace.tsx:39-43`; `src/main/main.ts:14-18`; `package.json:48`.

**[Recomendación]** B o C. Si se mantiene A, «minimizar» no funciona en una ventana cuyo viewport alcance `xl` (1280 px), que es el caso más probable en escritorio.

### 4.6. Persistencia de la preferencia

| Opción | Alcance | Ventajas | Costes / riesgos |
|---|---|---|---|
| **A. Sin persistencia** | Solo la sesión actual | No agrega infraestructura; es el comportamiento actual | Se pierde al reiniciar; el writer vuelve al valor por defecto |
| **B. Persistencia local del renderer** | `localStorage`/`sessionStorage` | Simple; no toca main | No hay precedente en el repo; `sessionStorage` no sobrevive al reinicio; `localStorage` en Electron requiere decidir el ciclo de vida y bajo `file://` es indefinido |
| **C. Persistencia en el main** | Archivo de settings o SQLite | Sobrevive al reinicio y es consistente con una app de escritorio | Requiere contrato/preload/servicio nuevo; contradice el alcance «solo renderer» y AGENTS pide no ampliar sin necesidad |

Evidencia: `workspace-context.tsx:116-126`; `package.json:28-82`; MDN, [`Window.localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

**[Recomendación]** Si «volver a abrirlo cuando lo necesite» significa dentro de la sesión, A o B bastan. Si debe sobrevivir al reinicio, C es la opción correcta, pero es una decisión de alcance que requiere contrato IPC y justificación; no debe asumirse como parte del cambio mínimo.

### 4.7. Animación

| Opción | Efecto | Ventajas | Costes / riesgos |
|---|---|---|---|
| **A. Sin animación** | El panel aparece/desaparece instantáneamente | Mínimo cambio; no hay infraestructura | No resuelve la percepción de «apertura brusca»; el layout sigue saltando |
| **B. Transición CSS de ancho/opacidad** | El panel se desliza o aparece | Suave; se puede hacer con utilidades | Hay que manejar el contenido durante la transición y `prefers-reduced-motion` (`src/renderer/src/styles/base.css:33-41`); el layout de `flex` puede requerir un wrapper |
| **C. Transición de grid/columnas** | El workspace anima el ancho de la columna | Evita saltos de layout | Más complejo; no hay precedente en el repo |

**[Recomendación]** C para el panel inline: `grid-template-columns: 0fr ↔ 1fr`, `min-width: 0`, `overflow: hidden`, 150–250 ms, `motion-reduce:transition-none`. No animar en el primer render ni al cambiar de Article; la animación es para la acción del usuario. Si se elige C y el panel ya está abierto durante la creación, no hay animación de entrada al guardar.

### 4.8. Semántica accesible y contrato de tests

| Opción | Semántica | Compatibilidad con tests | Valoración |
|---|---|---|---|
| **A. Mantener `aria-pressed` + `Toggle source pane`** | Toggle de estado del botón | Pasa `App.test.tsx:404-415` sin cambios | Mínimo cambio, pero semánticamente incorrecto para un panel que muestra/oculta una región |
| **B. `aria-expanded` + nombre estable «Source story»** | Disclosure correcto | Rompe el test de `aria-pressed`; exige aprobar un cambio de contrato | Recomendado por accesibilidad; no es un ajuste mecánico del test |
| **C. `aria-expanded` + label dinámico «Minimize/Show source pane»** | Disclosure con nombre que cambia | Rompe el test actual; riesgo de anuncios redundantes | Aceptable, pero menos limpio que un nombre estable |

**[Recomendación]** B si la accesibilidad entra en el alcance. Si se decide preservar el contrato actual, documentar la deuda semántica y no añadir `aria-expanded` junto a `aria-pressed` (sería contradictorio). Cualquier cambio de este tipo debe tratarse como decisión de producto y actualizar los tests con aprobación explícita, no para «hacer pasar» una implementación.

---

## 5. Decisiones abiertas

| # | Decisión | Opciones | Por qué importa |
|---|---|---|---|
| 1 | **Alcance temporal de «al crearse»** | Durante el borrador / después de guardar / durante y después con la misma instancia | Determina si se elimina el salto y cuánto cambia `Workspace` |
| 2 | **Story que muestra el borrador** | Solo `creatingStoryId` / seguir `draft.StoryID` / vacío hasta guardar | Afecta la coherencia con el selector de `ArticleBand` y el estado local del editor |
| 3 | **Placeholder sin Story** | «Choose a story…» / texto explicativo / skeleton / nada | Hoy `null` muestra «no longer exists», incorrecto para un borrador |
| 4 | **Carga y error de Stories** | Distinguir `storiesStatus` / mantener el mensaje único | `null` confunde «cargando», «error» y «no existe» |
| 5 | **Toggle durante la creación** | En `ArticleHeader` / en `StoryPane` / en `ArticleBand` / en una barra nueva | Sin toggle durante la creación, el panel abierto no se puede minimizar |
| 6 | **Forma de minimizar** | Ocultar por completo / franja / overlay | Define el affordance de restaurar y el impacto en el layout |
| 7 | **Comportamiento en `xl`** | Mantener `xl:flex` / quitarlo / default con override | Hoy no se puede minimizar en la ventana inicial de 1280 px |
| 8 | **Persistencia** | Ninguna / sesión / por Article en main | Si debe sobrevivir al reinicio, amplía el alcance a IPC/main |
| 9 | **Animación** | Ninguna / ancho-opacidad / grid | La opción grid evita saltos, pero añade complejidad y requiere `prefers-reduced-motion` |
| 10 | **Semántica del toggle** | `aria-pressed` actual / `aria-expanded` | `aria-expanded` es el patrón correcto; cambiar rompe un test que hoy es contrato |
| 11 | **Acciones del panel en creación** | Mostrar todas / ocultar las destructivas / solo lectura | `Delete story` no recibe la Story y `App` usa `openStory`, no `creatingStoryId`; podría borrar otra Story |
| 12 | **`StoryID` vacío** | Mostrar panel con placeholder / no mostrar panel hasta tener Story | Un Article persistido nunca tiene `StoryID` vacío; el caso solo existe en el borrador |
| 13 | **Continuidad tras guardar** | Misma instancia del panel / remontar al cambiar de rama | La continuidad evita el salto, pero exige un layout/estado compartido |
| 14 | **Markdown en el panel** | Mantener `<pre>` / renderizar Markdown | La spec previa de `preview-story` excluye Markdown en `StoryPane`; si «better preview» incluye esto, es otro alcance |
| 15 | **Integración con ramas paralelas** | Trabajar desde `main` / integrar antes `feat/preview-story-integration` o `feat/delete-story` | `feat/delete-story` toca `StoryPane` y `workspace-context.tsx`; puede conflictuar |

---

## 6. Inventario de archivos

### 6.1. Producción (solo lectura en esta investigación)

| Archivo | Papel actual | Por qué podría cambiar |
|---|---|---|
| `src/renderer/src/workspace/Workspace/Workspace.tsx` | Decide las ramas y el layout; aplica `hidden xl:flex` | Es el punto donde se monta/no se monta `StoryPane` y donde se decide la visibilidad por breakpoint |
| `src/renderer/src/workspace/StoryPane/StoryPane.tsx` | Panel de la Story; resuelve `Story/null` y sus acciones | Necesita un estado «sin Story todavía», posiblemente un control de minimizar y un tratamiento distinto de acciones |
| `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx` | Toggle `Toggle source pane` con `aria-pressed` | Es el control actual de visibilidad; puede cambiar de ubicación, label o semántica |
| `src/renderer/src/state/workspace-context.tsx` | `storyPaneVisible`, `storyPane/toggle`, estado de creación | Posible nuevo estado/acción para la visibilidad durante creación o para distinguirla de la de un Article guardado |
| `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx` | Draft local, `StoryID`, persistencia, `onStored` | Si el panel debe seguir la Story elegida en la banda, hay que compartir el `StoryID` del draft o componer el panel aquí |
| `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx` | Selector de Story y validación visible | Es la fuente del `StoryID` que el writer elige durante la creación; su texto/estado puede influir en el placeholder |
| `src/renderer/src/workspace/ArticlePane/ArticlePane.tsx` | Composición `ArticleHeader` + `ArticleEditor` | Puede cambiar si el panel se mueve o si se necesita un header común para creación y edición |
| `src/renderer/src/state/use-story-in-context.ts` | Deriva la Story del Article abierto o de la Story seleccionada | No conoce `creatingStoryId`; si el panel de creación necesita contexto, esta derivación es el lugar natural para revisarlo |
| `src/renderer/src/state/library-context.tsx` | Expone `allStories`, `storiesTotal`, `storiesStatus`, `storyById` | Probablemente no necesita cambios: ya tiene los datos y el estado de carga necesarios |
| `src/renderer/src/ui/EmptyState/EmptyState.tsx` | Empty state genérico | Posible reutilización para el placeholder; no tiene acción ni variante compacta |
| `src/renderer/src/ui/Skeleton/Skeleton.tsx` | Skeleton de listas con `role=status` | Posible reutilización para el estado de carga de Stories |
| `src/renderer/src/ui/IconButton/IconButton.tsx` | Botón icon-only con `label`/`aria-label`/`title` | Reutilizable para un botón de minimizar/restaurar |
| `src/renderer/src/styles/base.css` / `global.css` | Tokens, foco y `prefers-reduced-motion` | Solo si se agrega una animación o un token nuevo; no se esperan colores nuevos |
| `src/renderer/src/App.tsx` | Diálogos de borrado y guard de navegación | Relevante si el panel de creación permite borrar una Story: hoy el diálogo usa `openStory`, no `creatingStoryId` |

### 6.2. Tests (no modificados en esta investigación)

| Archivo / bloque | Por qué podría necesitar atención |
|---|---|
| `src/renderer/src/App.test.tsx:339-426` | Fija contenido, Story inexistente, copia, toggle y apertura del editor; es el contrato más directamente afectado |
| `src/renderer/src/App.test.tsx:404-415` | Fija `aria-pressed=false` inicial; cualquier cambio de valor inicial o semántica lo rompe |
| `src/renderer/src/App.test.tsx:666-744` | Flujo de creación; si el panel se monta durante la creación, conviene agregar casos aquí |
| `src/renderer/src/App.test.tsx:746-910` | Botón contextual y atajo; indirectamente afectado si cambia el layout de creación |
| `src/renderer/src/App.test.tsx:912-939` | Botón `New Article` sin Stories; cuidado con textos duplicados como `No story yet` |
| `src/renderer/src/App.test.tsx:941-1033` | Borrado de Story/Article; relevante si el panel de creación expone `Delete story` |
| `src/renderer/src/App.test.tsx:1035-1178` | Atajos; si se agrega un atajo para el panel, este es el seam natural |
| `jest.config.js:24-35` | Confirma jsdom y la ausencia de CSS en los tests; explica por qué `hidden` no oculta a Testing Library |
| `src/renderer/src/test/render-app.tsx:6-11` | Renderiza `App` sin `main.tsx`/`global.css`; cualquier test de visibilidad real por breakpoint requeriría otra estrategia |

### 6.3. Documentación / planificación

| Archivo | Papel |
|---|---|
| `.scratch/better-preview-story/spec.md` (a crear en la fase de planificación) | Spec de la feature, en español, con las decisiones cerradas |
| `docs/adr/` | Solo si se toma una decisión durable de estado, persistencia o accesibilidad que merezca un ADR; no es obligatorio para un cambio de layout |
| `AGENTS.md` | No parece requerir cambios; las reglas actuales ya cubren estado, tests y tokens |

### 6.4. Fuera de alcance previsible

- **No** hay cambios en `src/main`, `src/preload`, `src/main/adapters/ipc`, `DataPort`, dominio, SQLite ni migraciones. El panel solo consume datos ya disponibles en `LibraryProvider`. `AGENTS.md:45,51-52`; `library-context.tsx:49-64`.
- **No** hay cambios de contrato IPC: la creación de Article sigue exigiendo `storyID` + `title` y el `storyID` sigue siendo inmutable. `docs/api/ipc-contract.md:135-143`; `docs/adr/0005-entity-born-from-identifiers.md:3-7`.
- **Excepción:** si se decide persistir la preferencia en el proceso principal, sí habría cambios en main/preload/DataPort y probablemente una migración o un almacén de settings; eso debe justificarse aparte.

---

## 7. Conclusiones, limitaciones y siguiente paso

### 7.1. Conclusiones

- **[Hecho]** El problema no es de datos: `LibraryProvider` ya expone `allStories`, `storiesStatus` y `storyById`; `creatingStoryId` y el `StoryID` del borrador existen antes de guardar. El problema es de composición y de estado: el panel no se monta durante la creación y el toggle no existe en esa rama.
- **[Hecho]** El salto tiene dos causas visibles: el panel se monta recién al guardar, con ancho fijo y sin transición; y en `xl` se fuerza su visibilidad, por lo que el toggle no puede minimizarlo si el viewport de la ventana inicial alcanza ese breakpoint.
- **[Inferencia]** Abrir el panel durante el borrador y mantener la misma instancia al guardar es la forma más directa de cumplir «abierto al crearse» y eliminar la apertura brusca. Requiere decidir cómo se comparte el `StoryID` del borrador y cómo se compone el layout, sin mover todo el draft al workspace.
- **[Inferencia]** El estado vacío debe ser explícito y distinto de «Story inexistente». Hoy `StoryPane` no puede distinguirlos porque recibe solo `story: Story | null`.
- **[Recomendación]** El cambio mínimo coherente es: montar el panel en la creación, mostrar un placeholder cuando no hay Story, seguir el `StoryID` elegido, ofrecer un toggle real en todos los anchos y no animar en el primer render. La persistencia y la migración a `aria-expanded` son decisiones adicionales de alcance.
- **[Decisión abierta]** La semántica `aria-pressed` actual y el valor inicial `false` están fijados por tests. Migrar a `aria-expanded` es lo correcto según la APG, pero debe aprobarse como cambio de contrato; no debe hacerse para «pasar» una implementación.

### 7.2. Limitaciones

- **[Hecho]** Este informe se basa en lectura de código, tests y documentación; no se probó la app empaquetada ni con lectores de pantalla reales (NVDA, JAWS, VoiceOver).
- **[Inferencia]** Las recomendaciones sobre Electron y `localStorage` bajo `file://` se derivan de MDN y del comportamiento típico de empaquetado de electron-vite; deben confirmarse en la versión concreta de Electron y en el modo de carga del renderer.
- **[Inferencia]** El comportamiento de `grid-template-columns` animado y de `@starting-style` depende de la versión de Chromium incluida en Electron; verificar en el runtime objetivo.
- **[Hecho]** CLS es una métrica web; en una aplicación de escritorio no se reporta como Core Web Vital. Se usa como heurística de estabilidad visual.
- **[Hecho]** No se modificó código de producción ni tests. La suite `App.test.tsx` (75 tests) pasó completa durante la investigación de código (2026-10-20). La única escritura en el repo es este informe.

### 7.3. Siguiente paso

1. Cerrar las decisiones 1-10 de la sección 5, en especial: alcance temporal, Story que muestra el borrador, forma de minimizar, comportamiento en `xl`, persistencia y semántica accesible.
2. Escribir `.scratch/better-preview-story/spec.md` con las decisiones cerradas y los criterios de aceptación de la sección 3.9.
3. Recién después, descomponer en tickets y planificar la implementación. No se recomienda empezar por la animación: el salto se resuelve primero con composición y estado; la animación es un detalle posterior.
