# Versionado editorial: decisiones de diseño

Estado: diseño, especificación, puntos de prueba y desglose aprobados. Implementación y revisión contra la especificación completadas; ver implementation-review.md.

Los conceptos acordados se mantienen en `GLOSSARY.md`.

## Incorporación de piezas existentes

Los Articles y Posts existentes conservan sus datos actuales y reciben una variante principal con borrador `0.0.0`. No se crean versiones históricas retrospectivas; el autor decide cuándo guardar la primera versión explícita.

## Presentación de comparaciones

La comparación presenta ambos textos lado a lado y resalta agregados, eliminaciones y modificaciones de palabras o frases.

## Estado y programación del Post

El estado y la programación pertenecen al Post completo y se comparten entre sus variantes. Cambiar la variante principal no modifica esos datos; cada registro de publicación referencia la versión exacta elegida por el autor.

## Conversión en Post independiente

El Post independiente nace en `pending`, sin fecha programada ni registros propios de publicación. Conserva el historial editorial y la referencia al origen, donde permanecen los registros de publicación anteriores.

## Versiones con cambios

Crear una versión requiere diferencias en los campos de escritura o en las notas de revisión respecto de la versión anterior. Se permite conservar avances de revisión sin cambios en el texto; se impide crear una versión sin diferencias.

## Inmutabilidad de versiones

Las versiones guardadas conservan su contenido, número y fotografía de notas sin modificaciones. Las correcciones se realizan en el borrador y se conservan mediante una versión nueva, manteniendo referencias de publicación y comparaciones estables.

## Protección antes de integrar

Si el borrador destino tiene cambios pendientes, el autor debe guardarlos primero como versión y elegir su incremento antes de integrar cambios de otra variante. Tras la revisión y confirmación, el resultado de la integración queda como borrador hasta que el autor decida versionarlo.

## Notas al integrar

Durante la integración, el autor puede seleccionar las notas pendientes de la variante fuente relacionadas con los fragmentos elegidos. Las notas incorporadas conservan su origen y se resuelven de forma independiente en el destino.

## Origen de una integración

Los cambios incorporados deben proceder de una versión guardada e identificable de la variante fuente. Para incorporar su borrador actual, el autor debe versionarlo primero; el origen sigue siendo identificable aunque la variante fuente continúe evolucionando.

## Relaciones de la pieza

Las variantes de un Article comparten su Story. Las variantes de un Post comparten su fuente: Story, Article o ninguna. Estas relaciones pertenecen a la pieza completa; un Post surgido de una conversión conserva inicialmente la misma fuente, además de la referencia a la pieza de origen, y un Article independiente conserva la misma Story.

## Publicación con notas pendientes

Registrar una publicación de una versión con notas pendientes muestra un aviso y permite continuar. El autor decide si las observaciones impiden publicar esa versión; la aplicación no bloquea el registro por ese motivo.

## Edición en paralelo

El autor puede abrir y editar dos variantes lado a lado, cada una con su propio autoguardado. La comparación de diferencias conserva una vista específica, separada de la edición simultánea.

## Historial al independizar una variante

La nueva pieza conserva la línea de versiones que condujo a la variante convertida, sin copiar las variantes hermanas. La referencia al origen permite consultar el contexto restante.

## Interfaz de anotaciones

Las notas generales y las vinculadas a párrafos o fragmentos se crean y consultan mediante popovers pequeños no modales, sin oscurecer la pantalla. Seleccionar texto permite abrir el formulario cerca del fragmento; un indicador permite consultar después las notas. La distribución general de la interfaz se presenta como propuesta visual.
