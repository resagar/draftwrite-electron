# Spec: lista reutilizable y borrado de Article desde su fila

**Status:** ready-for-agent
**Fecha:** 2026-10-20
**Feature:** reusable-list
**Informe de investigación:** `research.md` (misma carpeta)

---

## Declaración del problema

El escritor puede borrar una Story desde su fila en la lista de Stories, pero no puede borrar un Article desde la lista de Articles: tiene que abrir el Article y usar el botón del header. La acción existe, pero está escondida en otro flujo.

Replicar el patrón copiando la fila de Stories duplicaría el listbox, el roving tabindex, el `role="option"` y el botón hermano. Esa estructura concentra reglas de accesibilidad y ya está duplicada en el armazón de las dos listas, así que una copia invita a que las dos versiones se desincronicen.

Además, el diálogo de borrado de Article resuelve el objetivo con el Article seleccionado, no con el Article que originó la acción. Un botón en una fila no seleccionada borraría el Article abierto o no abriría nada. Por eso el borrado por fila no es una copia automática: necesita un objetivo explícito y una limpieza selectiva.

## Solución

Extraer un componente de lista interactiva reutilizable, `OptionList`, que ambas listas usen para el listbox, la fila seleccionable y el slot de acción. El contenido de la fila sigue saliendo de `ListRowItem`; las diferencias de cada entidad —estado vacío, cabecera, creación, filtrado y borrado— siguen viviendo en su lista.

Migrar la lista de Stories al componente compartido sin cambiar su comportamiento. Migrar la lista de Articles al mismo componente y añadir en cada fila una acción `Delete article` que abra el diálogo de confirmación apuntando al Article de esa fila.

El diálogo de borrado de Article pasa a recibir un objetivo explícito y deja de depender de la selección. Al confirmar, se borra ese Article, se limpia la selección solo si el Article borrado era el seleccionado, se conservan las selecciones no relacionadas y se recargan ambas listas. El borrado sigue siendo una acción sin deshacer, advertida en el diálogo.

## Historias de usuario

1. Como escritor, quiero ver una acción para borrar cada Article en su fila de la lista, para borrar sin abrir el Article primero.
2. Como escritor, quiero que la acción de borrar de una fila apunte al Article de esa fila, para que borre lo que parece borrar.
3. Como escritor, quiero poder borrar un Article no seleccionado mientras otro Article está abierto, para no perder el contexto de lo que estoy editando.
4. Como escritor, quiero que borrar un Article no seleccionado conserve el Article abierto y su editor, para seguir trabajando sin interrupciones.
5. Como escritor, quiero que borrar el Article seleccionado limpie la selección y cierre su editor, para no quedar mirando contenido que ya no existe.
6. Como escritor, quiero que al borrar el último Article la lista muestre `No articles yet`, para entender el estado resultante.
7. Como escritor, quiero que al borrar el último Article visible de un filtro la lista muestre el estado de filtro vacío, no el de biblioteca vacía, para distinguir ambos casos.
8. Como escritor, quiero que el diálogo muestre el título del Article de la fila, para confirmar que es el correcto.
9. Como escritor, quiero que el diálogo siga advirtiendo que la acción no se puede deshacer, para decidir con cuidado.
10. Como escritor, quiero que cancelar o pulsar Escape cierre el diálogo sin borrar ni cambiar la selección, para arrepentirme sin consecuencias.
11. Como escritor, quiero que un fallo al borrar muestre el error dentro del diálogo y mantenga el Article, para saber que sigue existiendo.
12. Como escritor, quiero que un fallo al borrar refresque las listas, para ver el estado real de la biblioteca.
13. Como escritor, quiero que borrar un Article refresque la lista de Articles, para que la fila desaparezca de inmediato.
14. Como escritor, quiero que borrar un Article no borre su Story ni otros Articles de esa Story, para no perder contenido no relacionado.
15. Como escritor, quiero que borrar un Article mientras estoy creando otro Article no cancele el borrador en curso, para no perder lo que estoy escribiendo.
16. Como escritor, quiero que borrar el Article que estoy editando sea la única advertencia sobre sus cambios pendientes, para no recibir dos diálogos contradictorios.
17. Como escritor, quiero que la acción de borrar no aparezca mientras estoy creando una Story nueva, para no ofrecer una acción sobre algo que todavía no existe.
18. Como escritor, quiero que la fila del Article siga mostrando título, fecha y extracto como hasta ahora, para no cambiar mi forma de escanear la lista.
19. Como escritor, quiero que la fila del Article no muestre los Tags de su Story como si fueran Tags del Article, para no confundir la procedencia con una propiedad del Article.
20. Como escritor, quiero que la acción de borrar sea visible pero discreta, para encontrarla sin que compita con el título y la fecha.
21. Como escritor, quiero que la acción de borrar use el mismo tratamiento destructivo que las otras acciones de borrado, para reconocerla como peligrosa.
22. Como escritor, quiero que la acción de borrar no tape el título, la fecha, el extracto ni ningún otro contenido de la fila, para poder leer la fila completa.
23. Como escritor, quiero que pulsar la acción de borrar no seleccione la fila ni navegue a ella, para que el diálogo sea la única acción.
24. Como usuario de teclado, quiero llegar al botón de borrar de una fila con Tab, para borrar sin usar el ratón.
25. Como usuario de teclado, quiero que Enter o Espacio sobre el botón de borrar abran el diálogo sin seleccionar la fila, para que la acción sea predecible.
26. Como usuario de teclado, quiero que las flechas, Inicio y Fin sobre el botón de borrar no muevan el foco de la lista, para no perder la posición.
27. Como usuario de teclado, quiero que la lista siga teniendo un único punto de tabulación entre sus opciones, para no tener que tabular por cada fila.
28. Como usuario de teclado, quiero que la lista siga siendo alcanzable con Tab después de filtrar o borrar una fila, para no quedar atrapado fuera de ella.
29. Como usuario de lector de pantalla, quiero que el botón de borrar anuncie el título del Article, para saber qué Article voy a borrar.
30. Como usuario de lector de pantalla, quiero que el nombre del botón distinga Articles con el mismo título en Stories distintas, para no borrar el equivocado.
31. Como usuario de lector de pantalla, quiero que la fila siga exponiendo `role="option"` y su estado de selección, para conservar la navegación actual.
32. Como usuario de lector de pantalla, quiero que el botón de borrar sea un control independiente, no un descendiente presentacional de la opción, para que se anuncie correctamente.
33. Como mantenedor, quiero que las dos listas compartan el mismo listbox, la misma fila seleccionable y el mismo slot de acción, para no duplicar reglas de accesibilidad.
34. Como mantenedor, quiero que agregar una acción a una fila sea declarativo, para que la paridad entre Stories y Articles no dependa de copiar markup.
35. Como mantenedor, quiero que el contenido de la fila siga siendo un componente compartido, para que el formato de título, fecha y extracto no se duplique.
36. Como mantenedor, quiero que el estado vacío, la cabecera, la creación y el filtrado sigan siendo de cada lista, para no esconder diferencias reales detrás de un componente genérico.
37. Como mantenedor, quiero que el diálogo de borrado reciba un objetivo explícito y tipado, para que no exista un estado `delete-article` sin Article.
38. Como mantenedor, quiero que borrar un Article limpie la selección solo si coincide con el Article borrado, para no cerrar editores no relacionados.
39. Como mantenedor, quiero que borrar un Article no toque el estado de creación, para no cancelar un borrador en curso.
40. Como mantenedor, quiero que el botón del header del Article también pase su ID, para que el contrato sea el mismo en todos los disparadores.
41. Como mantenedor, quiero que el borrado de Story desde la fila y desde el editor siga funcionando igual, para no introducir una regresión en el flujo ya entregado.
42. Como mantenedor, quiero que el cambio se limite al renderer, sin tocar dominio, IPC, preload ni base de datos, porque `deleteArticle` ya existe.
43. Como mantenedor, quiero que la suite de tests existente siga siendo el contrato y no se modifique para acomodar la implementación.
44. Como mantenedor, quiero que el componente compartido tenga tests enfocados de su contrato de accesibilidad, para no duplicar esas aserciones en las dos listas.
45. Como mantenedor, quiero que el flujo completo de borrado de Article se pruebe en el seam de integración de App, para detectar regresiones de estado y selección.
46. Como mantenedor, quiero que la lista siga funcionando con el filtro por Tags de la Story, para no cambiar el significado del filtro de Articles.
47. Como mantenedor, quiero que la acción de borrar no introduzca un menú contextual, un kebab ni selección múltiple, para mantener el alcance pequeño.
48. Como mantenedor, quiero que el foco no quede fuera de la lista cuando la cantidad de filas disminuye, para conservar la accesibilidad existente.

## Decisiones de implementación

### Alcance

- El cambio es exclusivamente de renderer: componentes de lista, estado del workspace, `App`, header del Article y tests.
- No se modifican dominio, servicios, repositorios, SQLite, migraciones, contrato IPC, preload ni `DataPort`. El borrado de Article ya está implementado y es idempotente.
- No se agregan dependencias.
- Se respetan ADR-0004 (estado del frontend sin store global) y ADR-0007 (tokens del tema, sin colores nuevos).

### Componente de lista compartido

- Se crea un componente `OptionList` genérico y presentacional. Su responsabilidad es el listbox y la fila interactiva, no la carga de datos ni el estado de la pantalla.
- Recibe: una etiqueta accesible, la colección de elementos, una función para obtener el ID, el ID seleccionado, la acción de selección, una función de contenido de fila y una función opcional de acción por fila.
- El contenido se delega a `ListRowItem` o al render que pase cada lista. `OptionList` no conoce Story ni Article.
- La acción por fila se renderiza en un slot hermano del elemento `role="option"`, posicionado a la derecha. El slot reserva espacio solo cuando hay acción.
- `OptionList` siempre estructura la fila como un contenedor de presentación con la opción y, si existe, la acción. No anida controles interactivos dentro de la opción.
- `OptionList` no decide loading, error, empty, cabecera, creación, filtrado, diálogos, cascada ni limpieza de selección.
- `ListColumn`, `ListEmpty`, `ListRowItem`, `SortToggle` y `IconButton` se mantienen como piezas separadas. No se crea un `LibraryList` monolítico.
- La lista de Stories se migra primero para demostrar paridad; después se migra la lista de Articles.

### Contenido de la fila

- `ListRowItem` sigue siendo el componente de contenido compartido: título, fecha relativa, extracto y Tags opcionales.
- La fila de Story pasa Topic y Tags; la fila de Article pasa Title y no pasa Tags, porque el Article no tiene Tags y el filtro de Articles usa los Tags de su Story.
- No se agregan Subtitle ni Target a la fila de Article en este alcance.

### Acción de borrado en la fila de Article

- Cada fila de Article expone una acción `Delete article` con el mismo patrón visual y de teclado que `Delete story`.
- La acción usa el tono destructivo del tema y es visible en reposo, no solo en hover o foco.
- El nombre accesible incluye el título del Article y, para desambiguar títulos repetidos entre Stories, el Topic de la Story de origen. Si la Story no está disponible, se usa solo el título.
- El botón usa el mismo icono de papelera y el mismo tratamiento que las otras acciones de borrado.
- Al pulsarla, se abre el diálogo de confirmación del Article de esa fila. No selecciona la fila ni navega.
- El botón no se anida dentro de `role="option"`; es un control hermano.
- La opción reserva espacio a la derecha para que la acción no tape el contenido.
- No se agrega un menú contextual, un botón kebab, borrado múltiple ni atajo de teclado.

### Objetivo explícito del diálogo

- El estado del workspace deja de modelar el diálogo como un tipo más un `storyId` opcional. Pasa a modelar un objetivo discriminado con dos variantes: `delete-story` con `storyId` y `delete-article` con `articleId`.
- Abrir el diálogo exige la variante y el ID correspondiente. No existe un `delete-article` sin Article.
- El reducer guarda el objetivo completo y lo limpia al cerrar. No quedan IDs paralelos nullable que puedan desincronizarse.
- `App` resuelve el objetivo con `storyById` o `articleById`, que buscan en la biblioteca completa y no en la lista filtrada.
- Si el objetivo ya no existe, el diálogo no se renderiza y no se borra nada. No se usa la selección actual como fallback.
- El mensaje y el ID que se borra salen del mismo objetivo resuelto.
- El botón del header del Article también pasa su ID; su comportamiento visible no cambia.
- Los disparadores de Story existentes se adaptan a la nueva forma del objetivo.

### Limpieza y estados después de borrar

- Al confirmar el borrado de un Article, se despacha una acción `article/deleted` con el ID borrado.
- `article/deleted` limpia `selectedArticleId` solo si coincide con el ID borrado y no modifica `creating` ni `creatingStoryId`.
- No se reutiliza `article/select` con `null`: esa acción también limpia el estado de creación y cancelaría un borrador en curso.
- No se limpia `selectedStoryId` al borrar un Article; la Story sigue siendo un contexto válido.
- Si el Article borrado era el seleccionado y no había creación, el workspace cae en la Story seleccionada o en el estado vacío, según corresponda.
- Si el Article borrado no era el seleccionado, el editor abierto y su selección se conservan.
- Después del éxito se recargan ambas listas y se cierra el diálogo.
- Si el borrado falla, el diálogo permanece abierto, muestra el error y se recargan ambas listas; no se limpia la selección.
- Si el Article borrado era el último visible de un filtro, el estado vacío debe ser el de filtro, no el de biblioteca vacía.

### Interacción con la creación

- Abrir el diálogo desde una fila no pasa por el guard de drafts: no cambia la selección ni desmonta editores.
- Si se borra una fila no seleccionada mientras hay un borrador, el borrador sigue intacto.
- Si se borra el Article seleccionado mientras se está creando otro Article, `article/deleted` limpia la selección pero conserva la creación.
- La carrera entre autosave y borrado del Article abierto queda fuera de alcance y se documenta como riesgo conocido, igual que en el borrado de Story.

### Teclado y foco

- La acción por fila no debe activar la opción: su `keydown` no puede llegar al manejador del listbox.
- Se centraliza la protección en el componente compartido: el listbox ignora los eventos cuyo objetivo no esté dentro de una opción. Así el botón conserva su comportamiento nativo y no se repite `stopPropagation` por acción.
- El modelo de roving tabindex se mantiene: exactamente una opción tiene `tabIndex=0`.
- Cuando la cantidad de elementos disminuye por filtro o borrado, el índice activo se ajusta al rango válido. Si la lista queda vacía, se reinicia. La lista nunca debe quedar sin ningún `tabIndex=0` mientras tenga opciones.
- La activación por Enter o Espacio usa el elemento del índice activo, con guarda para no acceder a un elemento inexistente.
- No se restaura el foco al cerrar el diálogo en este alcance; el comportamiento actual de `Modal` se mantiene y se documenta como deuda de accesibilidad.
- El tamaño del objetivo de la acción (~22×22 px) no se cambia en este alcance; queda como deuda de accesibilidad separada.

### Diferencias que se conservan

- La lista de Stories mantiene su estado vacío y su acción `New Story`.
- La lista de Articles mantiene sus cuatro variantes de estado vacío, la guarda `No story yet` y el botón `New Article` deshabilitado sin Story.
- Cada lista conserva su cabecera y su lógica de creación.
- El filtrado de Articles sigue usando los Tags de la Story de origen.
- La limpieza del filtro conserva su comportamiento actual en cada lista; no se unifica el uso de navegación con guard de drafts.
- El contador sigue mostrando la longitud visible, no el total de la biblioteca.

### Accesibilidad y estilo

- La fila sigue exponiendo `role="option"`, `aria-selected` y el foco móvil.
- La acción por fila conserva su rol nativo de botón, su nombre accesible y su `title`.
- El nombre accesible del borrado de Article incluye el título y, cuando está disponible, el Topic de la Story.
- El botón del header del Article pasa a usar el tono destructivo para ser consistente con las acciones de fila y de Story.
- Solo se usan tokens semánticos del tema; no se declaran colores nuevos.
- La acción es visible en reposo y tiene foco visible; no se oculta solo en hover.

## Decisiones de testing

### Seams

- **Seam principal, existente:** integración a nivel de `App` con `renderApp` y el fake del `DataPort`. Cubre el flujo completo: fila, diálogo, objetivo, borrado, selección, refresco, error y teclado.
- **Seam nuevo, acotado:** tests de componente de `OptionList` con Testing Library. Cubre el contrato reutilizable de listbox, roving tabindex, fila y slot de acción.
- No se crea un seam nuevo para el reducer ni para el hook de opciones. Su comportamiento se observa desde `App` y desde `OptionList`.
- Los tests de `OptionList` evitan repetir las mismas aserciones de accesibilidad en las dos listas; la integración de `App` sigue siendo la que prueba el comportamiento de cada entidad.
- jsdom no sintetiza el `click` nativo de un `<button>` a partir de Enter o Espacio. Por eso la integración de `App` verifica que la acción sea un botón nativo y que su click abra el diálogo sin cambiar la selección; el contrato de teclado se prueba en `OptionList`.

### Qué hace bueno a un test

- Verifica comportamiento externo observable: roles accesibles, nombres, selección, texto del diálogo, llamadas al fake, región visible y estado vacío.
- No verifica detalles de implementación: nombres de acciones internas, forma exacta del estado, clases CSS ni estructura del DOM más allá de las relaciones de accesibilidad que son contrato (por ejemplo, que la acción no sea descendiente de la opción).
- No modifica tests existentes para hacer pasar la implementación. Si un test existente falla, se investiga como regresión.
- Usa `within` cuando hay varios botones con el mismo nombre base.
- Delimita las búsquedas por rol y nombre accesible, no por posición.

### Casos de `OptionList`

- Renderiza un listbox con nombre accesible y N opciones.
- Marca `aria-selected` correctamente.
- Mantiene exactamente una opción con `tabIndex=0`.
- ArrowDown, ArrowUp, Home y End mueven el foco de la opción.
- Enter y Espacio llaman a la selección con el elemento correcto.
- Un clic en la acción no selecciona la fila.
- Enter, Espacio, ArrowDown, ArrowUp, Home y End sobre la acción no seleccionan la fila ni mueven el foco de la lista; el foco permanece en la acción.
- La acción no es descendiente de la opción.
- Sin acción no se renderiza botón de acción.
- Al rerenderizar con menos elementos, sigue habiendo exactamente una opción con `tabIndex=0` y la activación no rompe.
- Al vaciar la lista y volver a poblarla, la primera opción recupera `tabIndex=0`.

### Casos de integración de `App`

- Con dos Articles que comparten título en Stories distintas, los botones de fila son distinguibles por nombre accesible e incluyen el Topic de su Story.
- Abrir un Article A y borrar la fila B: el diálogo muestra B, se borra B, A sigue seleccionado y su editor sigue abierto.
- Borrar la fila del Article seleccionado: la selección se limpia, el editor se desmonta y, si era el último, aparece `No articles yet`.
- Cancelar o Escape: no se llama a `deleteArticle`, se conserva la selección y el editor.
- La acción de una fila es un botón nativo y su click abre el diálogo sin seleccionar la fila. En jsdom el click nativo no se sintetiza desde `keydown`; la cobertura de Enter, Espacio, flechas, Inicio y Fin vive en `OptionList`.
- Fallo de `deleteArticle`: aparece `role="alert"`, la fila sigue, el Article abierto sigue y las listas se recargan.
- Borrar el Article seleccionado mientras se crea otro Article: la creación sigue montada y el borrado se ejecuta.
- Borrar el último Article visible de un filtro, aunque sea el último de la biblioteca: se muestra el estado de filtro vacío.
- El botón del header del Article sigue borrando el Article abierto sin cambios observables.
- El borrado de Story desde la fila y desde el editor sigue pasando sin cambios.
- Los nombres accesibles de los botones de fila incluyen el título y, cuando hay Story, el Topic.

### Prior art

- Los tests de borrado de Story desde la fila y desde el editor, incluidos selección no relacionada, cascada, error y teclado.
- Los tests de navegación por teclado de la lista de Stories.
- Los tests de filtro por Tags de la Story en la lista de Articles.
- Los tests de creación de Article y de la guarda `No story yet`.
- Los tests de borrado de Article desde el header.

### Validación

- Ejecutar la suite completa de Jest.
- Ejecutar `pnpm typecheck`.
- Ejecutar `pnpm lint`.
- No se aceptan tests existentes modificados para acomodar la implementación.
- No se agregan tests de backend: el borrado y la idempotencia ya están cubiertos.

## Fuera de alcance

- Cambios en dominio, servicios, repositorios, SQLite, migraciones, contrato IPC, preload o `DataPort`.
- Deshacer, papelera o borrado lógico.
- Borrado múltiple o selección múltiple.
- Menú contextual, botón kebab o atajo de teclado para borrar.
- Cambiar la semántica de la cascada Story → Articles.
- Cambiar el diálogo de borrado de Story más allá de adaptarlo al objetivo discriminado.
- Mostrar Subtitle, Target o Tags de la Story en la fila de Article.
- Unificar el estado vacío, la cabecera o la creación de las dos listas.
- Unificar la limpieza del filtro con o sin guard de drafts.
- Restauración de foco al cerrar el diálogo.
- Corrección del tamaño de objetivo de 24×24 px.
- Corrección de la carrera entre autosave y borrado.
- Persistir el estado del diálogo o la selección entre sesiones.
- Internacionalización.

## Notas adicionales

- El informe `research.md` contiene la evidencia por archivo y línea, el análisis de duplicación y los riesgos.
- El baseline es `main` en `269d976`, con 267 tests, typecheck y lint verdes.
- `Article.Title` es único solo por Story; `Story.Topic` es único en todo el sistema. Por eso el nombre accesible del borrado de Article incluye el Topic cuando está disponible.
- El backend de borrado de Article ya existe y es idempotente; este trabajo no lo modifica.
- El borrado de Story ya usa un objetivo explícito y limpieza selectiva; esta feature extiende el mismo patrón a Article.
- No hay conflicto con ADR-0002, ADR-0003, ADR-0004 ni ADR-0007.
- La abstracción no pretende eliminar todas las diferencias entre las listas: comparte la interacción y deja explícitas las reglas de cada entidad.
