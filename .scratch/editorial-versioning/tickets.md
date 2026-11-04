# Tickets de versionado editorial

Status: ready-for-agent

Resolution: implemented

18 tickets aprobados, implementados y verificados. Cada ticket entrega comportamiento vertical demostrable, con las capas necesarias y pruebas.

1. **[Borrador principal de Article y migración](issues/01-article-draft.md)** — Bloqueado por: ninguno. Crear y reabrir Articles con una variante principal y borrador 0.0.0, conservando el editor y los Articles existentes.

2. **[Versiones manuales de Article](issues/02-article-versions.md)** — Bloqueado por: 01. Guardar, listar y consultar versiones inmutables del Article desde su editor.

3. **[Borrador principal de Post y migración](issues/03-post-draft.md)** — Bloqueado por: ninguno. Crear y reabrir Posts con variante principal y borrador 0.0.0, preservando datos previos y publicación.

4. **[Versiones manuales de Post](issues/04-post-versions.md)** — Bloqueado por: 03. Guardar, listar y consultar versiones inmutables de tema y texto de Post.

5. **[Notas generales y fotografía de revisión](issues/05-review-notes.md)** — Bloqueado por: 02, 04. Crear y resolver notas generales de revisión en Article y Post, y conservarlas en versiones.

6. **[Notas vinculadas a fragmentos](issues/06-anchored-notes.md)** — Bloqueado por: 05. Anotar fragmentos y conservar observaciones cuando cambie la redacción.

7. **[Variantes desde versiones guardadas](issues/07-variants.md)** — Bloqueado por: 06. Crear y cambiar entre variantes con borrador, numeración e historial propios.

8. **[Variante principal y archivo reversible](issues/08-primary-archive.md)** — Bloqueado por: 07. Elegir la propuesta principal y archivar o reactivar exploraciones.

9. **[Dos variantes editables lado a lado](issues/09-parallel-editing.md)** — Bloqueado por: 07. Escribir simultáneamente en dos variantes de la misma pieza.

10. **[Comparación editorial entre versiones y borrador](issues/10-comparison.md)** — Bloqueado por: 07. Elegir y comparar versiones de la misma pieza o un borrador contra una versión.

11. **[Recuperación sin pérdida de historial](issues/11-restoration.md)** — Bloqueado por: 07. Recuperar campos de escritura de una versión anterior en la variante actual.

12. **[Integración selectiva desde versión guardada](issues/12-integration.md)** — Bloqueado por: 10. Seleccionar cambios de otra variante, revisar y confirmar su incorporación al borrador destino.

13. **[Resolución manual de conflictos editoriales](issues/13-conflicts.md)** — Bloqueado por: 12. Resolver cambios superpuestos durante una integración y confirmar el resultado.

14. **[Notas seleccionadas al integrar](issues/14-integration-notes.md)** — Bloqueado por: 13. Trasladar observaciones pendientes relacionadas con los fragmentos integrados.

15. **[Variante de Article como Article independiente](issues/15-article-conversion.md)** — Bloqueado por: 08. Convertir una exploración en un Article de la misma Story y archivar el origen.

16. **[Variante de Post como Post independiente](issues/16-post-conversion.md)** — Bloqueado por: 08. Convertir una exploración en un Post independiente pendiente y archivar el origen.

17. **[Historial de publicaciones por versión](issues/17-publication-records.md)** — Bloqueado por: 07. Registrar y consultar publicaciones manuales de versiones exactas de Article y Post.

18. **[Aviso de revisión pendiente al registrar publicación](issues/18-publication-warning.md)** — Bloqueado por: 17. Advertir sobre notas pendientes de la versión publicada sin impedir la decisión del autor.

## Puntos de prueba propuestos

- Principal: frontera pública DataPort/preload/handlers con servicios y SQLite reales, incluyendo migración y reapertura.
- Complementarios: unit tests de invariantes y Testing Library para interacciones y cancelaciones.
- Runtime: Electron/Chromium para edición paralela, foco, scroll, selección, diferencias y conflictos; jsdom no prueba geometría.

## Criterio de avance

Trabajar cualquier ticket cuyos bloqueadores estén completos. 01 y 03 pueden iniciar sin dependencias. La secuencia evita refactorizaciones horizontales obligatorias; cada entrega amplía contratos de forma compatible. Revisar cada entrega contra la especificación antes de declararla terminada.

La resolución y la cobertura de cada entrega están registradas en [la revisión de implementación](implementation-review.md). El estado de triage conserva su vocabulario original; `Resolution` registra la implementación terminada.
