# 18: Aviso de revisión pendiente al registrar publicación

**What to build:** Advertir sobre notas pendientes de la versión publicada sin impedir la decisión del autor.

**Blocked by:** 17: Historial de publicaciones por versión.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Evalúa las notas de la fotografía de la versión elegida, no las notas actuales de otra variante.
- [x] El aviso permite continuar o cancelar; cancelar no crea registro.
- [x] Registrar sin notas pendientes no muestra un aviso incorrecto; las notas no se marcan resueltas por publicar.
- [x] Cobertura UI y recorrido real de persistencia para Article y Post.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
