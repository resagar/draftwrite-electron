# Spec: continuidad de edición durante el autoguardado

**Status:** ready-for-agent

**Fecha:** 2026-11-03

## Problem Statement

Al crear una Story, un Article o un Post, una pausa de 700 ms permite el primer autoguardado y reemplaza el editor activo. La persona pierde el foco de Topic o Title y necesita volver a seleccionar el campo para continuar. La investigación reprodujo el reemplazo del input en las tres entidades. El control de actualización de una Story existente conservó foco y selección; falta cubrir las actualizaciones de Article y Post.

## Solution

El autoguardado debe completar la creación y las actualizaciones sin interrumpir la escritura. La persona conserva el campo activo, la posición del cursor, la selección y el contenido más reciente; puede seguir escribiendo sin hacer clic. La biblioteca y las acciones reflejan la entidad persistida sin reemplazar la sesión de edición.

## User Stories

1. Como escritor, quiero seguir escribiendo el Topic de una Story después del primer autoguardado para conservar mi ritmo.
2. Como escritor, quiero seguir escribiendo el Title de un Article después del primer autoguardado para conservar mi ritmo.
3. Como escritor, quiero seguir escribiendo el Topic de un Post después del primer autoguardado para conservar mi ritmo.
4. Como escritor, quiero conservar la posición del cursor dentro del campo para insertar texto donde estaba trabajando.
5. Como escritor, quiero conservar una selección de texto para poder reemplazarla después de una pausa.
6. Como escritor, quiero que las actualizaciones posteriores tampoco alteren el foco para trabajar de forma continua.
7. Como escritor, quiero que un guardado respete el foco que moví a otro campo para seguir controlando dónde escribo.
8. Como escritor, quiero conservar lo escrito mientras el primer guardado está en vuelo para no perder cambios recientes.
9. Como escritor, quiero que seguir escribiendo actualice la entidad creada para evitar duplicados.
10. Como escritor, quiero ver la entidad persistida en la biblioteca sin abandonar el editor para reconocer que se guardó.
11. Como escritor, quiero cambiar deliberadamente de entidad y ver su contenido correcto para evitar mezclar borradores.
12. Como escritor, quiero mantener los requisitos actuales de creación para no guardar entidades incompletas.
13. Como escritor, quiero poder reintentar un guardado fallido conservando mi contenido para recuperarme del error.
14. Como escritor, quiero que el guardado manual y la navegación sigan funcionando para usar mis flujos habituales.
15. Como escritor, quiero conservar la continuidad del editor de texto al completar la creación para no perder su selección o historial de edición por un reemplazo de pantalla.

## Implementation Decisions

- Corregir la composición del Workspace y los panes de Story, Article y Post para conservar la instancia del editor durante la transición de creación a entidad persistida. Mantener tipo, posición e identidad del árbol que contiene los campos y el editor de texto.
- La identidad de la sesión de edición permanece estable al recibir el ID persistido. Cambiar deliberadamente a otra entidad o iniciar otra creación debe mostrar el borrador correspondiente y aislar las sesiones.
- Los encabezados y las acciones pueden cambiar al completar la creación sin reemplazar el editor. Mantener la selección de biblioteca y las proyecciones de fuente y Target existentes.
- Conservar el debounce actual de 700 ms y los requisitos de persistencia: Topic en Story/Post; Story y Title en Article. Mantener las invariantes del dominio y el flujo de creación dentro del editor.
- Adoptar el ID persistido sin sobrescribir texto más reciente con una respuesta antigua. Los cambios pendientes deben actualizar la entidad creada y mantener el orden de escrituras, sin duplicados.
- Respetar la elección actual de foco de la persona. La solución no depende de forzar foco tras cada guardado.
- Evaluar memo, useCallback o useMemo únicamente si una dependencia o un coste observado lo justifica. Documentar su propósito cuando se introduzcan, usar dependencias correctas y evitar closures obsoletos. La conservación del editor debe funcionar sin depender de una caché de rendimiento.
- Mantener el estado local y los reducers existentes, conforme a los ADR de estado del frontend y de creación dentro del editor. No añadir un store global ni cambiar esquema, contratos IPC, DataPort o servicios de dominio.

## Testing Decisions

- Usar como frontera principal la aplicación React completa con renderApp y el DataPort fake existente: componentes, navegación y autoguardado reales por encima del límite de datos. La suite de App y el harness de investigación son el precedente.
- Verificar comportamiento observable: foco, selección, escritura posterior, contenido visible, payloads persistidos, número de creaciones y navegación. Evitar aserciones de contadores de render, hooks usados o estructura interna de componentes.
- Reproducir primero el fallo en creación de Story, Article y Post. Tras corregirlo, comprobar foco y selección antes y después del primer guardado y de una actualización posterior para las tres entidades.
- Incluir selección no colapsada y cursor en mitad del texto; continuar escribiendo en esa posición después del guardado.
- Retener la respuesta de creación con una promesa controlada para escribir más texto o mover el foco antes de resolverla. Comprobar conservación del último borrador, foco elegido y una sola entidad creada; verificar la actualización posterior con su ID.
- Cubrir cambio explícito entre entidades, nueva creación, validación, error/reintento, guardado manual y navegación usando las fronteras existentes. Evitar cambios a tests previos para acomodar una regresión.
- Complementar con Electron/Chromium para verificar foco y selección nativos y continuidad de CodeMirror, incluido undo tras completar la creación. No usar jsdom para comprobar layout o comportamiento nativo de CodeMirror.
- Ejecutar los tests pertinentes, typecheck y lint. Registrar por separado cualquier validación nativa que no pueda completarse.

## Out of Scope

Cambios de apariencia, nuevos campos, preferencias de autoguardado, guardado solo al perder foco, cambios de validación o modelo de dominio, APIs o migraciones, optimización general de renders y nuevos sistemas de gestión de estado.

## Further Notes

La investigación inicial verificó el fallo con Jest/jsdom y datos fake, sin SQLite/IPC ni GUI nativa. Esa evidencia describe el estado previo a la implementación.

React documenta que cambiar el tipo de componente en una posición reinicia el árbol: https://react.dev/learn/preserving-and-resetting-state. memo optimiza renders: https://react.dev/reference/react/memo. useCallback cachea la definición de una función: https://react.dev/reference/react/useCallback. Estas optimizaciones pueden complementar la implementación, pero no sustituyen la identidad estable del árbol.

Desglose aprobado: un ticket que resuelva conjuntamente las tres transiciones de creación y sus regresiones. Comparten causa y composición, y el cambio cabe en un contexto de implementación. Separarlas obligaría a coordinar modificaciones del mismo Workspace sin aportar un hito funcional diferente.


Decisiones confirmadas durante la revisión de implementación: la Story de un Article queda bloqueada al iniciar su creación y se libera si esta falla, preservando su procedencia inmutable. Un Post sigue naciendo Pending; si el borrador ya contiene State o ScheduledAt distintos, se persiste esa transición como actualización de la entidad recién creada antes de informar Saved. Ambas decisiones mantienen las invariantes y el contenido más reciente exigidos por esta spec.
