# 09: Dos variantes editables lado a lado

**What to build:** Escribir simultáneamente en dos variantes de la misma pieza.

**Blocked by:** 07: Variantes desde versiones guardadas.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Ambos paneles tienen identidad, foco, selección y autoguardado propios.
- [x] Respuestas tardías y salida de un editor no sobrescriben el otro.
- [x] Se verifica recuperación al reabrir y mensajes de error de guardado por variante.
- [x] Evidencia en Electron/Chromium de escritura, foco, scroll y edición paralela para Article y Post.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
