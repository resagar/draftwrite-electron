# 16: Variante de Post como Post independiente

**What to build:** Convertir una exploración en un Post independiente pendiente y archivar el origen.

**Blocked by:** 08: Variante principal y archivo reversible.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Conserva contenido, numeración, notas, línea histórica y fuente inicial, sin copiar variantes hermanas.
- [x] El nuevo Post nace pending, sin programación ni publicaciones propias; las previas quedan en el origen.
- [x] Crea principal nueva y conserva vínculo de origen; archivar la principal exige designar otra.
- [x] Prueba conversión desde Posts pending, scheduled y published, incluyendo cancelación, fallos y reapertura.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
