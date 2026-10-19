# La entidad nace cuando existen sus identificadores

Una `Story` y un `Article` se crean en cuanto sus campos identificadores están puestos —`topic` en la Story; `storyID` y `title` en el Article— y **todo lo demás es opcional, incluido el `text`**. El vacío se representa siempre como cadena vacía `""` (y lista vacía en `titles`/`tags`), nunca como `null` ni `undefined`. Lo que cuenta como vacío son los espacios en blanco, y el valor se guarda recortado.

Esto sustituye a la regla anterior, en la que el constructor exigía el cuerpo y todos los metadatos (`errTextRequired`, `errTitlesRequired`, `errSubtitleRequired`, `errTargetRequired` ya no existen). El motivo es de producto: la creación y la edición tenían pantallas distintas, un formulario para crear y el editor para editar, y eso obligaba a escribir los metadatos antes de tener nada que decir. Ahora la entidad se escribe donde se edita, y el orden lo decide quien escribe: primero el identificador, después el cuerpo si lo hay.

Lo que **no** cambia: el constructor sigue generando el `id` y validando (ADR-0002), `update` sigue re-validando, el `storyID` de un Article sigue siendo inmutable (ADR-0003), y siguen siendo obligatorios `topic`, `title` y `storyID` — de ahí que las unicidades existentes sigan siendo correctas sin migración: una entidad persistida nunca tiene vacíos sus identificadores.

La consecuencia menos obvia está en la unicidad: `topic` sigue siendo único en todo el sistema y `(story_id, title)` sigue siéndolo dentro de una Story, y ninguna de las dos se rompe con valores vacíos porque esos campos no pueden estar vacíos.
