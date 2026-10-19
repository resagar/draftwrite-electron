# 02: Atajo contextual `Ctrl/Cmd+N`

**Qué construir:** el atajo global de creación deja de estar fijo a Story y pasa a ejecutar la misma acción contextual que el botón del sidebar, usando la derivación del ticket 01. En Stories, `Ctrl/Cmd+N` crea una Story como hasta ahora. En Articles, crea un Article con la misma Story preseleccionada que produciría el botón. Si la acción está deshabilitada porque no existe ninguna Story, la tecla se consume pero no crea nada ni abre editores. `Ctrl/Cmd+S` no cambia.

**Blocked by:** 01 (necesita el hook de derivación y la habilitación contextual)

**Status:** ready-for-agent

- [ ] `Ctrl/Cmd+N` en Stories crea una Story y abre el Story editor (regresión del comportamiento actual).
- [ ] `Ctrl/Cmd+N` en Articles abre el Article editor y crea un Article con la misma Story preseleccionada que el botón.
- [ ] Sin ninguna Story y con Articles activo, `Ctrl/Cmd+N` no abre editor ni escribe nada.
- [ ] El atajo usa la misma fuente de tipo y habilitación que el botón; no duplica la derivación.
- [ ] `Ctrl/Cmd+S` sigue forzando el guardado del Article abierto.
- [ ] Tests de integración en el seam de App cubren Stories, Articles y el caso sin Story.
