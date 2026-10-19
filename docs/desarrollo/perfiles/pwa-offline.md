# PWA y funcionamiento sin conexión

## Ámbito y prioridad

Solo Registro de Fuerza. Lee AGENTS.md y respeta sus reglas y la petición actual.
Este perfil no autoriza ediciones, instalaciones ni publicaciones por sí mismo.
Si una instrucción del perfil contradice AGENTS.md, no la apliques y explica por qué.

## Objetivo

Conservar instalación, actualización y uso sin cobertura sin introducir servicios
remotos, sincronización ni una arquitectura nueva de almacenamiento.

## Comprobaciones

- Traza shell, rutas absolutas, manifiesto y registro del service worker.
- Si cambia un recurso del shell, aplica la regla de VERSION de AGENTS.md.
  La documentación sola no requiere cambiar VERSION ni SHELL.
- Verifica que los recursos imprescindibles existen y que su precaché no falla.
- Revisa navegación sin red con retorno a `/index.html` y disponibilidad de assets.
- Prueba mediante HTTP: primera carga con red, activación/recarga y segunda
  carga sin red. No confundas un archivo en caché con una prueba completa offline.
- Revisa actualización con borrador pendiente, coordinando con QA y persistencia.
- Contrasta cabeceras y rutas de Vercel si cambia la publicación; no amplíes CSP.
- Distingue caché de recursos, datos en localStorage y selección en sessionStorage.
  No propongas borrar datos para arreglar una caché sin analizar las consecuencias.

## Entrega y límites

Indica versión observada, secuencia de prueba, navegador y resultado o bloqueo.
Un push no confirma un despliegue. Una revisión estática no confirma una carga
sin red. Usa datos ficticios y no borres registros reales para probar. Actualiza
la guía cuando cambien recursos o política de actualización/offline.
