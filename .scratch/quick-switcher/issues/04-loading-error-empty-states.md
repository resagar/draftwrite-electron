# 04: Estados de carga, error y biblioteca vacía

**What to build:** La paleta nunca es una pantalla en blanco ni una pantalla de error. Abre aunque una o las tres colecciones estén cargando o hayan fallado. El grupo afectado muestra su estado: carga mientras llega y aviso con botón "Retry" si falló, llamando al `reload` correspondiente. Cuando la consulta no tiene resultados se muestra "No matches"; cuando las tres colecciones están cargadas y vacías se muestra "Nothing to open yet" con una pista para crear.

**Blocked by:** 02 (Búsqueda difusa con ranking y resaltado).

**Status:** ready-for-agent

- [ ] La paleta se abre con las colecciones en `loading`, en `error` o en cualquier combinación.
- [ ] Un grupo en carga muestra una fila o indicador de carga comprensible.
- [ ] Un grupo en error muestra un aviso y un botón "Retry" que vuelve a cargar solo esa colección.
- [ ] Un grupo cargado y vacío se omite de la lista.
- [ ] Si las tres colecciones están cargadas y vacías, se muestra "Nothing to open yet" con una pista para crear.
- [ ] Si la consulta no coincide con nada, se muestra "No matches" y el término buscado, sin confundirse con el estado de biblioteca vacía.
- [ ] Los estados no rompen el teclado: la opción activa sigue siendo válida y `Escape` cierra.
