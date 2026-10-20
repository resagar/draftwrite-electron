# Investigación: lista reutilizable y borrado de Article desde su fila

**Status:** research  
**Fecha:** 2026-10-20  
**Commit de referencia:** `269d976` (`main`, árbol limpio)  
**Alcance:** renderer. No se modificó código de producción.  
**Pregunta:** ¿StoryList y ArticleList usan componentes independientes que deberían ser reutilizables? ¿Se puede replicar el borrado por fila de Stories en Articles de forma automática y segura?

---

## Veredicto

La hipótesis es **parcialmente correcta**.

- **Sí** hay duplicación real en el *armazón* de las listas: las ramas de loading/error/empty, el `<ul role="listbox">`, la fila seleccionable y el slot de acción están escritos dos veces (`StoryList.tsx:30-127`, `ArticleList.tsx:51-144`).
- **No** es cierto que “solo cambia la formación”. La interacción base es la misma, pero cambian el estado vacío, las acciones de creación, la guarda de “New Article”, el filtrado, los campos disponibles, la selección y la semántica del borrado.
- El componente de contenido de fila **ya es reutilizable**: `ListRowItem` lo usan ambas listas (`ListRowItem.tsx:6-50`; `StoryList.tsx:104-110`; `ArticleList.tsx:133-138`). Lo que falta abstraer es la **fila interactiva** (`option` + acción), no el contenido.
- El borrado de Article desde la fila **no es automático**. El diálogo actual resuelve el objetivo con `selectedArticle`, no con el Article que originó la acción (`App.tsx:25,74-84`). Sin un target explícito, borrar una fila no seleccionada borraría el Article abierto o no abriría nada.
- La abstracción correcta y segura es un **`OptionList<T>`** que posea listbox + roving tabindex + fila + slot de acción, manteniendo `ListColumn`, `ListEmpty`, `ListRowItem`, `SortToggle` y los contenedores por entidad. **No** conviene un `LibraryList` monolítico que sepa de Stories, Articles, creación y borrado.

---

## 1. Estado actual: qué se comparte y qué se duplica

### 1.1 Piezas que ya son reutilizables

| Pieza | Responsabilidad | Evidencia |
|---|---|---|
| `ListColumn` | Columna, `section` con `aria-label`, cabecera, contador y `headerActions` | `ListColumn.tsx:3-33`; usado en `StoryList.tsx:32,40,52,78` y `ArticleList.tsx:53,61,73,95` |
| `ListEmpty` | Estado vacío, distinción filtro/biblioteca, “Clear filter” o acción | `ListEmpty.tsx:3-40`; usado en `StoryList.tsx:53-72` y `ArticleList.tsx:74-89` |
| `ListRowItem` | Contenido de fila: título, fecha relativa, extracto y tags opcionales | `ListRowItem.tsx:6-50`; usado en ambas listas |
| `SortToggle` | Orden global por `UpdatedAt` | `SortToggle.tsx:6-25`; usado en `StoryList.tsx:78` y `ArticleList.tsx:100` |
| `useOptionList` | Foco, `itemsRef`, roving tabindex y teclado del listbox | `use-option-list.ts:15-55`; usado en ambas listas |
| `IconButton` | Botón icon-only con `aria-label`, `title` y tono `danger` | `IconButton.tsx:12-39`; acción de fila en `StoryList.tsx:112-122` |
| `ConfirmDialog` / `Modal` | Confirmación, error y focus trap | `ConfirmDialog.tsx:22-47`; `Modal.tsx:15-58` |

`ListRowItem` ya resuelve exactamente la parte que el usuario llama “el componente de los items”. No hace falta reemplazarlo ni añadirle un `entityType`: recibe los campos ya formateados y los tags son opcionales (`ListRowItem.tsx:6-12,41-47`).

### 1.2 Duplicación real

| Bloque | `StoryList` | `ArticleList` | Diferencia |
|---|---|---|---|
| Datos y selección | `StoryList.tsx:18-26` | `ArticleList.tsx:20-30` | Articles añade `useStoryInContext`, `canCreate` y `startNew` |
| `filtered` | `StoryList.tsx:28` | `ArticleList.tsx:32` | Misma fórmula con `storiesTotal` / `articlesTotal` |
| Loading | `StoryList.tsx:30-36` | `ArticleList.tsx:51-57` | Solo cambian título y label |
| Error | `StoryList.tsx:38-48` | `ArticleList.tsx:59-69` | Solo cambian textos y `reload` |
| Empty | `StoryList.tsx:50-75` | `ArticleList.tsx:71-92` | Icono, copy, clear filter y acción |
| Header listo | `StoryList.tsx:78` | `ArticleList.tsx:95-106` | Articles añade “No story yet” + “New Article” |
| Listbox | `StoryList.tsx:79-84` | `ArticleList.tsx:108-113` | Solo cambia `aria-label` |
| Filas | `StoryList.tsx:85-125` | `ArticleList.tsx:114-141` | Story tiene wrapper y acción; Article no |
| Contenido | `StoryList.tsx:104-110` | `ArticleList.tsx:133-138` | Story pasa `Topic` y `Tags`; Article pasa `Title` sin tags |

La duplicación de valor está en el **markup del listbox y de la opción**: `role="option"`, `aria-selected`, `tabIndex`, `ref`, `onFocus`, `onClick`, el wrapper `li` y el slot de acción. Es la parte más fácil de desincronizar y la que concentra las reglas de accesibilidad.

### 1.3 Lo que no es duplicación y no debería unificarse a ciegas

- **Estado vacío:** Story siempre puede crear; Article depende de que exista una Story y tiene cuatro variantes de copy (`StoryList.tsx:53-72`; `ArticleList.tsx:74-89`).
- **Header:** Article añade el aviso “No story yet” y el botón de creación (`ArticleList.tsx:95-106`).
- **Filtrado:** Story filtra por `Story.Tags`; Article filtra por los tags de la Story de origen (`library.ts:20-40`; `library-context.tsx:40-47`).
- **Campos:** `Article` no tiene `Tags` (`types.ts:16-25`); no se deben pasar los tags de la Story a la fila del Article, porque cambiaría el significado de la fila.
- **Selección:** `story/select` limpia el Article abierto; `article/select` no limpia la Story (`workspace-context.tsx:76-93`).
- **Borrado:** Story cascadea sus Articles; Article solo se borra a sí mismo.
- **Clear filter:** `StoryList` usa `navigate` y pasa por el guard de drafts; `ArticleList` usa `dispatch` directo (`StoryList.tsx:62`; `ArticleList.tsx:87`). Hay que preservar o decidir explícitamente esta diferencia; no unificarla por accidente.

---

## 2. El patrón de borrado de Story que se quiere replicar

### 2.1 Flujo completo

1. La fila despacha `dialog/open` con el `storyId` de esa fila, sin seleccionarla (`StoryList.tsx:112-122`).
2. El reducer guarda `dialog` y `dialogStoryId` (`workspace-context.tsx:33-34,115-118`).
3. `App` resuelve la Story con `storyById(dialogStoryId)`, no con la selección (`App.tsx:19-26`).
4. El diálogo solo se renderiza si `dialog === 'delete-story'` y la Story existe (`App.tsx:94`); el mensaje usa el Topic del target (`App.tsx:96-98`).
5. Al confirmar, borra el ID explícito (`App.tsx:101-104`), limpia el Article abierto solo si pertenece a esa Story y la Story seleccionada solo si coincide (`App.tsx:106-111`), y recarga ambas listas (`App.tsx:40-44`).
6. Cancelar o Escape cierra sin borrar (`App.tsx:28-31`; `Modal.tsx:25-30`).
7. Un fallo mantiene el diálogo, muestra `role="alert"` y recarga las listas (`App.tsx:46-50`; `ConfirmDialog.tsx:25-29`).

### 2.2 Estructura accesible de la fila

La fila de Story usa:

```tsx
<li role="presentation" className="relative">
  <div role="option" aria-selected={selected} tabIndex={...} ...>
    <ListRowItem ... />
  </div>
  <IconButton
    label={`Delete story “${story.Topic}”`}
    tone="danger"
    onClick={() => dispatch({ type: 'dialog/open', dialog: 'delete-story', storyId: story.ID })}
    onKeyDown={(event) => event.stopPropagation()}
    className="absolute top-2 right-2"
  >
    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
  </IconButton>
</li>
```

Evidencia: `StoryList.tsx:89-123`.

El botón es **hermano** del `option`, no descendiente. Esto evita cuatro problemas:

- El clic del botón no burbujea al `onClick` del option y no selecciona la fila.
- El `keydown` no llega al `ul` y no activa `focusIndex` (`use-option-list.ts:48-51`).
- El foco del botón no dispara el `onFocus` del option ni mueve el roving tabindex.
- El botón conserva su rol nativo y su nombre accesible; no queda como descendiente presentacional de `role="option"`.

La decisión está documentada en `.scratch/delete-story/spec.md:93-103` y se implementó en `d324f1b`; el color destructivo se alineó en `72a8f8e`.

### 2.3 Cobertura que fija el contrato

Los tests de `App.test.tsx` cubren:

- Borrar una fila no seleccionada conserva la Story seleccionada (`App.test.tsx:1672-1698`).
- Borrar la fila seleccionada limpia la selección y muestra el vacío (`App.test.tsx:1700-1716`).
- Cancelar conserva selección y editor (`App.test.tsx:1718-1735`).
- Borrar la Story de origen limpia el Article abierto (`App.test.tsx:1758-1779`).
- Fallo de fila mantiene la Story y muestra error (`App.test.tsx:1781-1797`).
- Enter/Espacio sobre el botón no selecciona la fila (`App.test.tsx:1799-1817`).
- Nombres accesibles por Topic (`App.test.tsx:1679-1680`).

---

## 3. Borrado de Article: estado actual y brecha

### 3.1 Hoy solo existe en el header

`ArticleHeader` recibe el Article completo, pero despacha sin ID:

```tsx
<IconButton
  label="Delete article"
  onClick={() => dispatch({ type: 'dialog/open', dialog: 'delete-article' })}
>
  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
</IconButton>
```

Evidencia: `ArticleHeader.tsx:34-39`; el Article llega desde `ArticlePane.tsx:11-16`.

`App` resuelve el objetivo con `selectedArticle = articleById(selectedArticleId)` y solo renderiza el diálogo si no es `null` (`App.tsx:25,74-92`). Al confirmar, borra `selectedArticle.ID` y limpia `selectedArticleId` incondicionalmente (`App.tsx:84-87`).

### 3.2 Por qué una fila necesita un target explícito

Si un botón de fila despachara `dialog/open` sin ID:

| Escenario | Resultado con el contrato actual |
|---|---|
| Hay otro Article abierto y se pulsa borrar en la fila A | El diálogo muestra el Article abierto y borra ese, no A. |
| No hay Article seleccionado | `selectedArticle === null`; el diálogo no se renderiza y el botón parece no hacer nada. |
| El Article seleccionado está oculto por el filtro y la fila visible es otra | `articleById` busca en la lista completa (`library-context.tsx:58`), así que el diálogo apunta al Article oculto. |
| El botón está anidado en el `option` | El clic puede seleccionar la fila y disparar el guard de drafts (`use-navigation.ts:8-18`). |
| Enter/Espacio sobre un botón anidado | El `keydown` burbujea al `ul` y activa `focusIndex` (`use-option-list.ts:48-51`). |

Seleccionar primero la fila tampoco es seguro: cambia el contexto, puede abrir “Leave without saving?” y `article/select` limpia `creating`/`creatingStoryId` (`workspace-context.tsx:87-93`).

**Conclusión:** el target debe viajar en el evento, no inferirse de la selección. Es exactamente el cambio que `delete-story` ya hizo para Story (`workspace-context.tsx:33-34,51,115-118`).

---

## 4. ¿Solo cambia la formación? Diferencias que deben sobrevivir

| Dimensión | Story | Article | Evidencia |
|---|---|---|---|
| Estado vacío | “No stories yet” / “No stories with this tag”; “New Story” siempre disponible | Cuatro variantes; “New Article” deshabilitado sin Story | `StoryList.tsx:53-72`; `ArticleList.tsx:74-89` |
| Header | Solo `SortToggle` | `SortToggle` + “No story yet” + “New Article” | `StoryList.tsx:78`; `ArticleList.tsx:95-106` |
| Creación | Sin guarda de entidad padre | `canCreate = hasStories`; preselecciona la Story en contexto | `ArticleList.tsx:25,34-49`; `use-story-in-context.ts:13-22` |
| Filtro | `Story.Tags` | Tags de la Story de origen | `library.ts:20-40`; `library-context.tsx:40-47` |
| Tags en fila | Se muestran | No existen en `Article` | `StoryList.tsx:104-110`; `ArticleList.tsx:133-138`; `types.ts:16-25` |
| Campos | `Topic`, `UpdatedAt`, `Text`, `Tags` | `Title`, `UpdatedAt`, `Text`; `Subtitle`/`Target` no se muestran | `types.ts:6-25`; `ListRowItem.tsx:6-12` |
| Selección | `selectedStoryId`; `story/select` cierra el Article | `selectedArticleId`; `article/select` no cierra la Story | `workspace-context.tsx:76-93` |
| Borrado | Fila y editor; cascadea Articles | Solo header; no cascadea | `StoryList.tsx:112-122`; `ArticleHeader.tsx:34-39`; `App.tsx:94-117` |
| Clear filter | `navigate` (guard de drafts) | `dispatch` directo | `StoryList.tsx:62`; `ArticleList.tsx:87` |

La interacción “lista seleccionable con acción por fila” es la misma. El **contrato de datos y de dominio** no. La abstracción debe compartir la interacción, no la entidad.

---

## 5. Abstracción recomendada

### 5.1 Frontera: `OptionList<T>`, no `LibraryList`

Comparación de opciones:

| Opción | Alcance | Veredicto |
|---|---|---|
| **(a) `OptionList<T>`** | `ul[role=listbox]` + filas `option` + roving tabindex + slot de acción | **Recomendada** |
| (b) `LibraryList` monolítico | Loading, error, empty, header, filas, creación y borrado | **Rechazada**: explode en props y esconde diferencias reales |
| (c) Solo `OptionRow` | Extrae únicamente el `li`/`div role="option"` | **Fallback** si no se quiere tocar el foco ahora; deja duplicado el listbox |

`OptionList<T>` debe ser presentacional y agnóstico de la entidad:

```tsx
type OptionListProps<T> = {
  label: string
  items: readonly T[]
  getId: (item: T) => string
  selectedId: string | null
  onSelect: (item: T) => void
  renderContent: (item: T, selected: boolean) => ReactNode
  renderAction?: (item: T) => ReactNode
}
```

Uso previsto en Story:

```tsx
<OptionList
  label="Stories"
  items={stories}
  getId={(story) => story.ID}
  selectedId={selectedStoryId}
  onSelect={(story) => navigate({ type: 'story/select', storyId: story.ID })}
  renderContent={(story, selected) => (
    <ListRowItem
      title={story.Topic}
      updatedAt={story.UpdatedAt}
      text={story.Text}
      tags={story.Tags}
      selected={selected}
    />
  )}
  renderAction={(story) => (
    <IconButton
      label={`Delete story “${story.Topic}”`}
      tone="danger"
      onClick={() =>
        dispatch({ type: 'dialog/open', dialog: 'delete-story', storyId: story.ID })
      }
    >
      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
    </IconButton>
  )}
/>
```

Uso previsto en Article (después del cambio de estado):

```tsx
<OptionList
  label="Articles"
  items={articles}
  getId={(article) => article.ID}
  selectedId={selectedArticleId}
  onSelect={(article) => navigate({ type: 'article/select', articleId: article.ID })}
  renderContent={(article, selected) => (
    <ListRowItem
      title={article.Title}
      updatedAt={article.UpdatedAt}
      text={article.Text}
      selected={selected}
    />
  )}
  renderAction={(article) => (
    <IconButton
      label={`Delete article “${article.Title}”`}
      tone="danger"
      onClick={() =>
        dispatch({ type: 'dialog/open', dialog: 'delete-article', articleId: article.ID })
      }
    >
      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
    </IconButton>
  )}
/>
```

El componente debe:

- Renderizar siempre `li[role="presentation"] > div[role="option"]`, incluso sin acción, para que la estructura sea uniforme.
- Aplicar `pr-10` solo cuando `renderAction` devuelve algo distinto de `null`; si no, no reservar un hueco muerto.
- Posicionar la acción como hermana absoluta (`top-2 right-2`), nunca dentro del option.
- Mantener `aria-selected`, `tabIndex`, `ref`, `onFocus` y `onClick` en el option.
- Usar `getId` como key y para comparar la selección.
- Delegar el contenido a `ListRowItem` o al `renderContent` que pase el contenedor.

Lo que **no** debe hacer:

- Cargar datos, decidir loading/error/empty o calcular `filtered`.
- Saber si la entidad es Story o Article.
- Decidir si se puede crear, qué texto mostrar o qué acción borrar.
- Abrir diálogos, cascadear o limpiar selecciones.
- Renderizar `SortToggle`, `ListColumn` o `ListEmpty`; esos siguen siendo piezas del contenedor.

### 5.2 El contenido de fila ya está resuelto

`ListRowItem` es la pieza correcta y no necesita un rediseño:

- Story pasa `Topic`, `UpdatedAt`, `Text`, `Tags` y `selected` (`StoryList.tsx:104-110`).
- Article pasa `Title`, `UpdatedAt`, `Text` y `selected`; omite tags (`ArticleList.tsx:133-138`).
- `tags` ya es opcional (`ListRowItem.tsx:6-12,41-47`).

No conviene añadir `Subtitle`/`Target` a Article ni tags de la Story sin una decisión de producto; eso cambia la formación, no la reutilización.

### 5.3 Accesibilidad del slot de acción

- **Hermano, no hijo:** `role="option"` es un nodo hoja en el árbol de accesibilidad; un botón anidado no se expone como control separado y contamina el nombre de la opción.
- **Teclado:** el `keydown` de la acción no debe llegar al `ul`. La solución actual es `stopPropagation` en el botón (`StoryList.tsx:118`), pero se duplica por acción. Mejor centralizarlo en `useOptionList`:

```ts
const target = event.target as HTMLElement
if (target.closest('[role="option"]') === null) {
  return
}
```

Así Enter/Espacio sobre el botón solo ejecuta el botón, y los atajos globales que no son de la lista no se bloquean. Se puede mantener `stopPropagation` como defensa, pero no como único mecanismo.

- **Nombres accesibles:** el nombre del botón debe incluir el título del elemento. Para Story, `Delete story “Topic”` es único porque `Topic` es único (`schema.ts:14`). Para Article, `Title` es único solo por Story (`schema.ts:44`; `docs/api/ipc-contract.md:138`), así que `Delete article “Title”` puede repetirse entre Stories. Recomendación: incluir el Topic de la Story de origen en el nombre, p. ej. `Delete article “Title” from “Topic”`, usando `storyById(article.StoryID)` (`library-context.tsx:59`). Si la Story no está disponible, degradar a `Delete article “Title”`.
- **Foco visible:** el outline global ya existe (`styles/base.css:28-31`) y el tono `danger` añade `focus-visible:bg-error/10` (`IconButton.tsx:14`). No eliminarlo.
- **Tamaño:** `p-1` + icono de 14 px da ~22×22 px (`IconButton.tsx:31`; `StoryList.tsx:121`). WCAG 2.2 AA (2.5.8) pide 24×24; WCAG 2.1 AA no exige mínimo. Es una mejora recomendable, no un bloqueo de paridad.
- **Visibilidad:** mantener la acción visible en reposo, no solo en hover/focus; es más descubrible y funciona con teclado y táctil. El patrón actual ya lo hace.

### 5.4 Estado seguro para `delete-article`

#### Opción recomendada: target discriminado

Sustituir `dialog: DialogKind | null` + `dialogStoryId` por un target único:

```ts
export type DialogTarget =
  | { kind: 'delete-story'; storyId: string }
  | { kind: 'delete-article'; articleId: string }

export type WorkspaceState = {
  // ...
  dialog: DialogTarget | null
}

export type WorkspaceAction =
  | { type: 'dialog/open'; dialog: 'delete-story'; storyId: string }
  | { type: 'dialog/open'; dialog: 'delete-article'; articleId: string }
  | { type: 'dialog/close' }
  | { type: 'article/deleted'; articleId: string }
  // ...
```

Reducer:

```ts
case 'dialog/open':
  return {
    ...state,
    dialog:
      action.dialog === 'delete-story'
        ? { kind: 'delete-story', storyId: action.storyId }
        : { kind: 'delete-article', articleId: action.articleId }
  }

case 'dialog/close':
  return { ...state, dialog: null }

case 'article/deleted':
  return state.selectedArticleId === action.articleId
    ? { ...state, selectedArticleId: null }
    : state
```

Ventajas:

- Elimina estados imposibles (`dialog: 'delete-article'` sin ID, o con un `storyId`).
- Obliga en compilación a pasar un target válido.
- Deja el flujo de Story y Article simétrico.
- `article/deleted` limpia solo si el Article borrado era el seleccionado y **no toca `creating`/`creatingStoryId`**.

#### Alternativa incremental

Si se quiere reducir el diff, se puede añadir `dialogArticleId` junto a `dialogStoryId` y una acción `dialog/open` discriminada. Es aceptable como paso intermedio, pero deja dos campos nullable que pueden desincronizarse. No es el estado final recomendado.

#### Por qué no reutilizar `article/select null`

`article/select` hace más que limpiar la selección:

```ts
case 'article/select':
  return {
    ...state,
    selectedArticleId: action.articleId,
    creating: null,
    creatingStoryId: null
  }
```

Evidencia: `workspace-context.tsx:87-93`.

`create/start` no limpia `selectedArticleId` (`workspace-context.tsx:104-110`), así que se puede estar creando un Article con el Article anterior todavía seleccionado. Si se borra esa fila y se usa `article/select null`, se cancelaría el draft en curso. `article/deleted` evita esa regresión.

### 5.5 Resolución y limpieza en `App`

```tsx
const dialogStory = dialog?.kind === 'delete-story' ? storyById(dialog.storyId) : null
const dialogArticle = dialog?.kind === 'delete-article' ? articleById(dialog.articleId) : null
```

Reglas:

- Resolver el target con `storyById`/`articleById`, que buscan en la lista completa sin filtrar (`library-context.tsx:58-59`).
- Renderizar el diálogo solo si el target existe; si desapareció, no borrar nada.
- Confirmar con el ID del target resuelto, no con `selectedArticle`.
- Éxito: `dispatch({ type: 'article/deleted', articleId })` y `afterWrite()`.
- Fallo: mantener el diálogo, mostrar `role="alert"` y recargar las listas (`App.tsx:46-50`).
- No limpiar `selectedStoryId` al borrar un Article; la Story sigue siendo contexto válido.
- `ArticleHeader` debe pasar `article.ID`; el comportamiento visible no cambia, pero el contrato queda explícito.

### 5.6 Estilo destructivo

`StoryList` usa `tone="danger"` (`StoryList.tsx:114`), pero `ArticleHeader` usa el tono por defecto (`ArticleHeader.tsx:34-39`). Para que “Delete article” sea reconocible como destructivo y consistente con “Delete story”, añadir `tone="danger"` también en el header. No cambia el comportamiento ni los tests, solo el color.

---

## 6. Hardening necesario para que la abstracción sea segura

### 6.1 `focusIndex` cuando la lista se acorta

`useOptionList` guarda `focusIndex` por índice y no lo ajusta cuando cambia `count` (`use-option-list.ts:16-23`). Si hay dos filas, el foco está en la segunda y se filtra/borra una, `tabIndexFor` devuelve `-1` para todas: **la lista se queda sin ningún `tabIndex=0`** y deja de ser alcanzable por Tab.

Además, `StoryList` y `ArticleList` hacen `stories[index].ID` / `articles[index].ID` sin guarda (`StoryList.tsx:25`; `ArticleList.tsx:29`). Un índice obsoleto no debería poder activar una fila inexistente.

Mitigación en el hook:

```ts
const activeIndex = count === 0 ? 0 : Math.min(focusIndex, count - 1)
const tabIndexFor = (index: number) => (index === activeIndex ? 0 : -1)
```

Y usar `activeIndex` en `onKeyDown`/`onActivate`, con una guarda `items[index]` en `OptionList`. Si se prefiere, sincronizar `focusIndex` con un `useEffect` al cambiar `count`. Añadir un test de regresión: renderizar dos items, enfocar el segundo, rerenderizar con uno y verificar que sigue habiendo exactamente un `tabIndex=0`.

Este bug es preexistente al borrado de Story, pero la acción por fila lo hace más visible. Corregirlo en la extracción es más barato que duplicarlo en Article.

### 6.2 Teclado de la acción

Además del guard por `closest('[role="option"]')`, el test actual de Story solo dispara `keydown` (`App.test.tsx:1799-1817`); jsdom no sintetiza el click nativo de Enter/Espacio. En el componente genérico conviene probar:

- `fireEvent.click(action)` no llama a `onSelect`.
- `fireEvent.keyDown(action, { key: 'Enter' })` y `{ key: ' ' }` no llaman a `onSelect`.
- El botón no es descendiente del option.

### 6.3 Foco después de borrar

`Modal` enfoca el primer focusable al abrir, pero no guarda ni restaura el foco al cerrar (`Modal.tsx:15-23`). Si el disparador era el botón de una fila y esa fila desaparece, el foco puede caer a `body`. Es una deuda de accesibilidad independiente del refactor. Si se quiere cerrar en esta feature:

- Guardar `document.activeElement` al montar el modal.
- Al desmontar, restaurar si el elemento sigue conectado.
- Si el disparador desapareció, enfocar la opción siguiente/anterior o el estado vacío.
- No robar el foco desde `OptionList` en cada cambio de `items`; la restauración pertenece al flujo de borrado o a `Modal`.

### 6.4 Tamaño del target

El botón de fila mide ~22×22 px. Si se adopta WCAG 2.2 AA, subir a `min-h-6 min-w-6` o `p-1.5`. Hacerlo en `IconButton` afecta también headers y `StoryPane`; verificar el layout. Es una mejora opcional, no un requisito para replicar el borrado.

### 6.5 Carrera con autosave

Borrar el Article abierto desmonta `ArticleEditor`; `useDraftPersistence` hace flush del pending al desmontar. Si se confirma dentro de los ~700 ms posteriores a una edición, puede salir un `updateArticle` después del `deleteArticle`, con `errNotFound` en un editor ya desmontado. No resucita el Article ni corrompe datos. Es el mismo riesgo aceptado en `delete-story` (`.scratch/delete-story/research.md:299-317`); documentarlo o descartar el pending si se quiere eliminar. Fuera del alcance de la abstracción.

### 6.6 Concurrencia de diálogos

`afterWrite()` y `failed()` son compartidos (`App.tsx:40-50`). Una resolución tardía de un borrado de Story puede cerrar un diálogo de Article abierto después. No corrompe datos, pero puede perder el estado de la UI. Es un riesgo preexistente; no lo introduce la fila de Article.

### 6.7 Títulos duplicados

`Article.Title` es único por Story (`schema.ts:44`; `docs/api/ipc-contract.md:138`). Dos Articles de Stories distintas pueden compartir título. El nombre `Delete article “Title”` sería ambiguo. Recomendación: incluir el Topic de la Story en el nombre accesible, como se indicó en 5.3. Los fixtures de test pueden usar títulos distintos, pero el nombre debe ser seguro con datos reales.

---

## 7. Plan de implementación por fases

### Fase 0 — Baseline

- Confirmar `main` limpio y tests verdes.
- Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`.
- No tocar backend, IPC, preload ni `DataPort`: `deleteArticle` ya existe y es idempotente.

### Fase 1 — Extraer `OptionList<T>` y migrar StoryList

- Crear `src/renderer/src/list/OptionList/OptionList.tsx`.
- Mover a él el `<ul>`, el wrapper de fila, el option, el roving tabindex y el slot de acción.
- Migrar `StoryList` sin cambiar su comportamiento.
- Añadir tests enfocados de `OptionList`.
- Correr los tests existentes de Story sin modificarlos.

### Fase 2 — Migrar ArticleList sin acción

- Reemplazar el markup de filas de `ArticleList` por `OptionList`, sin `renderAction`.
- Mantener loading/error/empty/header/creación/filtrado en `ArticleList`.
- Verificar que las queries por `role="option"` y los tests de filtro siguen verdes.

### Fase 3 — Target de diálogo y `article/deleted`

- Introducir `DialogTarget` y la acción `dialog/open` discriminada.
- Actualizar `App`, `ArticleHeader`, `StoryList`, `StoryEditor` y `StoryPane` a la nueva forma.
- Añadir `article/deleted` y limpiar la selección solo si coincide.
- Mantener intactos los tests de borrado de Article desde el header; el comportamiento observable no cambia.
- Añadir tests de integración para borrar un Article no seleccionado, seleccionado, cancelar, fallo y borrar mientras se crea.

### Fase 4 — Acción de borrado en ArticleList

- Pasar `renderAction` a `OptionList` en `ArticleList`.
- Usar `tone="danger"` y nombre accesible con título (y Topic de la Story si se adopta la recomendación).
- Añadir tests de fila: target correcto, selección preservada/limpiada, teclado, error, nombres accesibles.
- Verificar que no se abre el guard de drafts al pulsar el botón.

### Fase 5 — Pulido y hardening

- Clamp de `focusIndex` y guarda de índice.
- Guard de teclado por `closest('[role="option"]')` y retirar `stopPropagation` repetido si se centraliza.
- `tone="danger"` en `ArticleHeader`.
- Decidir target size y restauración de foco (pueden ser tickets separados).
- Actualizar documentación de componentes si existe.

### Archivos previstos

| Archivo | Cambio |
|---|---|
| `src/renderer/src/list/OptionList/OptionList.tsx` | Nuevo componente genérico |
| `src/renderer/src/list/OptionList/OptionList.test.tsx` | Tests del listbox y la acción |
| `src/renderer/src/list/StoryList/StoryList.tsx` | Migrar filas a `OptionList` |
| `src/renderer/src/list/ArticleList/ArticleList.tsx` | Migrar filas y añadir acción |
| `src/renderer/src/list/use-option-list.ts` | Clamp y guard de teclado |
| `src/renderer/src/state/workspace-context.tsx` | `DialogTarget`, `article/deleted` |
| `src/renderer/src/App.tsx` | Resolver target y limpieza selectiva |
| `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx` | Pasar `article.ID`, `tone="danger"` |
| `src/renderer/src/App.test.tsx` | Tests de borrado por fila de Article |
| `src/renderer/src/ui/IconButton/IconButton.tsx` | Opcional: target size |

No se prevén cambios en dominio, servicios, SQLite, migraciones, contrato IPC, preload ni `DataPort`.

---

## 8. Estrategia de testing

### 8.1 Tests enfocados de `OptionList`

Archivo nuevo `OptionList.test.tsx`, con items simples y espías, sin providers:

| Caso | Qué fija |
|---|---|
| Listbox y opciones | `role="listbox"` con nombre, N `option`, `aria-selected` correcto |
| Roving tabindex | Exactamente una opción con `tabIndex=0` |
| Teclado | ArrowDown/Up, Home/End mueven el foco; Enter/Espacio llaman `onSelect` con el item correcto |
| Acción por clic | Click en la acción no llama `onSelect` |
| Acción por teclado | Enter/Espacio en la acción no llama `onSelect` |
| Hermandad | El botón no es descendiente del `option` |
| Sin acción | No se renderiza botón y no se reserva padding |
| Lista que se acorta | Tras rerenderizar con menos items sigue habiendo un `tabIndex=0` y Enter no rompe |

### 8.2 Tests de integración en `App.test.tsx`

Añadir al bloque `deleting`, sin crear un seam nuevo:

| Caso | Qué fija |
|---|---|
| Nombres por fila | Existen botones distinguibles por título (y Topic si se adopta) |
| Fila no seleccionada | Abrir A, borrar B; el diálogo muestra B, se borra B, A sigue abierto |
| Fila seleccionada | Abrir A, borrar A; se limpia la selección y se desmonta el editor |
| Cancelar | No llama `deleteArticle`; conserva selección y editor |
| Teclado | Enter/Espacio sobre la acción no selecciona ni abre el diálogo |
| Fallo | `role="alert"`, la fila sigue, el editor abierto sigue |
| Creando un Article | Borrar el Article seleccionado no cancela el draft en curso |
| Cascada de Story | Los tests existentes siguen pasando sin cambios |

### 8.3 Tests existentes que no se tocan

Son contrato y deben seguir verdes sin modificarse:

- Lista de Stories y navegación por teclado: `App.test.tsx:47-174`.
- Lista de Articles y filtro por tags: `App.test.tsx:177-258`.
- Borrado de Article desde header: `App.test.tsx:1519-1578`.
- Borrado de Story desde fila/editor y cascada: `App.test.tsx:1601-1843`.
- Creación y “New Article”: `App.test.tsx:1475-1502` y bloques de creación.
- Tests de sorting y shell.

Si un test existente falla por ambigüedad de nombres, la solución es acotar con `within`, no cambiar la aserción para acomodar la implementación.

---

## 9. Decisiones que conviene cerrar antes de implementar

1. **Estado del diálogo:** ¿target discriminado ahora o `dialogArticleId` incremental? Recomendación: target discriminado; el incremental solo como paso intermedio.
2. **Nombre accesible del borrado de Article:** ¿solo título o título + Topic de la Story? Recomendación: incluir el Topic, porque el título no es único globalmente.
3. **Tamaño del target:** ¿se corrige `IconButton` en esta feature o se deja como deuda? Recomendación: deuda separada si el cambio global afecta layout.
4. **Restauración de foco:** ¿se implementa en `Modal` en esta feature o se deja como deuda? Recomendación: deuda separada; no bloquea la paridad.
5. **Mostrar procedencia/tags en filas de Article:** fuera de alcance; cambiaría la formación y el significado del filtro.

---

## 10. Riesgos y fuera de alcance

### Riesgos

- **Borrar el Article equivocado** si se mantiene la resolución por `selectedArticle` (crítico).
- **Cerrar el editor abierto** si se reutiliza `article/select null` para limpiar la selección (alto).
- **Anidar el botón en el option** y romper clic, teclado, foco y ARIA (alto).
- **Perder el draft en curso** al borrar una fila mientras se crea un Article (alto); `article/deleted` lo evita.
- **Lista sin tab stop** si `focusIndex` queda fuera de rango al acortarse la lista (medio, preexistente).
- **Nombres ambiguos** por títulos repetidos entre Stories (medio).
- **Foco a `body`** al desaparecer el disparador (medio, preexistente en `Modal`).
- **Carrera de autosave** al borrar el Article abierto (medio, documentada).
- **Concurrencia de diálogos** Story/Article (bajo/medio, preexistente).

### Fuera de alcance

- Cambios en dominio, servicios, repositorios, SQLite, migraciones, IPC, preload o `DataPort`.
- Deshacer, papelera o borrado lógico.
- Borrado múltiple o selección múltiple.
- Menú contextual o kebab.
- Atajo de teclado para borrar.
- Cambiar la semántica de la cascada Story → Articles.
- Rediseñar el contenido de las filas o mostrar `Subtitle`/`Target` en Articles.
- Internacionalización.
- Persistir el estado del diálogo o la selección.

---

## 11. Referencias

### Código

- `src/renderer/src/list/StoryList/StoryList.tsx`
- `src/renderer/src/list/ArticleList/ArticleList.tsx`
- `src/renderer/src/list/ListColumn/ListColumn.tsx`
- `src/renderer/src/list/ListEmpty/ListEmpty.tsx`
- `src/renderer/src/list/ListRowItem/ListRowItem.tsx`
- `src/renderer/src/list/SortToggle/SortToggle.tsx`
- `src/renderer/src/list/use-option-list.ts`
- `src/renderer/src/state/workspace-context.tsx`
- `src/renderer/src/state/use-navigation.ts`
- `src/renderer/src/state/library-context.tsx`
- `src/renderer/src/data/library.ts`
- `src/renderer/src/data/types.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx`
- `src/renderer/src/workspace/ArticlePane/ArticlePane.tsx`
- `src/renderer/src/workspace/StoryPane/StoryPane.tsx`
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx`
- `src/renderer/src/workspace/Workspace/Workspace.tsx`
- `src/renderer/src/ui/IconButton/IconButton.tsx`
- `src/renderer/src/ui/ConfirmDialog/ConfirmDialog.tsx`
- `src/renderer/src/ui/Modal/Modal.tsx`
- `src/renderer/src/App.test.tsx`

### Contratos y specs

- `.scratch/delete-story/spec.md:75-118` — target explícito y limpieza selectiva.
- `.scratch/delete-story/spec.md:188` — el diálogo de Article con ID explícito quedó fuera de alcance.
- `.scratch/delete-story/research.md:299-317` — riesgo de autosave y foco.
- `.scratch/delete-story/issues/02-delete-story-from-list.md` — criterios de la fila.
- `docs/api/ipc-contract.md:138` — título de Article único por Story.
- `src/main/adapters/persistence/sqlite/schema.ts:14,44` — `Topic` único; `(storyID, title)` único.

### Commits

- `d324f1b` — `feat(renderer): delete stories from the editor and the list`.
- `72a8f8e` — `style(renderer): use the theme error color for story delete buttons`.
- `269d976` — merge de `better-preview-story`, estado actual del renderer.
