# 05: Mantener visible la fila abierta en la lista

**What to build:** Al abrir una entrada desde la paleta, la fila seleccionada de la columna de la izquierda queda a la vista aunque estuviera fuera del scroll. La columna se desplaza lo justo (`block: 'nearest'`) cuando cambia la selección visible, de modo que el resaltado confirma qué se abrió.

**Blocked by:** 01 (Quick switcher: abrir, explorar y abrir entidades).

**Status:** ready-for-agent

- [ ] Al cambiar la selección visible, incluida la que llega desde la paleta, la fila seleccionada se desplaza a la vista con `block: 'nearest'`.
- [ ] El desplazamiento ocurre también al cambiar de biblioteca desde la paleta.
- [ ] No se añaden tests de layout o geometría de scroll a Jest; la verificación se hace en la app Electron, según la regla del proyecto.
- [ ] El comportamiento no introduce saltos de scroll al abrir la app ni al seleccionar una fila ya visible.
