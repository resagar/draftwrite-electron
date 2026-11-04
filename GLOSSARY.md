# draftwrite

App de escritorio para escritores: organiza historias (`Story`) y los artículos (`Article`) basados en esas historias.

## Language

**Story**:
Unidad de organización de escritura: un tema que la identifica, con títulos candidatos, tags y un texto base. Solo el tema es obligatorio; lo demás puede estar vacío. Es la unidad padre de los Articles.
_Avoid_: historia, entrada

**Article**:
Pieza de escritura derivada de exactamente una Story: un título propio, y opcionalmente subtítulo, objetivo y texto.
_Avoid_: entrada, nota

**Post**:
Publicación corta para redes sociales: un topic obligatorio, un texto opcional, un estado editorial y, opcionalmente, una Story o un Article como fuente (nunca ambos).
_Avoid_: nota, tweet, entrada

**PostState**:
El estado editorial de un Post: `pending`, `scheduled` o `published`. Todo Post nace `pending` y las transiciones son libres.
_Avoid_: status

**ScheduledAt**:
La fecha ISO 8601 opcional de un Post programado. Solo existe mientras el estado es `scheduled`; al salir de ese estado se limpia.
_Avoid_: fecha de publicación, publishAt

**Topic**:
El tema que identifica a una Story (obligatorio y único en todo el sistema) o el resumen corto que identifica a un Post (obligatorio y sin unicidad): ninguna de las dos entidades existe sin él.
_Avoid_: asunto

**Titles**:
Los títulos candidatos o alternativos de una Story, opcionales.
_Avoid_: título (singular — ambiguo con `article.title`)

**Tags**:
Etiquetas opcionales para clasificar una Story.
_Avoid_: categorías, labels

**Text**:
El contenido escrito de una Story o de un Article, según el contexto. Opcional: una entidad puede existir con el texto vacío.
_Avoid_: cuerpo, body

**Subtitle**:
El subtítulo de un Article, opcional.
_Avoid_: subtítulo de la Story (no existe)

**Target**:
El objetivo de un Article —lo que pretende lograr—, opcional.
_Avoid_: meta, propósito, word count

**Vim mode**:
Preferencia de edición modal para escribir el Text de una Story, Article o Post con movimientos y comandos de estilo Vim. No implica ejecutar Neovim ni cargar su configuración o sus plugins.
_Avoid_: modo nvim, Neovim integrado

**Editorial draft**:
Estado de trabajo editable de un Article o Post, conservado mediante autoguardado. El autoguardado no crea una versión numerada.
_Avoid_: versión automática

**Editorial version**:
Estado editorial conservado explícitamente por el autor, identificado por tres números y acompañado de una descripción del cambio: en Article abarca título, subtítulo, objetivo y texto; en Post, tema y texto, dejando fuera el estado de publicación y la fecha programada. El autor elige qué número incrementar según el impacto editorial: el primero para enfoque o estructura, el segundo para desarrollo de párrafos y el tercero para correcciones puntuales.
_Avoid_: autoguardado, versión de Story

**Editorial variant**:
Línea de exploración con nombre dentro de un mismo Article o Post, con borrador, historial y numeración propios desde la versión de partida; cada versión se identifica dentro de su variante y un número mayor no expresa superioridad entre variantes. El autor puede convertirla explícitamente en una pieza independiente que conserva su contenido, historial y referencia al origen; la pieza original conserva sus versiones y las demás variantes.
_Avoid_: artículo duplicado, post duplicado, worktree

**Editorial restoration**:
Recuperación de los campos de escritura de una versión anterior en el borrador de la variante actual, conservando las versiones posteriores; si hay cambios pendientes, requiere que el autor cree primero una versión y elija su incremento antes de continuar. La siguiente versión numerada avanza desde la última versión de la variante; las notas actuales se conservan y se señalan para reubicar cuando corresponda.
_Avoid_: borrar historial, reiniciar numeración

**Editorial comparison**:
Comparación de dos versiones de un mismo Article o Post, incluso entre variantes distintas, o del borrador actual con una versión guardada de esa pieza. Permite reconocer agregados, eliminaciones y modificaciones de palabras o frases.
_Avoid_: comparación entre piezas independientes

**Editorial integration**:
Incorporación de cambios seleccionados de una variante al borrador de otra variante del mismo Article o Post, revisados por el autor antes de aplicarlos. Permite combinar hallazgos de distintas líneas de exploración.
_Avoid_: reemplazo completo de variante, integración entre piezas independientes

**Editorial conflict**:
Situación en la que dos variantes modificaron un mismo fragmento y su integración requiere una decisión del autor. El autor dispone del texto de partida, ambas propuestas y un resultado editable que confirma antes de incorporarlo al borrador destino.
_Avoid_: elección automática de variante

**Primary variant**:
Única variante editorial que representa la propuesta elegida de un Article o Post; inicialmente es la variante original. El autor puede designar explícitamente otra como principal, conservando los borradores e historiales de las demás.
_Avoid_: variante más reciente, variante de mayor número

**Published version reference**:
Registro manual de la versión editorial exacta de un Article o Post que el autor publicó, con fecha y enlace opcional; cada publicación se conserva en el historial de la pieza aunque continúe editando, publique revisiones o cambie la variante principal. Registrar esta referencia no publica contenido desde la aplicación.
_Avoid_: borrador actual, variante principal, publicación automática

**Review note**:
Observación editorial asociada a una variante de un Article o Post, referida a toda la variante o a un fragmento seleccionado, que el autor puede marcar como resuelta; al crear una variante se copian las notas pendientes de su punto de partida, conservando su referencia al origen y resolviéndose luego de forma independiente. Si el fragmento cambia y ya no puede localizarse con certeza, la nota conserva el texto citado y queda señalada para reubicarla.
_Avoid_: Post, descripción de versión

**Review snapshot**:
Fotografía de las notas de revisión y sus estados conservada en cada versión editorial. Al crear una variante desde esa versión, determina las notas pendientes que se heredan; recuperar su redacción conserva las notas actuales.
_Avoid_: notas actuales, restauración de notas

**Editorial version number**:
Tres números que expresan el impacto de los cambios editoriales: un Article o Post nuevo comienza con su borrador en `0.0.0`, y el autor crea la primera versión explícita al terminar su primer borrador, eligiendo el incremento según el impacto, por ejemplo `1.0.0` o `0.1.0`. La numeración evoluciona según lo necesite la pieza y es independiente de la preparación para publicar: la primera publicación puede corresponder, por ejemplo, a `2.0.0` o `3.0.0`.
_Avoid_: indicador de calidad, estado de publicación

**Editorial version increment**:
Avance elegido por el autor en uno de los tres componentes del número de versión, que reinicia en cero los componentes a su derecha. Por ejemplo, desde `0.2.4` los incrementos posibles son `1.0.0`, `0.3.0` y `0.2.5`.
_Avoid_: numeración arbitraria

**Variant starting point**:
Versión guardada desde la que nace una variante editorial y que conserva su referencia para comparaciones e integraciones posteriores. Puede elegirse una versión existente o partir del borrador actual, guardándolo primero como versión con el incremento elegido por el autor.
_Avoid_: borrador sin versionar como punto de partida

**Archived variant**:
Variante retirada de la lista de trabajo que conserva su contenido, versiones y notas, y que puede consultarse y reactivarse. Para archivar la variante principal, el autor debe designar previamente otra como principal.
_Avoid_: variante eliminada

**Variant conversion**:
Creación explícita de una pieza independiente a partir de una variante, conservando su contenido, numeración, historial y notas, junto con la referencia entre la nueva pieza y su origen; un Article resultante conserva su pertenencia a la misma Story. La variante de origen queda archivada y disponible para consulta; si era la principal, el autor debe designar otra antes de completar la conversión.
_Avoid_: duplicación de borradores activos
