# 15: Variante de Article como Article independiente

**What to build:** Convertir una exploración en un Article de la misma Story y archivar el origen.

**Blocked by:** 08: Variante principal y archivo reversible.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Conserva contenido actual, numeración, notas y línea histórica, sin copiar variantes hermanas.
- [x] Crea principal en la pieza nueva, vincula ambos orígenes y archiva la variante original; si era principal exige otra.
- [x] La unicidad de título por Story puede requerir corregir el título de destino antes de confirmar; no cambia versiones históricas.
- [x] La conversión persiste de forma atómica, tolera cancelación/fallo y deja ambas piezas consultables tras reabrir.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
