# Vim mode

Status: ready-for-agent

Alcance, fronteras de prueba y desglose aprobados por el usuario el 2026-10-31.

## Problem Statement

Quien escribe con movimientos de Vim necesita mantener ese flujo al editar el Text de una Story, Article o Post. Hoy el editor solo ofrece edición convencional. La preferencia debe poder cambiarse desde Settings sin perder el trabajo ni alterar otros campos.

## Solution

Agregar un interruptor global Vim mode en la ventana independiente de Settings, desactivado por defecto y persistido entre sesiones. Actúa inmediatamente sobre el Text del documento abierto. La barra de estado muestra Normal, Insert o Visual. Se mantienen el autoguardado, el guardado manual y los previews existentes.

## User Stories

1. Como escritor, quiero activar Vim mode desde Settings para usar edición modal.
2. Como escritor, quiero desactivarlo desde el mismo control para volver a la edición convencional.
3. Como usuario nuevo, quiero que esté desactivado para conservar el comportamiento actual.
4. Como escritor, quiero conservar mi elección al reiniciar la aplicación.
5. Como escritor, quiero una preferencia global para no repetirla por documento.
6. Como escritor, quiero usarla en el Text de una Story.
7. Como escritor, quiero usarla en el Text de un Article.
8. Como escritor, quiero usarla en el Text de un Post.
9. Como escritor, quiero que títulos y formularios mantengan su edición habitual.
10. Como escritor, quiero que Settings mantenga sus controles y atajos habituales.
11. Como escritor, quiero que los previews sigan siendo de solo lectura.
12. Como escritor, quiero que cada documento se abra en Normal para empezar desde un estado predecible.
13. Como escritor, quiero entrar en Insert con i y volver a Normal con Esc.
14. Como escritor, quiero seleccionar mediante Visual y ver ese modo en la barra de estado.
15. Como escritor, quiero que el cambio de preferencia se aplique sin reabrir el documento.
16. Como escritor, quiero conservar texto, selección, scroll e historial de deshacer al cambiarla.
17. Como escritor, quiero que activar Vim mode entre en Normal.
18. Como escritor, quiero que al desactivarlo desaparezca el indicador modal.
19. Como escritor, quiero que las teclas manejadas por Vim tengan prioridad dentro del Text sin disparar una segunda acción global.
20. Como escritor, quiero conservar los atajos de la aplicación fuera del editor.
21. Como escritor, quiero moverme por palabras mediante w y b.
22. Como escritor, quiero borrar líneas con dd y cambiar palabras con ciw.
23. Como escritor, quiero buscar con / y recorrer resultados con n y N.
24. Como escritor, quiero repetir una edición con el comando punto.
25. Como escritor, quiero deshacer con u y rehacer con Ctrl+R.
26. Como escritor, quiero usar :w con las validaciones y avisos del guardado manual existente.
27. Como escritor, quiero mantener el autoguardado mientras uso edición modal.
28. Como escritor, quiero recibir un aviso al intentar :q, :q! o :wq sin cerrar ni descartar trabajo.
29. Como escritor, quiero conservar mis fuentes, tamaños e interlineado al migrar mis preferencias.
30. Como escritor, quiero ver cualquier fallo de persistencia de la preferencia sin perder su efecto durante la sesión.

## Implementation Decisions

- Reutilizar el editor CodeMirror existente mediante una extensión de edición Vim. Evaluar la compatibilidad de @replit/codemirror-vim con las versiones instaladas antes de integrarla; no construir un motor modal propio.
- Reconfigurar el editor en vivo sin remontarlo ni sustituir su documento o historial. La activación entra en Normal y conserva los rangos de selección y la posición de scroll.
- El estado Normal/Insert/Visual es efímero y pertenece al editor actual. Solo se persiste el interruptor global. Un cambio de documento reinicia el estado a Normal cuando la preferencia está activa.
- Extender las preferencias existentes con un booleano de edición modal. Reutilizar la ventana Settings, los contratos tipados, las actualizaciones parciales, las revisiones y las notificaciones actuales; no introducir otro transporte o escritor de persistencia.
- Preferencias antiguas o sin el campo nuevo equivalen a desactivado, conservando todos los valores tipográficos. Validar estrictamente las escrituras: solo booleanos y solo en el contexto editor. No aceptar cambios en preview o interface para esta opción.
- Conservar el comportamiento actual ante almacenamiento bloqueado: cambio efectivo durante la sesión y aviso de que no pudo persistirse. Reabrir Settings muestra el valor efectivo.
- Restaurar los valores del editor también devuelve Vim mode a su valor predeterminado, desactivado.
- Respetar la separación de estado existente: los cambios de modo no generan escrituras de preferencias por pulsación ni propagan actualizaciones de alta frecuencia por toda la interfaz.
- La prioridad de teclado depende del foco y del consumo real de la tecla. No deshabilitar globalmente todos los atajos por estar activada la preferencia. Los listeners actuales de atajos requieren coordinación con las teclas consumidas por el editor.
- :w utiliza la misma acción de guardado manual del documento activo. Conserva las validaciones, errores, avisos y la semántica del guardado asíncrono; no anuncia éxito antes de que el flujo existente lo confirme.
- Interceptar :q, :q! y :wq como no disponibles, con aviso visible y sin efectos de cierre, descarte ni guardado parcial por :wq.
- Mantener la sincronización del preview, las métricas, el cursor y la persistencia existentes al editar mediante comandos Vim.
- No modificar el modelo de dominio ni la base de datos de Story, Article o Post. Respetar el aislamiento del renderer y la arquitectura de estado del frontend.

## Testing Decisions

- Frontera principal: interacción de usuario con Settings y el editor real en Electron, incluyendo dos ventanas. Verificar efectos observables y el documento resultante, sin probar métodos internos de la extensión.
- Reutilizar los tests de Settings/App con el puerto falso para activación, valores predeterminados, persistencia fallida, reapertura y exclusión de campos ajenos al Text.
- Reutilizar las pruebas de preferencias y del contrato IPC para migración compatible, booleanos inválidos, actualizaciones parciales y conservación de fuentes, tamaños e interlineado.
- Usar el harness nativo existente para secuencias de teclado reales, prioridad frente a atajos globales, cambios de documento y preservación de selección, historial y scroll. No comprobar geometría con jsdom.
- Verificar Normal/Insert/Visual y ausencia del indicador al desactivar; documentos distintos no heredan Insert o Visual.
- Cubrir w/b, dd, ciw, selección Visual, /, n/N, punto, u y Ctrl+R con textos y resultados concretos. Incluir al menos un atajo realmente compartido entre el motor seleccionado y la aplicación, tanto dentro como fuera del Text.
- Verificar :w en un documento válido, un borrador incompleto y un fallo de guardado, usando el flujo y feedback existentes. Verificar que cada comando de cierre rechazado deja intactos documento, ventana y borrador.
- Cubrir Story, Article y Post, autoguardado y preview tras cambios modales. Ejecutar las comprobaciones habituales de tipos, lint, tests y build al implementar; documentar límites de verificación por plataforma.
- No se necesitan nuevas fronteras públicas de test: ampliar las de preferencias/IPC y de aplicación existentes. Este enfoque fue aprobado por el usuario.

## Out of Scope

Ejecutar Neovim; configuración Lua; plugins; mappings personalizados; archivos de configuración de Vim; prometer paridad completa con Vim; comandos de cierre o descarte; edición de previews; modo modal en títulos, formularios o Settings; nuevas preferencias de tipografía; implementación en esta etapa de planificación.

## Further Notes

El alcance funcional fue confirmado al cerrar la entrevista. El desglose aprobado comprende tres entregas verticales: activación global, integración de edición y atajos, y comandos de guardado. La primera desbloquea las otras dos; estas no se bloquean entre sí. La spec y los tres tickets están publicados en el tracker local con estado ready-for-agent. La implementación queda fuera de esta publicación.
