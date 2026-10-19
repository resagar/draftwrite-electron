# AGENTS.md

## Project

Esta es una aplicación de escritorio para escritores. Su propósito principal es ayudar a organizar las historias y los artículos basados en esas historias.

## Stack

- electron -> [https://www.electronjs.org/](https://www.electronjs.org/)
- electron-vite -> [https://electron-vite.org/](https://electron-vite.org/)
- electron-builder -> [https://www.electron.build/](https://www.electron.build/)
- React -> [https://react.dev/](https://react.dev/)
- TypeScript en main, preload y renderer -> [https://www.typescriptlang.org/](https://www.typescriptlang.org/)
- pnpm (gestor de paquetes) -> [https://pnpm.io/](https://pnpm.io/)
- sqlite -> [https://sqlite.org/](https://sqlite.org/) vía better-sqlite3 -> [https://github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- Drizzle ORM -> [https://orm.drizzle.team/](https://orm.drizzle.team/) + drizzle-kit (migraciones) -> [https://orm.drizzle.team/docs/kit-overview](https://orm.drizzle.team/docs/kit-overview)
- editor: CodeMirror vía `@uiw/react-codemirror` -> [https://codemirror.net/](https://codemirror.net/)
- react-markdown -> [https://github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm -> [https://github.com/remarkjs/remark-gfm](https://github.com/remarkjs/remark-gfm)
- iconos: lucide-react -> [https://lucide.dev/](https://lucide.dev/)
- fuentes: `@fontsource/{inter,fira-code,newsreader}` -> [https://fontsource.org/](https://fontsource.org/)
- CSS puro (sin Tailwind ni daisyUI)
- Jest (sin Vitest) -> [https://jestjs.io/](https://jestjs.io/) + @testing-library/react -> [https://testing-library.com/docs/react-testing-library/intro/](https://testing-library.com/docs/react-testing-library/intro/) + jsdom -> [https://github.com/jsdom/jsdom](https://github.com/jsdom/jsdom) - unit tests, tests de integración y mocks
- IPC directo main↔renderer (`contextBridge` + `ipcRenderer.invoke`), sin servidor HTTP y sin red

## Structure

- `src/main/main.ts` - composition root: abre la BD, inyecta repositorios en servicios y registra los handlers IPC
- `src/main/<domain>/` - feature/dominio: `model.ts` (entidades y value objects, dominio puro), `repository.ts` (puerto del repositorio), `service.ts` (puerto + implementación del servicio de aplicación), `fake.ts` (dobles de test). Dominios actuales: `story/`, `article/`
- `src/main/platform/` - helpers de plataforma (p. ej. la ruta XDG de la BD), sin dependencias de Electron
- `src/main/ipc/register.ts` - registra los handlers `ipcMain.handle` del contrato (delegación pura, sin lógica de negocio)
- `adapters/ipc/` - adapter de entrada: `contract.ts` (DTOs del contrato IPC), `story-service.ts` y `article-service.ts` (wrappers de los servicios de aplicación)
- `adapters/persistence/sqlite/` - adapter de salida: `schema.ts` Drizzle, `migrations/` de drizzle-kit y los repositorios
- `src/preload/index.ts` - `contextBridge`: expone la API tipada al renderer
- `src/renderer/` - app React; su único punto de acceso a datos es `src/renderer/src/data/ipc-port.ts`
- `GLOSSARY.md` - glosario del dominio (vocabulario canónico), en el root del repo
- `docs/` - `adr/` (ADRs del proyecto), `agents/` (issue tracker, triage labels y domain docs) y `api/` (contratos)
- `docs/api/ipc-contract.md` - contrato IPC: renderer → preload → handlers

## Architecture

- Hexagonal, organizada por dominio/feature
- Regla de dependencias hacia adentro: `adapters/*` importa al dominio (`src/main/<domain>/`), nunca al revés
- El dominio no conoce Electron, ni Drizzle, ni better-sqlite3 (solo `node:crypto` para `randomUUID()`)
- La app arranca sin red y sin servidor: IPC directo main↔renderer
- El renderer nunca importa el dominio ni los adapters: solo consume `window.draftwrite` a través de la interfaz `DataPort`
- Los handlers IPC (y el preload) solo exponen los servicios de aplicación, sin lógica de negocio
- Dominio no anémico: las entidades se crean solo vía constructor (`newStory(topic, titles, tags, text)`, `newArticle(...)`) — el constructor genera el ID (`randomUUID()`) y valida las invariantes con centinelas del propio módulo `model`. No asignar el ID ni validar desde fuera de la entidad (tell, don't ask).
- Invariantes en toda escritura: `update` re-valida las reglas del constructor con un método que no genere un ID nuevo
- El `storyID` de un Article es inmutable: no se reasigna a otra Story tras la creación
- `update` lee antes de escribir solo cuando una regla de negocio necesita el valor almacenado (`article` lo hace para `storyID`; `story` no lee — ver `docs/adr/0003-update-read-before-write.md`)
- Las listas nunca son `null`/`undefined`: en el wire viajan siempre como `[]` (mapeo explícito en `adapters/ipc/contract.ts`)
- Los errores de dominio son centinelas exportados por cada `model` (`errTopicTaken`, `errNotFound`, …): cruzan el IPC como `{ code }` y se re-hidratan en `ipc-port.ts`

## Testing

- La lógica de dominio se prueba con unit tests.
- Los casos de uso utilizan fakes/mocks apropiados (`fake.ts` de cada dominio).
- SQLite se prueba con una base real en memoria (`new Database(':memory:')` con las migraciones aplicadas).
- No usar mocks para sustituir comportamiento que pueda verificarse mediante integración real.
- Todo bug corregido debe tener una prueba de regresión cuando sea razonable.
- Los tests existentes son parte del contrato y no deben modificarse para hacer pasar una implementación.

**Importante:** Si un test parece incorrecto, detenerse y solicitar revisión.

## Cambios

- Leer el código existente antes de modificarlo.
- Mantener los cambios pequeños y enfocados.
- No introducir abstracciones sin necesidad.
- No modificar APIs existentes sin justificarlo en el plan.
- No ampliar el alcance de una tarea sin aprobación.

## Idioma

- **Comunicación con el usuario:** siempre en español (respuestas, planes, explicaciones).
- **Código:** siempre en inglés — identificadores, nombres de archivo, comentarios, docstrings y mensajes de commit.
- Los documentos de planificación (specs, planes, ADRs) se escriben en español; el código citado dentro de ellos permanece en inglés.

Ejemplo: "Vamos a crear una función `getUserById`" (no `obtenerUsuarioPorId`).

## Conventional commits

Todos los mensajes de commit siguen la especificación [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```text
type(scope): description

[body opcional]

[footer opcional]
```

- Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`
- La descripción va en inglés, en minúscula y en imperativo ("add", no "added"), sin punto final y con un máximo de 72 caracteres
- Breaking change: `!` tras el tipo (`feat!: …`) o `BREAKING CHANGE:` en el footer
- Ejemplos: `feat(auth): add JWT token refresh endpoint` · `fix(api): handle null response from payment gateway` · `chore(deps): bump typescript to 5.4.0`

## Comandos

**Desarrollo (Electron)**

- `pnpm dev` - levantar la app en modo desarrollo (HMR del renderer, rebuild de main/preload)
- `pnpm build` - typecheck + build de producción (`electron-vite build`)
- `pnpm dist` - empaquetar con electron-builder: Linux (AppImage, deb) + Windows (NSIS)

**TypeScript**

- `pnpm typecheck` - typecheck de main/preload (`tsconfig.node.json`) y renderer (`tsconfig.web.json`)
- `pnpm lint` - análisis estático (ESLint)
- `pnpm format` - formatear (Prettier)

**Nota (plataforma):** el proyecto se desarrolla en Linux. `better-sqlite3` es un módulo nativo: si la app falla al abrir la BD por desajuste de ABI, reconstruirlo con `electron-builder install-app-deps` (ya está en `postinstall`). El paquete de Windows (NSIS) se genera desde Linux con `pnpm dist`.

**TDD (loop red-green con agentes)**

- `pnpm test` - suite completa (Jest)
- `pnpm test -- <ruta o patrón>` - un subconjunto de tests (p. ej. `pnpm test -- src/main/story`)
- `pnpm test -- -t "<nombre>"` - un caso concreto

**Migraciones (drizzle-kit)**

- `drizzle-kit generate` - generar el SQL de migración a partir del schema (`adapters/persistence/sqlite/schema.ts`)
- `drizzle-kit migrate` - aplicar las migraciones pendientes a la BD

## Agent skills

### Issue tracker

Local-markdown issues under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical label vocabulary for ticket `Status:` lines. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
