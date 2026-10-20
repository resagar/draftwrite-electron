# 03: Estados de carga, error y Story ausente en el panel

**Qué construir:** el panel distingue explícitamente cinco estados: `ready`, `empty`, `loading`, `error` y `missing`. `empty` conserva el placeholder de ausencia de Story. `loading` aparece cuando hay un `StoryID` seleccionado pero la lista de Stories todavía está cargando; muestra un mensaje discreto con `role="status"` y `aria-busy="true"`, sin skeleton de lista y sin decir que la Story ya no existe. `error` aparece cuando la carga de Stories falla; muestra un mensaje claro y una acción `Try again` que vuelve a cargar las Stories. `missing` aparece cuando la lista está lista y la Story no existe: en un Article guardado conserva el texto actual; en un borrador aclara que la Story seleccionada ya no está disponible y que se puede elegir otra. Si la Story ya está en memoria, se muestra aunque una recarga posterior esté en curso. La llegada de datos no cambia el estado expandido o minimizado del panel.

**Blocked by:** 02 (necesita el shell expandido/minimizado para que los estados respeten la expansión)

**Status:** ready-for-agent

- [ ] Con una Story seleccionada y la lista en carga, el panel muestra el estado de carga y no el mensaje de Story inexistente.
- [ ] El estado de carga se anuncia con `role="status"` y `aria-busy="true"`; no usa un skeleton de lista.
- [ ] Cuando la carga termina con éxito, el panel muestra la Story sin autoexpandirse si estaba minimizado.
- [ ] Si la carga de Stories falla, el panel muestra el error y una acción `Try again`.
- [ ] `Try again` vuelve a cargar las Stories y, si la carga tiene éxito, muestra el contenido de la Story.
- [ ] Si la Story ya está en memoria y una recarga posterior está en curso, el panel sigue mostrando la Story.
- [ ] Un Article huérfano con la biblioteca lista sigue mostrando `/no longer exists/`.
- [ ] Un borrador con una Story seleccionada que ya no existe muestra un mensaje específico de borrador, no el mensaje de Article guardado.
- [ ] Ninguno de los estados de carga o error se presenta como `role="alert"` salvo el error real.
- [ ] La llegada de datos no cambia `aria-expanded` ni la posición del foco.
- [ ] Tests de integración con `listStoriesGate`, `listStoriesFailures` y un Article huérfano cubren carga, error, reintento y Story ausente.
