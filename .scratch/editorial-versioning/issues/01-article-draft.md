# 01: Borrador principal de Article y migración

**What to build:** Crear y reabrir Articles con una variante principal y borrador 0.0.0, conservando el editor y los Articles existentes.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] La migración conserva IDs, Story, título, subtítulo, objetivo, texto y fechas de piezas existentes; no inventa versiones.
- [x] Crear y editar un Article usa autoguardado sin incrementar números; cerrar y reabrir conserva el contenido.
- [x] CRUD y listas existentes continúan funcionando y Story no cambia; se respetan unicidad de título y pertenencia.
- [x] Recorrido UI → DataPort → IPC → servicio → SQLite, migración real y regresión de foco/autoguardado.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
