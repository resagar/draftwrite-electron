# Spec: preview de Markdown en el editor de Story

**Status:** ready-for-agent
**Fecha:** 2026-10-20
**Feature:** preview-story
**Informe de investigación:** `research.md` (misma carpeta)

---

## Declaración del problema

Cuando el escritor crea o edita una Story, el editor solo muestra el texto plano de CodeMirror. No hay ninguna vista renderizada del Markdown, así que no puede revisar cómo quedan los títulos, listas, tablas, énfasis, citas ni bloques de código mientras escribe.

En el editor de Article esa revisión sí existe: el layout muestra el editor y el preview renderizado en paralelo, con modos Edit/Split/Preview. La diferencia obliga al escritor a cambiar de contexto o a guardar y abrir otra vista para comprobar el resultado, y rompe la expectativa de que ambas editoras se comporten igual.

## Solución

El editor de Story adopta el mismo layout y el mismo componente de preview que el editor de Article:

- El preview renderizado se muestra junto al editor en el modo Split, que sigue siendo el modo inicial del workspace.
- El editor lee el mismo estado global de modo de vista (`edit`, `split`, `preview`) que ya usa Article; no se crea estado nuevo.
- La toolbar de formato se oculta cuando solo se muestra el preview, igual que en Article.
- Una Story almacenada muestra un header de Story, análogo al header de Article, con el conmutador Edit/Split/Preview en la misma posición. Durante la creación de Story no hay header ni conmutador, exactamente como ocurre al crear un Article: el preview se ve por el modo inicial Split.
- Se reutiliza tal cual el componente `MarkdownPreview`, sin cambios de API, estilos ni dependencias.

El resultado es que crear o editar una Story ofrece la misma experiencia de escritura y revisión que crear o editar un Article.

## Historias de usuario

1. Como escritor que crea una Story, quiero ver el Markdown renderizado junto al editor, para revisar el formato mientras escribo.
2. Como escritor que edita una Story existente, quiero ver el mismo preview, para revisar el texto sin salir del editor.
3. Como escritor, quiero que el editor de Story use el mismo layout de dos columnas que el de Article, para no re-aprender la interfaz.
4. Como escritor, quiero que el modo inicial sea Split, para ver editor y preview desde el primer momento.
5. Como escritor, quiero que el preview se actualice en vivo con cada cambio del texto, para no tener que guardar antes de revisarlo.
6. Como escritor, quiero que los encabezados Markdown se rendericen con su jerarquía visual, para comprobar la estructura del texto.
7. Como escritor, quiero que los párrafos, el énfasis y el texto en negrita se rendericen, para revisar el tono del texto.
8. Como escritor, quiero que las listas ordenadas y desordenadas se rendericen, para revisar enumeraciones.
9. Como escritor, quiero que las citas se rendericen, para revisar bloques citados.
10. Como escritor, quiero que el código inline y los bloques de código se rendericen con su estilo, para revisar fragmentos técnicos.
11. Como escritor, quiero que los enlaces se rendericen como enlaces, para comprobar su presencia y destino.
12. Como escritor, quiero que las tablas GFM se rendericen, para revisar datos tabulados.
13. Como escritor, quiero que el tachado GFM se renderice, para revisar texto descartado.
14. Como escritor, quiero que las reglas horizontales se rendericen, para revisar separaciones.
15. Como escritor, quiero que el preview use los mismos estilos y tokens del tema que el preview de Article, para que ambas editoras se vean coherentes.
16. Como escritor con una Story almacenada, quiero encontrar el conmutador Edit/Split/Preview en el header de la Story, en la misma posición que en el header de Article, para saber dónde está sin buscarlo.
17. Como escritor en modo Edit, quiero que el preview se oculte y el editor ocupe todo el ancho disponible, para concentrarme en escribir.
18. Como escritor en modo Preview, quiero que el editor y la toolbar se oculten y el preview ocupe todo el ancho, para leer el resultado sin distracciones.
19. Como escritor en modo Split, quiero que el editor y el preview compartan el ancho y que el preview tenga scroll propio, para desplazarme por el resultado sin mover el editor.
20. Como escritor, quiero que la toolbar de formato se oculte en modo Preview, para no ver controles que no pueden aplicarse.
21. Como escritor que crea una Story, quiero que no aparezca el conmutador de vista, igual que al crear un Article, para que el flujo de creación sea idéntico.
22. Como escritor, quiero que el modo de vista se comporte como una preferencia del workspace, igual que entre Articles, para que mi elección se conserve al cambiar de documento.
23. Como escritor con una Story vacía, quiero que el preview esté vacío sin errores ni placeholders, para empezar a escribir sin ruido.
24. Como escritor, quiero que el texto de la Story se siga guardando exactamente como antes, para que el preview no altere la persistencia.
25. Como escritor, quiero que el preview muestre el borrador local antes del guardado diferido, para revisar lo que acabo de escribir.
26. Como usuario de lector de pantalla, quiero que la región del preview se anuncie como «Preview», igual que en Article, para reconocerla.
27. Como usuario de lector de pantalla, quiero que el conmutador se anuncie como «View mode» y exponga el modo activo, igual que en Article, para saber en qué vista estoy.
28. Como mantenedor, quiero reutilizar `MarkdownPreview` en lugar de duplicar el renderizado de Markdown, para tener una sola fuente de verdad visual.
29. Como mantenedor, quiero reutilizar `ViewModeSwitcher` y el estado `viewMode` existentes, para no agregar estado ni acciones al reducer.
30. Como mantenedor, quiero que el cambio se limite al renderer, sin tocar IPC, preload, dominio, servicios, SQLite ni migraciones.
31. Como mantenedor, quiero que el preview de Story quede cubierto por el mismo seam de integración que el de Article, para detectar regresiones sin crear infraestructura nueva.
32. Como mantenedor, quiero que los tests existentes de view modes de Article sigan pasando sin modificaciones, para demostrar que la reutilización no rompió el comportamiento previo.

## Decisiones de implementación

### Reutilización del preview

- `MarkdownPreview` se reutiliza **sin cambios**: misma API `{ markdown: string }`, mismos estilos, mismos plugins (`react-markdown` + `remark-gfm`) y mismo `aria-label="Preview"`.
- No se crea un segundo componente de preview ni se parametriza el existente. El texto de la Story (`Story.Text`) es un `string`, igual que el del Article.
- No se agregan dependencias: `react-markdown` y `remark-gfm` ya están instalados.

### Layout del editor de Story

- `StoryEditor` lee `viewMode` del estado global del workspace con el hook de estado existente; no recibe el modo por props ni crea estado local.
- Deriva dos flags, equivalentes a los de `ArticleEditor`: `showsEditor = viewMode !== 'preview'` y `showsPreview = viewMode !== 'edit'`.
- El cuerpo pasa de una columna a un contenedor flex de dos columnas:
  - columna del editor: visible y `flex-1` en `edit` y `split`; oculta en `preview`;
  - borde divisorio solo cuando editor y preview coexisten (`split`);
  - columna del preview: visible en `split` y `preview`, con `flex-1`, scroll vertical propio y `MarkdownPreview` alimentado por `draft.Text`.
- La toolbar de formato se renderiza solo si `showsEditor`; en `preview` queda oculta, igual que en Article.
- El preview usa el borrador local (`draft.Text`), no el valor almacenado, para reflejar los cambios antes del guardado diferido.
- Un texto vacío produce un preview vacío; no se agrega placeholder ni mensaje de error.

### Header de Story y conmutador de vista

- Se agrega un header de Story, análogo al header de Article, que se muestra **solo cuando la Story ya existe** (edición). El flujo de creación sigue montando el editor sin header.
- El header ocupa la misma posición visual que el header de Article (franja superior del panel de la entidad) y replica su estructura: a la izquierda el Topic de la Story, truncado si no cabe; a la derecha el `ViewModeSwitcher` en la misma posición relativa.
- El conmutador es el mismo `ViewModeSwitcher`: botones `Edit`, `Split`, `Preview`, `aria-pressed` y grupo `aria-label="View mode"`. No se modifica su API.
- El header no agrega acciones nuevas (borrar, duplicar, abrir panel fuente). Su único propósito en esta feature es alojar el conmutador con coherencia visual.
- La composición de Story almacenada replica la de Article: un contenedor de la entidad compone header + editor, y el workspace usa ese contenedor solo en la rama de Story almacenada. La rama de creación sigue usando el editor solo.
- En la creación de Story no se muestra el conmutador, igual que en la creación de Article. El preview aparece porque `viewMode` inicia en `split`.

### Estado del modo de vista

- No se agregan campos ni acciones al reducer del workspace. `viewMode` sigue siendo `'edit' | 'split' | 'preview'`, con `'split'` como valor inicial.
- No se resetea el modo al cambiar de Story o Article. Es el comportamiento actual entre Articles y se conserva para que la preferencia sea del workspace, no de la entidad.
- Si el usuario dejó un Article en `edit` o `preview`, la Story se abre en ese mismo modo. Es una consecuencia aceptada de compartir el estado, no un caso especial.

### Persistencia y datos

- No cambian el borrador inicial, la validación, el guardado diferido, la primera escritura con `create` ni las siguientes con `update`.
- El preview es puramente de presentación: no escribe, no valida y no altera el texto enviado al `DataPort`.
- No se toca `DataPort`, preload, contratos IPC, servicios, modelos, SQLite ni migraciones.

### Accesibilidad

- La región del preview conserva `aria-label="Preview"`.
- El editor conserva su región `Story editor`.
- El conmutador conserva el grupo `View mode` y el estado `aria-pressed`.
- Story y Article nunca se montan a la vez, por lo que no hay dos regiones `Preview` ni dos grupos `View mode` simultáneos.

### Idioma y estilo

- Los textos de UI nuevos o modificados van en inglés, como el resto de la interfaz; no hay infraestructura de i18n.
- Los identificadores nuevos van en inglés.
- Se reutilizan los tokens y utilidades del tema; no se declaran colores nuevos ni se agrega una librería de tipografía.

## Decisiones de testing

### Seam

- **Un solo seam: integración a nivel de App.** Se renderiza la app completa con `renderApp` y el fake del `DataPort`, y se interactúa con roles accesibles, texto visible y eventos de CodeMirror, igual que el bloque existente de `view modes`.
- No se crean seams nuevos ni tests unitarios de `MarkdownPreview`, `StoryEditor` o el header: su comportamiento queda cubierto por este seam.
- Se reutilizan los helpers y fábricas existentes: render de la app, fake port, fábricas de Story y Article, y los helpers de edición de CodeMirror.

### Qué hace bueno a un test

- Verifica **comportamiento externo observable**: región `Preview` presente o ausente, contenido renderizado (encabezados, tablas, énfasis, tachado), `aria-pressed` del modo, presencia o ausencia de la toolbar, región del editor visible y llamadas de persistencia.
- No verifica detalles de implementación: nombres internos, forma del estado, estructura del reducer ni clases CSS.
- No modifica tests existentes para hacer pasar la implementación. Si un test existente falla, se investiga como regresión.
- Los casos nuevos usan el mismo patrón que los tests de preview de Article y los tests del editor de Story.

### Casos a cubrir

- Crear una Story y comprobar que el modo inicial es `Split` y que la región `Preview` muestra el Markdown del borrador.
- Renderizar encabezados, tablas GFM, énfasis y tachado en el preview de una Story.
- Escribir en el editor de Story y comprobar que el preview se actualiza sin guardar.
- Abrir una Story almacenada y comprobar que el preview renderiza su `Text`.
- Cambiar a `Edit` desde el header de Story y comprobar que el preview desaparece y el editor sigue visible.
- Cambiar a `Preview` y comprobar que el editor y la toolbar desaparecen y el preview ocupa el espacio.
- Volver a `Split` y comprobar que editor, toolbar y preview coexisten.
- Comprobar que la creación de Story no muestra el grupo `View mode`, replicando la creación de Article.
- Comprobar que una Story con `Text` vacío muestra un preview vacío sin error.
- Comprobar que el preview no altera la persistencia: el texto guardado coincide con el editado.
- Comprobar que los tests existentes de view modes de Article siguen pasando sin cambios.

### Prior art

- `describe('view modes')` en `App.test.tsx`: split inicial, GFM, ocultamiento del preview en Edit, persistencia del documento al cambiar de modo y toolbar oculta en Preview.
- `describe('the story editor')`: apertura, edición y guardado de Story, títulos y tags, y guards de navegación.
- Helpers `replaceEditorText` y `articleView` basados en `.cm-content`, usados tanto por Story como por Article.

## Fuera de alcance

- Renderizar Markdown en el panel `StoryPane` (la Story fuente de un Article), que hoy muestra el texto como `<pre>` crudo.
- Cambiar el componente `MarkdownPreview`: API, estilos, plugins, tipografía o resaltado de sintaxis.
- Agregar sincronización de scroll entre editor y preview.
- Agregar el conmutador durante la creación de Story.
- Agregar acciones nuevas al header de Story (borrar, duplicar, abrir panel fuente).
- Cambiar el estado `viewMode`, su valor inicial, su persistencia o su reset al navegar.
- Cambiar la toolbar de formato, sus comandos o su comportamiento.
- Cambiar atajos de teclado.
- Cambiar el `aria-label` del editor, que hoy dice «Article text» porque las extensiones son compartidas.
- Cambiar la persistencia, el contrato IPC, el preload, el dominio, los servicios, SQLite o las migraciones.
- Internacionalización.

## Notas adicionales

- El informe `research.md` de esta carpeta documenta con archivos y líneas por qué faltaba el preview: `MarkdownPreview` y el layout de Article nacieron en el port inicial del frontend, pero el editor de Story se portó como variante de una sola columna y nunca se cableó el preview.
- La creación de Article tampoco muestra el conmutador, porque el workspace monta el editor sin header; el preview se ve por el valor inicial `split`. La spec replica esa misma situación en Story para que ambos flujos de creación sean idénticos.
- `viewMode` es estado del workspace, no de la entidad. No se resetea al navegar; la spec conserva ese comportamiento.
- Story y Article no coexisten en el workspace, así que los nombres accesibles `Preview` y `View mode` no se duplican.
- El editor de Story comparte las extensiones de Article y por eso su nombre accesible sigue siendo «Article text». No se cambia en esta feature.
- Restricciones de arquitectura respetadas: estado sin store global, componentes de presentación sin acoplamiento al dominio y tokens de diseño del tema.
- Los textos de UI nuevos van en inglés; la spec y la documentación van en español.
