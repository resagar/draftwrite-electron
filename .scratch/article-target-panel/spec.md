# Spec: panel de Target bajo el preview de la Story

**Status:** implemented
**Fecha:** 2026-10-26
**Feature:** article-target-panel
**Rama sugerida:** `feat/article-target-panel`

---

## Declaración del problema

Hoy el Target de un Article se edita en un `input` de una línea dentro de la banda superior (`ArticleBand`), al mismo nivel que el título y el subtítulo. Ese control compite visualmente con la Story, muestra el target como un campo de formulario y no permite leerlo con la tipografía del contenido.

El escritor quiere que el Target forme parte del contexto de la Story: que se vea debajo de su preview, con la misma escala de lectura, que pueda tener textos largos con scroll y que se pueda editar en el mismo sitio sin abrir un modal ni volver a la banda.

## Solución

- El Target deja de mostrarse en la banda superior del Article.
- En la pantalla de Article, el panel `Source story` incluye un subpanel `Target` debajo del contenido de la Story.
- El subpanel ocupa el **25% del alto del área de contenido** del panel, debajo de la fila `#storyId`.
- En reposo muestra el target con `text-[14px] leading-loose`, conserva saltos de línea y tiene scroll propio.
- Un botón `Edit target` (o `Add target` si está vacío) convierte el cuerpo del panel en un `<textarea>` con `Cancel` y `Save`.
- `Save` actualiza el borrador del Article; el autosave existente persiste el cambio. `Cancel` descarta la edición.
- El subpanel es exclusivo de Article: no aparece en la pantalla de Post.

## Historias de usuario

1. Como escritor, quiero ver el Target debajo del preview de la Story, para leerlo como parte del contexto del Article.
2. Como escritor, quiero que el Target ocupe el 25% del área de contenido del panel, para que sea visible sin quitarle demasiado espacio a la Story.
3. Como escritor, quiero que el Target use el mismo tamaño de fuente y el mismo interlineado que el preview de la Story, para que la lectura sea coherente.
4. Como escritor, quiero que los saltos de línea del Target se conserven, para no perder la estructura del texto.
5. Como escritor, quiero que el Target tenga scroll propio, para poder leer un texto largo sin mover la Story.
6. Como escritor, quiero ver `No target yet` cuando el Article no tiene Target, para distinguir la ausencia de un error.
7. Como escritor, quiero un botón `Add target` cuando el Target está vacío, para poder definirlo sin volver a la banda.
8. Como escritor, quiero un botón `Edit target` cuando ya hay Target, para cambiarlo en el mismo panel.
9. Como escritor, quiero que al editar el mismo cuerpo del panel se convierta en un textarea, para no cambiar de contexto.
10. Como escritor, quiero botones `Cancel` y `Save` durante la edición, para decidir explícitamente qué se guarda.
11. Como escritor, quiero que `Cancel` restaure el valor anterior y no persista nada, para deshacer una edición.
12. Como escritor, quiero que `Save` conserve el valor en el borrador, para que el autosave lo persista con el resto del Article.
13. Como escritor, quiero poder definir el Target antes de que el Article tenga Story y título, para no perderlo cuando el Article sea guardable.
14. Como escritor, quiero que al cambiar de Article se descarte una edición de Target en curso, para no guardar el texto en el Article equivocado.
15. Como escritor, quiero que el Target no aparezca en la pantalla de Post, porque el Target pertenece al Article.
16. Como escritor, quiero que al colapsar el panel `Source story` se oculte también el Target, para que el panel se comporte como una unidad.
17. Como usuario de teclado, quiero que `Escape` cancele la edición y `Cmd/Ctrl+Enter` guarde, para editar sin ratón.
18. Como usuario de teclado, quiero que el foco entre en el textarea al editar y vuelva al botón al salir, para no perder mi posición.
19. Como usuario de lector de pantalla, quiero que el panel anuncie `Target` como región y que el textarea tenga un nombre accesible, para saber dónde estoy.
20. Como escritor, quiero que un Target de más de 255 bytes muestre un error y no se guarde, para no romper la validación del dominio.
21. Como escritor, quiero que el Target se recorte al guardar, para que lo mostrado coincida con lo persistido.
22. Como escritor, quiero poder vaciar el Target, para que el panel vuelva al estado `No target yet`.
23. Como escritor, quiero que la Story y el Target tengan scrolls independientes, para moverme por cada uno sin arrastrar al otro.
24. Como mantenedor, quiero que escribir en el texto del Article no vuelva a renderizar el panel de Target, para conservar el rendimiento del editor.
25. Como mantenedor, quiero que el cambio quede limitado al renderer, sin tocar IPC, preload, dominio, SQLite ni migraciones.
26. Como mantenedor, quiero que la Story del panel siga siendo de solo lectura, para no mezclar la edición del Article con la de su origen.
27. Como mantenedor, quiero que el comportamiento quede cubierto por tests unitarios del panel y tests de integración en el seam de `App`.

## Decisiones de implementación

### Ubicación y geometría

- El subpanel vive dentro de `SourcePane`, debajo del contenido de la Story, no en el preview Markdown del editor.
- El 25% se mide sobre el área de contenido que queda debajo de la fila `#storyId`, no sobre la altura total del panel (que incluye su header).
- El header del subpanel no se encoge; el cuerpo es el que hace scroll. Si el panel es muy bajo, el header conserva los controles y el cuerpo se reduce.
- El subpanel se renderiza siempre para `subject === 'article'`, incluso si la Story está vacía, cargando, en error o ausente. El Target es metadata del Article y no depende de que la Story esté disponible.
- En `PostEditor` no se renderiza.
- Al colapsar `SourcePane` se oculta con el resto del contenido; para editar el Target hay que expandir el panel.
- El layout reserva el 25% desde el primer render del Article para que la llegada del link no provoque un salto. Mientras no hay link, el área queda vacía.

### Tipografía y scroll

- Lectura: `text-[14px] leading-loose`, `whitespace-pre-wrap`, `break-words`, `select-text`.
- Se replica el tamaño y el interlineado del texto de la Story; el Target es prosa, así que usa la fuente sans por defecto, no la mono del `<pre>` de la Story.
- Edición: el textarea usa la misma escala (`text-[14px] leading-loose`), `resize-none`, fondo transparente y `overflow-y-auto`.
- El cuerpo del panel usa `min-h-0 flex-1 overflow-y-auto overscroll-contain`.
- La Story y el Target son dos scrollers independientes dentro del panel.

### Puente de estado

El Target sigue viviendo en el borrador de `ArticleEditor`, pero el panel que lo edita está en `SourcePane`. Para no duplicar la fuente de verdad se usa un contexto local a la rama de Article:

```ts
type ArticleTargetLink = {
  articleId: string
  value: string
  save: (next: string) => void
}
```

- `ArticleTargetProvider` envuelve solo la rama de Article en `Workspace`.
- `ArticleEditor` publica el link con `{ articleId: draft.ID, value: draft.Target, save }`.
- `save` usa refs al último borrador y al último `change`, para no reemplazar el título o el texto con una copia vieja del draft.
- El publish ocurre solo cuando cambian `draft.ID` o `draft.Target`; escribir en el texto del Article no vuelve a renderizar el panel.
- El provider se monta y se desmonta con la rama de Article. Al cambiar de Article, el nuevo editor republica y el panel se remonta con `key={link.articleId}`, descartando una edición en curso.
- No se usa un store de módulo: el estado es local al workspace de Article y no se comparte con la pantalla de Post.

### Componente `TargetPanel`

- `TargetPanel` es presentacional y recibe `link: ArticleTargetLink`.
- Estado local: `editing`, `draft`, `error`.
- Reposo:
  - etiqueta `Target`;
  - `Edit target` si hay valor, `Add target` si está vacío;
  - `No target yet.` como placeholder.
- Edición:
  - el cuerpo se reemplaza por un `<textarea>` con `aria-label="Target"`;
  - `Cancel` restaura y enfoca el botón de edición;
  - `Save` valida, recorta, llama a `link.save(next)` y vuelve a reposo.
- Al entrar en edición, el textarea recibe el foco y el caret queda al final.
- `Escape` cancela y `Cmd/Ctrl+Enter` guarda.
- El valor no se publica hasta `Save`; mientras se escribe, el borrador del Article no cambia.

### Validación

- El dominio limita el Target a 255 bytes UTF-8 (`errTargetTooLong`), no a 255 caracteres.
- El panel valida con un helper puro `utf8Length(next) <= 255`, que cuenta bytes UTF-8 sin depender de `TextEncoder` (no existe en el entorno jsdom de Jest).
- Si se supera, muestra un mensaje visible, marca el textarea con `aria-invalid` y no llama a `save`.
- Antes de guardar se aplica `trim()`, igual que `normaliseArticle`.
- Un Target vacío o solo con espacios es válido: se guarda vacío y el panel vuelve a `No target yet`.
- No se cambia el límite del dominio ni se añade un campo nuevo al contrato.

### Persistencia

- `save` llama a `change({ ...draft, Target: next })`, el mismo camino que usaba el input de la banda.
- Si el Article ya es persistible, el autosave de 700 ms hace `updateArticle`.
- Si todavía no hay Story o título, el Target queda en el borrador y se persiste cuando el Article pase a ser guardable.
- Al desmontar, `useDraftPersistence` sigue haciendo flush de lo pendiente.
- No se añade guardado explícito ni un estado de guardado propio del panel.

### SourcePane

- `SourcePane` acepta un slot opcional `footer?: ReactNode`.
- El contenido expandido se organiza en columna:
  - arriba, el contenido actual de la Story dentro de un contenedor con scroll;
  - abajo, el footer con `h-1/4 min-h-0 shrink-0`.
- El scroll del contenido de la Story se mueve al contenedor superior; el bloque `ready` deja de tener su propio `overflow-y-auto` para no anidar scrollers.
- El footer solo se pasa desde la rama de Article. `PostEditor` no lo pasa.
- El footer está dentro del contenedor que se oculta al colapsar, así que desaparece con el panel.

### ArticleBand y ArticleEditor

- `ArticleBand` deja de recibir `target` y `onTarget`, y elimina el input `Target`.
- `Subtitle` se mantiene en la segunda fila.
- `ArticleEditor` deja de pasar `onTarget` a la banda y publica el link al contexto.
- `Target` sigue formando parte del borrador, de `hasContent` y de las llamadas `createArticle` / `updateArticle`.

### Accesibilidad

- El subpanel es una `section` con `aria-label="Target"`.
- El botón de edición es un `<button type="button">` nativo con nombre `Edit target` o `Add target`.
- El textarea tiene `aria-label="Target"`, `aria-invalid` cuando corresponde y el error asociado con `aria-describedby`.
- El error se anuncia con `role="alert"`.
- El foco vuelve al botón de edición al guardar o cancelar.
- No se usa `aria-pressed`; el botón de edición no es un toggle, es una acción que abre un modo.

### Ubicación del cambio

- `src/renderer/src/state/article-target-context.tsx`: provider, tipos y hooks.
- `src/renderer/src/workspace/TargetPanel/TargetPanel.tsx`: panel de lectura/edición.
- `src/renderer/src/workspace/TargetPanel/TargetPanel.test.tsx`: tests unitarios.
- `src/renderer/src/workspace/SourcePane/SourcePane.tsx`: slot `footer` y layout del 25%.
- `src/renderer/src/workspace/Workspace/Workspace.tsx`: provider y footer en la rama de Article.
- `src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx`: publicar el link y quitar `onTarget`.
- `src/renderer/src/workspace/ArticleBand/ArticleBand.tsx`: quitar el input de Target.
- `src/renderer/src/App.test.tsx`: integración del flujo completo.

## Decisiones de testing

### Seam

- Tests unitarios de `TargetPanel` con un `ArticleTargetLink` de fixture.
- Tests de integración en `App` con el fake del `DataPort`, reutilizando `renderApp`, `createFakePort`, `makeArticle` y los helpers de Article existentes.
- No se testea el contexto aislado: su comportamiento queda cubierto por la integración.

### Casos a cubrir

- Panel vacío: `No target yet` y `Add target`.
- Panel con valor: muestra el texto y `Edit target`.
- Editar → `Cancel`: no llama a `save` y muestra el valor anterior.
- Editar → `Save`: recorta, llama a `save` con el nuevo valor y vuelve a reposo.
- `Escape` cancela; `Cmd/Ctrl+Enter` guarda.
- Target de 255 bytes se acepta; 256 bytes muestran error y no guardan.
- Un valor multibyte se mide en bytes, no en caracteres.
- Vaciar el Target y guardar vuelve a `No target yet`.
- Article guardado: editar y guardar actualiza `updatedArticles` después del autosave.
- Article en creación: definir Target antes de Story y título; al guardar, `createArticle` recibe el Target.
- Cambiar de Article mientras se edita descarta la edición y muestra el Target del nuevo Article.
- Colapsar `SourcePane` oculta el Target; expandirlo lo muestra.
- La pantalla de Post no muestra la región `Target`.
- Los tests actuales siguen pasando sin cambios, salvo que alguno consulte el input `Target` de la banda; en ese caso el cambio de contrato se actualiza de forma deliberada.
- El 25% de altura, el scroll y la tipografía no se verifican en jsdom: comprobación manual en Electron.

### Verificación manual

- Abrir un Article guardado con y sin Target.
- Redimensionar la ventana y comprobar que el Target sigue en el 25% y que su cuerpo hace scroll.
- Probar un Target largo con saltos de línea.
- Colapsar y expandir `SourcePane`.
- Editar, cancelar, guardar y navegar a otro Article sin guardar.
- Comprobar el foco con teclado y el orden de tabulación.
- Comprobar que la Story y el Target no se arrastran mutuamente al hacer scroll.

### Comandos

- `pnpm test`
- `pnpm test -- src/renderer/src/workspace/TargetPanel`
- `pnpm test -- src/renderer/src/App.test.tsx`
- `pnpm typecheck`
- `pnpm lint`

## Fuera de alcance

- Renderizar el Target como Markdown.
- Persistir el estado de edición o el borrador del Target entre navegaciones o reinicios.
- Hacer redimensionable el subpanel del Target: el 25% es fijo.
- Cambiar el límite de 255 bytes, el modelo, el contrato IPC, SQLite o las migraciones.
- Convertir el panel `Source story` en editable: la Story sigue siendo de solo lectura; el Target es una isla editable del Article.
- Añadir un atajo global para editar el Target.
- Internacionalización.
- Cambiar el preview Markdown del editor o su sincronización con el caret.

## Notas

- La excepción al carácter read-only de `SourcePane` es deliberada y acotada al Target del Article. Conviene dejarla escrita para que no se confunda con una edición de la Story.
- La primera proyección del link ocurre después del montaje del editor. El layout reserva el 25% desde el primer render para que no haya salto; el contenido puede aparecer un frame después.
- Si el equipo prefiere evitar el puente hijo→padre, la alternativa es subir todo el borrador a un `ArticleWorkspace` que envuelva `SourcePane` y el editor. Es un refactor mayor y queda fuera de esta spec.

## Tickets

1. [01: Puente de estado del Target](issues/01-target-state-bridge.md)
2. [02: TargetPanel de lectura y edición](issues/02-target-panel.md)
3. [03: Integrar el Target en SourcePane](issues/03-source-pane-target.md)
4. [04: Quitar el input de la banda y cubrir el flujo completo](issues/04-remove-band-input.md)
