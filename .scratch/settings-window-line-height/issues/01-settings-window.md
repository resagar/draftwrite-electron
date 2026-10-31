# 01: Abrir configuración en una ventana nativa con preferencias sincronizadas

**What to build:** El engranaje abre una única ventana auxiliar de configuración, no modal. La persona puede seguir escribiendo en la principal y ve allí los cambios de preferencias sin recargar. Cerrar o reabrir configuración conserva el trabajo y los ajustes actuales.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Spec:** [Ventana de configuración e interlineado de escritura](../spec.md).

**Historias cubiertas:** 1–13, 22–24 y 26–30 en lo relativo a ventanas, sincronización y compatibilidad.

- [x] Abrir desde el engranaje crea una ventana nativa auxiliar, redimensionable y no modal. La principal conserva su workspace visible e interactivo; la auxiliar no monta otra biblioteca ni otro editor.
- [x] Pulsaciones repetidas muestran, restauran si está minimizada y enfocan la misma ventana. Cerrar y abrir de nuevo crea una instancia nueva utilizable, sin referencias o listeners obsoletos.
- [x] El cierre nativo y una acción visible de cierre solo cierran configuración. Cerrar la principal también cierra la auxiliar; la reactivación de la app no deja ventanas huérfanas.
- [x] Abrir/cerrar configuración conserva documento, borrador incompleto, instancia del editor, selección, cursor y scroll; no dispara descarte ni guardado forzado.
- [x] La auxiliar obtiene la última instantánea efectiva y recibe cambios ocurridos durante su arranque. El estado inicial no sobrescribe preferencias con defaults o datos antiguos.
- [x] Fuente, tamaño y escala se aplican inmediatamente en ambas ventanas. El contrato de sincronización conserva todos los campos vigentes, incluido lineHeight si el ticket 02 ya fue integrado.
- [x] Las actualizaciones parciales conservan otros campos/contextos, no generan ecos y no permiten que un mensaje antiguo revierta una edición reciente. Un fallo de guardado no impide aplicar el cambio durante la sesión y se informa correctamente.
- [x] El guardado sigue siendo inmediato y compatible con la clave local y los valores existentes. Hay un único responsable de persistir cada cambio; cerrar/reabrir la auxiliar y reiniciar la app conserva los ajustes guardados.
- [x] La apertura y comunicación entre ventanas pasan por un contrato tipado de presentación y preload/IPC, sin importar Electron o Node desde componentes. Se validan emisores y payloads; no se aceptan URLs arbitrarias para abrir ventanas.
- [x] La política de permisos de sesión reconoce a los frames principales de ambas ventanas autorizadas. Las fuentes locales funcionan en configuración y Copy source text sigue funcionando en la principal; páginas ajenas y subframes no obtienen esos permisos.
- [x] Permanecen Monaspace, fuentes actuales y del sistema, búsqueda, deduplicación, fallback, recuperación de elecciones ausentes y restauración por contexto. La fuente y escala de interfaz también afectan a la auxiliar.
- [x] Se adaptan navegación, controles de cierre y pruebas existentes al cambio explícito de presentación, sin relajar las garantías de conservación. La ventana tiene controles etiquetados, operación por teclado y scroll utilizable.
- [x] Se verifica el flujo con dos ventanas en Electron real, perfil y SQLite temporales, sin sustituir permisos. Las pruebas cubren aperturas repetidas, foco/restauración, cierre/reapertura, actualizaciones rápidas, fallo de persistencia, reinicio y cierre de la principal.
- [x] Typecheck, lint, tests afectados y build pasan. Si el ticket 02 ya está integrado, se verifica también el interlineado desde la auxiliar antes de dar por completada la entrega.

## Notes

Este ticket es una entrega completa del cambio de ventana, no una fase de infraestructura. No está bloqueado por el interlineado: traslada y sincroniza el esquema de preferencias vigente sin eliminar campos que incorpore el otro ticket.

## Comments

2026-10-31: Implementado y verificado en Linux con Electron real. La revisión por historia, las pruebas y los límites de verificación están en [implementation-review](../implementation-review.md).
