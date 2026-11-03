# Rosé Pine Moon para interfaz, editor y preview

Status: ready-for-agent

Alcance, frontera de validación y desglose de un único ticket aprobados por el usuario el 2026-11-03. Esta publicación no implementa el cambio visual.

## Problem Statement

Quien escribe quiere usar Rosé Pine Moon en toda la aplicación, tanto en la interfaz como al editar Markdown crudo y leer su preview. Actualmente la aplicación usa Dracula y combina tokens compartidos con colores propios; necesita una apariencia coherente sin cambiar su distribución ni sus preferencias tipográficas.

## Solution

Reemplazar Dracula por Rosé Pine Moon como tema único. Compartir una sola paleta entre la interfaz, el editor y el preview, con hojas de estilo internas separadas por responsabilidad, tomando como referencia la organización de Inkdrop.

El editor y el preview usarán los mismos colores para los elementos Markdown equivalentes: títulos en iris, enlaces en foam y código en gold. Los signos del Markdown crudo también usarán colores de la paleta según su función, como en la referencia de Inkdrop, en lugar de un color gris tenue uniforme. Se conservarán las fuentes, tamaños, espaciado, distribución y comportamientos actuales.

## User Stories

1. Como escritor, quiero ver Rosé Pine Moon al abrir la aplicación para encontrar una apariencia uniforme desde el inicio.
2. Como escritor, quiero que Rosé Pine Moon reemplace a Dracula para no tener que seleccionar un tema.
3. Como escritor, quiero fondos y superficies de la misma paleta para distinguir las áreas de trabajo con coherencia.
4. Como escritor, quiero texto y controles legibles para navegar y escribir cómodamente.
5. Como escritor, quiero distinguir los estados de foco, hover, selección y deshabilitado para reconocer las acciones disponibles.
6. Como escritor, quiero que errores, advertencias e información sigan siendo distinguibles para entender el estado de la aplicación.
7. Como escritor, quiero que Settings y las demás superficies propias de la aplicación compartan el tema para mantener continuidad visual.
8. Como escritor, quiero editar el Text de una Story con Rosé Pine Moon para escribir dentro de la misma apariencia que la interfaz.
9. Como escritor, quiero editar el Text de un Article con la misma paleta para conservar la continuidad entre documentos.
10. Como escritor, quiero editar el texto de un Post con la misma paleta para mantener una experiencia uniforme.
11. Como escritor, quiero que los previews Markdown existentes usen la paleta para leer sin cambios bruscos de apariencia.
12. Como escritor, quiero títulos en iris tanto en el editor como en el preview para reconocer su jerarquía al cambiar de vista.
13. Como escritor, quiero enlaces en foam en ambas vistas para identificarlos de forma consistente.
14. Como escritor, quiero código en gold en ambas vistas para distinguirlo del texto habitual.
15. Como escritor, quiero que los demás elementos Markdown equivalentes compartan colores entre ambas vistas para reconocerlos fácilmente.
16. Como escritor, quiero signos Markdown coloreados según su función con la misma paleta para distinguir la sintaxis del contenido sin ocultarla.
17. Como escritor, quiero bloques de código del preview con fondo Moon y texto gold uniforme para leerlos sin introducir resaltado por lenguaje.
18. Como escritor, quiero reconocer el cursor, la selección y la línea activa para orientarme al editar.
19. Como escritor, quiero conservar mis fuentes, tamaños e interlineado para mantener mi entorno de escritura.
20. Como escritor, quiero conservar el espaciado, las dimensiones y la distribución para seguir trabajando con la misma organización.
21. Como escritor, quiero conservar edición, selección, deshacer, guardado y Vim mode para que el cambio de colores no interrumpa mi trabajo.
22. Como escritor, quiero conservar el scroll y la sincronización del preview para mantener mi posición al escribir y leer.
23. Como escritor, quiero que la paleta funcione sin conexión para mantener el funcionamiento local de la aplicación.

## Implementation Decisions

- Definir una única paleta Rosé Pine Moon y derivar de ella los tokens semánticos de daisyUI y los colores propios de la aplicación. No duplicar valores crudos en componentes, el editor ni el preview.
- Sustituir el tema Dracula y seleccionar el mismo tema Moon en el arranque y en la configuración de estilos. No incorporar selector ni persistencia de temas.
- Mantener la separación de responsabilidades de Inkdrop: paleta común, interfaz, sintaxis y preview. Las hojas son internas y se cargan con los estilos de la aplicación; sus nombres no activan mecanismos automáticos de CodeMirror ni implican compatibilidad con paquetes de Inkdrop.
- Conservar la integración existente de CodeMirror: el tema del editor y el resaltador consumen variables CSS. Preferir este puente a introducir otro motor, un sistema de plugins o una nueva abstracción de temas.
- Separar los roles Markdown de los estados de la interfaz, aunque algunos compartan valores. Cambiar el color de un título no debe cambiar incidentalmente un error o una advertencia.
- Compartir roles Markdown entre editor y preview. Son decisiones confirmadas títulos en iris, enlaces en foam y código en gold; las correspondencias restantes se resolverán durante la implementación con la misma paleta y legibilidad, sin agregar preferencias.
- Colorear los signos de sintaxis Markdown por función mediante roles de la paleta: encabezados, listas y numeración, tareas, énfasis, código, enlaces y citas. Diferenciar sus roles de los del contenido. Extender únicamente los metadatos de resaltado del lenguaje Markdown existente; no cambiar su gramática, ocultar delimitadores ni alterar el documento.
- Aplicar al preview estilos de color acotados a su superficie, conservando sus componentes estructurales, anclas y mecanismos de sincronización. Revisar encabezados, énfasis, enlaces, listas, citas, código, separadores, tablas y tareas existentes.
- Mantener el código del preview con color uniforme, incluso cuando un bloque declare un lenguaje. No incorporar un resaltador de lenguajes.
- Recolorear fondos, texto, bordes, controles, cursor, gutter, línea activa, selección y estados interactivos mediante roles de la paleta. Revisar también las combinaciones con opacidad y los colores de contenido sobre botones.
- Conservar fuentes, tamaños, pesos, interlineado, espaciado, radios, distribución y dimensiones actuales, incluidas las preferencias tipográficas del usuario.
- Mantener la regla del ADR 0007 de una sola fuente de verdad semántica. Al implementar, actualizar su descripción ligada a Dracula para reflejar la nueva fuente de colores y conservar el motivo de evitar duplicación.
- No modificar entidades, contratos IPC, esquema SQLite, servicios, persistencia ni funcionalidades de edición. No introducir recursos remotos ni dependencias de Inkdrop para aplicar la paleta.

## Testing Decisions

- Frontera principal aprobada: aplicación renderizada en Electron o Chromium real, comprobando el comportamiento visible de interfaz, editor y preview. Preferir la app Electron cuando sea necesario cubrir la ventana independiente de Settings.
- Reutilizar el enfoque de los harnesses de verificación de tipografía y Vim mode existentes, con perfil y datos aislados. No agregar una API pública de pruebas ni usar los datos personales de escritura.
- Un buen test comprueba colores calculados y resultados visibles en superficies reales, sin depender de nombres de clases generadas, cantidad de variables CSS ni organización interna de módulos.
- Usar un documento representativo con encabezados, negritas, cursivas, enlaces, listas, citas, código inline y cercado, tablas y tareas. Comparar títulos iris, enlaces foam y código gold entre editor y preview; verificar colores de los signos según su función y código cercado uniforme.
- Verificar fondos, bordes, texto, botones, foco, hover, selección, cursor, gutter y línea activa. Revisar legibilidad y contraste de las combinaciones efectivas, incluyendo opacidades, estados deshabilitados y texto sobre colores de acción.
- Capturar el estado anterior y posterior en condiciones equivalentes para comprobar que solo cambian colores: mismas preferencias, contenido, dimensiones de ventana y estado de paneles. Usar capturas y mediciones reales para tipografía y geometría.
- Cubrir el editor de Story, Article y Post y los previews existentes, sin crear nuevos previews como parte de la verificación.
- Confirmar que siguen funcionando edición, selección, deshacer, guardado, Vim mode y sincronización del preview. Reutilizar las pruebas existentes de aplicación y preview para regresiones de comportamiento; añadir pruebas nuevas solo cuando aporten cobertura observable necesaria.
- jsdom no demuestra la apariencia, el contraste, la geometría ni el scroll; no agregar aserciones de layout a Jest. No crear tests que solo reproduzcan el listado de tokens de la implementación.
- Ejecutar typecheck, lint, las pruebas pertinentes y build durante la implementación. Registrar evidencia visual y límites de plataforma; una comprobación en Chromium aislado no demuestra comportamiento de ventanas nativas de Electron.
- Esta publicación no ejecuta ni afirma aprobadas las comprobaciones de una implementación futura.

## Out of Scope

Selector o persistencia de temas; mantener Dracula como opción; otras variantes de Rosé Pine; carga de CSS personalizado; gestor de temas o plugins de Inkdrop; cambios de tipografía, layout o contenido; resaltado por lenguaje en bloques de código; nuevos previews; cambios de dominio, IPC o base de datos; implementación o commits en esta etapa de publicación.

## Further Notes

La entrevista quedó cerrada y el usuario aprobó una única entrega vertical sin bloqueadores, incluyendo la validación en Electron/Chromium. El ticket abarca el resultado completo y sus comprobaciones; no se divide por capas de CSS ni se separa la verificación en una entrega posterior.

La investigación previa es evidencia técnica y contiene alternativas, no requisitos adicionales. Esta spec fija el alcance aprobado. La implementación debe dejar evidencia de correspondencia entre esta spec y el resultado, e identificar cualquier limitación de verificación.

Durante la implementación, el usuario aportó capturas de Inkdrop y aclaró que los símbolos Markdown también deben llevar colores de la paleta. Esa indicación reemplaza el tratamiento inicial de signos con un tono tenue uniforme; los colores acordados para el contenido se mantienen.
