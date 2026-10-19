# Modelo de dominio rico (no anémico)

Las entidades (`Story`, `Article`) solo se crean vía constructor (`newStory()`, `newArticle()`), que genera el ID con `randomUUID()` y valida las invariantes con centinelas camelCase exportados por el propio `model.ts`: "tell, don't ask".

Esto impide construir entidades inválidas desde fuera del dominio y centraliza las reglas en un solo lugar. `update` re-valida las invariantes mediante un método que no regenera el ID.
