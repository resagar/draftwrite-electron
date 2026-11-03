# 02: Búsqueda difusa con ranking y resaltado

**What to build:** El input de la paleta filtra en vivo. La búsqueda ignora mayúsculas y tildes, exige que todos los términos aparezcan (AND) y combina fuzzy matching en identificadores y tags con subcadena en el `Text`. Los resultados se ordenan por relevancia y, en empate, por `UpdatedAt` descendente. Los caracteres que coinciden en el título o topic se resaltan. Con la consulta vacía vuelve la lista completa agrupada, y una consulta sin coincidencias muestra un mensaje claro.

**Blocked by:** 01 (Quick switcher: abrir, explorar y abrir entidades).

**Status:** ready-for-agent

- [ ] La consulta se normaliza con `trim`, minúsculas y eliminación de diacríticos, tanto en la consulta como en los campos indexados.
- [ ] La consulta se parte en tokens y cada token debe coincidir en al menos un campo de la entrada para que aparezca.
- [ ] En Story se busca por `Topic`, `Titles` y `Tags` con fuzzy, y por `Text` con subcadena.
- [ ] En Article se busca por `Title`, `Subtitle` y `Target` con fuzzy, por los identificadores de su Story (`Topic`, `Titles`, `Tags`) y por `Text` con subcadena.
- [ ] En Post se busca por `Topic` con fuzzy, por los identificadores de la Story o Article que cita y por `Text` con subcadena.
- [ ] Los identificadores pesan más que las tags, el contexto y el `Text`; una coincidencia en posición temprana puntúa más; los empates se resuelven por `UpdatedAt` descendente y luego por tipo e `id`.
- [ ] Los caracteres coincidentes del título o topic se resaltan en la fila; el `Text` se muestra como preview plano.
- [ ] La consulta vacía devuelve todas las entradas agrupadas por tipo y ordenadas por `UpdatedAt` descendente.
- [ ] Una consulta sin coincidencias muestra "No matches" con el término buscado.
- [ ] La lógica de búsqueda vive en un módulo puro sin React y está cubierta por tests unitarios de tabla.
