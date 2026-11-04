# 06: Notas vinculadas a fragmentos

**What to build:** Anotar fragmentos y conservar observaciones cuando cambie la redacción.

**Blocked by:** 05: Notas generales y fotografía de revisión.

**Status:** ready-for-agent

**Resolution:** implemented

Especificación y desglose aprobados por el usuario. Recorrido vertical: persistencia, servicios, IPC/DataPort, UI y verificación del comportamiento.

- [x] Seleccionar texto permite crear una nota con cita y referencia al fragmento en Article y Post.
- [x] Un anclaje incierto conserva la cita, señala reubicación y no salta a otra coincidencia silenciosamente.
- [x] Las fotografías de revisión conservan los datos del anclaje y su estado.
- [x] Verificar selección y reubicación en Electron/Chromium, además de persistencia y casos de texto repetido.


## Parent

[Especificación de versionado editorial](../spec.md).

- [x] Seleccionar un párrafo o fragmento ofrece anotar; el formulario y la consulta se abren cerca del texto mediante popover sin backdrop.
- [x] El indicador de anotación permite reabrirla; el popover se recoloca en bordes, admite Escape y devuelve el foco sin descartar texto pendiente silenciosamente.

## Verificación

Implementado y cotejado contra la especificación. Evidencia y límites en [la revisión de implementación](../implementation-review.md).
