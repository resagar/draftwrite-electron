# Versionado editorial de Articles y Posts

Status: ready-for-agent

Especificación y puntos de prueba aprobados por el usuario. Publicada en el tracker local; no implica funcionalidad implementada.

## Problem Statement

El autor necesita desarrollar Articles y Posts mediante revisión intensiva y exploración de enfoques, sin perder redacciones anteriores ni confundir lo publicado con el trabajo en curso. El flujo actual de una única redacción dificulta conservar hitos, comparar decisiones, combinar hallazgos y seguir observaciones editoriales. La organización y edición de Stories deben permanecer iguales.

## Solution

Separar el borrador autoguardado de las versiones editoriales explícitas e inmutables. Cada pieza admite variantes con nombre, borradores e historiales independientes, una variante principal y dos editores en paralelo. El autor controla la numeración, compara versiones, integra fragmentos, resuelve conflictos y recupera redacciones sin perder trabajo. Las notas de revisión acompañan la mejora continua y cada publicación manual queda vinculada a una versión exacta.

## User Stories

1. Como autor, quiero mantener las Stories sin cambios para conservar mi organización actual.
2. Como autor, quiero iniciar cada Article o Post con un borrador `0.0.0` para comenzar sin crear una versión histórica artificial.
3. Como autor, quiero autoguardado del borrador para proteger la escritura sin crear versiones numeradas.
4. Como autor, quiero decidir cuándo termino un primer borrador y guardo su versión para conservar un hito significativo.
5. Como autor, quiero elegir el componente del número que incremento para expresar el impacto editorial.
6. Como autor, quiero describir cada versión para recordar la intención del cambio.
7. Como autor, quiero incrementar el primer componente por cambios de enfoque o estructura para identificar revisiones profundas.
8. Como autor, quiero incrementar el segundo componente por desarrollo de párrafos para identificar revisiones intermedias.
9. Como autor, quiero incrementar el tercero por correcciones puntuales para identificar ajustes pequeños.
10. Como autor, quiero reiniciar los componentes menores al incrementar uno para mantener una numeración consistente.
11. Como autor, quiero publicar por primera vez en cualquier versión para no asociar `1.0.0` con estar listo.
12. Como autor, quiero listar y consultar versiones inmutables para conocer la evolución de la pieza.
13. Como autor, quiero conservar juntos título, subtítulo, objetivo y texto del Article para recuperar una redacción coherente.
14. Como autor, quiero conservar juntos tema y texto del Post para recuperar su redacción sin alterar la programación.
15. Como autor, quiero crear variantes desde versiones guardadas para explorar enfoques con un origen preciso.
16. Como autor, quiero partir del borrador actual después de versionarlo para explorar sin perder ese trabajo.
17. Como autor, quiero identificar las versiones por variante y número para distinguir numeraciones coincidentes.
18. Como autor, quiero numeración independiente desde el punto de partida de cada variante para desarrollar cada enfoque a su ritmo.
19. Como autor, quiero elegir una única variante principal para señalar mi propuesta actual.
20. Como autor, quiero editar dos variantes lado a lado con autoguardado independiente para desarrollar enfoques en paralelo.
21. Como autor, quiero comparar dos versiones incluso entre variantes de la misma pieza para evaluar alternativas.
22. Como autor, quiero comparar un borrador con una versión de su pieza para revisar trabajo todavía no versionado.
23. Como autor, quiero ver los textos lado a lado con agregados, eliminaciones y modificaciones de palabras o frases para revisar diferencias concretas.
24. Como autor, quiero recuperar los campos de escritura de una versión anterior sin borrar versiones posteriores para retomar una dirección previa.
25. Como autor, quiero guardar antes los cambios pendientes eligiendo su incremento para no perderlos al recuperar o integrar.
26. Como autor, quiero continuar la numeración desde la última versión de la variante tras recuperar contenido para preservar la secuencia histórica.
27. Como autor, quiero integrar fragmentos seleccionados de una versión guardada de otra variante para combinar hallazgos.
28. Como autor, quiero revisar y confirmar la integración para controlar el resultado que llega al borrador.
29. Como autor, quiero resolver conflictos viendo la base, ambas propuestas y un resultado editable para elegir conscientemente la redacción.
30. Como autor, quiero notas generales y notas vinculadas a fragmentos para registrar mejoras pendientes.
31. Como autor, quiero marcar notas resueltas para seguir el progreso de revisión.
32. Como autor, quiero conservar la cita y una señal de reubicación cuando el anclaje sea incierto para no perder observaciones.
33. Como autor, quiero conservar las notas y sus estados en cada versión para conocer la revisión de ese momento.
34. Como autor, quiero heredar las notas pendientes del punto de partida de una variante con referencia al origen para continuar la revisión de forma independiente.
35. Como autor, quiero conservar mis notas actuales al recuperar una redacción para no retroceder el seguimiento editorial.
36. Como autor, quiero seleccionar notas pendientes relacionadas con los fragmentos integrados para trasladar también sus observaciones.
37. Como autor, quiero guardar versiones cuando solo cambian las notas para conservar avances de revisión.
38. Como autor, quiero impedir versiones idénticas para evitar hitos sin cambios.
39. Como autor, quiero archivar y reactivar variantes conservando todo su trabajo para cerrar exploraciones de forma reversible.
40. Como autor, quiero designar otra principal antes de archivar la actual para mantener una propuesta elegida.
41. Como autor, quiero convertir una variante en pieza independiente para desarrollar una idea que tomó otro rumbo.
42. Como autor, quiero conservar su contenido, numeración, línea histórica, notas y origen sin copiar variantes hermanas para mantener su trazabilidad.
43. Como autor, quiero archivar la variante convertida en el origen para evitar dos borradores activos de la misma exploración.
44. Como autor, quiero conservar la misma Story del Article o la fuente inicial del Post al convertir para mantener su contexto.
45. Como autor, quiero que un Post independiente nazca pendiente, sin programación ni publicaciones propias para no atribuirle publicaciones ajenas.
46. Como autor, quiero registrar manualmente publicaciones con versión exacta, fecha y enlace opcional para saber qué compartí en cada momento.
47. Como autor, quiero conservar múltiples registros de publicación para seguir revisiones publicadas.
48. Como autor, quiero un aviso de notas pendientes que no bloquee registrar una publicación para conservar mi decisión editorial.
49. Como autor, quiero conservar estado y programación únicos por Post al cambiar de principal o recuperar contenido para evitar cambios de publicación involuntarios.
50. Como autor, quiero incorporar piezas existentes conservando todos sus datos y un borrador principal `0.0.0` para adoptar el flujo sin inventar historial.
51. Como autor, quiero reabrir la aplicación y recuperar variantes, borradores, versiones y notas para continuar donde estaba.

## Implementation Decisions

### Escritura y numeración

- El autor decide el incremento; no se infiere automáticamente por conteo de párrafos ni se usa como puntuación de calidad.
- `0.0.0` es el estado inicial del borrador, no una versión guardada automáticamente. El autoguardado persiste trabajo sin aumentar números. La primera versión puede ser `1.0.0`, `0.1.0` o `0.0.1`.
- Los incrementos desde `0.2.4` producen `1.0.0`, `0.3.0` o `0.2.5`. Cada variante continúa desde su versión de partida y tiene su propia secuencia.
- La identidad estable de una versión no depende solo del número: identifica también pieza y variante, aunque se renombre una variante.
- Cada versión guarda campos de escritura, descripción del cambio y fotografía de notas. Su contenido, numeración y fotografía son inmutables.
- Las versiones requieren diferencias de escritura o notas respecto del estado de referencia; comparar con el borrador inicial cuando todavía no existe versión. No convertir fechas de autoguardado en diferencias editoriales.
- Article conserva título, subtítulo, objetivo y texto; Post conserva tema y texto. Relaciones, estado y programación son datos de la pieza, no campos editoriales de cada variante.

### Variantes, recuperación e integración

- Cada pieza tiene una variante original principal; exactamente una variante es principal. Se puede designar otra sin alterar sus borradores, historiales ni publicaciones.
- Crear una variante exige una versión de partida persistida. Si se parte del borrador con cambios, el autor guarda primero una versión y elige su incremento; si ya coincide con una versión, se usa esa versión sin crear un duplicado.
- La lista muestra nombre y número de la variante; un número mayor no implica superioridad editorial.
- Recuperar restaura únicamente campos de escritura, conserva notas actuales y versiones posteriores y no crea automáticamente una nueva versión. La próxima numeración avanza desde el último hito de la variante destino.
- Recuperar e integrar requieren guardar previamente cambios pendientes, incluidos los de notas. Cancelar ese guardado cancela la operación sin reemplazar el borrador.
- Las comparaciones se limitan a la misma pieza y admiten versiones de distintas variantes o borrador contra versión. Incluyen diferencias en todos los campos de escritura, no solo el cuerpo.
- Integrar exige una versión fuente guardada de otra variante de la misma pieza y conserva su referencia. La resolución considera la ascendencia compartida; no se aproxima la base eligiendo números coincidentes.
- Los cambios se seleccionan y revisan antes de confirmar. Los conflictos presentan base, origen, destino y resultado editable. El resultado confirmado queda como borrador.
- Las notas pendientes relacionadas pueden seleccionarse al integrar, conservando procedencia y resolución independiente. Las notas del destino permanecen y se reubican cuando corresponda.
- Las variantes archivadas conservan contenido, historial y notas, se consultan y reactivan. Archivar o convertir la principal requiere designar otra; no puede completarse si no queda principal.
- La edición en paralelo tiene identidad, foco y autoguardado separados por variante. Una respuesta tardía de una edición no puede sobrescribir otra variante.

### Notas, conversión y publicación

- Las notas generales o ancladas se crean y consultan mediante popovers pequeños no modales, sin backdrop ni oscurecimiento. Seleccionar un párrafo o fragmento habilita la anotación junto a esa selección; un indicador permite volver a consultar la nota cerca del texto. Deben admitir teclado, cierre con Escape y retorno del foco, sin perder anotaciones en edición al cerrar.
- Las notas generales o ancladas pertenecen a una variante. Si un anclaje es incierto, conservar cita y señalar reubicación, sin asociarla silenciosamente a otra coincidencia.
- Cada versión conserva las notas y sus estados. La creación de variantes hereda solo las pendientes de la versión de partida, con procedencia e independencia posterior.
- La conversión conserva contenido actual, notas, numeración y línea de versiones que condujo a la variante. No duplica variantes hermanas. La nueva pieza tiene su variante principal y mantiene vínculo con el origen, que archiva la variante convertida.
- El Article independiente conserva la misma Story. El Post conserva inicialmente su fuente, nace `pending`, sin programación ni registros propios de publicación; las publicaciones previas quedan en el origen. La conversión no inventa una versión numerada del borrador pendiente.
- Registrar una publicación es una acción manual sobre una versión guardada exacta, con fecha y enlace opcional. Se conservan registros anteriores aunque cambie la principal o continúe la escritura. Notas pendientes de esa versión generan aviso no bloqueante.
- El registro manual no incorpora publicación remota ni nuevas reglas para las transiciones actuales de PostState.

### Arquitectura y persistencia

- Mantener la arquitectura hexagonal, validación en dominio y servicios de aplicación, SQLite local y acceso renderer a través de DataPort, preload e IPC tipado. No introducir servidor, Git real ni dependencia de red.
- Ampliar contratos de forma compatible para direccionar variantes y operaciones editoriales; conservar consumidores existentes hasta migrarlos. Los errores cruzan la frontera con códigos tipados y listas explícitas.
- Conservar piezas, variantes, borradores, versiones, notas, procedencia, fotografía de revisión, integración y referencias de publicación con identidades estables. El diseño físico y los índices se concretan al implementar cada slice; esta especificación no impone duplicar el dominio Article/Post.
- La migración de piezas existentes conserva datos y relaciones, incluidos estado y programación, y crea un borrador principal `0.0.0`, sin versiones o publicaciones históricas ficticias.
- Crear versiones, recuperar, integrar, designar principal y convertir deben evitar estados parciales persistidos. Si la escritura falla, no declarar éxito ni perder el borrador protegido.
- Mantener las invariantes existentes, incluida pertenencia inmutable del Article a su Story. Ajustar las proyecciones de listas al flujo de variante principal sin perder filtros ni relaciones.
- Respetar la unicidad actual del título de Article dentro de una Story y la restricción de cambio de fuente del Post al estado pendiente. Los títulos históricos no deben apropiarse de la unicidad de piezas activas; una conversión o cambio de principal que choque con otra pieza debe informar el conflicto y permitir corregirlo antes de confirmar, sin dejar una conversión parcial ni relajar silenciosamente las reglas actuales.
- Respetar los ADRs de arquitectura hexagonal, dominio rico, lectura previa de Article para proteger su Story, estado frontend sin store global y nacimiento de entidades mediante identificadores.

## Testing Decisions

Puntos de prueba aprobados por el usuario:

- Priorizar comportamiento observable mediante el límite público existente DataPort/preload/handlers con servicios reales y SQLite temporal o en memoria con migraciones reales. Un recorrido integrado debe crear una pieza, escribir, versionar, ramificar y reabrir sin llamar directamente a tablas para simular el comportamiento.
- Reutilizar unit tests de dominio para invariantes y conflictos editoriales difíciles de aislar en un recorrido, sin replicar la implementación ni sustituir SQLite por mocks.
- Reutilizar Jest y Testing Library para interacciones, errores y cancelaciones del renderer; los dobles de DataPort solo verifican comportamiento de la UI, no prueban la persistencia ni IPC real.
- Como precedentes existentes, usar las suites de servicios de Article, repositorios SQLite de Post, handlers IPC y continuidad de foco durante autoguardado. La suite integrada propuesta combina esas fronteras existentes; no afirmar que hoy existe un único harness que ya las recorra todas.
- Verificar en Electron/Chromium la edición de dos variantes, foco y continuidad de autoguardado, scroll, selección de fragmentos, comparación y resolución de conflictos. No afirmar geometría usando jsdom.
- Cubrir las dos clases de pieza en las pruebas de aceptación. Probar migración de datos previos y reapertura real de la BD, no solo una base nueva en memoria.
- Incluir guardado/cancelación antes de recuperar e integrar, incrementos, versiones sin diferencias, notas como único cambio, origen e historial al convertir, principal única, archivos reversibles y registros de publicación estables.
- Probar escrituras tardías y fallos de persistencia en operaciones de varias entidades, verificando ausencia de mezclas entre variantes y de conversiones parciales.
- Cada ticket debe demostrar su recorrido completo antes de avanzar. La validación final coteja cada regla con evidencias; no confundir documentación publicada con funcionalidad implementada.

## Out of Scope

- Cambiar Stories o sus reglas de organización.
- Git real, repositorios remotos, sincronización, colaboración multiusuario o publicación automática.
- Clasificación automática del impacto, garantías de calidad o viralidad, generación o evaluación de escritura mediante IA.
- Comparaciones e integraciones entre piezas independientes o conversiones entre Article y Post.
- Borrado destructivo, poda o reescritura de versiones; nuevas reglas de borrado de piezas existentes requieren otro alcance.
- Sustituir CodeMirror, modificar el tema o rediseñar el resto de la aplicación.

## Further Notes

- Vocabulario: Editorial draft, Editorial version, Editorial variant, Primary variant, Editorial restoration, Editorial comparison, Editorial integration, Editorial conflict, Review note, Review snapshot y Published version reference.
- Esta especificación recoge las decisiones confirmadas en la conversación. Las elecciones físicas de almacenamiento y del algoritmo de diferencias deben justificar sus consecuencias sin añadir requisitos de producto.
- La conversión de una variante con integraciones conserva la línea histórica de esa variante y las referencias de procedencia; no equivale a copiar todo el árbol de exploraciones del origen.
- El usuario aprobó los puntos de prueba y el desglose de 18 tickets antes de su publicación.

La implementación fue cotejada ticket a ticket; ver [la revisión de implementación](implementation-review.md) para las comprobaciones y los límites de runtime.
