# 11: Recuperación sin pérdida de historial

**What to build:** Recuperar campos de escritura de una versión anterior en la variante actual.

**Blocked by:** 07: Variantes desde versiones guardadas.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Con cambios de escritura o notas pendientes, exige crear versión y elegir incremento; cancelar conserva todo.
- [x] Conserva versiones posteriores y continúa numeración desde la última versión destino.
- [x] Mantiene notas actuales y marca reubicación cuando corresponda, sin restaurar sus estados históricos.
- [x] No altera fuente, Story, estado, programación ni publicaciones; errores no dejan recuperación parcial.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
