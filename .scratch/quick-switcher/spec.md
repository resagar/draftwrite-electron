# Spec: Quick switcher (buscar y abrir Stories, Articles y Posts)

**Status:** ready-for-agent
**Fecha:** 2026-11-03
**Feature:** quick-switcher

---

## Problema

Encontrar una pieza concreta obliga hoy a cambiar de biblioteca en la sidebar y recorrer la columna de lista a ojo. La barra de título muestra un buscador deshabilitado con el texto *"Search stories and articles…"* y el `aria-label` *"not available yet"*, así que la app promete una búsqueda que no existe. Tampoco hay forma de saltar directamente a una Story, un Article o un Post desde el teclado.

La referencia que el usuario tiene en mente es el *quick switcher* de Obsidian y el buscador flotante de Inkdrop: una ventana que se abre con un atajo, muestra todo lo que hay y permite filtrar y abrir con las flechas y `Enter`.

Nota de vocabulario: en el dominio de este proyecto no existen "notas". Lo que se busca y se abre son tres entidades distintas —`Story`, `Article` y `Post`—, cada una con su identificador canónico (`Topic`, `Title`, `Topic`). La UI debe nombrarlas así.

## Solución

Un **quick switcher** de solo navegación:

- Se abre con `Cmd/Ctrl+K` o haciendo clic en la caja de búsqueda de la barra de título.
- Presenta una única lista con las tres colecciones, agrupadas por tipo (`Stories`, `Articles`, `Posts`) y ordenadas por `UpdatedAt` descendente.
- Cada fila muestra el identificador, el contexto cuando existe (el Article muestra de qué Story viene; el Post muestra su `PostState`), la fecha relativa y un preview del `Text`.
- Un input arriba filtra en vivo, sin distinguir mayúsculas ni tildes, con fuzzy matching sobre identificadores y tags y subcadena sobre el `Text`. Varios términos se combinan con AND.
- Las flechas mueven la selección sin wrap, `Home`/`End` saltan a los extremos, `Enter` o clic abren, `Escape` o clic fuera cierran.
- Abrir una entrada cambia la biblioteca activa, la selecciona, limpia el filtro de tag si ese filtro la ocultaría y pasa por el guard de borradores sin guardar.
- La paleta abre aunque alguna colección esté cargando o haya fallado; el grupo afectado muestra su estado y un botón de reintento.

Todo ocurre en el renderer. No hay cambios en `src/main`, IPC ni SQLite: las tres colecciones ya están cargadas en memoria en `LibraryProvider`.

## Historias de usuario

1. Como escritor, quiero abrir el quick switcher con `Cmd/Ctrl+K` desde cualquier punto de la app, para llegar a una Story, un Article o un Post sin usar el ratón.
2. Como escritor, quiero abrir el quick switcher haciendo clic en la caja de búsqueda de la barra de título, para descubrir la función sin memorizar atajos.
3. Como escritor, quiero ver al abrirlo todas mis Stories, Articles y Posts agrupados por tipo, para saber qué tengo sin cambiar de biblioteca.
4. Como escritor, quiero ver el `Topic` de cada Story en la lista, para reconocerla.
5. Como escritor, quiero ver el `Title` de cada Article y el `Topic` de la Story de la que viene, para no confundir artículos homónimos.
6. Como escritor, quiero ver el `Topic` de cada Post junto a su estado editorial, para distinguir pendientes, programados y publicados.
7. Como escritor, quiero ver la fecha relativa de actualización de cada entrada, para reconocer lo reciente.
8. Como escritor, quiero ver un preview del `Text` de cada entrada, para confirmar que es la pieza que busco.
9. Como escritor, quiero escribir en el input y ver los resultados filtrarse en vivo, para acotar la lista sin pulsar "buscar".
10. Como escritor, quiero que la búsqueda ignore mayúsculas y tildes, para encontrar "cancion" aunque el `Topic` diga "Canción".
11. Como escritor, quiero buscar por `Topic` de Story y por `Title` de Article, para encontrar por su identificador principal.
12. Como escritor, quiero buscar por `Tags` de Story, para llegar a un tema por su clasificación.
13. Como escritor, quiero buscar por los `Titles` candidatos de una Story, para encontrar un tema por un título alternativo.
14. Como escritor, quiero buscar por `Subtitle` y `Target` de un Article, para encontrar por su enfoque.
15. Como escritor, quiero buscar dentro del `Text` de las tres entidades, para encontrar una pieza por una frase que recuerdo.
16. Como escritor, quiero que buscar el `Topic` de una Story también encuentre sus Articles y Posts, para agrupar mentalmente todo lo derivado de un tema.
17. Como escritor, quiero poder escribir varios términos y que se exijan todos, para acotar con precisión.
18. Como escritor, quiero ver resaltados los caracteres que coinciden en el título o topic, para entender por qué apareció un resultado.
19. Como escritor, quiero mover la selección con `↑`/`↓` sin que dé la vuelta, y saltar al primero o al último con `Home`/`End`, para no perderme en listas largas.
20. Como escritor, quiero abrir la entrada seleccionada con `Enter`, para navegar solo con teclado.
21. Como escritor, quiero abrir una entrada con un clic, para usar el ratón cuando me apetezca.
22. Como escritor, quiero cerrar la paleta con `Escape` o haciendo clic fuera, para volver al editor sin cambiar nada.
23. Como escritor, quiero ver un mensaje claro cuando una búsqueda no tiene resultados, para saber que el término no existe y no que la app falló.
24. Como escritor, quiero ver un mensaje cuando todavía no tengo nada escrito, para saber que la paleta funciona aunque esté vacía.
25. Como escritor, quiero que la paleta abra mientras una colección carga, para no esperar a que termine todo.
26. Como escritor, quiero ver un aviso y un botón de reintento si una colección falló al cargar, para recuperarme sin cerrar la paleta.
27. Como escritor, quiero que al abrir una entrada se active su biblioteca y quede seleccionada en la columna, para mantener el contexto visual.
28. Como escritor, quiero que al abrir una entrada se limpie el filtro de tag solo si ese filtro la ocultaría, para no perder un filtro que no molesta.
29. Como escritor, quiero que abrir otra entrada con un borrador sin guardar me pregunte antes de descartarlo, para no perder texto por accidente.
30. Como escritor, quiero cancelar esa confirmación y quedarme donde estaba, para no perder el borrador.
31. Como escritor, quiero que la fila abierta quede visible en la lista de la izquierda, para confirmar de un vistazo qué se abrió.
32. Como escritor, quiero que al cerrar la paleta el foco vuelva a donde estaba, para seguir escribiendo sin tocar el ratón.
33. Como usuario de lector de pantalla, quiero que la paleta se anuncie como un combobox con la opción activa, para saber qué voy a abrir.
34. Como escritor, quiero que el atajo no abra la paleta encima de un diálogo de borrado o de "Leave without saving?", para no encadenar modales.
35. Como escritor, quiero que los atajos `N`, `S` y Zen no se disparen mientras la paleta está abierta, para que escribir en el input nunca cree o guarde algo por accidente.
36. Como usuario, quiero que la ventana de Settings no cambie, para que la búsqueda viva solo en la app principal.

## Decisiones de implementación

### Alcance y capas

- **Sin cambios en `src/main`, IPC ni SQLite.** `LibraryProvider` ya expone `stories`, `articles`, `posts`, los índices `storyById`/`articleById`/`postById` y los `reload*`. La paleta consume esos datos.
- **Sin nuevo concepto de dominio.** La paleta usa un view model local `SearchEntry`, no una entidad de dominio ni una entrada nueva en `GLOSSARY.md`. El glosario no cambia y "nota" sigue vetado.
- **Solo navegación.** No hay comandos, creación ni borrado desde la paleta. El diseño deja un módulo de búsqueda separado de la lista para que un futuro registro de comandos no lo rediseñe.

### View model y módulo de búsqueda

Módulo puro del renderer, sin React, que transforma las tres colecciones en entradas y resuelve consultas. Forma decision-rich:

```ts
type SearchEntry = {
  kind: 'story' | 'article' | 'post'
  id: string
  title: string
  context: string | null
  text: string
  tags: string[]
  state: PostState | null
  updatedAt: string
}

type SearchResult = {
  entry: SearchEntry
  score: number
  titleMatches: number[]
}
```

- `context` para un Article es el `Topic` de su Story; para un Post es su `PostState` legible; para una Story es `null`.
- `titleMatches` son los índices de caracteres del `title` que coinciden con la consulta, para resaltarlos.

**Normalización:** `trim`, minúsculas, descomposición NFD y eliminación de diacríticos. Se aplica a la consulta y a los campos indexables. Es una función pura y testeable.

**Consulta:** se parte por espacios en tokens; cada token debe coincidir en al menos un campo (AND). Sin operadores (`#tag`, `type:post` quedan fuera).

**Campos y algoritmo por entidad:**

| Entidad | Identificadores (fuzzy) | Contenido (subcadena) |
| --- | --- | --- |
| Story | `Topic`, cada `Title`, cada `Tag` | `Text` |
| Article | `Title`, `Subtitle`, `Target`, `Topic`/`Titles`/`Tags` de su Story | `Text` |
| Post | `Topic`, identificadores de la Story/Article que cita | `Text` |

**Ranking:** cada token puntúa por el mejor campo donde aparece, con peso mayor para identificadores que para tags, contexto y `Text`, y bonus por posición temprana. La puntuación de la entrada es la suma de sus tokens. Empate: `UpdatedAt` descendente; segundo empate: orden estable por tipo y `id`.

**Consulta vacía:** no filtra; devuelve todas las entradas agrupadas por tipo y ordenadas por `UpdatedAt` descendente, sin tope.

**Grupos:** orden fijo `Stories`, `Articles`, `Posts`. Un grupo sin resultados se omite. Si las tres colecciones están cargadas y vacías, se muestra el estado global vacío.

### Componente Quick switcher

- Componente propio, no reutiliza el ancho ni el centrado de `Modal`. Anclado arriba (≈12–15 % desde el borde superior), ancho ≈640 px, `max-h` ≈60 vh, input fijo arriba y resultados con scroll.
- Usa las clases y los tokens de diseño existentes; reutiliza `Kbd` para la leyenda del pie (`↑↓` navegar, `↵` abrir, `esc` cerrar).
- Patrón accesible **combobox + listbox**: el foco permanece siempre en el input; la opción activa se comunica con `aria-activedescendant`, `aria-expanded`, `aria-controls` y un `option` por fila con `aria-selected`. No se reutiliza `useOptionList`, cuyo roving tabindex robaría el foco del input e impediría escribir.
- Al abrir, el foco va al input. Al cerrar, vuelve al elemento que tenía el foco antes de abrir. `Escape` y clic en el overlay cierran.
- Teclado: `↑`/`↓` se clampan (sin wrap), `Home`/`End` van a los extremos, `Enter` abre la opción activa, `Tab` se mantiene dentro del diálogo para alcanzar los botones de reintento.
- Filas con el mismo lenguaje visual que `ListRowItem`: título con resaltado de coincidencias, badge de tipo, contexto, fecha relativa y preview del `Text` (sin snippet con contexto).

### Estado y navegación

- El estado de apertura (`quickSwitcherOpen`) es local al layout de la app; no entra en el reducer del workspace. `AppShell` y `TitleBar` reciben una prop `onSearch`.
- `use-shortcuts` gana un handler `onSearch` para `Cmd/Ctrl+K`. Se ignora si ya hay un diálogo de borrado o una navegación pendiente, o si la paleta ya está abierta.
- Mientras la paleta está abierta, los atajos globales `N`, `S` y Zen se suspenden.
- Abrir una entrada es **una sola acción** del reducer del workspace, con la forma:

```ts
| {
    type: 'entry/open'
    kind: 'story' | 'article' | 'post'
    id: string
    clearTagFilter: boolean
  }
```

  La acción fija `library` a la colección correspondiente, selecciona la entidad, limpia las otras dos selecciones, cancela cualquier `creating`, incrementa `editorSession` y pone `tagFilter` a `null` solo si `clearTagFilter` es `true`. Al ser una sola acción, el guard de borrador se dispara una vez y no a medias.

- `clearTagFilter` se calcula antes de navegar: `true` solo si hay `tagFilter` y la entrada no aparecería en su lista con ese filtro. Para un Post siempre es `false` (la lista de Posts no se filtra por tag). Un Article queda oculto si su Story no lleva el tag.
- La navegación se enruta por el hook de navegación existente, de modo que un borrador sin guardar abre la confirmación "Leave without saving?" y puede cancelarse sin cambiar la selección. La paleta se cierra antes de disparar la navegación.

### Barra de título

- El `<input type="search" disabled>` se sustituye por un botón con apariencia de campo de búsqueda: icono de lupa, texto "Search stories, articles and posts…" y un `Kbd` con el modificador de plataforma (`⌘ K` o `Ctrl K`).
- El botón abre la paleta con clic o teclado. Su `aria-label` incluye el atajo. El placeholder deja de prometer solo Stories y Articles y deja de decir "not available yet".

### Estados de carga, error y vacío

- La paleta se abre con cualquiera de los tres estados.
- Un grupo en `loading` muestra una fila de carga; uno en `error` muestra el aviso y un botón "Retry" que llama al `reload*` correspondiente.
- Grupo cargado y vacío con consulta vacía: se omite.
- Consulta con cero resultados: mensaje "No matches" con el término.
- Todas las colecciones cargadas y vacías: "Nothing to open yet" con una pista para crear.

### Visibilidad de la selección

- Cuando cambia la selección visible (incluida la que llega desde la paleta), la fila seleccionada de la columna debe quedar a la vista con `scrollIntoView({ block: 'nearest' })`.
- No se verifica la geometría en jsdom; se comprueba en la app Electron, según la regla del proyecto sobre tests de layout/scroll.

## Decisiones de testing

**Qué hace bueno a un test:** verifica comportamiento externo (lo que el usuario ve y hace), no detalles de implementación. No se testean nombres de funciones internas, estructuras de estado intermedias ni clases CSS.

**Seams (los mínimos posibles):**

1. **Módulo puro de búsqueda** — el seam más alto para toda la lógica de normalización, fuzzy, AND, ranking, agrupación y cálculo de `titleMatches`. Tests unitarios de tabla, sin React.
2. **Componente Quick switcher a través de la app** — integración con el harness `renderApp` y el fake port existente: abrir con atajo y con clic en la barra, escribir, flechas, `Enter`, `Escape`, estados y reintento. Es el mismo seam que usan los tests de autosave y de la app.
3. **Reducer del workspace** — unit test del nuevo `entry/open`: cambia `library`, selecciona, limpia las otras selecciones, respeta `clearTagFilter` y no toca `tagFilter` cuando no hace falta. Ya existe el archivo de tests del reducer.

**Prior art:** `data/library.test.ts` para funciones puras, `App.test.tsx` y `autosave-focus.test.tsx` para integración con fake port, `workspace-context.test.ts` para el reducer.

**Regresión:** no se modifican tests existentes para hacer pasar la implementación. El contrato IPC no cambia, así que sus tests siguen igual.

## Fuera de alcance

- Comandos y acciones en la paleta (crear, borrar, abrir Settings, alternar Zen).
- Operadores de consulta (`#tag`, `type:article`, `state:published`).
- Snippet del `Text` con la coincidencia resaltada.
- Búsqueda en la ventana de Settings.
- Búsqueda en `src/main` o en SQLite; no hay índice persistente.
- Virtualización o límite de resultados.
- Recordar la última consulta entre aperturas.
- Filtros por fecha, estado editorial o etiqueta desde la paleta.
- Crear entidades desde la paleta.
- Abrir la entidad fuente de un Article/Post desde su fila.
- Personalización del atajo.
- Búsqueda dentro de los `Titles` con ranking distinto al de `Topic` más allá del peso de identificador.

## Notas adicionales

- No se crea ADR: la decisión es reversible, no sorprendente y no cambia el modelo de dominio.
- La spec respeta los ADRs existentes: hexagonal (el renderer no importa dominio ni adapters), estado por contextos sin store global, y tokens de diseño de daisyUI.
- El trabajo deja tres piezas reutilizables: el view model `SearchEntry`, el matcher puro y el patrón combobox; un futuro registro de comandos puede reutilizar el matcher y la cáscara de diálogo.

---

## Refinamiento aprobado: divisores por tipo (2026-11-04)

**Status:** ready-for-agent

### Problema

Los encabezados por tipo se confunden visualmente con los resultados. Este refinamiento implementa únicamente la separación visual aprobada y los tres colores del research; no reabre el alcance funcional de la spec original.

### Solución

Diferenciar los encabezados de Stories, Articles y Posts con un color por tipo, una línea horizontal sutil y mayor separación entre grupos, conservando la densidad del primer grupo y la apariencia de las opciones.

### Historias de usuario

1. Como escritor, quiero reconocer el inicio de cada grupo para escanear los resultados rápidamente.
2. Como escritor, quiero identificar Story en dorado, Article en lavanda y Post en celeste para distinguir los tipos.
3. Como escritor, quiero mantener los nombres de tipo y una separación física para no depender exclusivamente del color.
4. Como escritor, quiero que el primer grupo no gane espacio superior para conservar el acceso inmediato a los resultados.
5. Como escritor, quiero distinguir la selección de los encabezados para saber qué abrirá Enter.
6. Como escritor, quiero conservar el filtrado, los estados y el recorrido de teclado para seguir usando el Quick Switcher como hasta ahora.

### Decisiones de implementación

- Modificar únicamente la presentación de los encabezados del componente Quick Switcher.
- Asignar clases estáticas completas: Story `text-accent`, Article `text-secondary`, Post `text-success`, sin reducir opacidad ni duplicar hexadecimales.
- Añadir una línea horizontal de 1 px mediante `border-line` y 4 px adicionales de separación entre grupos. No añadir separación superior antes del primer grupo visible, incluso si se omiten tipos anteriores por el filtro.
- Mantener el espaciado interno del primer encabezado. No añadir fondo de selección ni borde izquierdo coloreado a los encabezados.
- Mantener sin cambios etiquetas de resultados, roles y atributos ARIA, agrupación y orden, opciones seleccionadas, hover, foco, scroll y handlers de teclado.
- Consumir los tokens existentes conforme al ADR del tema; no cambiar paleta, dependencias, contratos, dominio ni persistencia.

### Decisiones de testing

- Fronteras de comprobación: Quick Switcher a través de la app para comportamiento, usando los tests existentes con fake port; componente renderizado en Electron/Chromium con datos sintéticos aislados para apariencia.
- Comprobar resultado visible y comportamiento externo; no añadir tests Jest que afirmen clases CSS o geometría en jsdom.
- Verificar los tres colores computados y contraste de texto de al menos 4.5:1 sobre el fondo real; los cálculos del research son 9.55:1, 7.47:1 y 9.19:1 respectivamente.
- Revisar tres grupos, filtro a un solo tipo, selección junto a un divisor, lista desplazable, títulos largos, zoom y estados de carga/error.
- Comprobar agrupación, etiquetas, flechas sin wrap, Home/End, Enter, Escape y foco con la cobertura existente y la validación de navegador pertinente.
- Ejecutar tests existentes relevantes, typecheck, lint y suite completa al final, además de revisar la implementación contra cada criterio del ticket.
- No usar perfiles ni datos reales para validación visual.

### Fuera de alcance

Fallo editorial de navegación de la sesión anterior, rediseño de resultados, búsqueda o ranking, nuevas interacciones, temas nuevos, migraciones, instalaciones, merge y push.

### Notas adicionales

Fuente: research de esta feature y alcance explícitamente aprobado en la conversación. Un único ticket completo cubre implementación y validación, sin dependencias ni prefactoring. La skill implement requiere un commit final convencional; no incluir atribución AI ni Co-Authored-By.
