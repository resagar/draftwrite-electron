# 04: Versiones manuales de Post

**What to build:** Guardar, listar y consultar versiones inmutables de tema y texto de Post.

**Blocked by:** 03: Borrador principal de Post y migración.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Mismas reglas de incremento manual, descripción, 0.0.0 y rechazo de ausencia de cambios que Article.
- [x] Versionar excluye fuente, estado y programación; consultar una versión no los modifica.
- [x] La identidad identifica pieza y variante, y el historial sobrevive a la reapertura.
- [x] Cobertura UI/IPC/SQLite de versiones y compatibilidad con estados del Post.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
