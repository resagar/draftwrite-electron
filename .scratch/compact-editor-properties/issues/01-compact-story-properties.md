# 01: compactar las propiedades de Story

**What to build:** ofrecer Topic siempre visible y Titles/Tags dentro de Properties, inicialmente plegado, con un resumen que permita reconocer su contenido. Recuperar espacio para escribir cuando el grupo esté cerrado, conservando la edición y el autoguardado actuales.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Topic, validaciones, acciones existentes y acceso a Properties siguen visibles y accesibles.
- [x] Una nueva sesión de creación o edición inicia Properties cerrado; al abrir una entidad se reflejan sus propios valores y cantidades.
- [x] Properties permite editar Titles y Tags y muestra cantidades derivadas del contenido actual; los títulos vacíos y Tags aún sin confirmar no aparecen como contenido completado.
- [x] Plegar y reabrir conserva valores, inputs vacíos y el texto local de un Tag aún sin confirmar, sin guardar ese Tag implícitamente.
- [x] El grupo cerrado excluye sus controles de Tab y del contenido accesible; el desplegable informa su estado y funciona por teclado.
- [x] El autoguardado inicial y las actualizaciones conservan la expansión elegida, el foco y la selección; no se remonta el editor ni se mezclan sesiones.
- [x] Las pruebas desde la aplicación con DataPort fake cubren edición, resúmenes, Tags sin confirmar y persistencia; se mantienen las regresiones de creación lenta y navegación.
- [x] Chromium verifica 1280 × 800 y 900 × 600, valores largos, múltiples Titles/Tags, escala de interfaz y variantes de vista; la banda cerrada libera altura frente al bloque abierto y la línea base comparable sin achicar controles ni modificar Text.
- [x] Pasan los checks pertinentes y se documenta la revisión de este alcance contra la spec.

## Comments

Alcance aprobado; implementación iniciada. El patrón de Properties debe ser consistente con Article y Post, sin exigir una abstracción compartida como requisito previo.

2026-11-03: implementación completada y revisada contra los criterios de la spec. Ocho casos nuevos de aplicación, suite completa de 534 tests, typecheck y lint pasan. Chromium confirma geometría, teclado, foco y continuidad del editor; medidas, límites y tradeoffs en el informe de verificación de esta feature.
