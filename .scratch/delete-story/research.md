# Investigación: eliminación de Stories desde su propia interfaz

**Estado:** investigación de solo lectura. No se modificó código de producción ni tests.
**Fecha:** 2026-10-20.
**Rama:** `feat/delete-story` (sin commits por delante de `main`).
**Pregunta:** la Story no tiene una opción visible para eliminarla en su interfaz. ¿Qué pasó y qué cambios hacen falta para agregar la funcionalidad?

Convenciones del informe:

- **[Hecho]**: verificado leyendo código, tests, documentación o historial de git.
- **[Inferencia]**: consecuencia razonable de los hechos, no una regla escrita en el repo.
- **[Decisión abierta]**: el repo no la resuelve; requiere elegir antes de planificar.

---

## Resumen ejecutivo

- **[Hecho]** El borrado de Story ya está implementado de punta a punta: servicio de dominio, repositorio SQLite con cascada, canal IPC, preload, `DataPort` y diálogo de confirmación en `App`.
- **[Hecho]** El único disparador visible es el botón `Delete story` de `StoryPane`, el panel de solo lectura «Source story» que **solo** se renderiza cuando hay un Article abierto.
- **[Hecho]** El editor propio de la Story (`StoryEditor` + `StoryBand`) no tiene ninguna acción de borrado, y `StoryList` tampoco.
- **[Hecho]** No es una regresión: `git log --all -S "Delete story"` solo devuelve `656e46f` (el port del frontend), y ninguna rama (`main`, `feat/preview-story`, `feat/better-preview-story`, `feat/delete-story`) tuvo nunca un borrado en `StoryEditor`, `StoryBand` o `StoryList`.
- **[Inferencia]** La funcionalidad quedó incompleta en el port: se cableó «borrar la Story desde el Article» y no «borrar la Story desde su propio editor».
- **[Hecho]** El cambio mínimo es solo de renderer: agregar un disparador en `StoryBand`/`StoryEditor` que despache `dialog/open` con `delete-story`. El diálogo de `App` ya resuelve la Story seleccionada mediante `useStoryInContext`, y el backend ya borra en cascada.
- **[Decisión abierta]** Dónde ubicar el disparador (banda del editor vs. fila de la lista), si se agrega un atajo de teclado y si se corrige la carrera con un autosave pendiente.

---

## 1. Estado actual por capa

| Capa | ¿Existe el borrado de Story? | Evidencia |
|---|---|---|
| Dominio / servicio | Sí | `StoryService.delete` en `src/main/story/service.ts:10,32-34` |
| Puerto de repositorio | Sí | `StoryRepository.delete` en `src/main/story/repository.ts:25` |
| Persistencia SQLite | Sí, silencioso para IDs inexistentes | `src/main/adapters/persistence/sqlite/story-repository.ts:62-65` |
| Base de datos | Sí, cascada a Articles | `src/main/adapters/persistence/sqlite/schema.ts:30-33`; `migrations/0000_init.sql:10` |
| IPC main | Sí | `storyChannels.delete = 'story:delete'` en `src/main/adapters/ipc/contract.ts:32`; handler en `story-service.ts:21-23` |
| Preload | Sí | `src/preload/index.ts:22` |
| `DataPort` del renderer | Sí | `src/renderer/src/data/port.ts:25` |
| Implementación IPC del port | Sí | `src/renderer/src/data/ipc-port.ts:94-96` |
| Fake de tests | Sí, borra también los Articles de la Story | `src/renderer/src/data/fake/fake-port.ts:170-184` |
| Diálogo de confirmación | Sí | `src/renderer/src/App.tsx:94-113` |
| Disparador desde la UI de la Story | **No** | `StoryEditor.tsx` y `StoryBand.tsx` no tienen acción de borrado |
| Disparador desde la lista de Stories | **No** | `StoryList.tsx:83-113` no tiene acción por fila |

### 1.1 El único disparador: `StoryPane`

El botón existe en el header del panel «Source story»:

```tsx
<button
  type="button"
  aria-label="Delete story"
  title="Delete story"
  onClick={() => dispatch({ type: 'dialog/open', dialog: 'delete-story' })}
  className="rounded p-1 text-base-content/60 transition hover:bg-neutral/40 hover:text-error"
>
  <Trash2 aria-hidden="true" className="h-3 w-3" />
</button>
```

Fuente: `src/renderer/src/workspace/StoryPane/StoryPane.tsx:65-73`.

Ese componente se usa en un solo lugar: la rama de Article de `Workspace` (`src/renderer/src/workspace/Workspace/Workspace.tsx:34-47`). No se renderiza cuando se selecciona una Story.

### 1.2 Cómo decide `Workspace` qué mostrar

`src/renderer/src/workspace/Workspace/Workspace.tsx`:

| Condición | Qué renderiza | Líneas |
|---|---|---|
| `creating === 'story'` | `StoryEditor` con `stored={null}` | 16-22 |
| `creating === 'article'` | `ArticleEditor` con `stored={null}` | 24-30 |
| Hay Article seleccionado | `StoryPane` (Source story) + `ArticlePane` | 32-49 |
| Hay Story seleccionada y no hay Article | `StoryEditor` con `stored={story}` | 51-59 |
| Nada seleccionado | `EmptyState` | 61-69 |

Por eso el usuario que abre una Story desde la lista ve `StoryEditor`, que no tiene botón de borrado. El botón solo aparece si antes abrió un Article de esa Story.

### 1.3 El editor de Story no tiene la acción

`StoryEditor` renderiza `StoryBand`, el toolbar y el editor de texto; no hay ningún `onDelete` ni `dialog/open`:

- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx:81-107`.
- `src/renderer/src/workspace/StoryBand/StoryBand.tsx:60-116`.

`StoryBand` solo tiene el botón `Discard` y únicamente mientras se está creando (`creating === true`):

```tsx
{creating ? (
  <button type="button" onClick={onDiscard} ...>
    Discard
  </button>
) : null}
```

Fuente: `src/renderer/src/workspace/StoryBand/StoryBand.tsx:91-99`.

### 1.4 El diálogo y el backend ya funcionan para una Story seleccionada

`App` obtiene la Story en contexto con `useStoryInContext()` (`src/renderer/src/App.tsx:25-26`). Ese hook resuelve:

1. La Story del Article abierto, si hay Article.
2. La Story seleccionada, si no hay Article.
3. `null` si no hay ninguna.

Fuente: `src/renderer/src/state/use-story-in-context.ts:12-23`.

El diálogo se muestra cuando `dialog === 'delete-story' && openStory !== null` y al confirmar llama a `port.deleteStory(openStory.ID)`, limpia las selecciones de Article y Story, recarga ambas listas y cierra el diálogo (`src/renderer/src/App.tsx:94-113`).

**Consecuencia [Hecho]:** abrir el diálogo desde el editor de Story no requiere tocar `App` ni el hook; basta con despachar `dialog/open` desde `StoryEditor`/`StoryBand`.

### 1.5 El backend ya resuelve las reglas de negocio

- El servicio delega en el repositorio: `src/main/story/service.ts:32-34`.
- El repositorio SQLite ejecuta `DELETE` y no falla si el ID no existe: `src/main/adapters/persistence/sqlite/story-repository.ts:62-65`.
- La FK de `articles.story_id` usa `ON DELETE cascade`: `src/main/adapters/persistence/sqlite/schema.ts:30-33`; `migrations/0000_init.sql:10`.
- El contrato documenta que el borrado es silencioso e idempotente y que arrastra los Articles: `docs/api/ipc-contract.md:118-121`.
- Hay tests de cascada y de borrado silencioso:
  - `src/main/bootstrap.test.ts:143-155`.
  - `src/main/adapters/persistence/sqlite/article-repository.test.ts:160-172`.
  - `src/main/adapters/persistence/sqlite/story-repository.test.ts:129-139`.
  - `src/main/story/service.test.ts:217-229`.

**Conclusión [Hecho]:** no hace falta cambiar dominio, persistencia, IPC, preload ni `DataPort`. El trabajo es exclusivamente de UI y tests del renderer.

---

## 2. Qué pasó: la funcionalidad quedó incompleta en el port

### 2.1 Evidencia de historial

```text
git log --all --oneline -S "Delete story"
656e46f feat(renderer): port the real React frontend
```

```text
git log --all --oneline -- src/renderer/src/workspace/StoryPane/StoryPane.tsx
656e46f feat(renderer): port the real React frontend
```

```text
git log --all --oneline -- src/renderer/src/workspace/StoryBand/StoryBand.tsx \
  src/renderer/src/workspace/StoryEditor/StoryEditor.tsx
656e46f feat(renderer): port the real React frontend
```

Búsqueda en todas las ramas de `delete` dentro de `StoryEditor`, `StoryBand` y `StoryList`: sin coincidencias en `main`, `feat/preview-story` y `feat/better-preview-story`.

`git log main..HEAD`: vacío. La rama actual no tiene trabajo previo sobre esta funcionalidad.

### 2.2 Interpretación

- **[Hecho]** El commit `656e46f` introdujo a la vez el botón de `StoryPane`, el diálogo de `App` y el test de borrado de Story desde un Article (`src/renderer/src/App.test.tsx:1013-1032`).
- **[Hecho]** Nunca existió un botón equivalente en el editor de la Story.
- **[Inferencia]** No se perdió nada al portar: el port cubrió el caso que tenía delante (el panel de la Story dentro del Article) y dejó fuera el editor de Story. La percepción de «falta la opción» es correcta para la vista de la Story, pero el backend y el diálogo sí están completos.

---

## 3. Reglas de negocio ya decididas

| Regla | Estado | Fuente |
|---|---|---|
| Borrar una Story borra sus Articles en cascada | Implementada | `schema.ts:30-33`; `0000_init.sql:10`; `bootstrap.test.ts:143-155` |
| Borrar un ID inexistente no es error (idempotente) | Implementada | `story-repository.ts:62-65`; `docs/api/ipc-contract.md:118-121` |
| La confirmación advierte que se borran los Articles | Implementada | `App.tsx:96-98` |
| La acción no se puede deshacer | Implementada (texto) | `App.tsx:97` |
| Solo se puede borrar una Story ya guardada | Implícita: `StoryEditor` con `stored={null}` no tiene ID | `Workspace.tsx:16-22`; `StoryEditor.tsx:36-37` |

No hay decisiones de negocio nuevas que tomar para el borrado en sí. Las decisiones abiertas son de UI y de manejo del autosave.

---

## 4. Cambios propuestos

### 4.1 Opción recomendada: acción en `StoryBand`

Es el equivalente natural de `ArticleHeader`, que ya coloca un `IconButton` con `Trash2` para `Delete article` (`src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx:35-39`). No introduce un patrón nuevo y deja la acción visible al abrir la Story.

**Archivos a modificar:**

| Archivo | Cambio |
|---|---|
| `src/renderer/src/workspace/StoryBand/StoryBand.tsx` | Agregar `onDelete: () => void` a `StoryBandProps`; importar `Trash2` y `IconButton`; renderizar el botón cuando `!creating`, en el extremo derecho de la fila del `Topic` (el mismo slot donde hoy aparece `Discard` al crear) |
| `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx` | Pasar `onDelete={() => dispatch({ type: 'dialog/open', dialog: 'delete-story' })}` a `StoryBand` |
| `src/renderer/src/App.test.tsx` | Agregar los casos de la sección 5 |

**Sin cambios:**

- `App.tsx`: el diálogo ya usa `useStoryInContext()` y resuelve la Story seleccionada.
- `use-story-in-context.ts`: ya devuelve la Story seleccionada cuando no hay Article.
- `DataPort`, `ipc-port`, preload, handlers IPC, servicios y repositorios.
- `StoryPane`: se conserva su botón; el nuevo disparador cubre la otra vista.

**Boceto del cambio en `StoryBand`:**

```tsx
import { Trash2 } from 'lucide-react'
import { IconButton } from '../../ui/IconButton/IconButton'

type StoryBandProps = {
  // ...
  onDelete: () => void
}

// En la fila del Topic:
{creating ? (
  <button type="button" onClick={onDiscard} ...>
    Discard
  </button>
) : (
  <IconButton label="Delete story" onClick={onDelete}>
    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
  </IconButton>
)}
```

`IconButton` ya expone `aria-label` y `title` con el mismo texto (`src/renderer/src/ui/IconButton/IconButton.tsx:10-25`), así que el nombre accesible será `Delete story`.

**Boceto del wiring en `StoryEditor`:**

```tsx
<StoryBand
  // ...
  onDelete={() => dispatch({ type: 'dialog/open', dialog: 'delete-story' })}
/>
```

**Por qué este lugar:**

- Es el encabezado funcional de la Story; `ArticleHeader` ya usa el mismo patrón para el Article.
- No requiere leer la Story en contexto ni duplicar la resolución de `useStoryInContext`.
- No colisiona con `StoryPane`: `Workspace` renderiza una vista u otra, nunca ambas.
- El botón no aparece al crear (`creating === true`), cuando todavía no hay ID que borrar.

### 4.2 Alternativa: acción en la fila de `StoryList`

Agregar un botón por fila o un menú contextual permitiría borrar sin abrir la Story. Sin embargo:

- No existe hoy ningún menú contextual ni acción por fila en las listas (`StoryList.tsx:83-113`); sería un patrón nuevo.
- Un botón por fila compite con el clic de selección y aumenta el riesgo de borrado accidental.
- Requiere `stopPropagation`, foco visible y decisiones de hover/teclado.

**[Inferencia]** No es necesario para resolver el pedido. Si se quiere más adelante, conviene hacerlo como una mejora separada.

### 4.3 Atajo de teclado (opcional)

No hay un patrón de atajo por entidad. El único atajo global es `Ctrl/Cmd+N` para crear y `Ctrl/Cmd+S` para guardar (`src/renderer/src/state/use-shortcuts.ts`). Una tecla `Delete` global chocaría con la edición de texto; no se recomienda en esta iteración.

---

## 5. Tests necesarios

### 5.1 Tests nuevos del renderer

Todos pueden vivir en `describe('deleting')` (`src/renderer/src/App.test.tsx:941-1033`), que ya tiene `stories`, `articles` y el fake con `deleteStoryFailures`.

| Caso | Qué verifica |
|---|---|
| `deletes the story from its editor once the writer confirms` | Abrir la Story, hacer clic en `Delete story` dentro de la región `Story editor`, ver el diálogo, confirmar, comprobar `fake.deletedStoryIds === ['s1']`, que el editor desaparece y que la lista muestra `No stories yet` |
| `keeps the story when the confirmation is cancelled` | Cancelar no llama a `deleteStory` y el editor sigue montado |
| `says so when the story is already gone, and refreshes the list` | Con `deleteStoryFailures: 1`, confirmar muestra `role="alert"` y el mensaje genérico; la lista se recarga |
| `deleting a story from its editor takes its articles with it` | Tras borrar, cambiar a `Articles` y comprobar `No articles yet` (el fake ya elimina los Articles, `fake-port.ts:170-184`) |
| `does not offer to delete a story that is being created` | Al abrir `New Story`, no existe el botón `Delete story` |

**Helper sugerido:** reutilizar el patrón de `openStory` de `describe('the story editor')` (`App.test.tsx:1195-1199`) o moverlo a un helper compartido del bloque `deleting`.

**Ámbito:** usar `within(screen.getByRole('region', { name: 'Story editor' }))` para el disparador y `within(screen.getByRole('dialog'))` para la confirmación, igual que los tests existentes de Article (`App.test.tsx:952-967`).

**Colisión con el test existente:** el test de `App.test.tsx:1013-1032` busca `Delete story` sin ámbito, pero abre un Article; en esa vista se renderiza `StoryPane` y no `StoryBand`, así que el nombre seguirá siendo único. No hace falta modificar ese test.

### 5.2 Tests existentes que ya cubren el backend

- Cascada: `bootstrap.test.ts:143-155` y `article-repository.test.ts:160-172`.
- Borrado silencioso: `story-repository.test.ts:129-139`.
- Servicio: `story.service.test.ts:217-229`.
- Contrato IPC: el handler `story:delete` se registra en `register.test.ts` (el test de los 11 canales), aunque no hay un caso específico de `story:delete`; no es necesario para este cambio de UI.

### 5.3 Validación

```bash
pnpm test -- src/renderer/src/App.test.tsx
pnpm test -- src/main/adapters/persistence/sqlite
pnpm typecheck
pnpm lint
```

---

## 6. Riesgos y casos límite

### 6.1 Autosave pendiente al borrar (riesgo principal)

`useDraftPersistence` guarda el último draft pendiente y lo escribe al desmontar el editor:

- El delay es de 700 ms: `src/renderer/src/state/use-draft-persistence.ts:5`.
- Al desmontar, `flush.current()` limpia el timer y lanza `write(pending)`: `use-draft-persistence.ts:128-137`.

El flujo de borrado de `App` limpia `story/select` después de que `deleteStory` resuelve (`App.tsx:105-108`), lo que desmonta `StoryEditor`. Si el usuario confirma el borrado dentro de los 700 ms posteriores a una edición, el flush envía un `updateStory` **después** del `deleteStory`. El update falla con `errNotFound`; no resucita la Story, pero genera una llamada IPC innecesaria y un estado de error en un componente ya desmontado.

**Opciones:**

1. **Aceptarlo y documentarlo** (mínimo cambio). El error no es visible y no corrompe datos.
2. **Cancelar el flush antes de borrar**: exponer una forma de descartar el pending desde el editor o un flag de «Story en borrado» que `useDraftPersistence` consulte. Agrega acoplamiento.
3. **Forzar guardado antes de borrar**: `requestSave()` del `save-registry` antes de `deleteStory`. Escribe de más y no elimina la ventana de carrera si el guardado falla.

**[Decisión abierta]** Si se elige la opción 1, conviene agregar un test que documente el comportamiento; si se elige la 2, el plan debe definir el mecanismo exacto.

### 6.2 Otros casos

- **Última Story borrada:** `App` limpia `story/select` y `article/select`, recarga las listas y el `StoryList` muestra `No stories yet` (`StoryList.tsx:48-70`). Ya cubierto por el flujo actual de `App`.
- **Articles en cascada:** el backend y el fake los eliminan; `App` recarga también `reloadArticles()` (`App.tsx:40-44`). El test debe comprobarlo.
- **Story seleccionada con un Article abierto:** no ocurre desde el editor de Story porque `story/select` limpia `selectedArticleId` (`workspace-context.tsx:76-82`). El botón de `StoryPane` sigue siendo el camino para el caso Article.
- **`openStory === null`:** el diálogo no se renderiza si no hay Story en contexto (`App.tsx:94`). Es un comportamiento existente; no se agrava con el nuevo disparador.
- **Draft inválido (topic vacío):** abrir el diálogo no pasa por `useWorkspaceNavigation`, así que no se muestra el aviso de «Leave without saving». Es correcto: borrar descarta el draft. Al desmontar, `useEditorStatus` llama a `resetStatus()` (`use-editor-status.ts:40-43`), que pone `unsavedDraft = false` (`status-store.ts:50-53`), por lo que el flag no queda pegado.
- **Foco tras borrar:** el editor se desmonta y el foco puede quedar en `body`. No hay un patrón de restauración de foco en la app; se puede dejar para otra iteración.
- **Descubribilidad:** el botón será icon-only. Se mitiga con `aria-label`/`title` de `IconButton`; si se quiere más claridad, usar un botón con texto `Delete story`, pero rompe la consistencia con `ArticleHeader`.

---

## 7. Decisiones abiertas antes de planificar

1. **Ubicación:** ¿acción en `StoryBand` (recomendada) o también en `StoryList`?
2. **Formato:** ¿`IconButton` con `Trash2` (consistente con `ArticleHeader`) o botón con texto?
3. **Autosave:** ¿se acepta el update posterior al borrado o se agrega un mecanismo para cancelar el pending?
4. **Atajo:** ¿se deja sin atajo en esta iteración?
5. **Alcance:** ¿se confirma que el cambio es solo renderer + tests y no toca backend, IPC ni `DataPort`?

---

## 8. Referencias

### Código

- `src/renderer/src/workspace/Workspace/Workspace.tsx`
- `src/renderer/src/workspace/StoryEditor/StoryEditor.tsx`
- `src/renderer/src/workspace/StoryBand/StoryBand.tsx`
- `src/renderer/src/workspace/StoryPane/StoryPane.tsx`
- `src/renderer/src/workspace/ArticleHeader/ArticleHeader.tsx`
- `src/renderer/src/App.tsx`
- `src/renderer/src/state/use-story-in-context.ts`
- `src/renderer/src/state/workspace-context.tsx`
- `src/renderer/src/state/use-draft-persistence.ts`
- `src/renderer/src/state/use-editor-status.ts`
- `src/renderer/src/state/status-store.ts`
- `src/renderer/src/data/port.ts`
- `src/renderer/src/data/ipc-port.ts`
- `src/renderer/src/data/fake/fake-port.ts`
- `src/renderer/src/ui/IconButton/IconButton.tsx`
- `src/renderer/src/ui/ConfirmDialog/ConfirmDialog.tsx`
- `src/renderer/src/list/StoryList/StoryList.tsx`
- `src/main/story/service.ts`
- `src/main/story/repository.ts`
- `src/main/adapters/persistence/sqlite/story-repository.ts`
- `src/main/adapters/persistence/sqlite/schema.ts`
- `src/main/adapters/persistence/sqlite/migrations/0000_init.sql`
- `src/main/adapters/ipc/contract.ts`
- `src/main/adapters/ipc/story-service.ts`
- `src/preload/index.ts`

### Tests

- `src/renderer/src/App.test.tsx:941-1033` (bloque `deleting`)
- `src/renderer/src/App.test.tsx:1190-1341` (bloque `the story editor`)
- `src/main/bootstrap.test.ts:143-155`
- `src/main/adapters/persistence/sqlite/story-repository.test.ts:129-139`
- `src/main/adapters/persistence/sqlite/article-repository.test.ts:160-172`
- `src/main/story/service.test.ts:217-229`
- `src/main/adapters/ipc/register.test.ts`

### Documentación

- `docs/api/ipc-contract.md:118-121`
- `GLOSSARY.md` (Story es la unidad padre; Article se deriva de exactamente una Story)
- `AGENTS.md`

### Commits

- `656e46f feat(renderer): port the real React frontend` — introduce `StoryPane`, el diálogo de borrado y el test de borrado desde Article. Es el único commit que menciona `Delete story`.
