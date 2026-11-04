# 02: Versiones manuales de Article

**What to build:** Guardar, listar y consultar versiones inmutables del Article desde su editor.

**Blocked by:** 01: Borrador principal de Article y migración.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] El autor elige incremento y describe el cambio; primera versión desde 0.0.0 e incrementos con reinicio correctos.
- [x] Se conservan título, subtítulo, objetivo y texto, con identidad estable y fotografía de revisión inicialmente vacía.
- [x] Autoguardado no crea versiones, se rechazan versiones sin diferencias y la lista permite consultar hitos tras reabrir.
- [x] Validación integrada con SQLite real y flujo de guardado/cancelación en UI.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
