# Verificación de propiedades compactas

Fecha: 2026-11-03. Baseline de revisión: `8218176425f291ee3c47630c14948cc59bca9c72`.

## Resultado por ticket

| Ticket | Implementación y evidencia |
| --- | --- |
| 01 — Story | Topic permanece visible. Titles y Tags se conservan montados en Properties, inicialmente cerrado por sesión. El resumen excluye Titles vacíos y Tags sin confirmar. La prueba de aplicación conserva una etiqueta a medio escribir al plegar/reabrir y verifica foco, selección y expansión durante el primer guardado. El panel tiene scroll local para listas largas. |
| 02 — Article | Title y Story permanecen visibles. Subtitle se edita desde Properties y conserva borrador, resumen y foco durante el guardado. Container queries permiten que Title utilice toda su fila en el panel estrecho. Se mantienen los bloqueos de procedencia, el panel de fuente y Target. |
| 03 — Post | Topic y State permanecen visibles. Source tiene resumen y editor desplegable; ScheduledAt aparece directamente al elegir scheduled y mantiene su carácter opcional. Las pruebas comprueban fuentes Story/Article, estados y persistencia. El resumen usa la fuente resuelta y no confunde un filtro de biblioteca con una fuente ausente; el selector conserva su opción actual aunque el filtro la excluya. |

Los tres tipos se comprueban también al abrir registros existentes, cambiar de entidad e iniciar otra creación: Properties arranca cerrado con los datos de su propia sesión. Los campos ocultos quedan fuera del orden de foco y no se desmontan; el botón expone aria-expanded, aria-controls y la descripción completa del resumen.

## TDD y regresiones

- Cada flujo principal se ejecutó primero en rojo porque no existía su control Properties y después pasó con su implementación.
- Dos casos adicionales reprodujeron en rojo el resumen incorrecto de Source con filtros que excluían una Story o un Article existentes; pasan después de usar la fuente ya resuelta.
- Ocho casos nuevos usan la aplicación completa con DataPort fake, sin mocks de componentes internos.
- Las pruebas existentes de App y autoguardado conservan todas sus aserciones. Se agregaron únicamente cinco acciones de apertura de Properties para recorrer la interfaz aprobada.
- No se modificaron TextEditor, EditorPreviewLayout, toolbar, preview, tipografía, contratos de datos, esquema ni servicios de dominio.

## Geometría en Chromium

La comparación siguiente utiliza escala de interfaz al 100 %, modo split, panel de fuente abierto y los anchos iniciales de paneles, con los fixtures de investigación. La banda contiene identificadores válidos; los avisos requeridos no se ocultan para obtener las medidas. Los resultados completos resumidos se conservan en chromium-results.json.

| Banda cerrada | Baseline a 1280 × 800 | Implementación a 1280 × 800 | Baseline a 900 × 600 | Implementación a 900 × 600 |
| --- | ---: | ---: | ---: | ---: |
| Story sin Titles | 95,28 px | 45 px | 95,28 px | 45 px |
| Story con tres Titles | 169,56 px | 45 px | 169,56 px | 45 px |
| Article | 95,28 px | 81 px | 95,28 px | 153,56 px |
| Post pending | 81 px | 45 px | 81 px | 81 px |

En Article, Title pasó de 18 a aproximadamente 357 px de ancho en la ventana de 1280 × 800, y de 18 a 172 px en la de 900 × 600. Conserva 28 px de alto a escala 100 %. La banda estrecha crece porque apila campos legibles; no se promete ahorro vertical universal. En Post estrecho el botón y las acciones envuelven a otra fila, por lo que el alto cerrado permanece igual al baseline. En ambos casos los controles se adaptan al contenedor sin reducir las fuentes para forzar una sola fila.

Se revisaron capturas de los tres tipos abiertos y cerrados en ambas ventanas. Los resúmenes largos se truncan y conservan su contenido completo como descripción accesible y tooltip. En el panel más estrecho también puede truncarse visualmente Properties; el nombre accesible y el tooltip mantienen la acción completa.

## Comprobación nativa

Se compiló un harness temporal con el App real, su CSS de Tailwind, fuentes y DataPort fake. Playwright controló Chromium en 12 escenarios, produciendo 48 mediciones:

- Los tres tipos a 1280 × 800 y 900 × 600 con escala 100 %, modo split y fuente abierta.
- Los tres tipos a 900 × 600 con escala 150 %, modo edit y fuente abierta.
- Los tres tipos a 1280 × 800 con escala 80 %, modo preview y fuente cerrada.

Los seis escenarios centrales verificaron Enter para abrir, Space para cerrar, foco conservado en el botón y Tab sin entrar en controles ocultos. En los doce se comprobaron expansión estable, foco y selección durante una creación diferida, conservación de la instancia de CodeMirror y undo de contenido anterior al primer guardado. Story conservó el Tag sin confirmar; Post mostró la fecha aunque Source estuviera plegado. No hubo errores de JavaScript ni desbordes horizontales de los controles de las bandas. Las aserciones adicionales verificaron alto de Title según escala y ancho completo en su fila estrecha.

El harness y las capturas están en `/tmp/draftwrite-compact-properties-browser/`. Se cerró su sesión de navegador y el servidor temporal al terminar. Esta comprobación no ejecutó el paquete Electron instalado ni un lector de pantalla; no constituye una auditoría integral de accesibilidad. El límite de datos del harness es el fake acordado.

## Checks y revisión

- `pnpm test --runInBand`: 44 suites y 534 tests pasados en main y renderer, aproximadamente 70 segundos.
- `pnpm typecheck`: main/preload y renderer sin errores.
- `pnpm lint`: sin errores.
- Detector de diseño sobre los cuatro componentes de propiedades: `[]`.
- Standards: cero hallazgos pendientes tras corregir Source filtrado.
- Spec: cero hallazgos funcionales pendientes; geometría y comprobación nativa confirmadas.

El estado ready-for-agent de los documentos se conserva como etiqueta de triage; las listas de aceptación y los comentarios de cada ticket registran su implementación completada.
