# Spec: eliminar una Story desde su editor y desde la lista

**Status:** ready-for-agent
**Fecha:** 2026-10-20
**Feature:** delete-story
**Informe de investigación:** `research.md` (misma carpeta)

---

## Declaración del problema

Cuando el escritor abre una Story desde la biblioteca Stories, no encuentra ninguna acción para eliminarla. El único botón `Delete story` vive en el panel «Source story», que solo aparece al abrir un Article. La acción existe y funciona, pero está escondida en un flujo distinto al de la Story, así que para el escritor la interfaz de la Story no ofrece borrarla.

## Solución

Exponer `Delete story` en los dos lugares donde el escritor trabaja con Stories:

- En la banda del editor de la Story, cuando la Story ya existe.
- En cada fila de la lista de Stories.

Ambos disparadores abren el mismo diálogo de confirmación. El diálogo identifica la Story objetivo por su ID —no por la selección actual—, muestra su Topic, advierte que se borrarán también sus Articles y, al confirmar, elimina la Story en cascada, refresca las listas y limpia únicamente las selecciones que apuntan a esa Story. Cancelar no cambia nada.

## Historias de usuario

1. Como escritor, quiero ver una acción para eliminar la Story en su editor, para no tener que abrir un Article de esa Story.
2. Como escritor, quiero ver una acción para eliminar cada Story en su fila de la lista, para borrar sin abrirla primero.
3. Como escritor, quiero que ambas acciones abran el mismo diálogo de confirmación, para aprender un solo flujo.
4. Como escritor, quiero que el diálogo muestre el Topic de la Story que voy a borrar, para confirmar que es la correcta.
5. Como escritor, quiero que el diálogo advierta que se borrarán también los Articles de esa Story, para no perder contenido por sorpresa.
6. Como escritor, quiero que el diálogo me permita cancelar sin cambios, para arrepentirme antes de borrar.
7. Como escritor, quiero que cancelar deje intacta la Story y su editor, para seguir trabajando.
8. Como escritor, quiero que cancelar desde la lista no cambie la Story seleccionada, para no perder el contexto.
9. Como escritor, quiero que confirmar desde el editor borre la Story y cierre el editor, para volver a un estado coherente.
10. Como escritor, quiero que confirmar desde la lista borre la Story de esa fila, para no depender de haberla seleccionado antes.
11. Como escritor, quiero que el botón de una fila borre la Story de esa fila aunque haya otra seleccionada, para que la acción haga lo que parece hacer.
12. Como escritor, quiero que borrar una Story no seleccionada conserve la Story que estaba editando, para no perder mi trabajo.
13. Como escritor, quiero que borrar la Story seleccionada limpie la selección y muestre el estado vacío o la siguiente vista coherente, para no quedar mirando una Story inexistente.
14. Como escritor, quiero que borrar la Story de origen de un Article abierto cierre ese Article, para no quedar mirando contenido que ya no existe.
15. Como escritor, quiero que las Stories y los Articles se refresquen después de borrar, para que la lista refleje el cambio de inmediato.
16. Como escritor, quiero que al borrar la última Story la lista muestre `No stories yet`, para entender el estado resultante.
17. Como escritor, quiero que los Articles de la Story borrada desaparezcan también de la biblioteca de Articles, para no encontrar huérfanos.
18. Como escritor, quiero que la acción de borrar no aparezca mientras estoy creando una Story nueva, porque todavía no hay nada que borrar.
19. Como escritor, quiero que el botón del editor esté visible solo cuando la Story ya existe, para evitar acciones inválidas.
20. Como usuario de teclado, quiero poder llegar al botón de borrar de una fila sin activar la selección de esa fila, para borrar sin cambiar de contexto.
21. Como usuario de teclado, quiero que pulsar Enter o Espacio sobre el botón de borrar no seleccione la fila, para que el diálogo sea la única acción.
22. Como usuario de lector de pantalla, quiero que el botón del editor anuncie `Delete story`, para saber qué hace.
23. Como usuario de lector de pantalla, quiero que cada botón de fila incluya el Topic en su nombre accesible, para distinguir qué Story borra.
24. Como usuario de lector de pantalla, quiero que la lista siga exponiendo sus filas como opciones seleccionables, para conservar la navegación actual.
25. Como escritor, quiero que el botón de la fila sea visible y reconocible, pero discreto, para no competir con el título y la fecha.
26. Como escritor, quiero que el botón use el mismo icono y tratamiento visual que `Delete article`, para reconocerlo como una acción destructiva.
27. Como escritor, quiero que el foco y el hover del botón de fila sean claros, para saber qué voy a pulsar.
28. Como escritor, quiero que el botón de borrar del panel «Source story» siga funcionando, para no perder el flujo existente desde un Article.
29. Como escritor, quiero que el botón de `StoryPane` no abra un diálogo si la Story de origen ya no existe, para no quedar con un diálogo vacío.
30. Como escritor, quiero que un fallo al borrar se muestre dentro del diálogo, para saber que la Story sigue existiendo.
31. Como escritor, quiero que un fallo al borrar refresque las listas, para ver el estado real de la biblioteca.
32. Como escritor, quiero que borrar una Story que ya no existe sea inofensivo, para que un doble intento no muestre un error inesperado.
33. Como escritor, quiero que el diálogo se cierre con Escape, para descartar la acción sin usar el ratón.
34. Como escritor, quiero que borrar sea una acción sin deshacer y esté advertida como tal, para decidir con cuidado.
35. Como escritor, quiero que la interfaz siga en inglés, para mantener la consistencia con el resto de la app.
36. Como mantenedor, quiero que el borrado desde la lista y desde el editor compartan el mismo diálogo y la misma lógica de limpieza, para que no diverjan.
37. Como mantenedor, quiero que las selecciones se limpien solo cuando apuntan a la Story borrada, para no cerrar editores no relacionados.
38. Como mantenedor, quiero que el cambio se limite al renderer, sin tocar dominio, IPC, preload ni base de datos, porque el backend ya está completo.
39. Como mantenedor, quiero que el comportamiento quede cubierto por tests de integración de la App, para detectar regresiones en el flujo completo.
40. Como mantenedor, quiero que los tests existentes de borrado de Article y de navegación por teclado sigan pasando sin modificarse, para conservar el contrato actual.

## Decisiones de implementación

### Alcance

- El cambio es exclusivamente de renderer: estado del workspace, componentes de la Story y de la lista, y tests.
- No se modifican dominio, servicios, repositorios, SQLite, migraciones, contrato IPC, preload ni `DataPort`: el borrado de Story y la cascada de Articles ya están implementados y probados.
- No se modifica el flujo de borrado de Article ni el diálogo «Leave without saving?».
- Se conserva el botón `Delete story` del panel «Source story».

### Diálogo con Story objetivo explícita

- El diálogo deja de inferir la Story desde `useStoryInContext` o desde la selección actual. El estado del workspace suma un identificador de Story objetivo mientras el diálogo `delete-story` está abierto.
- La acción de abrir el diálogo acepta opcionalmente ese identificador; `dialog/close` lo limpia. El diálogo de Article mantiene su comportamiento actual.
- `App` resuelve la Story objetivo con `storyById(dialogStoryId)`. Si la Story ya no existe, el diálogo no se renderiza y no se borra nada.
- Todos los disparadores del diálogo `delete-story` deben pasar el ID: el botón del editor, el botón de cada fila y el botón de `StoryPane`.
- Esta decisión es necesaria para que el botón de una fila borre esa fila y no la Story seleccionada, y para no cambiar la selección ni disparar el guard de drafts antes de que el escritor confirme.

### Acción en el editor de la Story

- `StoryBand` recibe una acción de borrado y la renderiza como `IconButton` con `Trash2`, `aria-label` y `title` `Delete story`.
- El botón aparece en el extremo derecho de la fila del Topic, en el mismo slot donde hoy aparece `Discard` mientras se crea.
- El botón se renderiza solo cuando `creating === false`. Al crear una Story no hay ID que borrar.
- `StoryEditor` conecta la acción con la apertura del diálogo, pasando el ID de la Story almacenada.
- No se agrega un botón de texto ni se cambia el layout de la banda más allá de ese slot.

### Acción en la lista de Stories

- Cada fila expone un botón `Delete story` independiente del elemento seleccionable.
- Para no anidar un control interactivo dentro de un `role="option"`, la fila se estructura como un contenedor de presentación con dos hermanos:
  - el elemento seleccionable que conserva `role="option"`, el `tabIndex` móvil, el foco y el clic de selección;
  - el botón de borrar, posicionado a la derecha.
- El hook compartido de navegación de opciones se adapta para aceptar como elemento enfocable un `HTMLElement`, sin cambiar su comportamiento de teclado ni afectar a la lista de Articles.
- El botón de la fila no selecciona la Story ni navega: solo abre el diálogo con el ID de esa fila.
- El botón consume sus propios eventos de teclado para que Enter, Espacio, las flechas o Inicio/Fin no activen la opción de la lista mientras el foco está en él.
- El nombre accesible del botón de fila incluye el Topic de la Story, por ejemplo `Delete story “Calm software”`, para que varias filas no compartan un nombre ambiguo.
- El botón se muestra de forma discreta en reposo y se resalta en hover y foco, con el mismo icono `Trash2` y el mismo tratamiento destructivo que `Delete article`.
- El contenido de la opción reserva espacio a la derecha para que el botón no tape el título, la fecha, el extracto ni los tags.
- No se agrega un menú contextual, un botón de kebab ni una acción de borrado múltiple.

### Limpieza después de borrar

- Al confirmar, se llama a `deleteStory` con el ID objetivo.
- Al resolverse con éxito:
  - se cierra el diálogo;
  - se limpia `selectedStoryId` solo si coincide con el ID borrado;
  - se limpia `selectedArticleId` solo si el Article abierto pertenece a la Story borrada;
  - se recargan las listas de Stories y Articles;
  - las selecciones no relacionadas se conservan.
- Si la Story borrada era la seleccionada, el editor se desmonta y la vista pasa al estado vacío o a la selección restante.
- Si el Article abierto pertenecía a la Story borrada, su selección se limpia porque el Article ya no existe.
- Si el borrado falla, el diálogo permanece abierto, muestra el error existente y se recargan ambas listas para reflejar el estado real.
- El borrado sigue siendo idempotente: un ID inexistente no produce error de dominio.

### Navegación, drafts y autosave

- Abrir el diálogo desde la lista o desde el editor no pasa por el guard de navegación: no cambia la selección, no desmonta editores y no adelanta escrituras antes de la confirmación.
- Si hay un draft inválido en otra Story, borrar una Story distinta no muestra «Leave without saving?».
- Si se borra la Story que se está editando, el diálogo de confirmación es la única advertencia; al confirmar, el draft se descarta junto con la Story.
- La carrera conocida entre el autosave pendiente y el borrado queda fuera de alcance y se documenta como riesgo: si se borra dentro de la ventana de 700 ms posterior a una edición, el desmontaje puede enviar un `updateStory` después del `deleteStory`. No corrompe datos ni resucita la Story, pero puede producir un `errNotFound` en un editor ya desmontado.

### Idioma y estilo

- Los textos de UI nuevos o reutilizados van en inglés, como el resto de la interfaz.
- Los identificadores nuevos van en inglés.
- Se reutilizan los tokens de diseño del tema; no se declaran colores nuevos.

## Decisiones de testing

### Seam

- **Un solo seam: integración a nivel de App.** Se renderiza la app completa con el fake del `DataPort` y se interactúa con roles accesibles, como en los tests actuales de borrado, creación y atajos.
- No se crean tests de componente para `StoryBand` o `StoryList` ni tests unitarios del estado del diálogo: el comportamiento observable queda cubierto por el seam de App.
- No se agregan tests de backend: el borrado, la cascada y la idempotencia ya están cubiertos por los tests de servicio, repositorio SQLite y bootstrap.

### Qué hace bueno a un test

- Verifica comportamiento externo observable: presencia y nombre accesible del botón, texto del diálogo, Story objetivo, llamadas al fake, selección resultante, región visible y estado vacío.
- No verifica detalles de implementación: nombres de acciones internas, forma exacta del estado, clases CSS ni estructura del DOM más allá de los roles accesibles.
- No modifica tests existentes para hacer pasar la implementación. Si un test existente falla, se investiga como regresión.
- Usa los helpers, fábricas y el fake port ya disponibles.
- Delimita las búsquedas con `within` cuando hay varios botones con el mismo nombre: el botón del editor, los de las filas y el de `StoryPane` comparten la etiqueta base.

### Casos a cubrir

- El editor muestra `Delete story` cuando la Story está almacenada y no lo muestra al crear una Story nueva.
- Confirmar desde el editor borra la Story, cierra el editor y actualiza la lista.
- Cancelar desde el editor no llama a `deleteStory` y deja la Story y el editor intactos.
- Confirmar desde la lista borra la Story de esa fila aunque haya otra Story seleccionada.
- El diálogo abierto desde una fila muestra el Topic de esa fila, no el de la Story seleccionada.
- Borrar una Story no seleccionada conserva la selección y el editor de la otra Story.
- Borrar la Story seleccionada limpia la selección y muestra el estado vacío cuando era la única.
- Borrar la Story de origen de un Article abierto limpia la selección del Article.
- Los Articles de la Story borrada desaparecen de la biblioteca de Articles.
- Al borrar la última Story, la lista muestra `No stories yet`.
- Un fallo de `deleteStory` muestra el error del diálogo, mantiene la Story y recarga las listas.
- Cancelar con Escape cierra el diálogo sin borrar.
- Un Enter o Espacio sobre el botón de una fila no selecciona la fila ni cambia el editor.
- Los botones de las filas tienen nombres accesibles distinguibles por Topic.
- Los tests existentes de navegación por teclado de la lista siguen pasando sin cambios.
- Los tests existentes de borrado de Article y de `StoryPane` siguen pasando sin cambios.

### Prior art

- El bloque de tests de borrado de Article y de Story desde `StoryPane`.
- El bloque de tests del editor de Story, incluida la escritura diferida y el guard de drafts.
- Los tests de navegación por teclado de las listas con `role="option"`.
- Los tests de creación contextual que usan el fake port y roles accesibles.

### Validación

- Ejecutar la suite completa de Jest.
- Ejecutar el typecheck de main/preload y renderer.
- Ejecutar el lint.
- No se aceptan tests existentes modificados para acomodar la implementación.

## Fuera de alcance

- Corregir la carrera entre el autosave pendiente y el borrado; solo se documenta.
- Deshacer, papelera o borrado lógico.
- Borrado múltiple o selección múltiple.
- Atajo de teclado para borrar.
- Menú contextual o botón de kebab en la lista.
- Cambiar el diálogo de borrado de Article para que también reciba un ID explícito.
- Cambiar la semántica de la cascada o el contrato IPC.
- Cambios en dominio, servicios, repositorios, SQLite, migraciones, preload o `DataPort`.
- Cambiar el orden, los filtros o la navegación de la lista.
- Restauración de foco después de desmontar el editor.
- Internacionalización.
- Cambios visuales en el panel «Source story» más allá de pasar el ID y deshabilitar el botón cuando no hay Story.
- Persistir el estado del diálogo o la selección entre sesiones.

## Notas adicionales

- El informe de investigación de esta carpeta contiene la evidencia por capa, las referencias de línea y el historial de git que respaldan el diagnóstico.
- La causa raíz no es una regresión: el port del frontend introdujo el borrado solo en el panel «Source story»; nunca existió en el editor de Story ni en la lista.
- La rama actual no tenía commits por delante de `main` al iniciar este trabajo.
- El usuario eligió explícitamente los dos disparadores (editor y lista), el seam único de integración de App y dejar la carrera de autosave documentada fuera de alcance.
- El diálogo ya advierte que se borran los Articles y que la acción no se puede deshacer; no hace falta cambiar el texto salvo usar el Topic de la Story objetivo.
- El botón de `StoryPane` debe deshabilitarse cuando la Story de origen no existe, para no abrir un diálogo sin objetivo.
- Los nombres accesibles repetidos obligan a que los tests nuevos usen `within` y a que el botón de cada fila incluya el Topic.
- No hay cambios de esquema, migraciones ni contrato IPC.
