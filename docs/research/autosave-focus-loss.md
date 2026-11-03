# Pérdida de foco durante el autoguardado inicial

Fecha: 2026-11-03. Alcance original: investigación y propuesta del estado anterior a la corrección. Los resultados siguientes describen ese snapshot; la implementación y su verificación se registran en el tracker de autosave-focus.

## Resultado

Reproducido en la aplicación React completa con el DataPort fake existente: el primer autoguardado de una Story, de un Article y de un Post reemplaza el input enfocado. El input anterior queda desconectado del DOM y el foco pasa al body. Al actualizar una Story existente se conserva el mismo input, el foco y la selección (posición 5).

La prueba usa Jest/jsdom para identidad del nodo y foco de inputs HTML; no comprueba layout ni comportamiento nativo de Electron/Chromium. Tampoco verifica SQLite o IPC: el límite de persistencia es el fake del proyecto. No se generaliza el resultado a todas las actualizaciones ni a las actualizaciones de Articles o Posts existentes, que no se ejercitaron como control.

## Cadena causal y fuentes

1. El debounce de autoguardado es de 700 ms; una entidad con ID vacío se crea, las demás se actualizan. La respuesta dispara `onStored`. Fuente: [use-draft-persistence.ts](../../src/renderer/src/state/use-draft-persistence.ts), constante `DELAY_MS`, funciones `persist` y `schedule`.
2. Tras crear, los tres editores ejecutan `setDraft(value)`, `create/cancel` y navegación a la entidad creada. Fuentes: [StoryEditor.tsx](../../src/renderer/src/workspace/StoryEditor/StoryEditor.tsx), `onStored`; [ArticleEditor.tsx](../../src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx), `onStored`; [PostEditor.tsx](../../src/renderer/src/workspace/PostEditor/PostEditor.tsx), `onStored`.
3. Workspace cambia de `<StoryEditor stored={null}>` a `<StoryEditorPane>`, y de `<ArticleEditor stored={null}>` a `<ArticlePane>`; Post cambia de `<PostEditor stored={null}>` a `<PostPane>`. Los panes contienen otro editor. Cambiar el tipo del componente en esa posición desmonta el árbol anterior. Fuentes: [Workspace.tsx](../../src/renderer/src/workspace/Workspace/Workspace.tsx), ramas `creating` y selección; [StoryEditorPane.tsx](../../src/renderer/src/workspace/StoryEditorPane/StoryEditorPane.tsx); [ArticlePane.tsx](../../src/renderer/src/workspace/ArticlePane/ArticlePane.tsx); [PostPane.tsx](../../src/renderer/src/workspace/PostPane/PostPane.tsx).
4. React documenta que eliminar/reinsertar un input y cambiar la identidad de sus componentes puede causar problemas con el cursor, y que reemplazar tipos o claves reinicia el árbol y su DOM. Fuentes primarias: [React: input, troubleshooting](https://react.dev/reference/react-dom/components/input#my-input-caret-jumps-to-the-beginning-on-every-keystroke) y [React: preserving and resetting state](https://react.dev/learn/preserving-and-resetting-state).

No es solo una inferencia del código: las pruebas registraron `isConnected=false`, `sameNode=false` y `focused=false` después de guardar las tres entidades nuevas. El caso de control registró los tres valores en `true` al actualizar una Story existente.

## Reproducción y evidencia

Se ejecutó un harness temporal con `renderApp`, los componentes reales, `useDraftPersistence` real y `createFakePort`. Se enfoca Topic/Title, se escribe, se fija la selección y se espera a que aparezca el pane de entidad guardada.

Comando de ejecución focalizado (tras materializar el bloque del apéndice en la ruta indicada):

```sh
pnpm exec cross-env ELECTRON_RUN_AS_NODE=1 NODE_OPTIONS=--experimental-vm-modules electron node_modules/jest/bin/jest.js --runInBand --selectProjects renderer --runTestsByPath src/renderer/src/autosave-focus.research.test.tsx
```

Resultado final al incluir Post: 3 pruebas fallidas (conservación de foco en creación de Story, Article y Post), 1 pasada (actualización de Story existente). El fallo esperado compara el elemento activo con el input original; no depende solo de que el guardado haya ocurrido. Story y Article fallaron en tres ejecuciones y el control pasó en las tres; Post se incorporó a la última ejecución y también falló. Una primera invocación con un `--` adicional amplió accidentalmente la selección: 29 suites, 376 pruebas pasadas y únicamente estas dos fallidas. La invocación focalizada tardó aproximadamente 5 segundos.

```text
INITIAL_STORY   creates=1 connected=false sameNode=false focused=false
INITIAL_ARTICLE creates=1 connected=false sameNode=false focused=false
EXISTING_STORY  updates=1 connected=true  sameNode=true  focused=true
INITIAL_POST    creates=1 connected=false sameNode=false focused=false
```

El archivo de prueba temporal se retiró al terminar; su código queda aquí para reproducir el hallazgo sin dejar una suite deliberadamente fallida.

## Solución recomendada

Mantener estable la instancia del editor y sus inputs durante la transición de creación a entidad persistida. Unificar la composición de Workspace y los panes para que el editor ocupe la misma posición bajo el mismo tipo de padre antes y después del primer guardado. La identidad de una sesión de edición debe sobrevivir a la asignación del ID persistido; cambiar una key de ID vacío a ID de base de datos volvería a provocar el problema. Al seleccionar otra entidad sí debe iniciarse la sesión correspondiente.

El encabezado y las acciones pueden actualizarse sin reemplazar el editor. Esto permite conservar foco, selección y estado del editor, en vez de reconstruirlos. Es una propuesta de diseño basada en la causa comprobada; no se implementó ni se verificó una corrección en esta investigación.

Restaurar `focus()` después del guardado sería un parche más localizado, pero exige conservar selección y distinguir si la persona movió el foco mientras guardaba; además no evita perder el estado interno del editor al desmontarlo. Aumentar el debounce solo posterga el mismo reemplazo. Se recomienda resolver la identidad del árbol.

## Criterios para implementar y verificar

- Convertir las tres reproducciones fallidas en regresiones permanentes: mismo nodo, foco y selección conservados tras la creación; permitir seguir escribiendo sin clic.
- Cubrir actualizaciones posteriores de Story, Article y Post y selección deliberada de otra entidad.
- Cubrir escritura mientras la creación está en vuelo: conservar el draft más reciente, adoptar el ID persistido y actualizar sin crear duplicados. El hook ya ajusta el ID del pending; la composición nueva debe respetar ese comportamiento y no sobrescribir cambios con una respuesta antigua.
- Mantener errores/reintento, descarte y navegación; verificar que suscribirse/desuscribirse del guardado manual no interfiera durante la transición.
- Validar en Electron/Chromium foco, selección y continuidad de CodeMirror después de la corrección. Esta investigación no ejecutó una verificación GUI.

## Apéndice: harness temporal

Guardar temporalmente como `src/renderer/src/autosave-focus.research.test.tsx` y ejecutar el comando anterior. Usa únicamente infraestructura ya existente.

```tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from '@jest/globals'
import { createFakePort } from './data/fake/fake-port'
import { makeStory } from './data/fake/factories'
import { renderApp } from './test/render-app'

it('preserves topic focus through initial story autosave', async () => {
  const fake = createFakePort({ stories: [] })
  renderApp(fake.port)
  fireEvent.click(await screen.findByRole('button', { name: 'New Story' }))
  const input = screen.getByLabelText('Topic') as HTMLInputElement
  input.focus()
  fireEvent.change(input, { target: { value: 'Focus research' } })
  input.setSelectionRange(5, 5)
  await screen.findByRole('region', { name: 'Story' }, { timeout: 3000 })
  console.log('INITIAL_STORY', { creates: fake.calls.createStory, connected: input.isConnected, sameNode: screen.getByLabelText('Topic') === input, focused: document.activeElement === input })
  expect(document.activeElement === input).toBe(true)
})

it('preserves title focus through initial article autosave', async () => {
  const fake = createFakePort({ stories: [makeStory({ ID: 's1', Topic: 'Source' })], articles: [] })
  renderApp(fake.port)
  await screen.findByRole('listbox', { name: 'Stories' })
  fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
  fireEvent.click(await screen.findByRole('button', { name: 'New Article' }))
  fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
  const input = screen.getByLabelText('Title') as HTMLInputElement
  input.focus()
  fireEvent.change(input, { target: { value: 'Focus research' } })
  input.setSelectionRange(5, 5)
  await screen.findByRole('region', { name: 'Article' }, { timeout: 3000 })
  console.log('INITIAL_ARTICLE', { creates: fake.calls.createArticle, connected: input.isConnected, sameNode: screen.getByLabelText('Title') === input, focused: document.activeElement === input })
  expect(document.activeElement === input).toBe(true)
})

it('preserves topic focus during an existing story update', async () => {
  const fake = createFakePort({ stories: [makeStory({ ID: 's1', Topic: 'Source' })] })
  renderApp(fake.port)
  const list = await screen.findByRole('listbox', { name: 'Stories' })
  fireEvent.click(within(list).getByRole('option', { name: /Source/ }))
  const input = screen.getByLabelText('Topic') as HTMLInputElement
  input.focus()
  fireEvent.change(input, { target: { value: 'Focus research' } })
  input.setSelectionRange(5, 5)
  await waitFor(() => expect(fake.calls.updateStory).toBe(1), { timeout: 3000 })
  console.log('EXISTING_STORY', { updates: fake.calls.updateStory, connected: input.isConnected, sameNode: screen.getByLabelText('Topic') === input, focused: document.activeElement === input })
  expect(document.activeElement === input).toBe(true)
  expect(input.selectionStart).toBe(5)
})

it('preserves topic focus through initial post autosave', async () => {
  const fake = createFakePort({ stories: [], posts: [] })
  renderApp(fake.port)
  fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
  await screen.findByText('No posts yet')
  fireEvent.click(screen.getByRole('button', { name: 'New Post' }))
  const input = screen.getByLabelText('Topic') as HTMLInputElement
  input.focus()
  fireEvent.change(input, { target: { value: 'Focus research' } })
  input.setSelectionRange(5, 5)
  await screen.findByRole('region', { name: 'Post' }, { timeout: 3000 })
  console.log('INITIAL_POST', { creates: fake.calls.createPost, connected: input.isConnected, sameNode: screen.getByLabelText('Topic') === input, focused: document.activeElement === input })
  expect(document.activeElement === input).toBe(true)
})
```
