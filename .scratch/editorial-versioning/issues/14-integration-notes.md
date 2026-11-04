# 14: Notas seleccionadas al integrar

**What to build:** Trasladar observaciones pendientes relacionadas con los fragmentos integrados.

**Blocked by:** 13: Resolución manual de conflictos editoriales.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Se ofrecen notas pendientes relacionadas con los fragmentos seleccionados; el autor decide cuáles incorporar.
- [x] Las notas incorporadas conservan origen y tienen resolución independiente; no se copian todas por defecto.
- [x] Se preservan notas destino y se reubican si el resultado invalida anclajes.
- [x] Cambios de texto y notas se confirman juntos; cancelación o fallo no dejan una integración parcial.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
