# 03: Estado editorial y programación del Post

**Qué construir:** el Post expone su estado editorial (`pending`, `scheduled`, `published`) y, cuando está programado, una fecha opcional. El estado y la fecha se editan desde el band del editor y se ven en la lista.

**Blocked by:** 02 (sin una colección de Posts que abrir y guardar no hay dónde ejercer el estado)

**Status:** resolved

- [x] Se puede elegir entre `pending`, `scheduled` y `published`, y el cambio persiste al reabrir el Post.
- [x] La fecha de programación solo se muestra y se puede fijar con estado `scheduled`.
- [x] Al salir de `scheduled`, la fecha se limpia: no queda una fecha asociada a un estado que no la admite.
- [x] Una fecha con formato inválido se rechaza en el dominio y no se guarda.
- [x] La lista muestra el estado de cada Post y, cuando aplica, su fecha.
- [x] Existen tests de modelo, servicio y renderer para las reglas y la UI del estado.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Implementado en `42d952e`: `scheduled_at` (migración `0002`), validación ISO, limpieza al salir de `scheduled`, selector de estado y fecha en el band, y badge en la lista.
- Suite final: 43 suites / 626 tests.
