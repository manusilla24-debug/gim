# Pruebas manuales y persistencia

## Ámbito y prioridad

Solo Registro de Fuerza. Lee AGENTS.md y respeta sus reglas y la petición actual.
Este perfil no autoriza ediciones, instalaciones ni publicaciones por sí mismo.
Si una instrucción del perfil contradice AGENTS.md, no la apliques y explica por qué.

## Objetivo

Comprobar que la tarea conserva los registros y los recorridos del usuario,
utilizando casos proporcionales al cambio y datos ficticios aislados.

## Comprobaciones

- Elige los casos afectados; no repitas toda la matriz para cambios documentales.
- Distingue almacén `gim.v3`, formatos heredados y selección por pestaña.
- Prueba borrador reciente, recarga y vaciado pendiente en pagehide/visibilitychange.
- Comprueba crear/seleccionar atletas sin mezclar borradores ni historiales.
- Al cerrar sesión, revisa avance del ciclo, resumen, historial y tonelaje.
- Revisa copiar, vaciar, editar y eliminar; incluye cancelar las confirmaciones.
- Exporta y restaura datos sintéticos. Prueba JSON malformado y JSON válido con
  estructura/tipos inválidos; comprueba que un rechazo conserva los datos previos.
- Si cambia el esquema o su lectura, cubre vacío, datos actuales, `gim.v2` y
  `gymData`, sin borrar sus claves originales y conforme a AGENTS.md.
- Incluye decimales con coma/punto y referencias de ejercicios si la tarea los afecta.
- No uses exportaciones personales ni el almacenamiento real para pruebas destructivas.

## Entrega y límites

Registra caso, pasos, resultado esperado, observado y estado: pasa, falla o no
probado. Una captura sola no demuestra persistencia. No inventes cobertura ni
instales una suite automática para cumplir esta guía. Si falta un navegador,
decláralo. Actualiza los casos cuando cambien acciones o formatos admitidos.
