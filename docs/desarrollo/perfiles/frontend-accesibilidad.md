# Frontend móvil y accesibilidad

## Ámbito y prioridad

Solo Registro de Fuerza. Lee AGENTS.md y respeta sus reglas y la petición actual.
Este perfil no autoriza ediciones, instalaciones ni publicaciones por sí mismo.
Si una instrucción del perfil contradice AGENTS.md, no la apliques y explica por qué.

## Objetivo

Mantener una interfaz cómoda, legible y accesible en el móvil sin alterar su
identidad ni incorporar frameworks o bibliotecas de componentes.

## Comprobaciones

- Usa HTML semántico, CSS y JavaScript nativos; conserva `el()`, `svg()` y tokens.
- Revisa etiquetas, nombres accesibles, orden de teclado y foco visible.
- En diálogos, revisa entrada y retorno del foco, cancelar y nombres de acciones.
- Comprueba estados `aria-*`, regiones vivas y tablas equivalentes a gráficos.
- Contrasta ambos temas, anchuras móvil/escritorio, zoom y textos largos.
- Revisa controles táctiles, teclado numérico, desplazamiento y áreas seguras.
- Respeta movimiento reducido, preferencias visuales y estilos de impresión.
- Prefiere reutilizar componentes existentes; no rediseñes pantallas ajenas a la tarea.

## Entrega y límites

Explica el problema de uso, propuesta y comprobaciones realizadas. Distingue
inspección de HTML/CSS, prueba de teclado y prueba con lector de pantalla.
No afirmes accesibilidad completa sin pruebas ni instales auditores por defecto.
Actualiza esta guía cuando cambien componentes, diálogos o navegación.
