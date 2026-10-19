# 02: Atajo contextual `Ctrl/Cmd+N`

**Qué construir:** el atajo global de creación deja de estar fijo a Story y pasa a ejecutar la misma acción contextual que el botón del sidebar, usando la derivación del ticket 01. En Stories, `Ctrl/Cmd+N` crea una Story como hasta ahora. En Articles, crea un Article con la misma Story preseleccionada que produciría el botón. Si la acción está deshabilitada porque no existe ninguna Story, la tecla se consume pero no crea nada ni abre editores. `Ctrl/Cmd+S` no cambia.

**Blocked by:** 01 (necesita el hook de derivación y la habilitación contextual)

**Status:** resolved

- [x] `Ctrl/Cmd+N` en Stories crea una Story y abre el Story editor (regresión del comportamiento actual).
- [x] `Ctrl/Cmd+N` en Articles abre el Article editor y crea un Article con la misma Story preseleccionada que el botón.
- [x] Sin ninguna Story y con Articles activo, `Ctrl/Cmd+N` no abre editor ni escribe nada.
- [x] El atajo usa la misma fuente de tipo y habilitación que el botón; no duplica la derivación.
- [x] `Ctrl/Cmd+S` sigue forzando el guardado del Article abierto.
- [x] Tests de integración en el seam de App cubren Stories, Articles y el caso sin Story.

## Comments

- **2026-10-19 — Implementado e integrado.** Implementación en `01ae8ff`; merge en `9b3e85d`. La cobertura adicional de los guards del atajo (draft inválido y Story de origen inexistente) quedó en `075964d`. Evidencia: suite completa 228 tests, typecheck y lint verdes.
