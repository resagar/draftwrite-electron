# 01: Aplicar Rosé Pine Moon a interfaz, editor y preview

**What to build:** reemplazar Dracula por Rosé Pine Moon como tema único y coherente de la aplicación, incluido el Markdown crudo y renderizado. Compartir una paleta y separar los estilos internos por responsabilidad, conservando tipografía, distribución y funcionamiento. Entregar y verificar el resultado completo descrito en la spec de esta funcionalidad.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Rosé Pine Moon reemplaza a Dracula desde el arranque en la interfaz, Settings, editores y previews existentes, sin selector ni preferencias nuevas de tema.
- [x] Una única paleta abastece los tokens semánticos de daisyUI y los tokens propios; componentes, editor y preview no duplican valores crudos de colores.
- [x] La paleta, la interfaz, la sintaxis y el preview se organizan en hojas internas separadas. No se agrega carga de CSS personalizado ni dependencias de Inkdrop.
- [x] El tema y resaltador actuales de CodeMirror consumen las variables CSS compartidas; los estilos del preview quedan acotados a esa superficie.
- [x] Editor y preview usan títulos iris, enlaces foam y código gold; los demás elementos Markdown equivalentes conservan colores coherentes de la paleta.
- [x] Los signos Markdown usan colores de la paleta según su función, incluidos encabezados, listas, numeración, tareas, énfasis, enlaces, citas y código; no quedan en un gris uniforme, no se ocultan y no modifican el texto almacenado.
- [x] Los bloques de código del preview usan fondo Moon y texto gold uniforme, sin resaltado por lenguaje.
- [x] Se recolorean texto, fondos, bordes, controles, foco, hover, estados deshabilitados, selección, cursor, gutter y línea activa, conservando la distinción semántica de errores, advertencias e información.
- [x] Se revisan contraste y legibilidad de los colores efectivos, incluidas opacidades y texto sobre botones; los roles Markdown no controlan incidentalmente los estados de la interfaz.
- [x] Se conservan fuentes, tamaños, pesos, interlineado, preferencias tipográficas, espaciado, radios, dimensiones y distribución.
- [x] Story, Article y Post conservan edición, selección, deshacer, guardado y Vim mode; los previews existentes conservan scroll y sincronización.
- [x] Se mantiene el funcionamiento local sin red y no cambian dominio, IPC ni base de datos.
- [x] La descripción del ADR 0007 se actualiza al nuevo tema, conservando su principio de fuente de verdad semántica y evitando duplicación de colores.
- [x] La verificación real en Electron/Chromium cubre interfaz, editor y preview con Markdown representativo, colores calculados y capturas comparables antes/después. Settings se comprueba en Electron si se valida su ventana nativa.
- [x] La evidencia permite comprobar correspondencia de colores entre editor y preview y conservación de tipografía y distribución. Las comprobaciones visuales, de geometría y scroll no se sustituyen por jsdom.
- [x] Pasan typecheck, lint, las pruebas pertinentes y build; se registran la revisión contra la spec y cualquier limitación de verificación por plataforma.

## Comments

Implementado y revisado contra la spec, incluida la aclaración posterior sobre colores de los símbolos Markdown. Build, typecheck, lint y 557 tests aprobados; verificación real de Moon, tipografía y Vim en Electron. El detalle de requisitos y límites de plataforma está en la revisión de implementación de esta funcionalidad.
