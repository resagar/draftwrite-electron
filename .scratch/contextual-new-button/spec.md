# Spec: botón contextual «New Story» / «New Article» en el sidebar

**Status:** ready-for-agent
**Fecha:** 2026-10-19
**Feature:** contextual-new-button
**Informe de investigación:** `research.md` (misma carpeta)

---

## Declaración del problema

Cuando la biblioteca activa es Articles, el botón inferior del sidebar sigue diciendo «New Story» y el atajo `Ctrl/Cmd+N` sigue creando una Story. El escritor ve una acción que no corresponde con la biblioteca en la que está, no puede crear un Article desde el sidebar y el atajo lo lleva al tipo equivocado. Para crear un Article tiene que ir a la lista de artículos, y no existe ningún atajo que lo haga.

## Solución

El botón inferior del sidebar y el atajo `Ctrl/Cmd+N` se vuelven contextuales:

- En **Stories** crean una Story, como hasta ahora, y muestran «New Story».
- En **Articles** crean un Article, y muestran «New Article» con el mismo atajo.

Al iniciar la creación de un Article se preselecciona la Story que está en contexto: la del Article abierto o, si no hay ninguno, la Story seleccionada. Si no existe ninguna Story, el botón se deshabilita y el atajo no crea nada, porque un Article no puede existir sin una Story.

## Historias de usuario

1. Como escritor, quiero que el botón inferior del sidebar diga «New Story» cuando la biblioteca activa es Stories, para saber con certeza qué va a crear.
2. Como escritor, quiero que el mismo botón diga «New Article» cuando la biblioteca activa es Articles, para no tener que ir a la lista de artículos.
3. Como escritor, quiero ver junto a la etiqueta el atajo que corresponde, para aprenderlo y usarlo.
4. Como escritor, quiero que el atajo muestre el modificador de mi plataforma (⌘ en macOS, Ctrl en el resto), para reconocerlo.
5. Como escritor en Stories, quiero que el clic y `Ctrl/Cmd+N` creen una Story, para no perder el flujo actual.
6. Como escritor en Articles, quiero que el clic y `Ctrl/Cmd+N` creen un Article, para crear desde cualquier punto de la biblioteca.
7. Como escritor, quiero que al crear un Article se preseleccione la Story del Article que tengo abierto, para no volver a elegirla.
8. Como escritor sin Article abierto, quiero que se preseleccione la Story que tengo seleccionada, para mantener el contexto.
9. Como escritor sin Story en contexto, quiero que el formulario se abra sin Story preseleccionada y pueda elegir una de la lista.
10. Como escritor cuyo Article abierto apunta a una Story que ya no existe, quiero que el formulario se abra sin preselección y pueda elegir otra, en lugar de fallar.
11. Como escritor sin ninguna Story, quiero que el botón «New Article» se vea deshabilitado, para entender que primero necesito una Story.
12. Como escritor sin ninguna Story, quiero que `Ctrl/Cmd+N` no abra un formulario inservible, para no perder tiempo.
13. Como escritor, quiero que el atajo se consuma aunque no haya acción posible, para que la tecla no dispare comportamientos externos.
14. Como escritor con el sidebar colapsado, quiero que el tooltip diga la acción correcta, para decidir sin desplegarlo.
15. Como usuario de lector de pantalla, quiero que el nombre accesible anuncie «New Article (Ctrl N)» cuando corresponda, para saber qué hará el botón.
16. Como escritor, quiero que el botón deshabilitado se vea claramente inactivo, para no intentar usarlo en vano.
17. Como escritor con un draft sin guardar, quiero que crear desde el sidebar o con el atajo respete el diálogo de confirmación antes de descartar, para no perder lo escrito.
18. Como escritor, quiero que al confirmar el descarte, la creación continúe exactamente como si hubiera usado el botón.
19. Como escritor, quiero que tras iniciar la creación la vista vaya al editor correspondiente (Story editor o Article editor), para empezar a escribir.
20. Como escritor, quiero que el selector de Story siga editable mientras el Article no exista y quede bloqueado al crearse, como hoy.
21. Como escritor, quiero que la validación de Story + título para guardar un Article no cambie.
22. Como escritor en Stories, quiero que `Ctrl/Cmd+N` siga funcionando aunque el foco esté en el editor, como hoy.
23. Como escritor en Articles con las Stories todavía cargando, quiero que el botón se habilite en cuanto haya datos, sin recargar la app.
24. Como escritor, quiero que el botón conserve su posición, tamaño, estilo e icono, para no re-aprender la interfaz.
25. Como mantenedor, quiero que la preselección de Story y la condición de creación sean las mismas en el botón del sidebar, el atajo y la lista de Articles, para que no diverjan con el tiempo.
26. Como mantenedor, quiero que el comportamiento contextual quede cubierto por tests de integración del renderer, para detectar regresiones.
27. Como mantenedor, quiero que el cambio se limite al renderer, sin tocar IPC, dominio, preload ni base de datos.

## Decisiones de implementación

### Contexto y derivación

- La **biblioteca activa** del workspace (`stories` / `articles`) es la única fuente para decidir el tipo de entidad que crea la acción contextual.
- La derivación de la acción (tipo, etiqueta, estado deshabilitado y arranque) se centraliza en un **hook de estado del renderer** que consumen tanto el botón del sidebar como el registro global de atajos. Sin esa centralización, botón y atajo podrían divergir; con ella, ambos leen las mismas reglas.
- El hook devuelve, al menos: el tipo (`story` / `article`), la etiqueta visible (`New Story` / `New Article`), si la acción está deshabilitada y una función para iniciarla.
- La derivación replica la precedencia que ya usa la lista de Articles para la Story en contexto:
  1. Si hay un Article abierto, la Story de ese Article.
  2. Si no, la Story seleccionada.
  3. Si no, ninguna.
- Si el Article abierto apunta a una Story que ya no está en la biblioteca, **no** se cae a la Story seleccionada; se abre sin preselección. Es el comportamiento actual de la lista de Articles y se conserva para que ambas entradas coincidan.

### Botón del sidebar

- Mantiene su posición, tamaño, estilos, icono `PlusCircle` y estructura; solo cambian texto, `aria-label`, `title`, estado deshabilitado y la acción.
- El texto visible es `New Story` o `New Article` según la biblioteca.
- El `aria-label` y el `title` conservan el patrón actual `<Etiqueta> (<modificador> N)`, por ejemplo `New Article (Ctrl N)`. Esto mantiene el nombre accesible único frente a los botones «New Article» de la lista, que no incluyen el atajo.
- El `Kbd` sigue mostrando el atajo (`Ctrl N` / `⌘ N`) dentro del bloque de texto que se oculta con el sidebar colapsado o por debajo del breakpoint `lg`.
- Con el sidebar colapsado solo se ve el icono; el nombre accesible y el tooltip siguen siendo contextuales para que la acción sea inequívoca.
- No se cambia el icono ni se agrega un menú para el estado colapsado.

### Habilitación

- En Stories la acción siempre está habilitada, como hoy.
- En Articles la acción está habilitada solo si existe **alguna** Story en la biblioteca (misma condición que usa la lista de Articles: total de Stories mayor que cero, sin mirar el filtro de tags).
- No se consulta el estado de carga: si las Stories todavía no llegaron, el total es cero y la acción aparece deshabilitada; se habilita en cuanto la biblioteca se actualiza. Es el mismo comportamiento que ya tiene la lista de Articles.
- El botón deshabilitado usa el tratamiento visual de deshabilitado ya presente en la app (opacidad reducida y cursor no permitido), reutilizando tokens del tema.

### Atajo de teclado

- El hook de atajos deja de recibir `onNewStory` y pasa a recibir una acción genérica de creación (`onNew`), provista por la derivación contextual.
- `Ctrl/Cmd+S` no cambia.
- Cuando la acción contextual está deshabilitada, la tecla se consume igualmente (`preventDefault`) pero no crea nada ni abre editores.
- Se mantienen sin cambios el resto de las características del listener: no filtra por foco, no distingue `shift`/`alt`, no comprueba repetición y no se desactiva con modales abiertos.

### Navegación y estado

- Tanto el clic como el atajo pasan por el **guard de navegación existente**: si hay un draft sin guardar, la acción queda pendiente y aparece el diálogo de confirmación actual antes de descartar; al confirmar, se ejecuta la misma acción.
- El reducer no cambia: la acción de inicio de creación ya acepta `kind: article` y una Story opcional, y ya soporta el guard. No se agregan acciones ni estado nuevo.
- No cambian el flujo de creación, el borrador inicial, la banda del editor, la validación, la persistencia diferida ni la lista de Articles.
- No se toca `DataPort`, preload, contratos IPC, servicios, modelos, SQLite ni migraciones.

### Idioma y estilo

- Los textos de UI nuevos o modificados van en inglés, como el resto de la interfaz; no hay infraestructura de i18n.
- Los identificadores nuevos van en inglés.
- Se respetan los tokens de diseño del tema; no se declaran colores nuevos.

## Decisiones de testing

### Seam

- **Un solo seam: integración a nivel de App.** Se renderiza la app completa con el fake del `DataPort` y se interactúa con roles accesibles y eventos de teclado globales, igual que los tests actuales de creación y de atajos. No se crean seams nuevos ni tests unitarios de los hooks involucrados: su comportamiento queda cubierto por este seam.

### Qué hace bueno a un test

- Verifica **comportamiento externo observable**: nombres accesibles, texto visible, estado deshabilitado, región del editor que se abre, valor preseleccionado del selector de Story, entidades creadas en el fake y ausencia de escrituras cuando la acción está bloqueada.
- No verifica detalles de implementación (nombres de funciones internas, forma del estado, clases CSS salvo cuando el estado deshabilitado es el comportamiento).
- No modifica tests existentes para hacer pasar la implementación. Si un test existente falla, se investiga como regresión.
- Los casos nuevos usan los helpers y fábricas ya disponibles (render de la app, fake port, fábricas de Story y Article).

### Casos a cubrir

- En Stories, el botón del sidebar conserva «New Story», el atajo visible y crea una Story (regresión del comportamiento actual).
- En Articles, el botón del sidebar muestra «New Article» y al hacer clic abre el editor de Article con la Story en contexto preseleccionada.
- Con una Story seleccionada y sin Article abierto, la preselección es esa Story.
- Con un Article abierto, la preselección es la Story de ese Article, aunque haya otra Story seleccionada.
- Si la Story del Article abierto ya no existe, el editor se abre sin preselección.
- `Ctrl/Cmd+N` en Articles crea un Article (mismo resultado que el botón).
- `Ctrl/Cmd+N` en Stories sigue creando una Story.
- Sin ninguna Story y con Articles activo, el botón del sidebar está deshabilitado y `Ctrl/Cmd+N` no abre editor ni escribe nada.
- El nombre accesible del botón contextual incluye la etiqueta y el atajo, de modo que las búsquedas exactas de «New Article» de los tests existentes sigan encontrando un único botón.
- Con un draft inválido sin guardar, tanto el clic como el atajo muestran el diálogo de confirmación antes de descartar.
- Si las Stories llegan después, la acción en Articles se habilita sin recargar (se puede cubrir con el gate de listado del fake).

### Prior art

- Los tests de creación de Story desde el sidebar (botón y guard de navegación).
- Los tests de creación de Article (botón, preselección, deshabilitado sin Stories, bloqueo del selector).
- Los tests de atajos (keydown sobre el body con `ctrlKey`, texto del `Kbd` en el sidebar).

## Fuera de alcance

- Un atajo separado para New Article (por ejemplo `Ctrl/Cmd+Shift+N`).
- Cambiar los botones de creación de las listas de Stories y Articles.
- Persistir la biblioteca activa, agregar router o cambiar el estado inicial.
- Cambiar iconos, colores o el comportamiento del sidebar colapsado más allá de `aria-label`/`title`.
- Cambiar el comportamiento del listener de atajos respecto de foco, repetición, modificadores adicionales o modales abiertos.
- Agregar `aria-keyshortcuts` o un sistema de documentación de atajos.
- Internacionalización.
- Cambios en IPC, preload, dominio, servicios, modelos, base de datos o migraciones.
- Atajos para cambiar de biblioteca.

## Notas adicionales

- Las decisiones abiertas del informe de investigación quedaron cerradas así: `Ctrl/Cmd+N` contextual; sin Story el botón se deshabilita y el atajo no crea nada; la preselección replica la lista de Articles; con el sidebar colapsado solo cambian nombre accesible y tooltip; el nombre accesible conserva el sufijo con el atajo.
- El botón del sidebar es la única entrada de creación que no depende del estado de carga, error o vacío de la lista; por eso la condición de habilitación debe ser explícita y coincidir con la de la lista.
- El total de Stories que habilita la creación cuenta todas las Stories cargadas, no las visibles tras un filtro de tags.
- Los tests existentes que buscan el botón «New Article» por nombre exacto no colisionan mientras el nombre accesible del sidebar incluya el atajo. Mantener ese patrón es parte del contrato.
- El informe de investigación de esta carpeta conserva las referencias a archivos y líneas que respaldan cada decisión.
- Restricciones de arquitectura respetadas: estado sin store global, entidad que nace desde identificadores, tokens de diseño del tema y regla de dependencias hacia el dominio.
