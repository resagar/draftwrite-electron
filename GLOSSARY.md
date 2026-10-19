# draftwrite

App de escritorio para escritores: organiza historias (`Story`) y los artículos (`Article`) basados en esas historias.

## Language

**Story**:
Unidad de organización de escritura: un tema que la identifica, con títulos candidatos, tags y un texto base. Solo el tema es obligatorio; lo demás puede estar vacío. Es la unidad padre de los Articles.
_Avoid_: historia, post, entrada

**Article**:
Pieza de escritura derivada de exactamente una Story: un título propio, y opcionalmente subtítulo, objetivo y texto.
_Avoid_: post, entrada, nota

**Topic**:
El tema que identifica a una Story; único en todo el sistema y obligatorio: una Story no existe sin él.
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
