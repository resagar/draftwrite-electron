# Vim mode: decisiones de diseño

## Decisiones confirmadas

- El nombre canónico es Vim mode: edición de estilo Vim dentro del editor actual.
- No se ejecuta Neovim ni se carga su configuración Lua o sus plugins.
- Un único interruptor global en Settings permite activarlo y desactivarlo.
- Está desactivado por defecto y conserva la elección entre sesiones.
- Afecta al Text de Story, Article y Post. Títulos, formularios y configuración mantienen la edición habitual.
- Con Vim mode activado, cada documento se abre en Normal. No hereda el modo Insert o Visual del documento anterior; `i` permite empezar a escribir y `Esc` vuelve a Normal.
- Activar o desactivar Vim mode desde Settings tiene efecto inmediato sobre el documento abierto, conservando texto, selección, scroll e historial de deshacer. Al activarlo entra en Normal; al desactivarlo vuelve a la edición habitual sin reabrir el documento.
- Dentro del Text y con Vim mode activo, las teclas manejadas por Vim tienen prioridad sobre los atajos globales de la aplicación y no disparan ambas acciones. Fuera del editor se conservan los atajos actuales.
- Mientras Vim mode está activado, la barra de estado muestra el modo actual: Normal, Insert o Visual. Al desactivarlo, el indicador desaparece.
- `:w` ejecuta el guardado manual existente, con las mismas validaciones y avisos. El autoguardado se mantiene y no se incorpora un mecanismo de persistencia separado.
- En la primera versión, `:q`, `:q!` y `:wq` se muestran como comandos no disponibles y no cierran documentos ni la aplicación. No se introduce otro flujo de cierre o descarte de borradores.
- La primera versión utiliza atajos estándar de Vim, sin mappings personalizados ni archivos de configuración propios.
- Las funciones esenciales incluyen navegación, edición con operadores, selección Visual, búsqueda, repetición y deshacer/rehacer. Se validarán comandos representativos como `w/b`, `dd`, `ciw`, `/`, `n/N`, `.`, `u` y `Ctrl+R`, sin prometer compatibilidad completa con Vim.

## Estado de la conversación

La entrevista está cerrada y el alcance fue confirmado. Se solicitó preparar la spec
y los tickets mediante to-spec y to-tickets. Esto no autoriza implementación.

El usuario aprobó las fronteras de prueba y el desglose y autorizó su publicación
el 2026-10-31. Spec y tres tickets publicados como ready-for-agent.

El usuario autorizó la implementación mediante implement. Los tres tickets se
implementaron directamente y se revisaron contra la spec el 2026-10-31.
