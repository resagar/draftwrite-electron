# 05: Notas generales y fotografía de revisión

**What to build:** Crear y resolver notas generales de revisión en Article y Post, y conservarlas en versiones.

**Blocked by:** 02: Versiones manuales de Article; 04: Versiones manuales de Post.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Las notas pertenecen a la variante, persisten y pueden marcarse resueltas.
- [x] Una versión conserva notas y estados de ese momento; cambiar una nota después no modifica la fotografía.
- [x] Los cambios solo en notas permiten versionar; la ausencia de diferencias reales sigue impidiéndolo.
- [x] Las versiones previas sin notas siguen interpretándose con fotografía vacía sin reescribir su contenido.


## Parent

[Especificación de versionado editorial](../spec.md).

- [x] Crear y consultar notas generales usa un popover pequeño no modal, sin backdrop ni oscurecimiento, accesible por teclado.

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
