# 17: Historial de publicaciones por versión

**What to build:** Registrar y consultar publicaciones manuales de versiones exactas de Article y Post.

**Blocked by:** 07: Variantes desde versiones guardadas.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Cada registro exige versión guardada exacta, fecha y enlace opcional; permite varias publicaciones de una pieza.
- [x] Continuar editando o cambiar principal no altera referencias ni registros anteriores.
- [x] No publica por red ni cambia automáticamente estado/programación del Post.
- [x] Se prueba versión no perteneciente a la pieza, identidad entre números coincidentes y reapertura con SQLite real.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
