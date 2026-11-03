# 03: Disparador definitivo en la barra de título

**What to build:** La caja de búsqueda de la barra de título deja de parecer un input deshabilitado y pasa a ser el disparador visible de la paleta. Muestra icono de lupa, el texto "Search stories, articles and posts…" y la tecla de plataforma (`⌘ K` o `Ctrl K`) como pista. Al hacer clic o activarla con teclado abre la paleta con el foco en el input. El `aria-label` incluye el atajo y ya no dice "not available yet".

**Blocked by:** 01 (Quick switcher: abrir, explorar y abrir entidades).

**Status:** ready-for-agent

- [ ] El control de la barra de título es un botón real, enfocable y accionable con `Enter`/`Espacio`, no un input deshabilitado.
- [ ] Muestra icono de búsqueda, el texto "Search stories, articles and posts…" y la pista de teclado con el modificador correcto según la plataforma.
- [ ] Al activarlo abre la paleta con el foco en el input.
- [ ] El `aria-label` menciona Stories, Articles, Posts y el atajo; no contiene "not available yet".
- [ ] La pista de teclado usa el mismo modificador que el resto de la UI (`usePlatformModifier`).
- [ ] El botón se ve y se comporta bien en el layout existente de la barra, sin romper el ancho de las zonas laterales.
