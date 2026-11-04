# 07: Variantes desde versiones guardadas

**What to build:** Crear y cambiar entre variantes con borrador, numeración e historial propios.

**Blocked by:** 06: Notas vinculadas a fragmentos.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Se parte de una versión elegida o del borrador después de guardarlo con incremento elegido; cancelar no crea variante.
- [x] Una variante inicia desde el número elegido, continúa su secuencia y conserva punto de partida identificable.
- [x] Hereda solo notas pendientes de esa fotografía, con procedencia y resolución independiente.
- [x] Nombre y número distinguen versiones coincidentes; cambiar de variante no mezcla ni pierde autoguardados tardíos.


## Parent

[Especificación de versionado editorial](../spec.md).

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
