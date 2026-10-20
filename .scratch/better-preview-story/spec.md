# Spec: panel «Source story» durante la creación de un Article

**Status:** ready-for-agent
**Fecha:** 2026-10-20
**Feature:** better-preview-story
**Rama:** `feat/better-preview-story`
**Informe de investigación:** `research.md` (misma carpeta)

---

## Declaración del problema

Cuando el escritor empieza a crear un Article, el panel «Source story» no existe: el workspace muestra solo el editor de creación. El panel aparece recién cuando el guardado automático crea el Article, 700 ms después de que el borrador tenga Story y título. En ese momento el layout cambia de golpe, el editor se angosta y el panel aparece con contenido, mientras el escritor todavía puede estar escribiendo.

El problema se agrava por tres comportamientos actuales:

- El único control para mostrar u ocultar el panel vive en `ArticleHeader`, que no existe durante la creación. Por eso el panel no se puede minimizar antes de guardar.
- En viewports de 1280 px o más, la clase `hidden xl:flex` fuerza la visibilidad del panel aunque el estado sea «oculto»; el botón no puede minimizarlo.
- `StoryPane` recibe solo `story: Story | null` y no distingue «todavía no hay Story», «las Stories están cargando», «la carga falló» y «la Story ya no existe». Durante un borrador, el mensaje de error sería incorrecto.

El escritor necesita que el panel sea parte del Article desde el primer momento, que refleje la Story elegida, que pueda quedar vacío sin parecer un error y que se pueda minimizar y restaurar tanto durante la creación como después de guardar.

## Solución

El panel «Source story» pasa a formar parte del workspace de Article desde que se inicia la creación:

- Al pulsar **New Article**, el panel aparece abierto junto al editor, vacío si no hay una Story elegida o mostrando la Story preseleccionada si la hay.
- Mientras el writer elige o cambia la Story en la banda del Article, el panel sigue ese `StoryID` en vivo.
- Al guardarse el Article, el panel no se remonta ni se reinicia: sigue en la misma posición y conserva su contenido y su estado expandido o minimizado. El guardado solo cambia la fuente del `StoryID`, del borrador al Article almacenado.
- El panel se puede minimizar a una franja estrecha y restaurar con el mismo botón. El control está dentro del panel, por lo que existe también durante la creación.
- El panel puede estar abierto y vacío. Ese estado se muestra como un placeholder explícito, no como «la Story desapareció».
- La carga, el error, la Story inexistente y la ausencia de Story son estados distintos.
- El estado se conserva durante la sesión. Cada Article nuevo empieza expandido, aunque el anterior se haya minimizado.
- El panel ahora se puede minimizar en cualquier ancho de ventana; se elimina la visibilidad forzada en `xl`.
- El texto de la Story se sigue mostrando como `<pre>` crudo. Este cambio no renderiza Markdown en el panel.

La apertura al crear no se trata como una animación independiente: el panel es parte del workspace desde el primer frame. Lo que se elimina es el salto posterior al guardar. La transición de ancho se reserva para la acción explícita de minimizar o restaurar.

## Historias de usuario

1. Como escritor, quiero que el panel «Source story» esté abierto al empezar a crear un Article, para ver el contexto de la historia sin esperar al guardado.
2. Como escritor, quiero que el panel esté vacío si todavía no elegí una Story, para no confundir la ausencia de datos con un error.
3. Como escritor, quiero que la Story preseleccionada aparezca en el panel antes de guardar, para comprobar que es la historia correcta.
4. Como escritor, quiero que el panel se actualice al elegir otra Story en la banda, para que el preview nunca quede desactualizado.
5. Como escritor, quiero que al limpiar el selector de Story el panel vuelva al estado vacío, para reflejar exactamente el borrador.
6. Como escritor, quiero que el panel no muestre «la Story ya no existe» cuando todavía no hay Story, para no recibir un diagnóstico falso.
7. Como escritor, quiero que mientras las Stories se cargan el panel muestre un estado de carga discreto, para saber que la información todavía no llegó.
8. Como escritor, quiero que si falla la carga de Stories el panel lo diga y me permita reintentar, para no quedarme con un mensaje de Story inexistente.
9. Como escritor, quiero que una Story realmente ausente muestre un mensaje claro, para entender que el Article perdió su origen.
10. Como escritor, quiero que al guardar el Article el panel siga abierto y con el mismo contenido, para que el layout no salte mientras escribo.
11. Como escritor, quiero que el panel no se remonte al guardar, para conservar su estado y evitar un parpadeo.
12. Como escritor, quiero poder minimizar el panel durante la creación, para ganar espacio mientras escribo.
13. Como escritor, quiero poder restaurar el panel cuando lo necesite, para volver a consultar la Story.
14. Como escritor, quiero que el panel minimizado deje una franja visible con el control de restaurar, para no perder el acceso a la Story.
15. Como escritor, quiero que el control de minimizar funcione en ventanas anchas y estrechas, para que el estado del panel coincida con lo que veo.
16. Como escritor, quiero que un Article nuevo empiece con el panel expandido aunque el anterior estuviera minimizado, para tener el contexto desde el inicio.
17. Como escritor, quiero que el estado minimizado se conserve al navegar entre Articles durante la sesión, para no repetir el ajuste en cada uno.
18. Como escritor, quiero que al reiniciar la app el panel vuelva a su valor por defecto, porque no necesito una preferencia persistente para esta versión.
19. Como escritor, quiero que el panel no se autoexpanda cuando llegan los datos de la Story, para que la interfaz no se mueva sin una acción mía.
20. Como usuario de lector de pantalla, quiero que el botón anuncie si el panel está expandido o contraído, para entender el estado sin verlo.
21. Como usuario de lector de pantalla, quiero que el contenido minimizado no sea anunciado ni tabulable, para no navegar por controles invisibles.
22. Como usuario de teclado, quiero que Enter y Space funcionen sobre el botón nativo, para minimizar y restaurar sin ratón.
23. Como usuario de teclado, quiero que el foco permanezca en el botón al minimizar o restaurar, para no perder mi posición.
24. Como usuario con movimiento reducido, quiero que la transición del panel se desactive, para evitar movimiento no esencial.
25. Como usuario, quiero que la animación se use solo cuando yo minimizo o restauro, para que la apertura y el guardado no se sientan inestables.
26. Como usuario, quiero que el panel mantenga los tokens y el contraste del tema, para que el estado vacío, la carga y el error sean legibles.
27. Como escritor, quiero que el botón de copiar solo esté disponible cuando hay una Story, para no pulsar una acción que no hace nada.
28. Como escritor, quiero que el botón de abrir la Story en su editor solo esté disponible después de guardar, para no abandonar un borrador a medio escribir.
29. Como escritor, quiero que el borrado de la Story no esté disponible durante la creación, para no borrar por error la Story equivocada.
30. Como escritor, quiero que el borrado de la Story siga disponible en un Article guardado cuya Story existe, para conservar el flujo actual.
31. Como escritor, quiero que el panel no intente borrar una Story que ya no existe, para no abrir un diálogo sin destino.
32. Como escritor, quiero que al cambiar de Story el aviso «Copied» se limpie, para no atribuir la confirmación a la Story anterior.
33. Como escritor, quiero que el panel siga siendo de solo lectura, para no editar la Story desde el Article.
34. Como escritor, quiero que el panel de creación sea el mismo que el de edición, para no re-aprender dos interfaces.
35. Como escritor, quiero crear un Article desde la lista, el sidebar o el atajo y ver el mismo comportamiento del panel, para que las tres entradas coincidan.
36. Como escritor con una ventana de 900 px, quiero que el panel abierto deje espacio utilizable al editor y que pueda minimizarlo, para escribir sin quedar atrapado.
37. Como mantenedor, quiero que el cambio se limite al renderer, sin tocar IPC, preload, dominio, SQLite ni migraciones, para mantener la regla de dependencias.
38. Como mantenedor, quiero que el estado del panel viva en el reducer del workspace, para respetar la arquitectura sin store global.
39. Como mantenedor, quiero que la Story del borrador se comparta sin mover todo el texto del editor al workspace, para no re-renderizar CodeMirror en cada tecla.
40. Como mantenedor, quiero que el comportamiento quede cubierto por tests de integración del renderer, para detectar regresiones en la creación y en el guardado.

## Decisiones de implementación

### Composición y continuidad

- La creación de Article deja de ser una rama de retorno temprano con solo `ArticleEditor`. La creación y el Article guardado comparten una única composición de workspace: `StoryPane` como hermano del editor, seguido por `ArticleEditor` durante la creación o por `ArticlePane` después de guardar.
- `StoryPane` ocupa la misma posición en el árbol antes y después del guardado. React conserva su instancia, su estado de expansión, su estado de copiado y su scroll.
- El panel no se monta dentro de `ArticleEditor`. Se mantiene como hermano para que exista antes de que haya un Article almacenado y para que no dependa del ciclo de vida del editor.
- El `ArticleEditor` puede remontarse al pasar a `ArticlePane` con `key={article.ID}`; eso no afecta al panel.
- Al guardar, `creatingStoryId` pasa a ser `article.StoryID`. Ambos valores son el mismo `StoryID`, por lo que la fuente del panel no cambia de contenido en el mismo frame.

### Story del borrador

- El `StoryID` que el writer elige en `ArticleBand` se comparte con el workspace mediante una acción del reducer que actualiza `creatingStoryId`. No se eleva el borrador completo ni el texto.
- `ArticleEditor` sigue siendo el dueño del borrador y del texto; solo notifica los cambios de `StoryID` al workspace.
- `creatingStoryId` deja de significar únicamente «Story preseleccionada»: representa la Story actual del borrador. Se actualiza al elegir o limpiar la Story.
- La condición de guardado no cambia: un Article se persiste solo cuando tiene `StoryID` y `Title` no vacíos. El panel puede mostrar una Story aunque el Article todavía no sea persistible.
- Si el writer limpia la Story, el panel vuelve al estado vacío y no conserva el contenido anterior.
- `useStoryInContext` no cambia: sigue resolviendo la Story del Article abierto o de la Story seleccionada. La creación usa directamente `creatingStoryId`.

### Estado del panel

El panel distingue explícitamente cinco estados de fuente:

- `ready`: la Story existe en la biblioteca. Se muestra Topic, Titles, Tags y Text.
- `empty`: no hay `StoryID` seleccionado. Se muestra el placeholder de ausencia de Story.
- `loading`: hay `StoryID`, pero la lista de Stories está cargando y la Story todavía no está disponible.
- `error`: hay `StoryID` y la carga de Stories falló.
- `missing`: hay `StoryID`, la lista está lista y la Story no existe.

La derivación prioriza `ready` sobre el estado de la lista: si la Story ya está en memoria, se muestra aunque una recarga posterior esté en curso. Si no está, se usa `storiesStatus` para distinguir `loading`, `error` y `missing`.

### Expansión, minimización y persistencia

- El booleano existente se renombra a `storyPaneExpanded` para que su nombre describa el estado real. La acción sigue siendo `storyPane/toggle`.
- El valor inicial es `true`: la primera vez que se abre un Article en la sesión, el panel aparece expandido. Esto conserva el comportamiento visual actual en `xl` y extiende el preview a ventanas más angostas.
- `create/start` con `kind: 'article'` fuerza `storyPaneExpanded: true`. Un Article nuevo siempre empieza expandido, incluso si el panel estaba minimizado.
- `article/select` no fuerza el estado: si el writer minimizó el panel, se conserva minimizado al cambiar de Article durante la sesión.
- `create/cancel` no reinicia el estado. Si el writer cancela un borrador, el panel conserva la preferencia de la sesión.
- No hay persistencia en `localStorage`, `sessionStorage`, SQLite ni el proceso principal. La preferencia dura lo que dura la sesión.
- No hay estado por Article. Es una preferencia global de la sesión, con la excepción explícita de que cada Article nuevo se abre expandido.
- Se elimina la clase `hidden xl:flex` y cualquier visibilidad forzada por breakpoint. El estado `storyPaneExpanded` controla el panel en todos los anchos.
- El panel expandido conserva los anchos actuales: 360 px y 420 px en `xl`.
- El panel minimizado se colapsa a una franja de 40 px. La franja mantiene el botón de restaurar visible y el fondo/borde del panel.
- La franja no es un overlay: sigue ocupando espacio en el layout, para que el editor se ajuste de forma predecible.

### Anatomía y acciones del panel

- El botón de minimizar/restaurar es el primer control de la cabecera del panel, en el borde izquierdo. Así sigue visible cuando el panel se reduce a 40 px.
- El botón es un `<button type="button">` nativo, con nombre accesible estable `Toggle source story`, `aria-expanded` y `aria-controls` apuntando al contenido.
- No se usa `aria-pressed`. El control describe una región que se expande o contrae, no el estado presionado de un botón.
- El icono del botón cambia según el estado y va `aria-hidden="true"`. El tooltip usa el mismo nombre accesible.
- Cuando el panel está minimizado, el título, el chip `Read-only`, las acciones y el contenido se ocultan con `hidden`. El botón de la franja permanece.
- El contenido sigue montado cuando está minimizado para conservar el estado de copiado y el scroll. `hidden` lo retira del orden de tabulación y del árbol de accesibilidad.
- El panel sigue siendo una `<section aria-label="Source story">` con encabezado visible. Se conserva como `region` con nombre.
- El encabezado expandido conserva `Lock`, `Source story` y `Read-only`.
- La fila de proveniencia `#storyId` se muestra cuando hay un `StoryID`, incluso si está cargando o no existe. Se oculta en el estado `empty`.
- `Copy source text` solo se habilita en `ready`. En `empty`, `loading`, `error` y `missing` no se puede copiar.
- `Open story in editor` solo se muestra en un Article guardado y solo se habilita en `ready`.
- `Delete story` solo se muestra en un Article guardado y solo se habilita en `ready`. No se muestra durante la creación.
- El panel de creación es de solo lectura y no ofrece navegación ni borrado. El writer puede copiar el texto de la Story cuando está disponible.
- Al cambiar de `StoryID`, el estado local de copiado vuelve a `idle` para no mostrar «Copied» sobre otra Story.
- El texto de la Story se sigue mostrando en un `<pre>` crudo. No se renderiza Markdown.

### Estados vacío, carga, error y Story ausente

- `empty`: muestra `No source story yet` y una descripción como `Choose a story for this article to preview it here.` No es un error y no usa `role="alert"`.
- `loading`: muestra `Loading source story…` con `role="status"` y `aria-busy="true"`. No se usa un skeleton de lista; la lectura es local y un skeleton puede parpadear más que ayudar.
- `error`: reutiliza `ErrorState` con `Source story could not be loaded` y una acción `Try again` que llama a `reloadStories`.
- `missing`: en un Article guardado conserva el texto existente `The story this article came from no longer exists.`; en un borrador usa un mensaje equivalente que aclara que la Story seleccionada ya no está disponible y que se puede elegir otra.
- `ready`: muestra el contenido actual del panel.
- La llegada de datos no cambia `storyPaneExpanded`. Si el panel está minimizado, sigue minimizado; si está expandido, solo se actualiza el contenido.
- Los textos de UI van en inglés; los identificadores y comentarios nuevos van en inglés.

### Animación y accesibilidad

- La transición de ancho se usa solo en la acción de minimizar/restaurar. Dura entre 160 y 200 ms y no usa `transition-all`.
- La transición se desactiva con `prefers-reduced-motion` y con `motion-reduce:transition-none`, además de la regla global existente.
- No hay animación de entrada al montar el workspace de creación, al guardar ni al llegar los datos. No se usa `@starting-style` para el montaje inicial.
- El contenido interno mantiene un ancho fijo durante la transición para evitar que el texto se reflowe mientras se recorta.
- El foco permanece en el botón de toggle porque el botón no se desmonta al cambiar de estado.
- Al minimizar, el contenido se oculta de inmediato con `hidden`; no se deja contenido enfocable detrás de una animación.
- El botón tiene un área objetivo de al menos 24×24 px (la franja de 40 px y el padding del botón lo permiten).
- Se conservan los tokens semánticos de daisyUI (`bg-base-200`, `border-base-300`, `text-base-content`, `text-warning`, etc.). No se agregan colores hexadecimales.

### Ubicación del cambio

- `Workspace`: unifica las ramas de creación y Article guardado, deriva el estado de la fuente y controla la expansión.
- `StoryPane`: recibe el estado de la fuente, `expanded`, si está en creación, el toggle y el reintento; renderiza la franja, el placeholder y los estados.
- `workspace-context`: renombra el booleano, cambia su valor inicial, agrega la acción para actualizar la Story del borrador y fuerza la expansión en `create/start` de Article.
- `ArticleEditor`: notifica los cambios de `StoryID` del borrador; no mueve el texto ni el resto del borrador al workspace.
- `ArticleHeader`: elimina el toggle duplicado y el uso de `storyPaneVisible`; conserva `ViewModeSwitcher` y `Delete article`.
- `library-context` no requiere cambios: ya expone `storyById`, `storiesStatus` y `reloadStories`.
- No se toca el proceso principal, el preload, el contrato IPC, el dominio, SQLite ni las migraciones.

## Decisiones de testing

### Seam

- **Un solo seam: integración a nivel de `App`.** Se renderiza la app completa con el fake del `DataPort` y se interactúa con roles accesibles, texto visible y eventos de teclado, igual que los tests actuales de creación, panel y borrado.
- No se crean tests unitarios nuevos del reducer ni de `StoryPane` aislado. El comportamiento del estado y del panel queda cubierto por la integración, que es el seam más alto y el que ya usa el repo.
- Los helpers existentes (`renderApp`, `createFakePort`, `makeStory`, `makeArticle`, `openArticle`, `openNewArticle`) se reutilizan.

### Qué hace bueno a un test

- Verifica comportamiento externo observable: región presente, texto visible, `aria-expanded`, contenido oculto o expuesto, Story que muestra el panel, entidad creada, estado minimizado después de guardar y foco.
- No verifica nombres de funciones internas, la forma exacta del reducer ni clases CSS salvo cuando la clase representa el estado visible.
- No modifica tests existentes para hacer pasar una implementación. Los cambios de contrato de esta spec se actualizan de forma deliberada y justificada.
- Usa los mismos roles y nombres accesibles que un usuario o un lector de pantalla.

### Cambios de contrato existentes

- El test existente `lets the writer toggle the source pane` cambia porque el control deja de ser un toggle button con `aria-pressed` y pasa a ser un disclosure con `aria-expanded`. El nombre accesible cambia de `Toggle source pane` a `Toggle source story`.
- El estado inicial esperado del panel cambia de `false` a `true`, porque el panel ahora está expandido por defecto.
- El toggle deja de buscarse en `ArticleHeader` y pasa a estar dentro de la región `Source story`. Esto es un cambio de contrato aprobado por esta spec, no un ajuste mecánico para que pase la implementación.
- El helper `openArticle` sigue funcionando: la región `Source story` existe al seleccionar un Article guardado.
- Los tests de contenido, copia, Story inexistente y apertura del editor siguen siendo válidos con el panel expandido por defecto.

### Casos a cubrir

- Un Article guardado abre con el panel expandido y `aria-expanded="true"`.
- El botón `Toggle source story` minimiza el panel: `aria-expanded` pasa a `false` y las acciones del contenido dejan de estar disponibles para roles accesibles.
- El mismo botón restaura el panel y el contenido vuelve a estar disponible.
- Al iniciar `New Article` sin Story en contexto, el panel está expandido y muestra `No source story yet`, no `no longer exists`.
- Al iniciar `New Article` con una Story preseleccionada, el panel muestra el Topic y el texto de esa Story antes de guardar.
- Al elegir una Story en la banda, el panel se actualiza sin guardar.
- Al cambiar a otra Story, el panel muestra la nueva; al limpiar el selector, vuelve al estado vacío.
- Al guardar el Article, el botón del panel es el mismo nodo DOM antes y después del guardado, y el panel sigue expandido con el mismo contenido.
- Si el panel estaba minimizado durante el borrador, sigue minimizado después de guardar y conserva `aria-expanded="false"`.
- Después de minimizar un Article y crear uno nuevo, el nuevo Article abre el panel expandido.
- Con la lista de Stories en carga, un Article guardado muestra el estado de carga y no el mensaje de Story inexistente; al resolverse la carga muestra la Story.
- Con la lista de Stories en error, el panel muestra el error y `Try again`; al reintentar con éxito muestra la Story.
- Un Article huérfano con la biblioteca lista sigue mostrando `/no longer exists/`.
- Durante la creación no existe el botón `Delete story`; el panel de creación no navega ni borra.
- En un Article guardado con Story disponible, `Delete story`, `Copy source text` y `Open story in editor` siguen funcionando como hoy.
- En un Article guardado sin Story, las acciones que dependen de la Story no están disponibles.
- El botón de toggle no expone `aria-pressed`.
- El contenido minimizado no expone botones internos mediante roles accesibles.

### Prior art

- Los bloques `source story pane` y `creating an article` del test de integración, para contenido, copia, Story inexistente, toggle, preselección, cambio de Story, guardado y bloqueo del selector.
- Los tests de carga y error de listas que usan `listStoriesGate` y `listStoriesFailures` del fake.
- Los tests de atajos y de creación desde el sidebar, para comprobar que las tres entradas producen el mismo workspace.

### Verificación manual

- La transición de minimizar/restaurar y el respeto a `prefers-reduced-motion` no se pueden validar de forma fiable en jsdom. Se comprueban visualmente en Electron, con ventana ancha y con la ventana mínima de 900 px.
- También se comprueba que no hay salto visual al guardar mientras se escribe con el panel expandido.

## Fuera de alcance

- Renderizar Markdown en `StoryPane`; el panel sigue mostrando el texto crudo en `<pre>`.
- Persistir el estado del panel entre reinicios, por Article o en el proceso principal.
- Agregar preferencias de UI, `localStorage`, `electron-store`, IPC nuevo o migraciones.
- Convertir el panel en overlay, modal, drawer o panel redimensionable con arrastre.
- Agregar un atajo de teclado para minimizar o restaurar.
- Cambiar las reglas de creación del Article, la validación Story + título, el guardado automático o la inmutabilidad del `storyID`.
- Cambiar el selector de Story, el texto de la banda o el diálogo de borrado.
- Cambiar el comportamiento del editor de Story o el preview Markdown del editor.
- Internacionalización.
- Cambios en el proceso principal, el preload, el dominio, los servicios, SQLite o las migraciones.
- Abrir el panel automáticamente cuando llegan datos de la Story; la expansión solo ocurre por `create/start` o por acción del usuario.

## Notas adicionales

### Cierre de las decisiones abiertas del informe

| # | Decisión | Cierre |
|---|---|---|
| 1 | Alcance temporal de «al crearse» | Durante el borrador y después de guardar, con la misma instancia. |
| 2 | Story que muestra el borrador | La del `StoryID` actual, actualizada desde `ArticleBand`. |
| 3 | Placeholder sin Story | `No source story yet` con una descripción, no un error. |
| 4 | Carga y error de Stories | Estados `loading` y `error` distintos de `missing`, con reintento en error. |
| 5 | Toggle durante la creación | Dentro de `StoryPane`, visible también en la franja minimizada. |
| 6 | Forma de minimizar | Franja de 40 px con el botón de restaurar, sin overlay. |
| 7 | Comportamiento en `xl` | Sin visibilidad forzada; el estado manda en todos los anchos. |
| 8 | Persistencia | Solo sesión, en el reducer; cada Article nuevo expandido; sin IPC. |
| 9 | Animación | Solo en la acción de toggle, 160–200 ms, reducida por `prefers-reduced-motion`. |
| 10 | Semántica del toggle | `aria-expanded` y nombre estable; cambio de contrato de tests aprobado. |
| 11 | Acciones del panel en creación | Solo lectura: sin abrir Story ni borrar; copiar solo con Story disponible. |
| 12 | `StoryID` vacío | Panel abierto con placeholder; no se muestra el mensaje de Story inexistente. |
| 13 | Continuidad tras guardar | Misma composición y misma instancia de `StoryPane`; el editor puede remontarse. |
| 14 | Markdown en el panel | Fuera de alcance; se mantiene `<pre>`. |
| 15 | Integración con ramas paralelas | Trabajar sobre la rama actual; coordinar `StoryPane` y `workspace-context` con `feat/delete-story` antes de fusionar. |

### Notas de implementación

- `feat/delete-story` toca `StoryPane` y el reducer del workspace; esta feature también. Conviene resolver la integración de ambas ramas en una ventana controlada para no perder el `storyId` explícito del diálogo de borrado.
- El nombre de la feature («better preview story») no implica renderizar Markdown. El alcance es la presencia, el estado y la minimización del panel.
- No se necesita un ADR nuevo: la decisión de estado sigue el ADR-0004 y la de tokens sigue el ADR-0007. La regla de entidad que nace con `storyID` y `title` (ADR-0005) no cambia.
- El panel de creación no muestra `Open story in editor` para no abrir una navegación que podría abandonar un borrador antes de su guardado diferido. Después de guardar, la acción vuelve.
- Si en el futuro se decide persistir la preferencia, deberá hacerse por Article y a través del proceso principal, no con `localStorage` bajo `file://`.
