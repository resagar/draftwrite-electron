# update sin lectura previa salvo regla de negocio

Los servicios de aplicación `update` validan la entidad y la persisten; leen el valor almacenado antes de escribir solo cuando una regla de negocio necesita comparar contra él. `articleService.update` hace `validate → get → update` porque el `get` es lo que permite hacer cumplir `errStoryIDImmutable`; `storyService.update` hace `validate → update` porque story no tiene ningún campo inmutable que comparar.

## Por qué

La asimetría es deliberada, no un descuido. El update del repositorio de story usa `.returning()`: ante un ID inexistente el UPDATE no afecta filas (`changes === 0`) y `.returning()` no devuelve nada, así que el repositorio lo mapea a `errNotFound` — ya falla con el error correcto sin lectura previa. Un `get` extra en story sería una consulta redundante en cada update y obligaría a adaptar el test de `storyService.update` con ID inexistente (el fake pasaría de `update` a `get`), tocando el contrato de tests.

## Cuándo cambiarlo

Cuando aparezca una regla que necesite el valor almacenado (p. ej. inmutabilidad de `topic`), se añade el `get` siguiendo el patrón de `article`.
