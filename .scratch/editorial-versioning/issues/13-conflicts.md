# 13: Resolución manual de conflictos editoriales

**What to build:** Resolver cambios superpuestos durante una integración y confirmar el resultado.

**Blocked by:** 12: Integración selectiva desde versión guardada.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Por conflicto se presenta base, propuesta fuente, propuesta destino y resultado editable.
- [x] No se confirma la integración mientras queden conflictos sin resolver; cancelar no modifica el destino.
- [x] El autor confirma los resultados, que quedan en el borrador sin versionado automático.
- [x] Cobertura de reescritura, eliminación/modificación y texto repetido; comprobación visual y de persistencia.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
