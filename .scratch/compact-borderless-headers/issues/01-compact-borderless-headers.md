# 01: Compactar las cabeceras de Story, Article y Post al estilo Inkdrop

**What to build:** cabeceras con Topic o Title y controles adicionales en la misma fila cuando haya espacio, wrapping al reducir el contenedor y campos integrados sin cajas ni líneas, conservando edición, Properties, foco accesible y validación.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Las tres cabeceras comparten fila entre campo principal y controles cuando entran; el campo principal no reserva siempre el 100% del ancho.
- [x] El campo principal conserva protagonismo, ancho útil y edición de valores largos.
- [x] Los controles bajan de fila cuando es necesario y permanecen visibles sin solapamientos ni overflow de la cabecera.
- [x] Inputs y selects de cabecera y Properties no muestran bordes, subrayados ni sombras de caja en reposo, hover o foco.
- [x] El teclado ofrece foco visible mediante una variación discreta de fondo y conserva los nombres accesibles.
- [x] Los errores de campos obligatorios siguen siendo visibles sin depender de bordes.
- [x] Se conservan campos, valores, guardado, desplegables, preferencias tipográficas y paleta.
- [x] Se verifica el comportamiento real en Electron/Chromium para Story, Article y Post, a distintos anchos, con paneles abiertos/cerrados y tipografía ampliada.
- [x] Pasan las pruebas pertinentes, suite completa, typecheck, lint y build; se registra revisión contra la spec y límites de verificación.

## Comments

Implementación y verificación registradas en la revisión de esta funcionalidad. Incluye comprobación en Electron/WSLg a 1440 y 1000 px y revisión independiente contra estándares y spec.
