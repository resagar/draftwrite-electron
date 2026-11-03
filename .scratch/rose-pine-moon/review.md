# Revisión de implementación: Rosé Pine Moon

## Resultado contra la spec

| Requisito                        | Implementación y evidencia                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tema único Moon                  | Tema daisyUI propio, arranque Moon, sin Dracula habilitado; comprobado en Electron.                                                                                                                    |
| Paleta única                     | Valores crudos centralizados; tokens de interfaz, editor y preview derivados.                                                                                                                          |
| Hojas internas separadas         | Paleta, interfaz, sintaxis y preview separados, sin carga de CSS externo.                                                                                                                              |
| Integración de editor y preview  | Se conserva CodeMirror y su puente de variables; preview con estilos acotados.                                                                                                                         |
| Colores Markdown equivalentes    | Títulos iris, enlaces foam, código gold; citas, listas, negrita y énfasis con roles compartidos. Comprobaciones de colores calculados en Electron.                                                     |
| Símbolos coloreados              | Tags semánticos de Lezer para encabezados, listas, numeración, tareas, énfasis, enlaces, citas y código; solo cambian metadatos de resaltado. Sigue la aclaración del usuario con capturas de Inkdrop. |
| Código uniforme del preview      | Fondo Moon y texto gold, sin resaltador por lenguaje.                                                                                                                                                  |
| Estados interactivos             | Selección enfocada, cursor, gutter, línea activa, foco y controles deshabilitados comprobados. Hover de enlaces comprobado; hover de botones sujeto a media query pendiente en escritorio con mouse.   |
| Legibilidad                      | Muestras reales con contraste mínimo 4,71:1; texto de botón sobre overlay 8,82:1. No constituye auditoría completa WCAG.                                                                               |
| Tipografía y distribución        | Ocho superficies con medidas idénticas a la captura anterior; mismas preferencias y viewport. Harness tipográfico existente aprobado.                                                                  |
| Edición y navegación             | Story, Article y Post conservan selección y deshacer; harness Vim verifica guardado manual/automático, selección, scroll y atajos. Harness tipográfico verifica sincronización del preview.            |
| Funcionamiento local y fronteras | Sin cambios en dominio, IPC, SQLite ni dependencias; sin recursos remotos.                                                                                                                             |
| Documentación vigente            | ADR 0007 y referencia de stack actualizados; investigación y spec reflejan la aclaración sobre símbolos.                                                                                               |
| Verificación real                | Harness Moon ejecutado con perfil aislado, capturas antes/después y Settings nativo.                                                                                                                   |
| Sin sustituir layout con jsdom   | Geometría y apariencia se verifican en Electron; pruebas Jest existentes intactas.                                                                                                                     |
| Checks y revisión                | Build con typecheck, lint y 46 suites/557 tests aprobados. Revisión independiente de estándares y de spec sin hallazgos funcionales pendientes.                                                        |

## Correcciones descubiertas durante la verificación

- La utilidad de color de párrafos tapaba los roles de citas y listas en el preview; se trasladó al estilo de párrafos de primer nivel.
- Los tags heredados de citas y listas podían sobrescribir estilos inline en CodeMirror; se ordenan antes de los estilos inline y se prueban ejemplos anidados.
- El selector de selección enfocada de CodeMirror tenía mayor especificidad; el tema iguala su estructura y una regresión verifica el color calculado.
- Los símbolos de tareas usaban el tag genérico atom; se asignan al rol específico de listas sin cambiar su gramática.

## Límites de verificación

Se verificó Electron real en Linux headless, no paquetes Windows/macOS. La capacidad de hover del dispositivo no está disponible en este entorno; los botones condicionados por `(hover: hover)` deben confirmarse con mouse en un escritorio. Los screenshots son evidencia temporal en el directorio de pruebas, no nuevos assets de la aplicación.
