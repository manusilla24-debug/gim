# Registro de Fuerza

Registro de entrenamiento de fuerza para un ciclo de tres bloques (empuje,
tracción, hombro y abdomen). Se anota la carga, las series y las repeticiones de
cada ejercicio; al cerrar la sesión pasa al historial y el registro avanza al
bloque siguiente.

- **Varios atletas**: al abrir se elige quién entrena. Cada uno tiene su propio
  ciclo, borrador e historial. Se pueden añadir, renombrar y eliminar.
- **Progresión** por ejercicio: carga máxima de cada sesión, con mejor marca,
  última carga y variación. El gráfico tiene su tabla equivalente.
- **Color por bloque**: pecho y tríceps usa naranja, espalda y bíceps azul, y
  hombro y abdomen verde mientras se registra cada entrenamiento.
- **Calendario**: muestra los días entrenados con un círculo del color del bloque
  realizado; permite consultar también meses anteriores.
- **Historial** completo con el tonelaje (carga × series × repeticiones) de cada
  sesión.
- **Copiar la última sesión** del bloque para partir de lo que ya se hizo.
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

## Datos anteriores

La primera versión guardaba en la clave `gymData` de `localStorage`, y la
siguiente en `gim.v2`. Al abrir el sitio, lo que haya se convierte al formato
actual (`gim.v3`) y queda como un atleta llamado «Manuel», con su historial y lo
que estuviera anotado a medias. Las claves antiguas se conservan intactas.
