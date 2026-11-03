# 02: compactar las propiedades de Article y dar ancho útil a Title

**What to build:** mantener Title y Story visibles y editables conforme a sus reglas, adaptar su distribución al ancho del panel y ofrecer Subtitle en Properties con un resumen. Evitar que el campo Title quede reducido a un ancho inutilizable cuando la fuente está abierta.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Title, Story, sus validaciones y las acciones existentes permanecen visibles sin abrir Properties.
- [x] En panel estrecho, Title ocupa el ancho interior disponible en una fila propia; Story puede ocupar otra. Ninguno queda reducido al mínimo intrínseco por forzar una única fila.
- [x] Properties inicia cerrado por sesión y permite editar Subtitle; su resumen distingue la ausencia de contenido y permite reconocer un valor existente.
- [x] Abrir, plegar y reabrir conserva Subtitle y sus cambios. El grupo cerrado no participa del orden de foco y su control funciona por teclado con estado de expansión accesible.
- [x] La procedencia de Article sigue bloqueada durante la creación y tras guardarse; un error de creación permite cambiar Story y reintentar como hasta ahora.
- [x] Target y el panel de fuente conservan ubicación, datos y comportamiento; no se mueve ni duplica su edición.
- [x] Autoguardado, creación lenta y actualizaciones no cambian el desplegado ni pierden foco, selección o contenido reciente; otra entidad inicia su propia sesión.
- [x] Las pruebas de aplicación verifican Title, Story, Subtitle, persistencia, errores y continuidad; Chromium verifica ancho útil real y controles accesibles en ambas ventanas, con fuente abierta/cerrada, variantes de vista y escala de interfaz.
- [x] Se registran las medidas de altura y ancho antes y después sin prometer ahorro vertical en todos los paneles estrechos; Text y sus controles conservan implementación y tipografía.
- [x] Pasan los checks pertinentes y se documenta la revisión de este alcance contra la spec.

## Comments

Alcance aprobado; implementación iniciada. Priorizar la legibilidad y edición de Title sobre una fila universal. No necesita cambios de dominio ni un prefactor de Story.

2026-11-03: implementación completada y revisada contra los criterios de la spec. Ocho casos nuevos de aplicación, suite completa de 534 tests, typecheck y lint pasan. Chromium confirma geometría, teclado, foco y continuidad del editor; medidas, límites y tradeoffs en el informe de verificación de esta feature.
