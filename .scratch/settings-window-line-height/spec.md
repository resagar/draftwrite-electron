# Ventana de configuración e interlineado de escritura

Status: ready-for-agent
Fecha: 2026-10-31
Feature: settings-window-line-height
Referencia: [Configuración de tipografía existente](../typography-settings/spec.md)

## Problem Statement

La configuración actual ocupa el workspace y oculta temporalmente el documento.
Quien escribe necesita ajustar sus preferencias en una ventana aparte, viendo el
resultado en el documento sin abandonar la escritura. Además, el interlineado del
editor y de los previews está fijado en 2 y no puede adaptarse a sus necesidades.

## Solution

El engranaje abre una ventana nativa de configuración, independiente y no modal.
La ventana principal conserva el documento y continúa siendo interactiva. Los
cambios se reflejan inmediatamente entre ambas ventanas y mantienen la persistencia
y las opciones tipográficas existentes.

Editor y preview incorporan controles independientes de interlineado, expresado
como multiplicador del tamaño de fuente. El valor predeterminado sigue siendo 2.
Como decisión operativa para esta spec, se permite de 1 a 3, con botones de paso
0,1 y entrada numérica exacta dentro del rango. No se añade interlineado a la
configuración de la interfaz general.

## User Stories

1. Como persona que escribe, quiero que el engranaje abra una ventana nativa aparte para configurar la app sin reemplazar el workspace.
2. Como persona que escribe, quiero seguir escribiendo mientras configuración está abierta para comparar los cambios con mi documento.
3. Como persona que escribe, quiero mantener el documento, borrador incompleto, selección, cursor y scroll al abrir y cerrar configuración para no perder mi lugar ni mi trabajo.
4. Como persona que escribe, quiero que una segunda apertura enfoque la ventana existente para no acumular ventanas de configuración.
5. Como persona que escribe, quiero recuperar la ventana de configuración si está minimizada para encontrarla al pulsar el engranaje.
6. Como persona que escribe, quiero cerrar configuración mediante su control de cierre o una acción visible para volver a escribir sin cerrar la app.
7. Como persona que escribe, quiero reabrir configuración después de cerrarla para seguir ajustando mis preferencias.
8. Como persona que escribe, quiero que configuración se cierre con la ventana principal para no dejar una ventana huérfana.
9. Como persona que escribe, quiero que configuración muestre mis valores actuales al abrirse para no trabajar sobre valores antiguos o predeterminados.
10. Como persona que escribe, quiero ver inmediatamente en la ventana principal los cambios de fuente, tamaño, escala e interlineado para evaluar su resultado.
11. Como persona que escribe, quiero que las preferencias de interfaz también se apliquen a la ventana de configuración para que la presentación sea coherente.
12. Como persona que escribe, quiero que las fuentes incluidas y del sistema sigan disponibles en configuración para conservar las opciones existentes.
13. Como persona que escribe, quiero conservar los avisos y la recuperación de fuentes ausentes para entender cualquier sustitución temporal.
14. Como persona que escribe, quiero ajustar el interlineado del editor para elegir la separación entre los renglones que escribo.
15. Como persona que escribe, quiero ajustar el interlineado del preview de forma independiente para adaptar su lectura sin cambiar el editor.
16. Como persona que escribe, quiero comenzar con interlineado 2 en ambos contextos para conservar la apariencia actual.
17. Como persona que escribe, quiero ingresar un multiplicador exacto y aumentarlo o reducirlo con botones para ajustarlo con precisión.
18. Como persona que escribe, quiero que los controles impidan aplicar valores inválidos para conservar una presentación utilizable.
19. Como persona que escribe, quiero que los números de línea permanezcan alineados con el texto del editor al cambiar el interlineado para ubicarme correctamente.
20. Como persona que escribe, quiero que el preview aplique su interlineado a texto, títulos, listas, tablas y código para que la lectura sea coherente.
21. Como persona que escribe, quiero conservar los tamaños relativos de títulos y el código monoespaciado para mantener la estructura del preview.
22. Como persona que escribe, quiero que fuente, tamaño, interlineado y escala sean ajustes independientes para cambiar uno sin sobrescribir los demás.
23. Como persona que escribe, quiero conservar todas mis preferencias existentes al actualizar la app para no tener que configurarlas de nuevo.
24. Como persona que escribe, quiero conservar el interlineado al cerrar y reiniciar la aplicación para no repetir el ajuste.
25. Como persona que escribe, quiero restaurar el contexto elegido a sus valores iniciales, incluido interlineado 2, para recuperar su apariencia sin modificar el otro contexto.
26. Como persona que escribe, quiero que las preferencias sean globales para Story, Article y Post para obtener la misma experiencia en todos mis documentos.
27. Como persona que escribe, quiero que la sincronización entre ventanas no deshaga cambios recientes para que prevalezca mi última elección.
28. Como persona que escribe, quiero recibir un aviso cuando no se puedan guardar los cambios para distinguir el resultado visible del guardado permanente.
29. Como persona que escribe, quiero que el scroll y su sincronización se adapten a la nueva geometría del texto para seguir leyendo y editando correctamente.
30. Como persona que escribe, quiero operar la configuración con teclado, etiquetas claras y contenido desplazable para acceder a los ajustes también en una ventana pequeña.

## Implementation Decisions

### Ventana y ciclo de vida

- Interpretar «ventana aparte» como una BrowserWindow nativa, no como un modal, un popup HTML o una pestaña del workspace. Es una ventana auxiliar no modal y redimensionable de la ventana principal.
- Mantener como máximo una ventana de configuración por instancia de la aplicación. Abrir de nuevo restaura, muestra y enfoca la existente; después de cerrarla se puede crear otra.
- El main es dueño del ciclo de vida de ambas ventanas. Cerrar la auxiliar no termina la aplicación. Cerrar la principal cierra su auxiliar y elimina referencias y suscripciones obsoletas. La reactivación de la app no debe producir ventanas huérfanas o duplicadas.
- Usar una entrada interna del renderer para configuración. Esta entrada monta únicamente sus proveedores y controles necesarios, sin crear otro workspace, biblioteca o editor oculto. La entrada principal deja de ocultar o volver inert su workspace al abrir configuración.
- La ventana de configuración tiene título y acción de cierre en inglés. La navegación anterior de «volver» se adapta a cerrar la ventana auxiliar. No se introduce botón Guardar ni un flujo de Aplicar/Cancelar.
- Abrir y cerrar la auxiliar no desmonta ni cambia la selección del editor. Una edición tipográfica puede recalcular la geometría, pero no sustituye el documento ni dispara descarte o guardado forzado de borradores incompletos.

### Preferencias compartidas y frontera de plataforma

- Reutilizar el módulo de preferencias, los controles existentes y el puerto de presentación. Mantener React para el estado de UI, sin añadir una librería de store global. No modificar las entidades Story, Article o Post, sus DTOs ni el esquema SQLite.
- Justificar la ampliación del contrato de plataforma por dos necesidades nuevas: abrir/enfocar configuración y comunicar preferencias entre renderers. Exponer capacidades tipadas mediante DataPort, preload y un adapter IPC; los componentes no importan Electron ni Node.
- El contrato incluye apertura idempotente, obtención del estado actual, publicación de cambios y notificación de preferencias aceptadas. Mantener los errores de petición compatibles con la envoltura existente y hacer explícita la cancelación de suscripciones.
- La apertura obtiene la última instantánea efectiva, no solo los defaults o una copia antigua de almacenamiento. La suscripción y la hidratación no pueden perder cambios que lleguen durante el arranque de la auxiliar.
- Las actualizaciones identifican el contexto y los campos editados. Se combinan con el estado vigente, conservando los demás campos y contextos. Los receptores aplican las notificaciones sin volver a publicarlas; el orden de aceptación evita que respuestas antiguas reviertan cambios más recientes.
- Conservar la clave de preferencias local existente y la persistencia inmediata. Establecer un único responsable de guardar cada cambio para evitar escrituras duplicadas y bucles. No usar exclusivamente la lectura inicial de localStorage como mecanismo de sincronización.
- La notificación de un cambio visible no depende de que el guardado permanente tenga éxito. Si falla almacenamiento, el cambio sigue vigente durante la sesión y se informa el fallo; no se anuncia guardado exitoso. Reabrir configuración durante esa sesión utiliza la elección efectiva más reciente.
- Registrar el manejo de permisos de la sesión para las dos ventanas autorizadas. Crear o cerrar la auxiliar no puede reemplazar la política con un handler que deje de reconocer a la principal. Limitar fuentes locales y la escritura de texto en el portapapeles a los frames principales conocidos de la app; conservar Copy source text.
- Validar el emisor y el payload en los nuevos mensajes de plataforma. No aceptar URLs arbitrarias para abrir configuración, no exponer primitivas genéricas de IPC y no ampliar permisos a páginas enlazadas o subframes.
- Conservar fuentes incluidas, catálogo del sistema, búsqueda, deduplicación, fallback y recuperación de una elección ausente. Configuración usa los valores actuales de fuente y escala de interfaz desde su primera presentación utilizable.

### Interlineado

- Añadir una preferencia numérica lineHeight a editor y preview. La interfaz general conserva únicamente sus controles existentes de fuente y escala.
- El valor es un multiplicador CSS sin unidad. Predeterminado 2; rango inclusivo de 1 a 3. Los botones avanzan 0,1 sin acumular artefactos de precisión; la entrada exacta admite decimales válidos del rango, por ejemplo 1,25.
- Los datos almacenados anteriormente, que carecen de lineHeight, se leen como 2 por contexto sin borrar fuente, tamaño o escala. Un valor ausente o inválido recupera únicamente el default de ese campo, no los demás ajustes válidos.
- Rechazar como valores efectivos NaN, infinitos, negativos, cero y números fuera del rango. Una entrada transitoria vacía o fuera de rango no se aplica ni se transmite; al salir del campo se recupera el último valor válido, siguiendo el comportamiento del control numérico existente.
- Aplicar el interlineado del editor a contenido, scroller y gutters para conservar la alineación. El ajuste no depende de fuente, tamaño o escala de interfaz.
- Aplicar el interlineado de preview al cuerpo y a los bloques que actualmente fijan leading-loose: párrafos, títulos, citas, listas, tablas y bloques de código. El código continúa monoespaciado y los títulos conservan sus tamaños relativos. No añadir espaciado configurable entre párrafos o bloques.
- Reutilizar las variables tipográficas y los componentes compartidos para que el cambio alcance todos los editores y previews de Story, Article y Post. No agregar preferencias por documento.
- Restaurar editor o preview restablece sus valores existentes y lineHeight 2, preservando los otros contextos. El restablecimiento también se propaga inmediatamente entre ventanas.
- Recalcular las medidas del editor, el índice de líneas del preview y su espacio inferior cuando cambie la geometría. Mantener el mapeo de scroll basado en las medidas actuales, sin generar contenido Markdown ni crear una nueva instancia del editor para forzar la actualización.

## Testing Decisions

- Reutilizar los puntos de prueba ya acordados: integración de aplicación/Settings con FakePort, persistencia de preferencias y renderer real. La instrucción de publicación directa reemplaza una nueva ronda de confirmación; no se solicitan preguntas adicionales.
- Probar comportamiento externo: qué ventana aparece, qué controles se ofrecen, qué valor permanece y qué cambia en el documento. No probar contadores privados de BrowserWindow ni la forma interna del provider.
- Preferir el harness de Electron como punto de integración principal para las dos ventanas. Chromium aislado y jsdom no acreditan ciclo de vida nativo, sincronización real entre renderers, permisos de sesión ni geometría del texto.
- Extender los tests existentes de preferencias con migración de datos sin lineHeight, validación independiente por campo, extremos 1 y 3, decimal 1,25, persistencia y restauración. Mantener expectativas previas de fuentes, tamaños y escala.
- Extender las pruebas de Settings y el fake de plataforma para los controles de interlineado, ausencia de control en interfaz, mensajes de fallo, actualización parcial y recepción de cambios sin eco. Sustituir únicamente la frontera de plataforma, no la lógica de preferencias.
- En Electron con perfil y SQLite temporales, abrir desde el engranaje, comprobar dos ventanas, enfocar/restaurar sin duplicar, cerrar y reabrir configuración y cerrar la principal sin dejar la auxiliar. La principal permanece editable durante todo el flujo.
- Cambiar configuraciones desde la auxiliar y observarlas en la principal sin recargar. Probar cambios rápidos de campos distintos, cerrar/reabrir la auxiliar y reiniciar la app para comprobar valores y persistencia. Incluir un fallo de guardado para distinguir sincronización de almacenamiento permanente.
- Medir en Electron: editor de 16 px e interlineado 1,5 produce filas de 24 px; preview de 20 px e interlineado 1,25 produce líneas de cuerpo de 25 px; modificar uno no altera el otro. Comprobar alineación de gutters, títulos, código, escalas 80/150 %, extremos y scroll sincronizado tras el cambio.
- Abrir configuración por sí solo conserva instancia, documento, borrador incompleto, selección, cursor y scroll. Cuando cambia interlineado, conservar el lugar lógico de edición y verificar la sincronización con la geometría nueva; no exigir un scrollTop idéntico a pesar del cambio de altura de líneas.
- Verificar fuentes locales y del sistema en la auxiliar y Copy source text en la principal, sin permisos sustituidos en el harness de Electron. Probar rechazo de emisores ajenos y payloads inválidos en la frontera de plataforma.
- Actualizar las pruebas de navegación y el harness solo para reflejar la sustitución deliberada de la pantalla interna por la ventana auxiliar; no relajar las garantías anteriores de conservación ni ocultar fallos.
- Antes de completar la implementación, ejecutar typecheck, lint, tests afectados, suite completa y build; revisar ambas entregas contra esta spec y registrar qué se comprobó realmente en Electron.

## Out of Scope

- Implementar la funcionalidad como parte de esta publicación de planificación.
- Múltiples ventanas de configuración, múltiples workspaces o edición de documentos desde la auxiliar.
- Preferencias por documento, perfiles, sincronización entre equipos o almacenamiento en la nube.
- Interlineado configurable de la interfaz general, márgenes entre párrafos, ancho de lectura o espaciado entre letras.
- Temas nuevos, nuevas fuentes, instalación de fuentes o cambios de peso y ligaduras.
- Recordar posición/tamaño de la ventana auxiliar, una nueva arquitectura general de ventanas o una plataforma genérica de configuración.
- Cambios de contenido Markdown, exportación, esquema de dominio o repositorios de escritura.

## Further Notes

- Esta es una extensión de la configuración implementada en dfbb46b. Sustituye únicamente la presentación dentro del workspace y la exclusión anterior del interlineado; no modifica ni cierra la spec original.
- Ventana nativa no modal, instancia única, rango 1–3 y botones de paso 0,1 son decisiones operativas explícitas para concretar la petición sin otra entrevista. El default 2 y la independencia de editor/preview provienen de la petición y del alcance previo.
- Se publican dos tickets verticales independientes. Ninguno requiere que el otro se complete primero: los controles compartidos pueden ampliarse antes o después de trasladarlos a la auxiliar. El último en integrarse verifica el flujo combinado de dos ventanas e interlineado.
- Los artefactos quedan ready-for-agent por instrucción directa del usuario. Publicar esta spec y sus tickets no autoriza a iniciar implementación ni crear un commit.
