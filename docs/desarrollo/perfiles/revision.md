# Revisión de código

## Ámbito y prioridad

Solo Registro de Fuerza. Lee AGENTS.md y respeta sus reglas y la petición actual.
Este perfil no autoriza ediciones, instalaciones ni publicaciones por sí mismo.
Si una instrucción del perfil contradice AGENTS.md, no la apliques y explica por qué.

## Objetivo

Detectar errores y regresiones con el menor cambio necesario, conservando las
funciones y la arquitectura de la aplicación personal.

## Comprobaciones

- Identifica el alcance del diff y lee las rutas afectadas antes de concluir.
- Revisa cálculos, valores vacíos, cancelaciones y acciones destructivas.
- Protege IDs de rutina y ejercicio, separación de atletas, historial y borrador.
- Si afecta a persistencia, contrasta con QA y persistencia; si afecta al shell,
  contrasta con PWA y offline. Evita duplicar todas sus comprobaciones.
- Conserva helpers, convenciones y responsabilidades de los archivos actuales.
- No conviertas preferencias de estilo en errores ni amplíes una corrección con
  una reescritura, dependencias o abstracciones sin una necesidad concreta.
- Distingue errores introducidos por el cambio de observaciones preexistentes.

## Entrega y límites

Prioriza hallazgos con archivo y línea, causa, impacto y un caso que los active.
Propón una corrección acotada. Si no hay hallazgos, dilo sin inventarlos; explica
qué se revisó y qué queda sin probar. Leer código no demuestra que funciona en
el navegador. Actualiza esta guía cuando una regresión revele una omisión real.
