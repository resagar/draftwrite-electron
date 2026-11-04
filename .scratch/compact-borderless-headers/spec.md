# Cabeceras compactas sin bordes

Status: ready-for-agent

Alcance, ticket único y validación aprobados por el usuario.

## Problem Statement

Las cabeceras de Story, Article y Post reservan una fila completa para Topic o Title aunque haya espacio para otros controles. Sus inputs todavía muestran cajas y líneas al interactuar. Esto resta espacio al editor y se aleja de la referencia visual de Inkdrop.

## Solution

Permitir que Topic o Title compartan fila con los controles adicionales cuando entren. Mantener el protagonismo y la legibilidad del campo principal; distribuir los controles en más filas únicamente cuando el ancho disponible lo requiera. Presentar los campos como texto integrado, sin cajas, bordes ni subrayados decorativos, con foco discreto y validaciones visibles.

## User Stories

1. Como escritor, quiero que Topic de una Story comparta fila con Properties para aprovechar el espacio.
2. Como escritor, quiero que Title de un Article comparta fila con Story y Properties para reducir la altura de la cabecera.
3. Como escritor, quiero que Topic de un Post comparta fila con sus controles adicionales para dejar espacio al texto.
4. Como escritor, quiero que los controles bajen de fila cuando no entren para evitar solapamientos.
5. Como escritor, quiero conservar un campo principal legible para identificar y editar el documento.
6. Como escritor, quiero leer y editar títulos largos sin que empujen los controles fuera de pantalla.
7. Como escritor, quiero campos sin cajas en reposo para que la cabecera se vea integrada.
8. Como escritor, quiero que hover y foco tampoco dibujen bordes o subrayados para mantener esa apariencia.
9. Como escritor, quiero reconocer el campo enfocado con una señal discreta para navegar con teclado.
10. Como escritor, quiero conservar los nombres accesibles de los campos para identificarlos.
11. Como escritor, quiero seguir viendo los errores de validación sin depender de un borde.
12. Como escritor, quiero conservar los campos adicionales dentro de Properties para mantener la organización actual.
13. Como escritor, quiero conservar la edición y el guardado de los valores para seguir trabajando normalmente.
14. Como escritor, quiero que mis preferencias tipográficas se respeten al distribuir la cabecera.

## Implementation Decisions

- Ajustar las bandas existentes de Story, Article y Post y su estilo compartido, sin crear otra arquitectura de formularios.
- Sustituir la reserva de fila completa del campo principal por un reparto flexible con espacio útil para sus controles compañeros. El wrapping responde al espacio real del contenedor, también con paneles abiertos y texto escalado.
- Mantener los campos principales con su jerarquía tipográfica actual. No introducir medición del texto por pulsación ni ajustar su ancho al número de caracteres.
- Eliminar las líneas y cajas de inputs y selects de estas cabeceras en reposo, hover y foco, incluidos los campos adicionales cuando estén desplegados. Conservar el límite exterior de la cabecera y la función de los botones y desplegables existentes.
- Usar una variación discreta de fondo para el foco visible mediante teclado; no sustituirlo por un borde, subrayado o sombra que forme una caja.
- Conservar labels accesibles, placeholders, controles deshabilitados y mensajes de validación. Los avisos de campos obligatorios deben seguir siendo reconocibles sin depender de líneas de color.
- Mantener los valores, callbacks, Properties, guardado y preferencias actuales. No cambiar dominio, IPC, SQLite ni dependencias.
- Mantener el cambio de estilo acotado a las cabeceras; respetar los tokens semánticos de Rosé Pine Moon y el principio del ADR 0007.

## Testing Decisions

- Frontera principal aprobada: aplicación real en Electron o Chromium, verificando el resultado visible en las tres clases de documento.
- Comprobar una sola fila cuando el espacio alcance, wrapping cuando no alcance y ausencia de solapamientos, recortes de controles y desbordamiento horizontal atribuible a la cabecera.
- Incluir paneles abiertos/cerrados, anchos amplios y estrechos, títulos largos y preferencias tipográficas ampliadas. Revisar el contenedor disponible, no solo el ancho total de la ventana.
- Comprobar ausencia de bordes, subrayados y sombras de caja en reposo, hover y foco; verificar foco visible con teclado y avisos de validación.
- Reutilizar las pruebas existentes de propiedades compactas y aplicación para comprobar edición, campos obligatorios y apertura/cierre de Properties. No modificar tests para acomodar una regresión.
- Un buen test verifica acciones y resultados visibles. No fijar nombres de clases CSS ni usar jsdom para probar geometría.
- Ejecutar typecheck, lint, build y la suite completa al finalizar la implementación. Registrar las limitaciones de plataforma y revisar el resultado contra esta spec.

## Out of Scope

Rediseñar el editor, preview, sidebar o Settings; cambiar la paleta o la tipografía; ocultar controles o eliminar campos para ganar espacio; cambiar el comportamiento de Properties; nuevas preferencias; cambios de dominio, persistencia o contratos.

## Further Notes

Un ticket vertical cubre las tres cabeceras y su verificación; no tiene bloqueadores. La captura suministrada por el usuario y su referencia a Inkdrop expresan el resultado visual solicitado. No se requiere copiar su sistema de temas ni sus componentes.
