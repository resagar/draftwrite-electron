# Propiedades de edición más compactas

Fecha: 2026-11-03. Investigación previa a la implementación, sobre el baseline `8218176`. Los resultados siguientes describen ese diseño y su propuesta original; la spec aprobada y la verificación de la implementación se conservan en el tracker de compact-editor-properties.

## Resultado

Sí: se puede reducir el espacio que ocupan las propiedades sin cambiar el contenido, la tipografía ni el comportamiento de Text. Los tres editores ya separan sus bandas de propiedades del bloque que contiene TextEditor y la vista previa. El cambio puede concentrarse en esas bandas; Text recibiría el alto que se libere, conservando su implementación. Fuentes: [StoryEditor, líneas 84–112](../../src/renderer/src/workspace/StoryEditor/StoryEditor.tsx#L84-L112), [ArticleEditor, líneas 130–161](../../src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx#L130-L161), [PostEditor, líneas 103–152](../../src/renderer/src/workspace/PostEditor/PostEditor.tsx#L103-L152).

La oportunidad principal es mostrar progresivamente los campos secundarios, no achicar todos los controles. En la medición actual, los inputs principales ya tienen 28 px de alto. Además, Article tiene un problema de ancho utilizable: en ciertas configuraciones Title termina con solo 18 px. Por eso la propuesta debe adaptarse al ancho real del contenedor y permitir más de una fila cuando haga falta.

## Qué existe hoy

| Superficie | Propiedades y organización actual | Oportunidad acotada |
| --- | --- | --- |
| Story | Topic obligatorio en la primera fila; Titles y Tags en un bloque inferior. Cada Title agrega un input y una fila. | Mantener Topic visible; agrupar Titles y Tags en una sección desplegable con resumen. |
| Article | Story y Title obligatorios comparten fila; Subtitle ocupa otra. Story se bloquea durante la creación en vuelo y después de crear. | Mantener Story y Title visibles, dando ancho útil a Title; ofrecer Subtitle en una sección desplegable. |
| Post | Topic y State comparten fila. Source opcional está debajo; ScheduledAt aparece si State es scheduled y es opcional. Source queda bloqueado cuando el Post no está pending. | Mantener Topic y State visibles; hacer desplegable la edición de Source, conservando un resumen visible. ScheduledAt debe seguir visible cuando corresponda. |
| Target de Article | Ya dispone de un acceso y un panel propios en la zona de fuente, fuera de ArticleBand. | Mantener esa ubicación; incluirlo en la banda duplicaría o desplazaría una interacción que ya está separada. |

Fuentes: [StoryBand, líneas 12–49 y 51–125](../../src/renderer/src/workspace/StoryBand/StoryBand.tsx#L12-L125), [ArticleBand, líneas 5–114](../../src/renderer/src/workspace/ArticleBand/ArticleBand.tsx#L5-L114), [ArticleEditor, líneas 53–75 y 130–147](../../src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx#L53-L147), [PostBand, líneas 5–155](../../src/renderer/src/workspace/PostBand/PostBand.tsx#L5-L155), [ArticleTargetFooter, líneas 10–18](../../src/renderer/src/workspace/TargetPanel/ArticleTargetFooter.tsx#L10-L18), [SourcePane, líneas 127–130](../../src/renderer/src/workspace/SourcePane/SourcePane.tsx#L127-L130) y [TargetPanel, líneas 99–165](../../src/renderer/src/workspace/TargetPanel/TargetPanel.tsx#L99-L165).

Topic, Title y los selectores principales ya tienen etiquetas junto al control. El margen para una compactación basada solo en alinear etiquetas es, por tanto, limitado; Titles, Tags y Subtitle son los bloques que añaden filas permanentes. Esta observación procede de los componentes anteriores, no de datos sobre frecuencia de uso.

## Línea base medida en Chromium

Se renderizó la aplicación con un DataPort fake y fixtures, CSS de Tailwind compilado incluyendo el código del repositorio y las fuentes reales. Se midieron los rectángulos de las bandas, sus filas y controles en Chromium headless con ventanas de 1280 × 800 y 900 × 600, zoom de la interfaz al 100 %, modo split y panel de fuente visible. Se mantuvieron los anchos iniciales de lista y fuente. Las medidas son píxeles CSS del diseño actual; no son ahorro de una propuesta.

| Banda y estado de prueba | Alto a 1280 × 800 | Alto a 900 × 600 |
| --- | ---: | ---: |
| Story vacío, con aviso de Topic requerido | 117,56 px | 117,56 px |
| Story con Topic válido, sin Titles | 95,28 px | 95,28 px |
| Story con Topic válido y tres Titles | 169,56 px | 169,56 px |
| Article vacío, con aviso de campos requeridos | 117,56 px | 131,84 px |
| Article con identificadores válidos | 95,28 px | 95,28 px |
| Post vacío, con aviso de Topic requerido | 103,28 px | 103,28 px |
| Post válido, pending | 81,00 px | 81,00 px |
| Post válido, scheduled, con fecha visible | 117,00 px | 117,00 px |

En Story y Article válidos se midieron filas de 28 y 42,28 px, más separación, padding y borde. En Post pending son dos filas de 28 px. En Post scheduled la fila de Source y fecha envuelve contenido y la banda crece de 81 a 117 px. En Article vacío a 900 × 600, el aviso ocupa dos líneas y también aumenta la altura. Esas diferencias explican el coste de los bloques actuales; no justifican ocultar avisos ni fechas relevantes.

En Article, con la fuente visible, la banda dispone de 420 px de ancho en la ventana de 1280 × 800: Story ocupa 230 px y Title queda en 18 px. En la ventana de 900 × 600 la banda tiene 204 px y ambos controles quedan en 18 px. La captura confirma que apenas se ven el selector y el input. El documento no presentaba overflow horizontal, por lo que comprobar solo scrollWidth no detecta este problema de uso.

Evidencia de la sesión: [mediciones JSON](</tmp/draftwrite-properties-research/measurements.json>), [Story con tres Titles](</tmp/draftwrite-properties-research/story-1280x800.png>), [Article a 900 × 600](</tmp/draftwrite-properties-research/article-900x600.png>) y [Post scheduled](</tmp/draftwrite-properties-research/post-1280x800.png>). Son artefactos temporales; la tabla y los hallazgos anteriores conservan los resultados en el repositorio. Se descartó un primer ensayo sin las utilidades de Tailwind compiladas; no se usó para estas conclusiones.

## Recomendación

Usar una banda compacta, adaptable al contenedor, con los campos esenciales visibles y un disclosure local para los secundarios. Es una recomendación de diseño pendiente de validar con una propuesta visual, no una decisión ya tomada por el usuario.

| Superficie | Siempre visible | Contenido desplegable y resumen |
| --- | --- | --- |
| Story | Topic, acciones existentes y acceso a Properties. | Titles y Tags. Resumen con cantidades reales, por ejemplo, `3 titles · 2 tags`; los valores completos siguen disponibles al desplegar. |
| Article | Title, Story y acciones existentes. Title recibe ancho útil; Story puede pasar a otra fila compacta si no entra. | Subtitle, con indicación de si tiene valor y un resumen breve cuando esté plegado. Target conserva su acceso actual. |
| Post | Topic, State y, cuando State sea scheduled, ScheduledAt con su etiqueta Optional. | Source: resumen visible de la fuente elegida o de su ausencia; edición desplegable que conserve el bloqueo actual según State. |

El acceso a Properties puede compartir espacio con los controles principales solo cuando haya ancho suficiente. En un Article estrecho, forzar todo a una sola fila sería contraproducente: separar Story y Title puede aumentar parte de la altura, pero devuelve un campo en el que se puede escribir. El balance final depende del ancho disponible y del estado desplegado, no únicamente del ancho total de la ventana.

El resumen debe mostrar que existen propiedades y si contienen información, sin convertir todos sus valores en otra fila extensa. No se recomienda un modal ni un drawer lateral para este cambio: introducirían otro contexto de edición o competirían con el ancho disponible para el editor. Un desplegable en la banda mantiene la interacción junto a sus campos.

El tradeoff es un clic o una activación de teclado adicional para editar los secundarios a cambio de liberar espacio mientras están plegados. Si se exige mantener todos los campos visibles, la alternativa es alinear etiquetas y controles y usar una distribución responsive: añade menos interacción, pero libera menos altura porque los inputs ya son compactos y las filas adicionales siguen presentes. No se midió todavía ninguna de las dos variantes, por lo que no se propone un porcentaje ni una cantidad de píxeles de ahorro.

## Restricciones para conservar la experiencia de edición

- El autoguardado y la transición de creación a entidad persistida no deben plegar propiedades ni mover el foco. La apertura elegida por la persona debe sobrevivir a esa transición. Mantener la identidad de sesión y el montaje del editor que corrigieron la pérdida de foco. Fuentes: [Workspace](../../src/renderer/src/workspace/Workspace/Workspace.tsx), [workspace-context](../../src/renderer/src/state/workspace-context.tsx) e [investigación del autoguardado](./autosave-focus-loss.md).
- Al plegar secundarios, conservar los componentes y sus borradores locales. TagInput mantiene texto propio hasta Enter o coma; desmontarlo perdería una etiqueta todavía sin confirmar. El contenido plegado debe dejar de ser alcanzable por Tab; ocultarlo visualmente sin retirarlo del orden de foco no basta. Fuentes: [TagInput, líneas 9–28 y 53–60](../../src/renderer/src/forms/TagInput/TagInput.tsx#L9-L60) y [WAI sobre elementos ocultos](https://www.w3.org/WAI/tutorials/forms/labels/#note-on-hiding-elements).
- Mantener validaciones y errores visibles o revelar el grupo que los contiene. No ahorrar altura suprimiendo información necesaria para completar el campo. Conservar los bloqueos de Story en Article y Source en Post; la compactación no cambia esas reglas. Fuentes: [ArticleBand](../../src/renderer/src/workspace/ArticleBand/ArticleBand.tsx), [ArticleEditor](../../src/renderer/src/workspace/ArticleEditor/ArticleEditor.tsx) y [PostBand](../../src/renderer/src/workspace/PostBand/PostBand.tsx).
- Mantener la edición de propiedades en su estado local actual; no elevar Text al estado del Workspace ni modificar TextEditor, EditorPreviewLayout, su toolbar, el ancho de lectura, el contenido o la tipografía. La separación existente permite acotar el cambio a las bandas, aunque su menor altura cambie el alto disponible para Text.

## Accesibilidad y validación de una futura propuesta

Un disclosure personalizado necesita un botón con estado aria-expanded, activable con Enter y Space; aria-controls puede relacionarlo con el contenido. Las etiquetas deben conservar su asociación con cada campo y una relación visual clara. Ponerlas al lado es válido cuando hay ancho suficiente; apilarlas sigue siendo necesario cuando la fila deja de ser legible. Fuentes primarias: [W3C APG: Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) y [W3C WAI: Labeling Controls](https://www.w3.org/WAI/tutorials/forms/labels/).

La reducción de densidad vertical no debe apoyarse en objetivos de puntero diminutos. WCAG 2.2, criterio 2.5.8, establece 24 × 24 píxeles CSS o alguna de sus excepciones, incluida separación suficiente. Conviene conservar áreas de activación cómodas al revisar botones de propiedades, eliminación de títulos y tags. Esto es una restricción para la propuesta, no un veredicto de conformidad de los controles actuales. Fuente primaria: [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

Antes de implementar una variante, conviene verificar en Chromium las mismas ventanas y estados medidos, además de valores largos, múltiples Titles/Tags y grupos abiertos/cerrados. La comprobación debe medir tanto altura recuperada como ancho realmente editable de Topic, Title y selectores. Debe incluir teclado, foco, selección, una etiqueta sin confirmar al plegar/reabrir y autoguardado durante la creación. Las pruebas de comportamiento pueden usar la aplicación con su DataPort fake; layout y geometría requieren navegador real, no jsdom.

## Límites de la investigación

Se inspeccionó el código y se midió el diseño actual con fixtures en Chromium. No se implementó ni midió la variante compacta, no se modificó Text y no se crearon specs o tickets. La clasificación propuesta usa requisitos de creación y relaciones del dominio; no hay datos de frecuencia de uso que permitan afirmar qué propiedades usa más cada persona.
