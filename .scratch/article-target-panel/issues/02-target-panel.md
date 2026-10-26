# 02: TargetPanel de lectura y edición

**Qué construir:** crear `src/renderer/src/workspace/TargetPanel/TargetPanel.tsx` como componente presentacional que recibe un `ArticleTargetLink`. En reposo muestra la etiqueta `Target`, el texto con `text-[14px] leading-loose`, `whitespace-pre-wrap`, `break-words` y scroll propio; si está vacío muestra `No target yet.` y un botón `Add target`; si tiene valor muestra `Edit target`. Al editar, el mismo cuerpo se convierte en un `<textarea>` con la misma tipografía, `resize-none`, fondo transparente y scroll; aparecen `Cancel` y `Save`. `Cancel` descarta y devuelve el foco al botón; `Save` aplica `trim()`, valida el límite de 255 bytes UTF-8 con un helper puro `utf8Length` (equivalente a `Buffer.byteLength`, sin `TextEncoder` porque no existe en jsdom), llama a `link.save(next)` y vuelve a reposo. `Escape` cancela y `Cmd/Ctrl+Enter` guarda. El componente no conoce el contexto ni el borrador: solo el link y sus callbacks.

**Blocked by:** ninguna (el componente es presentacional y se prueba con un link de fixture)

**Status:** resolved

- [x] `TargetPanel` recibe `link: ArticleTargetLink` y no importa el contexto de Article.
- [x] El estado local es `editing`, `draft` y `error`; el valor no se publica hasta `Save`.
- [x] En reposo se muestra `No target yet.` + `Add target` cuando el valor está vacío.
- [x] En reposo se muestra el valor y `Edit target` cuando hay Target.
- [x] Al entrar en edición, el textarea contiene el valor actual y recibe el foco con el caret al final.
- [x] `Cancel` descarta los cambios, no llama a `link.save` y devuelve el foco al botón de edición.
- [x] `Save` recorta, llama a `link.save` con el valor y vuelve a reposo.
- [x] `Escape` cancela; `Cmd/Ctrl+Enter` guarda.
- [x] Un Target de 255 bytes se acepta; uno de 256 bytes muestra un error visible, marca el textarea con `aria-invalid` y no llama a `link.save`.
- [x] El límite se mide en bytes UTF-8, no en caracteres.
- [x] El helper `utf8Length` cuenta bytes sin depender de `TextEncoder`, que no existe en jsdom.
- [x] Guardar un valor vacío o solo con espacios es válido y vuelve a `No target yet.`.
- [x] El panel es una `section` con `aria-label="Target"`; el textarea tiene `aria-label="Target"` y el error usa `role="alert"` y `aria-describedby`.
- [x] El cuerpo usa `min-h-0 flex-1 overflow-y-auto overscroll-contain`; el header no se encoge.
- [x] `TargetPanel.test.tsx` cubre lectura, edición, cancelar, guardar, teclado, límite, `trim` y foco.
- [x] `pnpm test -- src/renderer/src/workspace/TargetPanel`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- 2026-10-26: implementado. Se añadió el caso de 255 bytes aceptados y la asociación `aria-describedby` del error, que faltaban. Se eliminó el prop opcional `className`, sin uso, para dejar el componente con el contrato de la spec.
