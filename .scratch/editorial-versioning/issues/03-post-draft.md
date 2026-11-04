# 03: Borrador principal de Post y migración

**What to build:** Crear y reabrir Posts con variante principal y borrador 0.0.0, preservando datos previos y publicación.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] La migración conserva IDs, tema, texto, fuente, estado, programación y fechas; no inventa versiones ni publicaciones.
- [x] Autoguardado persiste tema y texto sin incrementar; estado/programación y fuente siguen perteneciendo a la pieza.
- [x] Se mantienen la exclusión de fuentes, las transiciones actuales y la restricción de fuente mientras pending.
- [x] Recorrido completo con SQLite y reapertura, incluyendo Posts existentes scheduled y published.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
