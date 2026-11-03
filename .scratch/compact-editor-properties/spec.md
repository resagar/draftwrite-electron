# Spec: propiedades compactas de Story, Article y Post

**Status:** ready-for-agent

**Fecha:** 2026-11-03

## Problem Statement

Las propiedades ocupan espacio vertical permanente por encima de Text, incluso cuando la persona no las está editando. Story mantiene Titles y Tags abiertos, Article reserva una fila para Subtitle y Post otra para Source. Una Story con tres Titles llegó a ocupar unos 170 píxeles de propiedades en la investigación.

Article tiene además un problema de ancho útil: con la fuente abierta, Title llegó a medir 18 píxeles. Una compactación que fuerce todos los campos a una sola fila empeoraría esa situación.

## Solution

Presentar propiedades principales siempre visibles y secundarios en un desplegable local Properties con resumen. La persona obtiene más área para escribir cuando no edita esos secundarios y puede volver a ellos sin perder sus datos ni interrumpir el autoguardado.

| Entidad | Siempre visible | En Properties |
| --- | --- | --- |
| Story | Topic y acciones existentes | Titles y Tags |
| Article | Title, Story y acciones existentes | Subtitle |
| Post | Topic, State, acciones existentes y ScheduledAt cuando State sea scheduled | Source |

Target conserva su acceso y ubicación actuales. La distribución responde al ancho disponible dentro del editor; en Article estrecho Title puede ocupar una fila completa y Story otra.

## User Stories

1. Como escritor, quiero ver Topic de una Story sin desplegar otras propiedades para identificarla y empezar a escribir.
2. Como escritor, quiero abrir Titles cuando necesito editarlos para que no ocupen espacio permanente.
3. Como escritor, quiero abrir Tags cuando necesito organizarlos para mantener despejada mi zona de trabajo.
4. Como escritor, quiero ver cuántos Titles y Tags tienen contenido para reconocer la información existente sin abrirlos.
5. Como escritor, quiero conservar una etiqueta aún sin confirmar al plegar y reabrir Properties para no perder lo que estaba anotando.
6. Como escritor, quiero ver Title y Story de un Article para saber qué escribo y de dónde proviene.
7. Como escritor, quiero disponer de ancho útil en Title aun con la fuente abierta para poder leerlo y editarlo.
8. Como escritor, quiero editar Subtitle desde Properties para que un campo opcional no reserve una fila permanente.
9. Como escritor, quiero reconocer si un Article tiene Subtitle cuando Properties está plegado para no ignorar contenido existente.
10. Como escritor, quiero seguir usando Target en su ubicación actual para conservar mi flujo de edición.
11. Como escritor, quiero ver Topic y State de un Post sin abrir Properties para identificarlo y gestionar su estado.
12. Como escritor, quiero ver ScheduledAt al elegir scheduled para encontrar la fecha opcional sin una segunda acción.
13. Como escritor, quiero ver un resumen de Source y desplegar su edición para conservar el contexto con menos controles abiertos.
14. Como escritor, quiero que los bloqueos de procedencia se mantengan para evitar cambios que el dominio no permite.
15. Como escritor, quiero que el autoguardado respete Properties abierto o cerrado para que no reorganice la interfaz mientras escribo.
16. Como escritor, quiero conservar foco, cursor y selección durante el guardado para seguir escribiendo sin clics adicionales.
17. Como escritor, quiero abrir y cerrar Properties con el teclado para trabajar sin depender del mouse.
18. Como escritor, quiero encontrar los errores de propiedades aunque el grupo estuviera cerrado para poder corregirlos.
19. Como escritor, quiero que abrir otra entidad muestre exclusivamente sus datos para no mezclar borradores entre sesiones.
20. Como escritor, quiero conservar el tamaño de controles y texto para obtener una interfaz compacta que siga siendo legible.

## Implementation Decisions

- Limitar la implementación a la presentación y las interacciones de las propiedades. Mantener la identidad visual existente, las etiquetas de interfaz en inglés y el vocabulario Story, Article, Post, Topic, Titles y Tags.
- Mostrar Properties inicialmente plegado en cada nueva sesión de edición, tanto al crear como al abrir una entidad existente. El resumen permanece visible con los valores actuales del borrador; los errores pueden revelar automáticamente su grupo sin mover el foco.
- En Story, el resumen cuenta Titles con contenido no vacío y Tags confirmados. Los inputs vacíos y el texto de una etiqueta sin confirmar se conservan al plegar, pero no se presentan como valores ya completados.
- En Article, el resumen comunica la presencia o ausencia de Subtitle y permite reconocer un valor existente sin ocupar otra fila completa. Title y Story permanecen visibles. Cuando no caben con ancho útil en la misma fila, se distribuyen en filas distintas; Title ocupa el ancho interior disponible de su fila.
- En Post, mantener State visible y mostrar ScheduledAt, con su condición opcional actual, siempre que State sea scheduled. El resumen de Source indica la entidad elegida o No source. Desplegar su edición conserva los bloqueos actuales por State.
- Mantener las acciones existentes accesibles. El acceso a Properties comparte la fila principal solo cuando haya espacio; el comportamiento se adapta al ancho del contenedor y admite varias filas.
- Mantener las fuentes, tamaños de controles y escala de interfaz existentes. La reducción de altura proviene de agrupar campos secundarios y ajustar la composición, sin disminuir su legibilidad ni sus áreas de activación.
- El contenido plegado se conserva montado, incluido el borrador local de TagInput, y queda fuera del orden de tabulación y del contenido accesible mientras está oculto. El control informa el estado de expansión y funciona con teclado; se puede usar el patrón nativo equivalente.
- La apertura elegida por la persona permanece estable durante el autoguardado y la transición de creación a entidad guardada. Plegar devuelve o conserva el foco en su control; desplegar no roba foco hacia un campo de manera automática.
- Conservar editorSession y la transición create/complete. No cambiar claves ni desmontar el editor para actualizar propiedades, encabezados, resúmenes o estado de persistencia.
- Mantener los campos requeridos, validaciones, mensajes de error, debounce y persistencia actuales. Conservar la procedencia inmutable de Article, incluido su bloqueo durante la creación y desbloqueo si falla, y las reglas de State, ScheduledAt y Source de Post.
- Mantener el estado del desplegable local a la sesión de edición. No agregar preferencias globales, persistencia del desplegado, un store global ni nuevos contratos de datos. Usar el mismo patrón de interacción en las tres entidades; compartir código solo cuando haya una necesidad concreta, sin imponer una abstracción previa.
- Mantener TextEditor, EditorPreviewLayout, toolbar, vista previa, ancho de lectura y tipografía. El área disponible para Text puede crecer al plegar propiedades sin modificar la implementación de Text ni elevar su estado al Workspace.
- No modificar esquema, contratos IPC, DataPort ni servicios de dominio. Las interfaces internas de presentación pueden incorporar el estado de expansión y los resúmenes necesarios.

## Testing Decisions

- Usar como frontera funcional principal la aplicación completa con renderApp y el DataPort fake existente. Es la misma frontera usada por App y por las regresiones de foco del autoguardado; no crear otra frontera de componentes internos.
- Probar comportamiento observable: campos visibles, resúmenes, acceso por teclado, valores al reabrir, datos persistidos, errores, selección y foco. Evitar aserciones sobre el número de renders, hooks, composición privada o técnica elegida para el desplegable.
- Cubrir por entidad creación y apertura de registros existentes, Properties inicialmente plegado, edición tras desplegar, resumen actualizado, plegado y reapertura sin pérdida de información.
- Cubrir un Tag sin confirmar, múltiples Titles y Tags, Subtitle y Source largos, fuente ausente y los estados pending, scheduled y published de Post. Al elegir scheduled, la fecha opcional debe aparecer aunque Properties esté cerrado.
- Conservar y ejecutar las regresiones de autoguardado: primer guardado, actualizaciones posteriores, escritura durante una creación lenta, navegación y nueva sesión. Añadir comprobaciones de que el guardado no cambia la expansión, el foco ni la selección.
- Verificar teclado y estado accesible del desplegable, etiquetas, exclusión de controles ocultos del orden de foco y visibilidad de errores. Usar Chromium para la navegación de foco que dependa de visibilidad real.
- Medir layout y geometría en Chromium, con CSS y fuentes reales, a 1280 × 800 y 900 × 600; propiedades abiertas/cerradas, fuente abierta/cerrada, modo edit/split/preview y escalas de interfaz soportadas. No usar jsdom para afirmar altura, ancho útil o reflow.
- Comparar la banda cerrada con la línea base de investigación usando los mismos fixtures y condiciones. Story debe liberar la altura del bloque de Titles/Tags y Post pending la fila de edición de Source; documentar medidas antes y después. En Article, priorizar ancho útil de Title en panel estrecho aunque necesite otra fila, y registrar el balance de altura sin exigir una fila universal.
- Confirmar que Title ocupa el ancho disponible en su propia fila cuando el panel es estrecho y deja de reducirse al mínimo intrínseco de 18 píxeles. Comprobar que etiquetas, mensajes y acciones siguen accesibles sin depender solo de scrollWidth.
- Ejecutar los tests pertinentes, typecheck y lint; completar la suite de tests al cerrar la implementación. Revisar el resultado contra esta spec y registrar límites de cualquier validación no ejecutada.

## Out of Scope

Cambiar Text, CodeMirror, toolbar, preview, ancho de lectura, fuentes o preferencias de tipografía; reorganizar el shell, lista o paneles de fuente; mover o duplicar Target; cambiar las reglas de negocio o requisitos de creación; agregar modales, drawers laterales o un sistema configurable de propiedades; modificar IPC o SQLite; optimización general de renders y promesas de un porcentaje fijo de ahorro.

## Further Notes

La investigación midió el diseño actual con fixtures en Chromium: Story válida sin Titles y Article válido, aproximadamente 95 píxeles de banda; Story con tres Titles, aproximadamente 170; Post pending, 81; Post scheduled, 117. Son líneas base en la configuración medida, no dimensiones objetivo ni ahorro ya demostrado.

El beneficio de Properties cerrado se obtiene a cambio de una acción adicional para editar secundarios. El diseño mantiene visibles los identificadores y el estado editorial. Estas notas describen la investigación previa. Las medidas de la implementación se registran por separado en su informe de verificación.

Desglose aprobado: tres tickets funcionales independientes, uno por entidad, con sus propias regresiones y mediciones. No se requiere un prefactor separado ni dependencias artificiales para compartir un componente.
