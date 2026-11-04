# 02: Posts: colección, creación y editor

**Qué construir:** una tercera colección «Posts» en la Library, con un Post que se crea, se escribe y se reabre con el mismo editor que Story y Article. Un Post nace sin fuente y en estado `pending`; el control de estado y las relaciones llegan en los tickets 03 y 04.

**Blocked by:** — (puede empezar ya; en paralelo con 01)

**Status:** resolved

- [x] La Library ofrece tres colecciones y «Posts» lista los Posts persistidos con su topic, un adelanto del texto y la fecha, ordenados como las otras listas.
- [x] «New Post» (botón contextual y atajo de creación) abre un Post nuevo en el editor.
- [x] El topic es obligatorio: un Post sin topic no se guarda y, al intentar salir, se avisa con el mismo patrón que un Article sin título.
- [x] El editor ofrece el mismo comportamiento que Story y Article: Markdown, toolbar de formato, modos edit/split/preview, typewriter y autosave.
- [x] Un Post guardado se reabre desde la lista y sobrevive al reinicio de la app.
- [x] El dominio crea siempre el Post en estado `pending`, aunque la UI todavía no ofrezca cambiarlo.
- [x] Existen tests de modelo, persistencia SQLite, servicio, IPC y renderer para lo incluido.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Implementado en `046ab11`: dominio Post, migración `0001_add_posts`, repositorio, servicio, 4 canales IPC, colección «Posts», lista, band, editor y pane.
- Suite final: 43 suites / 619 tests; `pnpm typecheck` y `pnpm lint` limpios.
