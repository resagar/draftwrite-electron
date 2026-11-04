# 12: Integración selectiva desde versión guardada

**What to build:** Seleccionar cambios de otra variante, revisar y confirmar su incorporación al borrador destino.

**Blocked by:** 10: Comparación editorial entre versiones y borrador.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] La fuente es una versión persistida de otra variante de la misma pieza; se guarda antes un borrador fuente si corresponde.
- [x] Si el destino tiene cambios pendientes, requiere versión con incremento elegido; cancelar preserva ambos lados.
- [x] Usa procedencia y base común identificables, muestra vista previa y conserva referencia a la fuente.
- [x] Los cambios no conflictivos confirmados quedan como borrador; conflictos se detectan y no se aplican silenciosamente hasta disponer de resolución.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
