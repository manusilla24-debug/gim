# Registro de Fuerza

Registro de entrenamiento de fuerza para un ciclo de tres bloques (empuje,
tracción, hombro y abdomen). Se anota la carga, las series y las repeticiones de
cada ejercicio; al cerrar la sesión pasa al historial y el registro avanza al
bloque siguiente.

## Diseño visual

Interfaz inspirada en Liquid Glass de iOS: superficies translúcidas, reflejos
suaves, tarjetas y controles redondeados, temas claro y oscuro y emojis puntuales
en Inicio. Usa tipografía del sistema (la de Apple en iPhone), sin descargar
fuentes. Mantiene las funciones, el formato de datos y el uso sin conexión.
El tema oscuro utiliza fondo negro puro y superficies de cristal gris neutro.
El desenfoque se limita a cabecera, selector de atleta y barra de acciones;
sin soporte de `backdrop-filter` se conserva el fondo tintado y legible.
Respeta las preferencias de movimiento reducido y transparencia reducida.

Referencias visuales de código abierto consultadas:
[simple-liquid-glass](https://github.com/lucaperullo/simple-liquid-glass) y
[liquid-glass](https://github.com/dpawlikowski/liquid-glass). La implementación
es CSS propio; no incorpora código ni dependencias de estos proyectos.

## Funciones

- **Inicio personal**: próximo bloque, actividad reciente, mejores
  cargas y un mapa de constancia de las últimas 16 semanas. Las letras de los
  días acompañan a cada fila y rotan para que hoy siempre quede abajo.
- **Ayuda durante la sesión**: cada ejercicio muestra la última referencia y
  un objetivo conservador; una nueva mejor carga recibe un aviso especial.
- **Cargas decimales**: los campos aceptan tanto coma como punto en móvil
  (`42,5` y `42.5` se guardan como la misma carga).
- **Variantes de ejercicio**: los dos huecos de remo permiten elegir entre
  máquina de palanca, polea baja, remo de arriba y remo en T; la extensión de
  hombro permite seleccionar ejecución bilateral o unilateral. Cada variante
  conserva su propia serie dentro del bloque correspondiente en Progresión. Al
  cargar historiales anteriores, las sesiones personales de septiembre de 2026
  se reclasifican automáticamente para eliminar los nombres genéricos.

- **Varios atletas**: al abrir se elige quién entrena. Cada uno tiene su propio
  ciclo, borrador e historial. Se pueden añadir, renombrar y eliminar.
- **Progresión** por ejercicio: carga máxima de cada sesión, con mejor marca,
  última carga y variación. El gráfico tiene su tabla equivalente. Debajo se
  pueden comparar hasta tres sesiones de un mismo bloque, ejercicio a ejercicio,
  mediante tres líneas de carga y una tabla con cargas, series y repeticiones.
- **Color por bloque**: pecho y tríceps usa naranja, espalda y bíceps azul, y
  hombro y abdomen verde mientras se registra cada entrenamiento.
- **Calendario**: muestra los días entrenados con un círculo del color del bloque
  realizado; permite consultar también meses anteriores.
- **Historial** completo con el tonelaje (carga × series × repeticiones) de cada
  sesión. Las sesiones cerradas se pueden corregir desde el botón del lápiz;
  los abdominales se anotan con series y notas, sin campos de carga ni
  repeticiones. Los registros antiguos conservan sus repeticiones originales.
- **Controles al final del registro**: terminar, guardar y vaciar quedan debajo
  de los ejercicios, sin flotar sobre los campos al desplazarse.
- **Resumen directo** con el número de sesiones y la última actividad realizada.
- **Copiar la última sesión** del bloque para partir de lo que ya se hizo.
- **Entrenador local**: planifica el bloque del día a partir de las últimas
  sesiones, señala posibles estancamientos y puede aplicar una propuesta al
  borrador. El análisis funciona sin conexión y no envía el historial fuera.
- **Instalable y sin conexión**: es una PWA con service worker; una vez abierta
  funciona en el gimnasio aunque no haya cobertura. En Chrome y Edge aparece el
  botón «Instalar» en el pie; en iPhone se añade desde *Compartir → Añadir a
  pantalla de inicio* (Safari no ofrece el botón a la página).
- **Datos locales**: todo se guarda en `localStorage`, sin servidor ni cuentas.
  Hay descarga y restauración de copias en JSON.

## Acceso

No hay contraseñas ni cuentas: la pantalla de inicio es un selector de atleta,
como el de un televisor. Separa los registros de cada persona en el mismo
dispositivo, pero **no protege los datos** de quien tenga el teléfono
desbloqueado. Si algún día hace falta acceso real, el sitio ya está preparado
para ponerle un proveedor de autenticación delante (Vercel + Auth.js, Clerk,
etc.) sin tocar la interfaz.

Dentro de la misma pestaña no se vuelve a preguntar (`sessionStorage`), así que
recargar a media sesión no echa a nadie fuera.

## Estructura

```
index.html                 documento
assets/styles.css          sistema visual (tokens, retícula, componentes)
assets/app.js              atletas, registro, gráfico e historial
assets/boot.js             tema y pantalla inicial antes del primer pintado
assets/icon.svg            icono vectorial
assets/icon-*.png          iconos de la PWA (192, 512 y maskable)
assets/apple-touch-icon.png
assets/manifest.webmanifest
sw.js                      service worker (modo sin conexión)
vercel.json                cabeceras, cleanUrls y redirección de /gim.html
```

Sin dependencias, sin paso de compilación: el sitio es estático.

## En local

Hace falta un servidor (las rutas son absolutas y el service worker no funciona
sobre `file://`):

```bash
python3 -m http.server 8000
```

Y abrir <http://localhost:8000>. `localhost` cuenta como contexto seguro, así
que la PWA se puede probar entera.

Al cambiar archivos, sube `VERSION` en `sw.js` para renovar la caché.

## Desplegar en Vercel

La aplicación está desplegada en Vercel y el repositorio incluye su configuración
en `vercel.json`. El vínculo local de la CLI vive en `.vercel/` y no se versiona.

Opción A, desde el panel de Vercel: *Add New → Project*, importar este
repositorio y desplegar. La configuración se detecta sola (*Framework preset:
Other*, sin *build command*, *output directory* la raíz).

Opción B, desde la terminal:

```bash
npx vercel link
npx vercel --prod
```

`vercel link` es el paso que crea el vínculo con la cuenta y escribe `.vercel/`
(ignorado por git).

Después de subir a GitHub, comprueba también el despliegue de **Production** en
Vercel: un `git push` correcto no confirma que la web pública se haya actualizado.
El `VERSION` de `/sw.js` en la URL de producción debe coincidir con el del
repositorio. El shell evita la caché HTTP al actualizarse y conserva su caché
offline. Si la aplicación ya estaba abierta, recarga tras el aviso de nueva
versión; el borrador se guarda antes de salir.

## Datos anteriores

La primera versión guardaba en la clave `gymData` de `localStorage`, y la
siguiente en `gim.v2`. Al abrir el sitio, lo que haya se convierte al formato
actual (`gim.v3`) y queda como un atleta llamado «Manuel», con su historial y lo
que estuviera anotado a medias. Las claves antiguas se conservan intactas.
