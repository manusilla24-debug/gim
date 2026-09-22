# AGENTS.md

## Propósito del proyecto

Este repositorio contiene **Registro de Fuerza**, una aplicación web progresiva
(PWA) para anotar entrenamientos de fuerza. La experiencia principal debe seguir
siendo rápida en móvil, instalable y utilizable sin conexión dentro del gimnasio.

La aplicación es deliberadamente local-first:

- no hay backend, cuentas remotas ni sincronización;
- los atletas, borradores e historiales viven en `localStorage`;
- la selección del atleta activo durante una pestaña vive en `sessionStorage`;
- el usuario puede exportar e importar una copia JSON de sus datos.

No describas el selector de atletas como autenticación: separa datos en un mismo
dispositivo, pero no ofrece control de acceso.

## Arquitectura y tecnologías

Es un sitio estático sin dependencias, gestor de paquetes, framework ni fase de
compilación. Usa HTML5, CSS y JavaScript moderno del navegador y se despliega en
producción con Vercel.

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura semántica, paneles, controles, diálogos y carga de recursos. |
| `assets/boot.js` | Aplica tema y vista inicial antes del primer pintado para evitar destellos. Debe seguir siendo pequeño y bloqueante. |
| `assets/app.js` | Rutinas, estado, persistencia, migraciones, renderizado, eventos, gráficos e instalación de la PWA. |
| `assets/styles.css` | Tokens, temas, componentes, responsive, accesibilidad visual e impresión. |
| `assets/manifest.webmanifest` | Metadatos, iconos y accesos directos de la PWA. |
| `sw.js` | Precaché del shell y estrategia offline/network-first. |
| `vercel.json` | Redirecciones, caché y cabeceras de seguridad del despliegue. |

La aplicación usa rutas absolutas desde `/`, por lo que debe probarse mediante un
servidor HTTP y no abriendo `index.html` con `file://`.

## Modelo de datos y compatibilidad

- El almacén vigente es `gim.v3`; su forma raíz es `{ version, users,
  lastUserId, logs }`.
- Cada entrada de `logs` pertenece a un atleta y contiene el bloque activo, el
  siguiente bloque, el borrador, ejercicios extra y sesiones finalizadas.
- `gim.v2` y `gymData` son formatos heredados. Sus migraciones deben conservarse
  y nunca deben borrar las claves originales.
- Trata los datos guardados e importados como entrada no confiable: valida tipos,
  aplica valores por defecto y evita insertar texto de usuario con `innerHTML`.
- Un cambio de esquema exige compatibilidad hacia atrás, actualización explícita
  de versión y prueba con datos existentes, datos vacíos e importaciones inválidas.
- Conserva el guardado diferido y el vaciado pendiente en `pagehide`/
  `visibilitychange`; cerrar o recargar no debe perder el borrador reciente.

## Criterios para los cambios

- Mantén el proyecto sin dependencias y sin build salvo que el usuario pida
  expresamente cambiar esa decisión arquitectónica.
- Usa español en la interfaz y en los mensajes visibles. Mantén el estilo actual
  del código: comillas simples en JavaScript, punto y coma, funciones pequeñas y
  secciones comentadas.
- Centraliza los cambios de rutina en `SPLIT` y usa identificadores estables. No
  reutilices ni cambies IDs existentes si eso puede desasociar datos guardados.
- Genera nodos dinámicos con los helpers `el()` y `svg()` y `textContent`. Reserva
  HTML interpretado para contenido estático y controlado.
- Respeta la separación de responsabilidades: estructura en HTML, presentación en
  CSS, comportamiento en JavaScript y política offline en el service worker.
- Reutiliza los tokens CSS existentes y comprueba ambos temas. Evita colores,
  espaciados o tipografías aislados si ya existe una variable apropiada.
- Diseña primero para pantallas pequeñas y controles táctiles. Comprueba también
  escritorio, `prefers-reduced-motion`, áreas seguras y la hoja de impresión.
- Conserva HTML semántico, navegación por teclado, foco visible, nombres
  accesibles, estados `aria-*`, regiones vivas y la tabla equivalente al gráfico.
- No relajes la Content Security Policy de `vercel.json` sin una necesidad
  concreta. Si se añade un origen externo, limita el permiso a la directiva y al
  host mínimos necesarios.
- Conserva el despliegue estático en Vercel: no introduzcas comandos de build,
  funciones o variables de entorno si la funcionalidad no los necesita. Valida
  que las rutas, redirecciones y cabeceras nuevas sean compatibles con
  `vercel.json`.
- No añadas secretos, telemetría ni servicios remotos. Los datos de entrenamiento
  deben seguir en el dispositivo salvo requisito explícito del usuario.

## PWA y caché offline

Cuando cambie cualquier recurso que forme parte del shell de la aplicación,
actualiza `VERSION` en `sw.js`. Esto incluye al menos `index.html`, `assets/app.js`,
`assets/boot.js`, `assets/styles.css`, el manifiesto y los iconos. Usa un nombre de
versión descriptivo y distinto al anterior.

Si añades o eliminas un recurso imprescindible para funcionar sin conexión,
actualiza también `SHELL`. Comprueba que la instalación del service worker no
falle por una ruta inexistente y que una navegación sin red caiga en
`/index.html`.

Los cambios exclusivamente documentales, como este archivo, no requieren subir
la versión de caché.

## Ejecución y verificación

Arranca un servidor local desde la raíz:

```bash
python3 -m http.server 4173
```

No existe actualmente una suite automatizada. Antes de dar un cambio por bueno,
haz las comprobaciones proporcionales al área modificada:

1. Abre `http://localhost:4173` y revisa la consola del navegador.
2. Crea o selecciona un atleta, edita un borrador, recarga y confirma que persiste.
3. Cierra una sesión y revisa ciclo, resumen, historial, tonelaje y progresión.
4. Prueba copiar, vaciar y eliminar, incluidos sus diálogos de confirmación.
5. Exporta una copia y restáurala; verifica también un JSON inválido.
6. Revisa teclado y foco, tema claro/oscuro y anchos móvil y escritorio.
7. Para cambios de PWA, recarga tras activar el nuevo service worker y prueba una
   segunda carga sin red.

Como verificaciones rápidas adicionales, los archivos JavaScript deben pasar:

```bash
node --check assets/app.js
node --check assets/boot.js
node --check sw.js
```

Si no están disponibles Node o un navegador, indícalo claramente al entregar el
cambio; no afirmes que una comprobación se ejecutó si solo se inspeccionó el
código.

## Git y alcance

- Mantén los commits pequeños y centrados en la petición.
- No incluyas `.vercel/`, datos exportados por usuarios ni artefactos locales.
- No reformatees archivos completos ni alteres cambios ajenos sin necesidad.
- Actualiza `README.md` cuando cambien el comportamiento, la estructura, el
  formato de datos o el procedimiento de uso/despliegue.
