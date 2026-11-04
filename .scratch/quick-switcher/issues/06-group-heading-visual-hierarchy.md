# 06: Distinguir visualmente los encabezados por tipo

**What to build:** permitir que el escritor reconozca cada grupo del Quick Switcher mediante encabezados coloreados, una línea sutil y mayor separación, conservando los resultados y su comportamiento.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Story usa `text-accent`, Article `text-secondary` y Post `text-success`, mediante clases estáticas completas y a opacidad completa.
- [x] Los encabezados tienen una línea horizontal sutil `border-line`; los grupos posteriores al primero tienen 4 px adicionales de separación superior.
- [x] El primer grupo visible mantiene su espacio superior original, también al filtrar para omitir tipos anteriores.
- [x] Los encabezados no adoptan el fondo ni el borde izquierdo de selección; las etiquetas de resultados y su apariencia permanecen intactas.
- [x] Se conservan agrupación, orden, semántica, estados, foco, selección, scroll y navegación por teclado.
- [x] El cambio de producto queda limitado al componente Quick Switcher, sin modificar tema, dependencias, datos ni APIs.
- [x] Se verifica en Electron/Chromium con datos sintéticos aislados: los tres tipos, contraste computado >= 4.5:1, filtrado, selección, scroll, títulos largos, zoom y carga/error.
- [x] Pasan los tests existentes relevantes, typecheck, lint y suite completa, o se documentan los bloqueos sin ocultarlos.
- [x] Se revisa el diff final contra cada criterio y la ampliación de la spec, con evidencia y límites de validación.

## Contexto

Origen: refinamiento aprobado de la spec de Quick Switcher y research de la feature. El supervisor confirmó el ticket único, sin dependencias ni prefactoring, y las fronteras de validación ya aprobadas. No se modifica el resto de la spec ni sus tickets anteriores.

## Evidencia de implementación y validación (2026-11-04)

- Cambio de producto: mapa de tres clases completas, línea superior `border-line` de 1 px en cada encabezado y margen `mt-1` únicamente después del primer grupo visible. No se modificaron handlers, estructura de opciones, etiquetas ni semántica.
- Línea base: los 8 tests existentes de Quick Switcher pasaron antes del cambio. Tras el cambio volvieron a pasar los 8.
- `pnpm typecheck`: código 0; `pnpm lint`: código 0.
- `pnpm test`: 51 suites y 582 tests aprobados, sin fallos.
- `pnpm exec electron-vite build`: código 0. Se comprobó que el CSS generado contiene `text-accent`, `text-secondary`, `text-success`, `border-line` y `mt-1`.
- Detector de diseño sobre el componente: salida vacía de hallazgos (`[]`). Prettier del componente y del ticket se comprueba antes del commit; no se reformatea la spec original ajena al cambio.
- Chromium con Vite temporal: App y DataPortProvider reales, factories y createFakePort existentes con arrays sintéticos en RAM. Sin arrancar main/preload, IPC o SQLite; ningún perfil ni dato real. Harness y capturas en `/tmp/quickswitcher-dividers-verify/`.
- Colores computados RGB de encabezados: Story (246, 193, 119), Article (196, 167, 231), Post (156, 207, 216). Contraste sobre base: 9.55:1, 7.47:1 y 9.19:1. Opacidad 1, fondo transparente y sin borde izquierdo.
- Geometría computada: bordes superiores de 1 px en color (57, 53, 82), padding superior de encabezado de 8 px y márgenes de grupos 0/4/4 px. Al filtrar para dejar solo Articles o Posts, su margen inicial es 0 px.
- Selección conserva borde izquierdo primario de 2 px y fondo neutral. Se verificaron las seis opciones del fixture en el orden original.
- Comportamiento comprobado en Chromium: flechas saltan encabezados sin wrap, Home/End, Enter abre Article, Escape cierra y devuelve foco, Tab alcanza Retry y queda dentro del diálogo; Retry carga los posts. Se comprobaron filtro de un tipo y ausencia de coincidencias.
- Scroll con 36 opciones: altura de contenido 2804 px, viewport de lista 468 px, desplazamiento al último resultado 2335 px; selección dentro del área visible con tolerancia subpíxel de 1 px.
- Títulos largos y zoom CSS del 125 % a viewport 800×650: panel de 760 px, sin desbordamiento horizontal del panel ni de las opciones. Vista principal comprobada a 1280×900. Capturas revisadas: `ready.png`, `selected-article.png`, `filtered-Articles.png`, `filtered-Posts.png`, `long-125-percent.png`, `loading.png`, `error.png`.
- La ejecución validada terminó sin errores JavaScript de página. El primer arranque del harness tuvo errores de imports sin extensión y luego una falta de utilidades por escanear Tailwind desde /tmp; se corrigió exclusivamente la configuración temporal. No se cambió producto para resolverlos.

### Límites

La validación usa Chromium y la app React con puerto falso, no una sesión Electron nativa ni un lector de pantalla. El zoom se simula con CSS y no con el zoom nativo de Electron. Los archivos temporales de evidencia no forman parte del commit. No se añadieron tests de clases o geometría a Jest. El fallo editorial de navegación previo sigue fuera del alcance.

## Revisión final contra spec y ticket

**Resultado:** implementado y verificado. Se conserva la etiqueta canónica de triage del ticket; esta sección y las casillas registran el cierre técnico.

- **Standards:** 0 hallazgos. Revisión independiente de instrucciones locales, tokens semánticos, clases estáticas, diff mínimo y convenciones documentales.
- **Spec:** 0 hallazgos. Revisión independiente de cada criterio del refinamiento y ticket; sin requisitos faltantes ni ampliación funcional.
- Confirmación final de navegador: se repitió la comprobación usando el CSS generado por el build de producción, sin la directiva de escaneo del harness. Pasaron los mismos criterios; resultado estructurado en `/tmp/quickswitcher-dividers-verify/result.json` y registro en `production-verification.log`.
- Estado Git inicial de esta ejecución: spec modificada por la etapa anterior y research nuevo. Antes del commit, los únicos cuatro archivos previstos son spec, research, ticket 06 y componente. No se modifican los tickets 01–05.
- Sin instalaciones, migraciones, datos reales, merge ni push. Commit final convencional autorizado por la skill implement y el usuario.
