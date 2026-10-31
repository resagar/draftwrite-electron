# 02: Configurar y conservar el interlineado independiente de editor y preview

**What to build:** Los controles de editor y preview permiten cambiar la separación entre renglones, verla aplicada inmediatamente, conservarla entre sesiones y restaurarla a 2 sin modificar el otro contexto ni las preferencias tipográficas existentes.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Spec:** [Ventana de configuración e interlineado de escritura](../spec.md).

**Historias cubiertas:** 14–30 en lo relativo a interlineado, independencia, compatibilidad, persistencia y geometría.

- [x] Editor y preview ofrecen cada uno un control numérico etiquetado Line height. La interfaz general no añade este ajuste.
- [x] El valor es un multiplicador sin unidad: default 2 y rango inclusivo 1–3. Los botones aumentan/reducen 0,1 sin deriva numérica; la entrada exacta acepta decimales del rango, incluido 1,25.
- [x] Vacíos transitorios, NaN, infinitos y valores fuera del rango no se aplican ni se transmiten. Al salir del campo se recupera el último valor válido si corresponde; los botones respetan los límites.
- [x] La lectura de preferencias antiguas sin lineHeight produce 2 por contexto y conserva sus fuentes, tamaños y escala. Un campo de interlineado inválido solo recupera su propio default.
- [x] Cambiar el interlineado del editor actualiza contenido, scroller y números de línea, conservando su alineación. No cambia la fuente, el tamaño ni las preferencias del preview o de la interfaz.
- [x] Cambiar el interlineado del preview afecta cuerpo, títulos, citas, listas, tablas y código. Conserva tamaños relativos de encabezados, código monoespaciado y márgenes existentes entre bloques; no modifica el editor.
- [x] El ajuste se aplica globalmente a los componentes de escritura de Story, Article y Post, sin cambiar contenido, DTOs de dominio ni esquema SQLite.
- [x] El cambio se aplica y guarda inmediatamente. Persistencia y restauración incluyen el nuevo campo; restaurar un contexto lo devuelve a 2 y conserva los demás contextos.
- [x] Se modifica el componente de configuración compartido. Puede verificarse en la presentación actual si el ticket 01 aún no se integró; si ya existe la ventana auxiliar, el control aparece allí y el cambio llega a la principal sin recargar.
- [x] Las actualizaciones preservan campos ajenos, incluida una elección de fuente ausente. La sincronización existente o añadida por el ticket 01 transporta el nuevo campo sin ecos ni pérdida de cambios rápidos.
- [x] Se recalculan las medidas del editor y del preview, su índice de líneas y su espacio inferior. Cambiar interlineado conserva documento, selección y lugar lógico de edición; no remonta el editor para forzar el cambio.
- [x] Tests de preferencias e integración cubren default, datos anteriores, campos inválidos, entrada transitoria, extremos, decimal 1,25, independencia, guardado y restauración.
- [x] En Electron real, editor de 16 px con multiplicador 1,5 mide filas de 24 px, y cuerpo de preview de 20 px con 1,25 mide líneas de 25 px. Se comprueban gutters, títulos, código, extremos 1/3 y escalas de interfaz 80/150 % sin acoplar los ajustes.
- [x] El harness real comprueba scroll y sincronización después del cambio, además de persistencia tras reiniciar. jsdom no se usa como prueba de geometría.
- [x] Typecheck, lint, tests afectados y build pasan. Si el ticket 01 ya está integrado, se verifica el flujo completo de dos ventanas e interlineado antes de dar por completada la entrega.

## Notes

Este ticket no requiere que la ventana nativa exista primero: amplía los controles y preferencias compartidos de extremo a extremo. No introduce interlineado para la interfaz, separación entre párrafos ni preferencias por documento.

## Comments

2026-10-31: Implementado y verificado en Linux con Electron real. La revisión por historia, las pruebas y los límites de verificación están en [implementation-review](../implementation-review.md).
