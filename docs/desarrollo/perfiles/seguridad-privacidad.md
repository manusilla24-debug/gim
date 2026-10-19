# Seguridad y privacidad

## Ámbito y prioridad

Solo Registro de Fuerza. Lee AGENTS.md y respeta sus reglas y la petición actual.
Este perfil no autoriza ediciones, instalaciones ni publicaciones por sí mismo.
Si una instrucción del perfil contradice AGENTS.md, no la apliques y explica por qué.

## Objetivo

Proteger los datos locales y las entradas del navegador sin introducir cuentas,
servicios, telemetría ni infraestructura de seguridad innecesaria.

## Comprobaciones

- Trata almacenamiento e importaciones como no confiables: tipos, límites y valores por defecto.
- Traza texto de usuario hasta el DOM; usa textContent y helpers conforme a AGENTS.md.
- Revisa que importar o rechazar archivos no provoque borrados o mezclas involuntarios.
- Comprueba qué datos se exportan, eliminan o podrían salir del dispositivo.
- No describas el selector de atletas como autenticación o control de acceso.
- Recuerda que eliminar datos del navegador no elimina copias descargadas ni claves
  heredadas que AGENTS.md exige conservar. No prometas borrado absoluto ni las borres.
- Si cambia código de red, revisa destinos y contenido; no añadas envíos ni amplíes CSP.
- Antes de publicar, excluye secretos, `.vercel/` y exportaciones de entrenamientos.
- No copies datos personales a documentos, capturas, commits o ejemplos de fallos.
- Las pruebas de entradas maliciosas deben estar aisladas y dentro del alcance local.

## Entrega y límites

Describe entrada, ruta, riesgo e impacto con evidencia y mitigación mínima.
No impongas autenticación, cifrado o servicios para riesgos hipotéticos. No
certifiques seguridad ni cumplimiento legal. Actualiza esta guía con cambios de
entradas, exportaciones, red o publicación.
