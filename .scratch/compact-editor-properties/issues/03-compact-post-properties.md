# 03: compactar las propiedades de Post conservando estado y fecha visibles

**What to build:** mantener Topic y State visibles, permitir editar Source desde Properties con un resumen y mostrar ScheduledAt al elegir scheduled, aunque Properties permanezca cerrado. Liberar espacio sin ocultar información editorial necesaria.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Topic, State, validación, acciones actuales y acceso a Properties permanecen visibles.
- [x] Properties inicia cerrado por sesión y muestra un resumen de la fuente elegida o No source; al abrirlo se puede seleccionar Story o Article según las reglas actuales.
- [x] Source conserva su bloqueo cuando State no es pending y la explicación de ese estado sigue siendo accesible.
- [x] Elegir scheduled muestra ScheduledAt directamente, con su etiqueta y carácter opcional, sin exigir abrir Properties. Los cambios de State y fecha se siguen persistiendo tras la creación inicial como Pending.
- [x] Plegar y reabrir conserva la selección y los cambios de Source; el contenido cerrado queda fuera de Tab y del contenido accesible, con control de expansión operable por teclado.
- [x] Los resúmenes y la fuente proyectada reflejan el borrador y los datos correctos; no se modifica el panel de fuente ni se duplican propiedades.
- [x] Creación, autoguardado y actualizaciones mantienen foco, selección y expansión elegida; una respuesta tardía no reemplaza otra sesión ni pierde cambios recientes.
- [x] Las pruebas de aplicación cubren fuentes de ambos tipos, ausencia de fuente, pending, scheduled, published y su persistencia; se conservan las regresiones de creación lenta y navegación.
- [x] Chromium mide banda abierta/cerrada y reflow de controles en las dos ventanas, variantes de vista, fuente abierta/cerrada y escala de interfaz. Post pending libera la fila de edición de Source sin achicar controles ni modificar Text.
- [x] Pasan los checks pertinentes y se documenta la revisión de este alcance contra la spec.

## Comments

Alcance aprobado; implementación iniciada. ScheduledAt no se convierte en obligatorio y Properties no altera las reglas de State o Source. No necesita cambios de dominio ni un prefactor de las otras entidades.

2026-11-03: implementación completada y revisada contra los criterios de la spec. Ocho casos nuevos de aplicación, suite completa de 534 tests, typecheck y lint pasan. Chromium confirma geometría, teclado, foco y continuidad del editor; medidas, límites y tradeoffs en el informe de verificación de esta feature.
