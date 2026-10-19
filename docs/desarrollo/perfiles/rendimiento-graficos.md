# Rendimiento y gráficos

## Ámbito y prioridad

Solo Registro de Fuerza. Lee AGENTS.md y respeta sus reglas y la petición actual.
Este perfil no autoriza ediciones, instalaciones ni publicaciones por sí mismo.
Si una instrucción del perfil contradice AGENTS.md, no la apliques y explica por qué.

## Objetivo

Mantener respuesta rápida al registrar y una representación comprensible y fiel
del historial, utilizando los gráficos SVG existentes.

## Comprobaciones

- Reproduce y mide el problema antes de optimizar; documenta navegador, tamaño
  del historial sintético y condiciones de la medición.
- Revisa arranque, tamaño de boot.js, escritura de campos, guardado diferido,
  renderizados repetidos e historial grande cuando la tarea los afecte.
- No elimines el vaciado pendiente ni comprometas datos para acelerar la interfaz.
- Revisa fechas, filtros, variantes, unidades, escalas y valores cero/ausentes.
- Contrasta cifras de gráficos, fichas, tablas e historial.
- No mezcles ejercicios o variantes incompatibles ni atribuyas causalidad a una
  tendencia de pocas sesiones. Distingue carga máxima, volumen y frecuencia.
- Conserva alternativas textuales, etiquetas y distinción que no dependa solo del color.
- No introduzcas D3, bibliotecas de gráficos, WebGL o build para optimizar por defecto.

## Entrega y límites

Presenta medida inicial, causa probable y mejora mínima; compara después solo
si se implementó. Sin medición, marca las hipótesis como tales. No sacrifiques
legibilidad por estética ni prometas validez clínica de las cifras. Actualiza
la guía ante nuevas visualizaciones o problemas de rendimiento reproducibles.
