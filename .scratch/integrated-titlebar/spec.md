# Barra de título integrada

**Status:** ready-for-agent

## Problem Statement

En Windows y Linux (incluido WSLg), la ventana principal de DraftWrite muestra una barra nativa con icono y título encima del encabezado de la aplicación. Esa separación visual ocupa espacio y rompe la continuidad del tema. El usuario quiere una barra integrada, tomando como referencia visual Inkdrop.

## Solution

Integrar el encabezado existente con el área de título de la ventana principal en Windows y Linux. Mantener los controles nativos de minimizar, maximizar/restaurar y cerrar, con colores acordes al tema y espacio reservado para evitar superposiciones. El área libre permitirá mover la ventana.

## User Stories

1. Como escritor, quiero una barra superior integrada para que la ventana tenga una apariencia coherente.
2. Como escritor, quiero eliminar la fila nativa duplicada de título para aprovechar el espacio vertical.
3. Como escritor, quiero conservar el encabezado de DraftWrite para reconocer la aplicación.
4. Como escritor, quiero minimizar la ventana desde la barra integrada para volver a otras tareas.
5. Como escritor, quiero maximizar la ventana para ampliar mi espacio de escritura.
6. Como escritor, quiero restaurar la ventana para recuperar su tamaño anterior.
7. Como escritor, quiero cerrar la ventana desde su control habitual para conservar mi flujo de trabajo.
8. Como escritor, quiero arrastrar la ventana desde el área libre del encabezado para ubicarla cómodamente.
9. Como escritor, quiero seguir usando los botones del encabezado para que arrastrar la ventana no interfiera con sus acciones.
10. Como escritor, quiero controles visibles y legibles con el tema actual para reconocer sus funciones.
11. Como escritor, quiero que los controles no tapen contenido cuando reduzco o maximizo la ventana.
12. Como escritor, quiero seguir accediendo a los controles de ventana en modo Zen para poder administrar la ventana mientras escribo.
13. Como usuario de Linux bajo WSLg, quiero la misma barra integrada para evitar el marco del sistema al ejecutar la aplicación desde WSL.

## Implementation Decisions

- Aplicar el cambio a la ventana principal en Windows y Linux, incluido WSLg, conservando el comportamiento actual en macOS.
- Usar la barra oculta de Electron mediante titleBarStyle y Window Controls Overlay mediante titleBarOverlay. Mantener los controles nativos; no construir botones propios ni nuevos canales IPC.
- Adaptar el encabezado existente y sus estilos al espacio disponible, usando los colores del tema actual.
- Reservar espacio para los controles nativos en todos los estados relevantes de la interfaz, incluido Zen y los tamaños de ventana admitidos.
- Definir el área libre del encabezado como arrastrable y excluir sus elementos interactivos.
- Conservar el comportamiento actual de cierre y guardado, sin introducir lógica de persistencia.
- Mantener las dependencias del renderer y del dominio existentes; no cambiar contratos de datos ni esquema de SQLite.
- No es necesario un refactor previo.

## Testing Decisions

- Frontera principal propuesta: la ventana real de Electron en Windows. Verificar el comportamiento observable y la presentación, no la forma del objeto de configuración.
- Comprobar ausencia de la fila nativa duplicada, colores, legibilidad, ausencia de solapamientos, arrastre, doble clic para maximizar/restaurar y minimizar/maximizar/restaurar/cerrar.
- Comprobar botones existentes del encabezado y modo Zen para detectar interferencias con las regiones arrastrables o los controles nativos.
- Usar los tests existentes de la aplicación para regresiones de Zen y navegación; no añadir tests de geometría en jsdom.
- El proyecto cuenta con tests de comportamiento de Zen/sidebar, pero no con pruebas específicas de BrowserWindow o TitleBar. Chromium puede ayudar a verificar layout; no sustituye la comprobación de controles nativos en Windows.
- Ejecutar typecheck, lint y las pruebas pertinentes. Registrar claramente si la comprobación nativa de Windows queda pendiente; no declararla verificada desde Linux.
- Realizar un smoke test de la ventana principal en Linux cuando el entorno lo permita.

## Out of Scope

- Cambiar la ventana de Settings.
- Rediseñar las acciones o la distribución completa del encabezado.
- Copiar los iconos, menús o funciones de Inkdrop.
- Sustituir controles nativos por botones personalizados.
- Rediseñar el marco de macOS.
- Añadir dependencias, contratos IPC o cambios de dominio y persistencia.

## Further Notes

Inkdrop sirve como referencia de integración visual; no se ha investigado su implementación interna. El tracker configurado es local. La frontera de pruebas y el desglose de un ticket fueron aprobados por el usuario.

## Comments

Corrección de alcance tras la captura del usuario: la ejecución desde WSL2 se identifica como Linux, aunque el escritorio anfitrión sea Windows. La barra integrada debe cubrir también Linux/WSLg. La exclusión inicial de Linux no resolvía su caso real. Ver la actualización de evidencia en verification.md.
