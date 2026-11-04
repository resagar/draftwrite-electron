# 10: Comparación editorial entre versiones y borrador

**What to build:** Elegir y comparar versiones de la misma pieza o un borrador contra una versión.

**Blocked by:** 07: Variantes desde versiones guardadas.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Admite versiones de distintas variantes de la misma pieza y rechaza piezas ajenas.
- [x] Muestra ambos textos lado a lado y distingue agregados, eliminaciones y modificaciones por palabra o frase.
- [x] Incluye todos los campos de escritura y distingue nombre/número de cada lado; no modifica borradores.
- [x] Verificación en Electron/Chromium y casos de texto vacío, repetido y cambios en título/tema/metadatos editoriales.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
