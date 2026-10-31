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
