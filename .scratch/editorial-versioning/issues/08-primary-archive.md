# 08: Variante principal y archivo reversible

**What to build:** Elegir la propuesta principal y archivar o reactivar exploraciones.

**Blocked by:** 07: Variantes desde versiones guardadas.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Existe exactamente una principal, inicialmente la original; elegir otra conserva las demás.
- [x] Archivar la principal requiere designar otra previamente y no se completa si no queda principal.
- [x] Archivo conserva borrador, versiones y notas, permite consulta y reactivación.
- [x] Listas reflejan la propuesta principal sin alterar Story, fuente, estado, programación ni publicaciones.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
