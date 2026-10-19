# Contrato IPC

Referencia del **contrato de la capa de presentación**: las operaciones del backend que el renderer
invoca a través del preload. Guía para desarrollar (y mantener) el backend por operación,
especificando parámetros, retorno y errores de dominio.

## Cómo se exponen

El contrato viaja por una cadena de delegación, sin generación de código:

```
src/renderer/src/data/ipc-port.ts (DataPort)
  → src/preload/index.ts (contextBridge → window.draftwrite)
    → src/main/ipc/register.ts (ipcMain.handle)
      → adapters/ipc/ (wrappers, sin lógica)
        → src/main/<domain>/service.ts (servicios de aplicación)
          → adapters/persistence/sqlite/ (repositorios)
```

Los canales son 11: `story:create`, `story:get`, `story:list`, `story:update`, `story:delete`,
`article:create`, `article:get`, `article:listByStory`, `article:list`, `article:update` y
`article:delete`.

El contrato se mantiene a mano en `adapters/ipc/contract.ts` (`StoryDTO`, `ArticleDTO` y las
firmas); se verifica con `pnpm typecheck` y los tests.

Los wrappers de `adapters/ipc/` no contienen lógica: delegan al servicio de aplicación
(`src/main/<domain>/service.ts`), que a su vez delega al repositorio. Por eso las validaciones y
los errores provienen del dominio (`src/main/<domain>/model.ts`), no del adapter. Esta guía pega
el contrato a esa realidad.

## Tipos compartidos

`StoryDTO` (entidad raíz):

```
id: string · topic: string · titles: string[] · tags: string[] · text: string · createdAt: string · updatedAt: string
```

`ArticleDTO` (entidad, depende de una Story):

```
id: string · storyID: string · title: string · subtitle: string · target: string · text: string · createdAt: string · updatedAt: string
```

Los timestamps viajan como string ISO 8601 y los asigna el backend. Los errores de dominio llegan
como `{ code: '<centinela>' }` del `model.ts` correspondiente (véase GLOSSARY.md y `docs/adr/`).

## storyService

Servicio raíz para historias. No depende de otro dominio.

### create

```
create(story: StoryDTO): Promise<StoryDTO>
```

- Recibe la entidad completa, como `update`. El `id` lo genera el dominio (`newStory()`), no el llamante.
- `topic`: obligatorio, recortado; en blanco cuenta como vacío → `errTopicRequired`. Único en el
  sistema → `errTopicTaken` si colisiona.
- `titles`: opcional; una lista vacía es válida.
- `tags`: opcional; sin restricción de longitud.
- `text`: opcional; una cadena vacía es válida (ADR-0005).
- Errores: `errTopicRequired | errTopicTaken`.
- Retorno: `StoryDTO` con `id` generado (UUID v4) e invariantes validadas.

### get

```
get(id: string): Promise<StoryDTO>
```

- `id`: requerido.
- Errores: `errNotFound` si no existe.

### list

```
list(): Promise<StoryDTO[]>
```

- Sin parámetros. Devuelve todas las stories, en orden descendente por fecha de creación.

### update

```
update(story: StoryDTO): Promise<StoryDTO>
```

- Recibe la entidad completa; `id` obligatorio.
- Normaliza (recorta) y re-valida las invariantes: solo `topic` es obligatorio, y es único (ADR-0005).
- NOTA (ADR-0002/0003): `storyService.update` valida y persiste **sin lectura previa**, porque Story
  no tiene campo inmutable que comparar y el update del repositorio ya devuelve `errNotFound` ante
  un ID inexistente. Sigue el patrón "read-before-write sólo cuando una regla lo requiere".
- Errores: `errTopicRequired | errTopicTaken | errNotFound`.
- Retorno: `StoryDTO` con `updatedAt` refrescado.

### delete

```
delete(id: string): Promise<void>
```

- `id`: requerido.
- Borra la story y, en cascada, sus articles.
- Errores: `errNotFound` si no existe.

## articleService

Servicio derivado: un article pertenece a exactamente una story (ver `storyID`).

### create

```
create(article: ArticleDTO): Promise<ArticleDTO>
```

- Recibe la entidad completa, como `update`. El `id` lo genera el dominio (`newArticle()`).
- `storyID`: obligatorio; **debe existir** → si no, `errStoryNotFound` (comprobado vía el puerto
  `StoryRepository`, no vía el adapter; ADR-0001).
- `title`: obligatorio, recortado, ≤ 255; único por story → `errTitleTaken` si colisiona.
- `subtitle`: opcional, ≤ 255.
- `target`: opcional, ≤ 255. Significado: el objetivo del artículo (ver GLOSSARY.md).
- `text`: opcional; una cadena vacía es válida (ADR-0005).
- Las entradas se recortan (`trim()`) antes de validar; los espacios en blanco cuentan como vacío.
- Errores: `errStoryIDRequired | errTitleRequired | errStoryNotFound | errTitleTaken`.
- Retorno: `ArticleDTO` con `id` generado (UUID v4) e invariantes validadas.

### get

```
get(id: string): Promise<ArticleDTO>
```

- Errores: `errNotFound`.

### listByStory

```
listByStory(storyID: string): Promise<ArticleDTO[]>
```

- Lista los articles de una story, en orden descendente por fecha de creación.
- Si la story no existe, devuelve lista vacía (no error).

### list

```
list(): Promise<ArticleDTO[]>
```

- Devuelve todos los articles de todas las stories, en orden descendente por fecha de creación.

### update

```
update(article: ArticleDTO): Promise<ArticleDTO>
```

- Recibe la entidad completa; `id` obligatorio.
- Flujo (ADR-0003): valida → lee el almacenado → compara → persiste.
  - La validación del modelo re-chequea requerimientos y longitudes.
  - **`storyID` inmutable**: si el `storyID` recibido difiere del almacenado → `errStoryIDImmutable`.
    Un article no se reasigna a otra story tras la creación.
  - El resto de campos sí son actualizables.
- Errores: `errStoryIDImmutable | errNotFound | errTitleTaken` y los centinelas de validación del
  modelo (requeridos / longitud).

### delete

```
delete(id: string): Promise<void>
```

- Errores: `errNotFound`.

## Pendientes / fuera de este contrato

- El renderer consume este contrato a través de un único puerto (`src/renderer/src/data/ipc-port.ts`,
  interfaz `DataPort`).
- Al cambiar la superficie: actualizar `adapters/ipc/contract.ts`, `src/preload/index.ts` y
  `src/main/ipc/register.ts`; y actualizar este doc junto a `adapters/ipc/` y los tests
  `src/main/<domain>/service.test.ts`.

## Notas de migración

- Los DTOs y el set exacto de códigos `{ code }` se confirmarán contra `adapters/ipc/contract.ts`
  y los `model.ts` al implementarlos.
- El data layer del renderer debe emitir y leer camelCase; `normalise.ts` se adaptará en su
  momento.
