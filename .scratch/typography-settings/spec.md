# Configuración de tipografía

Status: ready-for-agent
Fecha: 2026-10-30
Feature: typography-settings

## Problem Statement

Quien escribe no puede adaptar la fuente ni el tamaño de lectura a sus preferencias de forma independiente para el editor, el preview y la interfaz. Necesita hacerlo sin alterar sus documentos, perder su lugar de trabajo ni repetir la configuración en cada sesión.

## Solution

Una pantalla de configuración, accesible desde un engranaje siempre visible en la navegación principal, permite personalizar tres contextos independientes: editor, preview e interfaz. Los cambios se aplican inmediatamente y se guardan globalmente entre sesiones. Ofrece las cinco familias Monaspace incluidas y las fuentes instaladas en el sistema, con búsqueda y restauración de valores por contexto.

## User Stories

1. Como persona que escribe, quiero abrir configuración desde la navegación principal para encontrar mis preferencias fácilmente.
2. Como persona que escribe, quiero volver al mismo documento y posición para continuar sin interrupciones.
3. Como persona que escribe, quiero conservar también un borrador incompleto al abrir configuración para no perder trabajo aún no persistido.
4. Como persona que escribe, quiero elegir la fuente del editor para escribir con comodidad.
5. Como persona que escribe, quiero ajustar el tamaño del editor entre 10 y 40 px para mejorar su legibilidad.
6. Como persona que escribe, quiero elegir una fuente independiente para el preview para adaptar la lectura.
7. Como persona que escribe, quiero ajustar el tamaño base del preview entre 10 y 40 px para leer cómodamente.
8. Como persona que escribe, quiero que los títulos del preview conserven sus proporciones para mantener la jerarquía del documento.
9. Como persona que escribe, quiero conservar el código monoespaciado en el preview para mantener su alineación.
10. Como persona que escribe, quiero que el código acompañe el tamaño del preview para que también resulte legible.
11. Como persona que escribe, quiero elegir la fuente de la interfaz para adaptar menús, botones y campos.
12. Como persona que escribe, quiero escalar la interfaz entre 80 % y 150 %, incluidos controles y espaciados, para conservar su usabilidad.
13. Como persona que escribe, quiero que la escala de la interfaz respete los tamaños independientes del editor y preview para mantener mis elecciones.
14. Como persona que escribe, quiero aumentar o reducir los tamaños con controles e ingresar un valor exacto para ajustarlos con precisión.
15. Como persona que escribe, quiero usar Monaspace Neon, Argon, Xenon, Radon y Krypton sin instalarlas ni conectarme a internet.
16. Como persona que escribe, quiero elegir fuentes instaladas en mi equipo para aprovechar mis preferencias existentes.
17. Como persona que escribe, quiero buscar familias por nombre para encontrar una entre muchas fuentes.
18. Como persona que escribe, quiero distinguir fuentes incluidas y del sistema para saber su procedencia.
19. Como persona que escribe, quiero ver cada familia una sola vez, priorizando la incluida cuando exista duplicación, para evitar elecciones confusas.
20. Como persona que escribe, quiero que los cambios se apliquen y guarden inmediatamente para comprobar el resultado sin pulsar Guardar.
21. Como persona que escribe, quiero conservar mis preferencias al reiniciar para no configurarlas otra vez.
22. Como persona que escribe, quiero aplicar las preferencias a todas las Story, Article y Post para tener una experiencia uniforme.
23. Como persona que escribe, quiero restaurar cada contexto de forma independiente para recuperar sus valores iniciales sin alterar los otros.
24. Como persona que escribe, quiero conservar la apariencia actual hasta personalizarla para que una actualización no cambie mi entorno de trabajo.
25. Como persona que escribe, quiero recibir un aviso en configuración si mi fuente ya no está disponible para entender el reemplazo temporal.
26. Como persona que escribe, quiero que se conserve la fuente ausente y vuelva a utilizarse cuando esté disponible para no perder mi elección.
27. Como persona que escribe, quiero seguir usando las fuentes incluidas si falla la lectura de fuentes del sistema para poder configurar la aplicación.
28. Como persona que escribe, quiero operar los ajustes con teclado y etiquetas accesibles para utilizarlos sin depender del mouse.

## Implementation Decisions

- Son preferencias globales de presentación, independientes del contenido y de las entidades Story, Article y Post; no se agregan propiedades tipográficas a esas entidades.
- Mantener el estado de UI en React, conforme al ADR de estado existente, sin incorporar un store global externo.
- Reutilizar el precedente de persistencia de preferencias de UI en almacenamiento local. Centralizar lectura, validación y escritura; tolerar datos inválidos y errores de almacenamiento sin impedir abrir la app. No informar guardado exitoso si la escritura falla.
- Conservar los valores actuales como defaults: editor Fira Code a 16 px, preview sans actual a 16 px, interfaz Inter con base actual de 14 px y escala 100 %. Conservar también las proporciones y estilos actuales al no personalizar.
- Cada contexto tiene una familia seleccionada; editor y preview tienen tamaño en px y la interfaz una escala relativa a su apariencia inicial. Aceptar únicamente valores finitos dentro de los rangos acordados.
- Separar la familia solicitada de la efectiva: una ausencia activa el fallback del contexto y un aviso, sin sobrescribir la selección persistida. Reevaluar disponibilidad al cargar el catálogo y al volver a configuración; no se requiere vigilancia continua del sistema.
- Empaquetar las cinco familias Monaspace con su licencia; mantener las fuentes actuales y el funcionamiento sin red del ADR de tipografía. No descargar fuentes en ejecución.
- El catálogo distingue familias incluidas y del sistema, permite búsqueda y deduplica por identidad de familia, no por cada peso o estilo. Si una familia está en ambos orígenes, prevalece la incluida.
- No existe aún una capacidad de enumeración de fuentes locales. Agregar una frontera mínima, tipada y de solo lectura para el catálogo, respetando el aislamiento del renderer. Si requiere acceso nativo, exponerlo mediante preload e IPC y el puerto de datos; evitar acceso directo a Node o Electron desde componentes. La técnica concreta debe verificarse con la versión instalada de Electron durante la implementación.
- Mantener los tamaños efectivos del editor y preview independientes de la escala de interfaz. El preview escala títulos respecto del cuerpo y conserva una familia monoespaciada para código.
- Abrir configuración no debe activar descarte, persistencia forzada de un borrador inválido ni pérdida del editor. Conservar documento, borrador, selección, cursor y scroll; preservar la instancia o restaurar explícitamente su estado.
- Restaurar un contexto restablece su familia y tamaño o escala, aplicando y persistiendo el resultado inmediatamente. No modifica otros contextos.
- UI y etiquetas accesibles en inglés, siguiendo las convenciones del proyecto.

## Testing Decisions

- Enfoque de pruebas confirmado por el usuario: integración de aplicación, persistencia y comprobación de fuentes, escalado y scroll en Electron real.
- Priorizar integración al nivel de aplicación, reutilizando renderApp y FakePort, para probar acciones visibles: acceso, selección, independencia de contextos, aplicación inmediata, restauración y conservación de borradores. Evitar pruebas de detalles internos o que repitan la implementación.
- Seguir el precedente de pruebas de persistencia del tamaño de panel para verificar recarga de preferencias, datos corruptos, rangos, errores de almacenamiento y conservación de elecciones ausentes.
- Probar el contrato del catálogo en su frontera: familias duplicadas, prioridad de incluidas, catálogo vacío o fallido y fuente ausente que vuelve a estar disponible. Sustituir solo la dependencia del sistema en las pruebas deterministas.
- Usar Electron o Chromium real para comprobar carga efectiva de fuentes incluidas y del sistema, tamaños calculados, proporciones de títulos, código monoespaciado, escala de controles y conservación del scroll. Reiniciar la app para verificar persistencia real.
- No acreditar layout, scroll ni disponibilidad real de fuentes mediante jsdom. El proyecto no tiene actualmente un harness de navegador; preparar uno mínimo o documentar una comprobación reproducible con Electron.
- Verificar extremos de los rangos, navegación por teclado y controles accesibles. Ejecutar typecheck, lint, tests afectados y build antes de declarar terminada la implementación; revisar cada historia contra la evidencia disponible.

## Out of Scope

- Preferencias por documento, Story, Article o Post; sincronización entre equipos y perfiles.
- Temas, colores, interlineado configurable, pesos, ligaduras y ejes tipográficos avanzados.
- Instalación o importación de fuentes, descargas en ejecución y un selector de archivos tipográficos.
- Vigilancia continua de instalaciones y desinstalaciones de fuentes mientras la pantalla permanece abierta.
- Cambios en exportación o contenido Markdown y una plataforma genérica para futuras configuraciones.

## Further Notes

- Alcance funcional confirmado mediante entrevista; no implementar la funcionalidad como parte de la publicación de esta especificación.
- Las fuentes del sistema varían entre equipos; las incluidas deben estar disponibles independientemente de las instalaciones locales.
- Monaspace se distribuye con licencia SIL OFL: https://github.com/githubnext/monaspace. Conservar los avisos y revisar los archivos de licencia de los artefactos que se empaqueten.
- Alcance y enfoque de pruebas confirmados por el usuario; especificación publicada en el tracker local con estado ready-for-agent.
