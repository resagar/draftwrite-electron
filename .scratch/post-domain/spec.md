# Spec: dominio Post (publicaciones cortas para redes)

**Status:** implemented
**Fecha:** 2026-10-24
**Feature:** post-domain
**Implementación:** `01` `88bf6ba` · `02` `046ab11` · `03` `42d952e` · `04` `4497d7b` · `05` `8af00f3`

---

## Problema

La app solo modela dos piezas: `Story` (unidad madre) y `Article` (pieza larga derivada de una Story). No hay dónde guardar publicaciones cortas para redes sociales. `Article` no sirve: exige una Story, tiene título/subtítulo/objetivo y una unicidad por Story que no aplica a un post corto.

Se añade un tercer dominio, `Post`, con relación **opcional y excluyente** a una Story o a un Article, un estado editorial y, cuando aplica, una fecha de programación. Mismo editor y mismo panel de fuente que `Article`.

## Modelo

`src/main/post/model.ts`:

```ts
export type PostState = 'pending' | 'scheduled' | 'published'

export interface Post {
  id: string
  topic: string              // obligatorio, libre, no único
  text: string               // opcional
  state: PostState
  scheduledAt: string | null // ISO 8601; solo con state = 'scheduled'
  storyID: string | null     // excluyente con articleID
  articleID: string | null
  createdAt: string
  updatedAt: string
}
```

Decisiones de campo ya acordadas:

- `topic` es el resumen corto que identifica la pieza. Obligatorio (trim, vacío = ausente), **sin unicidad** y sin tope artificial, igual que `Story.Topic`.
- `text` es el cuerpo, opcional, con trim, igual que Story/Article.
- `state` nace `pending`. Los valores viajan como texto plano: `pending`, `scheduled`, `published`.
- `scheduledAt` es opcional; solo tiene sentido con `state = 'scheduled'`.
- `storyID` y `articleID` son opcionales y excluyentes: como máximo uno. Ambos `null` es un Post válido (sin fuente).

### Invariantes y centinelas

Todos los errores son centinelas exportados por el módulo, con `code` (`err*`), como en Story y Article:

| Regla | Error |
|---|---|
| `topic` vacío tras normalizar | `errTopicRequired` |
| `storyID !== null && articleID !== null` | `errSourceAmbiguous` |
| Cambiar la fuente con un Post almacenado no `pending` | `errSourceLocked` |
| `scheduledAt` presente y no ISO 8601 válido | `errScheduledAtInvalid` |
| Actualizar un Post inexistente | `errNotFound` (del puerto) |
| Referenciar una Story/Article inexistente | `errSourceNotFound` (del servicio) |

Reglas de normalización:

- `newPost(topic, text, storyID, articleID)` genera el ID con `randomUUID()` y **fuerza `state = 'pending'` y `scheduledAt = null`**: se crea siempre pendiente, igual que un Article nace con su Story.
- `normalisePost(post)` recorta `topic` y `text`; si `state !== 'scheduled'`, deja `scheduledAt = null`; si `state === 'scheduled'` y hay fecha, valida ISO 8601.
- `validatePost(post)` re-aplica las invariantes sin generar ID, para que `update` las exija igual que el constructor.

## Reglas de actualización

`update` lee el Post almacenado (mismo patrón que `Article.update`, que lee para comparar `storyID`):

1. Normaliza y valida.
2. Si la fuente cambia (`storyID`/`articleID` distintos de los almacenados) y el estado **almacenado** no es `pending`, lanza `errSourceLocked`.
3. Si la fuente cambia, el servicio comprueba que el nuevo destino exista (`storyRepo.get` / `articleRepo.get`) y traduce el `errNotFound` de origen a `errSourceNotFound`.
4. El cambio de estado es libre (`pending` ↔ `scheduled` ↔ `published`), sin matriz de transiciones.
5. `scheduledAt` se limpia al salir de `scheduled` por la normalización, así que no queda una fecha mintiendo sobre el estado.

Nota de implementación: la comprobación usa el estado **almacenado**; desprogramar y reasignar la fuente exige dos guardados (primero `pending`, luego la fuente). Es la lectura conservadora de «editable solo en pending» y evita que un único payload cambie estado y relación a la vez.

## Persistencia

Nueva migración de drizzle-kit a partir de `src/main/adapters/persistence/sqlite/schema.ts` (hoy solo existe `0000_init.sql`):

```text
posts
  id            text primary key
  topic         text not null
  text          text not null
  state         text not null default 'pending'
  scheduled_at  text null
  story_id      text null references stories(id) on delete set null
  article_id    text null references articles(id) on delete set null
  created_at    text not null default (datetime('now'))
  updated_at    text not null default (datetime('now'))
```

Con dos guardas a nivel de base de datos, espejo de las invariantes:

- `check (state in ('pending', 'scheduled', 'published'))`.
- `check (story_id is null or article_id is null)` (exclusividad).

`on delete set null` deja el Post sin fuente cuando se borra la Story o el Article referenciado; nunca borra el Post.

`src/main/adapters/persistence/sqlite/post-repository.ts`: `create`, `get`, `list`, `update`, `delete`. Sin `listByStory`: el filtrado por fuente vive en el renderer, como en Stories y Articles. `list` ordena por `created_at desc` (consistente con el resto). `update` nunca toca `created_at` y escribe `updated_at = datetime('now')`.

## Servicio

`src/main/post/service.ts`, mismo molde que `newArticleService`:

```ts
export function newPostService(
  repo: PostRepository,
  storyRepo: StoryRepository,
  articleRepo: ArticleRepository
): PostService
```

- `create`: construye con `newPost`, comprueba que la fuente exista (si hay) y persiste.
- `update`: lee, valida fuente/estado, comprueba el nuevo destino si cambió, persiste.
- `get`, `list`, `delete`: delegación directa.

`src/main/post/fake.ts`: `newFakePostRepository()` con `jest.fn` por método, como `article/fake.ts`.

## IPC

- `src/main/adapters/ipc/contract.ts`: `PostDTO = Post`, `postChannels { create, get, list, update, delete }` y `DraftwriteApi.post`.
- `src/main/adapters/ipc/validate.ts`: `parsePostCreatePayload` / `parsePostUpdatePayload`, con un nuevo helper `expectNullableString(value, field)` para `storyID`, `articleID` y `scheduledAt` (`string | null`).
- `src/main/adapters/ipc/post-service.ts` + registro en `register.ts` (`IpcServices.post`); se pasa de 11 a 16 handlers.
- `src/preload/index.ts`: expone `post` junto a `story` y `article`.
- `src/main/main.ts` / `bootstrap.ts`: construye el repositorio y el servicio nuevos.

Los errores cruzan como `{ code }` y se re-hidratan en `ipc-port.ts` (`IpcError`), sin cambios en ese mecanismo.

## Renderer

### Tipos y puerto

- `src/renderer/src/data/types.ts`: `Post` en PascalCase (`ID`, `Topic`, `Text`, `State`, `ScheduledAt: string | null`, `StoryID: string | null`, `ArticleID: string | null`, `CreatedAt`, `UpdatedAt`).
- `src/renderer/src/data/normalise.ts`: `toPost` / `toPosts`. Aquí es donde un `null` del wire se mantiene `null` (los IDs opcionales no son listas).
- `src/renderer/src/data/port.ts`: `NewPost` (`topic`, `text`, `storyId`, `articleId`), `listPosts`, `createPost`, `updatePost`, `deletePost`.
- `src/renderer/src/data/ipc-port.ts`: mapeo y `toPostDTO`.

### Estado

- `workspace-context.tsx`: `selectedPostId: string | null`, `library: 'stories' | 'articles' | 'posts'`, `CreateKind` gana `'post'`, acciones `post/select`, `post/deleted`, `create/start` con `kind: 'post'`.
- `library-context.tsx`: `posts`, `postsStatus`, `postsTotal`, `postById`, `reloadPosts`, `upsertPost`; nuevo `use-posts.ts` con `useList` (mismo patrón que `use-stories`).
- `use-contextual-create.ts` + `CREATE_LABELS`: «New Post».
- `use-navigation.ts`: `post/select` entra en el flujo de «draft sin guardar» igual que Story/Article.

### UI

- **LibraryNav**: tercera entrada «Posts»; el panel del sidebar pasa a tres colecciones.
- **PostList** (`src/renderer/src/list/PostList/PostList.tsx`): `ListColumn title="Posts" collapsed={zenMode}`, `OptionList label="Posts"`, filas con `Topic`, fecha y preview del `Text`; badge de estado (`pending`/`scheduled`/`published`) y `ScheduledAt` cuando aplique; `SortToggle` y acciones de borrar.
- **PostBand**: `Topic` (input obligatorio), `State` (select), `ScheduledAt` (input de fecha, visible solo con `scheduled`) y **un único selector Source** con `<optgroup label="Stories">` / `<optgroup label="Articles">` y opción vacía «No source». El selector se deshabilita cuando el estado almacenado no es `pending` (el band lo explica).
- **PostEditor / PostPane**: mismo editor que Story/Article (CodeMirror + `EditorToolbar` + `ViewModeSwitcher` + `EditorPreviewLayout` + `MarkdownPreview`), con autosave y validación de `Topic` igual que Article valida Title.
- **Panel de fuente**: generalizar `StoryPane` a un `SourcePane` que acepte una unión discriminada:
  `{ kind: 'story'; story } | { kind: 'article'; article; story: Story | null } | { kind: 'empty' }`.
  Story → `Topic`, `Titles`, `Tags`, `Text` (lo actual). Article → `Title`, `Subtitle`, `Target`, `Text` y el `Topic` de su Story como contexto. Sin fuente → estado vacío de «no source». Conserva colapsar/expandir, resizer y «copiar».
- **Borrado**: `dialog/open` con `{ kind: 'delete-post'; postId }` y `ConfirmDialog` como los otros dos.
- **Zen mode**: la lista de Posts se oculta con el resto sin cambios (ya consume `ListColumn collapsed`).

## Testing

- **Modelo** (unit): `topic` obligatorio; normalización de `topic`/`text`; exclusividad de fuente; `state` forzado a `pending` al crear; limpieza de `scheduledAt` al salir de `scheduled`; ISO inválido.
- **Servicio** (fakes): fuente inexistente → `errSourceNotFound`; cambio de fuente con estado `scheduled`/`published` → `errSourceLocked`; cambio de fuente en `pending` → persiste; el estado se cambia libremente.
- **SQLite** (integración, `:memory:` + migraciones): insert/list/update/delete; `on delete set null` al borrar Story y Article; los dos `check` rechazan estado inválido y fuente doble.
- **IPC**: los 5 handlers responden `IpcResult`; `parsePost*Payload` acepta `null` en los tres campos opcionales y rechaza tipos incorrectos.
- **Renderer**: `App` — tercera colección, crear Post, selector Source con optgroups y deshabilitado fuera de `pending`, panel de fuente para Story y para Article, borrado con confirmación, y `ListColumn collapsed` en Zen. `ipc-port` — `null` preservado en los IDs.
- Contrato: la suite actual (590) sigue verde; `pnpm typecheck` y `pnpm lint` limpios.

## Documentación

- `GLOSSARY.md`: añadir `Post`, `PostState`, `ScheduledAt`; ampliar `Topic` («identifica una Story o resume un Post; único solo entre Stories») y **quitar `post` del `_Avoid_` de `Article`** (deja de ser un sinónimo prohibido y pasa a ser entidad propia).
- `docs/api/ipc-contract.md`: añadir los 5 canales de Post.
- `AGENTS.md` (sección Structure): añadir `post/` a los dominios actuales.

## Fuera de alcance

- Publicar de verdad (la app no tiene red): `published`/`scheduled` son etiquetas editoriales.
- `Channel` (X, LinkedIn, Instagram) u otras redes.
- Adjuntar imágenes, hilos o límites por red.
- Listar los Posts de una Story/Article dentro de su pantalla.
- Exportar o programar con recordatorios.
- Mover un Post entre estados automáticamente por fecha.
