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
  Encima de «Tu referencia» hay un calendario semanal de lunes a domingo:
  permite avanzar o retroceder con flechas o deslizando sobre los días, seleccionar
  una fecha y consultar sus sesiones completadas en el historial. Un círculo rodea
  los días entrenados con el color del bloque (dividido en segmentos si hay varios)
  y «Volver a hoy» recupera la fecha actual. Solo muestra
  sesiones guardadas del atleta activo; no genera entrenamientos previstos.
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
  Debajo está **Otros**: «Marcar un día» abre un diálogo con el selector de fecha
  nativo del dispositivo. Permite marcar o desmarcar una fecha pasada o actual
  en morado, sin nombres, notas ni entradas en el historial. Solo se guarda la
  fecha por atleta, también en las copias JSON. No cuenta como sesión ni cambia
  el ciclo, el ritmo, el tonelaje o las estadísticas. Los calendarios mensual y
  semanal dividen el círculo en segmentos iguales por bloque y Otros: gimnasio
  y Otros usan dos mitades; varios bloques usan sus respectivos colores.
  Tocar un día entrenado abre sus sesiones en el historial, restablece el orden
  por fecha y las enmarca durante cinco segundos con el color actual de la
  interfaz. Si hay varias sesiones ese día, se resaltan todas.
- **Historial** completo con el tonelaje (carga × series × repeticiones) de cada
  sesión. Las sesiones cerradas se pueden corregir desde el botón del lápiz;
  los abdominales se anotan con series y notas, sin campos de carga ni
  repeticiones. Los registros antiguos conservan sus repeticiones originales.
- **Sensaciones del entrenamiento**: al terminar se puede escribir una nota
  opcional de hasta 2000 caracteres. Aparece debajo de la cabecera de la sesión
  y antes de los ejercicios en el historial. Se puede corregir con el lápiz y se
  incluye en las copias JSON; dejarla vacía no muestra un apartado adicional.
- **Orden del historial**: el botón cuadrado de flechas junto al título permite
  ver todas las sesiones de la más reciente a la más antigua o al revés. Las
  opciones de bloque A, B y C muestran solo ese bloque, con sus sesiones más
  recientes primero. La consulta no altera los registros y vuelve al orden
  inicial al recargar o cambiar de atleta. El cuadrado de flechas contiene un
  selector nativo como el de Ejercicio en Progresión: al tocarlo directamente,
  el dispositivo abre su propio menú de opciones. No usa un menú personalizado
  ni una apertura simulada con JavaScript.
- **Controles al final del registro**: terminar, guardar y vaciar quedan debajo
  de los ejercicios, sin flotar sobre los campos al desplazarse.
- **Resumen directo** con el número de sesiones y la última actividad realizada.
- **Copiar la última sesión** del bloque para partir de lo que ya se hizo.
- **Entrenador local**: consulta ejercicios por nombre, compara sus tres últimas
  referencias con fechas y notas, recupera la última sesión del bloque, resume
  las sesiones y el tonelaje de los últimos siete o treinta días, o del mes actual, y revisa los
  campos pendientes del borrador. Las coincidencias
  ambiguas ofrecen botones para elegir (por ejemplo, los dos remos). Conserva el
  ejercicio de la conversación para consultas como «¿Y la carga?».
  Su guía conversacional cubre 24 temas: técnica, calentamiento, descansos,
  series, RIR, cargas, recuperación, alternativas, organización, nutrición y
  otros conceptos. Responde según la intención de la pregunta, puede combinar
  hasta tres temas y consulta ejercicios de otros bloques sin cambiar el registro.
  Recuerda temporalmente el objetivo, experiencia, tiempo disponible, días y peso
  corporal que indiques explícitamente. Si describes fatiga o poco margen de
  esfuerzo, no añade repeticiones a la propuesta de progresión. Distingue lo que
  le cuentas de las sesiones guardadas. «He hecho 3×10 con 20,5 kg» permite
  calcular 615 kg de tonelaje sin añadir una sesión. Las opciones para continuar
  y las aclaraciones conservan la pregunta original. Puedes pedir respuestas
  más breves o con más detalle y reiniciar el chat con el botón de su cabecera.
  Prepara propuestas explicadas por ejercicio: repetir referencias, probar una
  repetición más o reducir series. Separa variantes y deja vacíos los campos sin
  referencia; no aumenta automáticamente los kilos ni deduce recuperación o
  ganancias de fuerza de las cifras. Tres referencias iguales son una señal para
  revisar, no un diagnóstico de estancamiento. Ante una consulta sobre dolor
  retira la propuesta pendiente.
  Al aplicar completa solo campos vacíos por defecto; sustituir cifras requiere
  confirmación si ya hay anotaciones. Conserva notas y permite deshacer mientras
  no se haya vuelto a editar el borrador. Si los datos cambian, exige revisar una
  propuesta actualizada. El chat es temporal (máximo 60 mensajes), se reinicia al
  recargar o cambiar de atleta/bloque, y no forma parte de las copias JSON. Al
  cambiar de bloque conserva el objetivo y los datos de contexto del mismo atleta;
  cambiar de atleta o iniciar una conversación nueva los elimina de la memoria.
  Funciona sin conexión mediante reglas locales, sin IA remota ni envío del
  historial. Las propuestas son referencias editables, no prescripciones físicas.
  No contiene un modelo de lenguaje ni entiende cualquier pregunta libre: ante
  dudas sin cobertura pide concretar. [Guía, ejemplos y fuentes](docs/entrenador.md).
- **Instalable y sin conexión**: es una PWA con service worker; una vez abierta
  funciona en el gimnasio aunque no haya cobertura. En Chrome y Edge aparece el
  botón «Instalar» en el pie; en iPhone se añade desde *Compartir → Añadir a
  pantalla de inicio* (Safari no ofrece el botón a la página).
- **Datos locales**: todo se guarda en `localStorage`, sin servidor ni cuentas.
  Hay descarga y restauración de copias en JSON.
  La restauración comprueba la estructura antes de sustituir datos y conserva
  el registro anterior si el navegador no permite guardar. Las sesiones
  importadas se ordenan por fecha; al compararlas, los ejercicios omitidos no
  desplazan las cargas de los demás y las variantes se mantienen separadas.

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
assets/coach-knowledge.js  guía y alias del entrenador sin conexión
assets/boot.js             tema y pantalla inicial antes del primer pintado
assets/icon.svg            icono vectorial
assets/icon-*.png          iconos de la PWA (192, 512 y maskable)
assets/apple-touch-icon.png
assets/manifest.webmanifest
sw.js                      service worker (modo sin conexión)
vercel.json                cabeceras, cleanUrls y redirección de /gim.html
```

Sin dependencias, sin paso de compilación: el sitio es estático.

## Ayuda para desarrollar este proyecto

El proyecto incluye nueve [perfiles de trabajo](docs/desarrollo/README.md)
inspirados en Agency Agents y adaptados a esta aplicación personal. Son pequeñas
guías para que el asistente revise mejor el código, la facilidad de uso, los
datos y el funcionamiento sin conexión. No añaden funciones ni IA a la app,
no necesitan instalar nada y no configuran otros proyectos ni la cuenta.

Puedes pedir los cambios con palabras normales, por ejemplo: «Revisa que no se
pierda lo que anoto al recargar, sin cambiar nada todavía». El asistente elegirá
el perfil adecuado siguiendo `AGENTS.md`. La guía incluye también ejemplos para
seleccionarlos expresamente.

## En local

Hace falta un servidor (las rutas son absolutas y el service worker no funciona
sobre `file://`):

```bash
python3 -m http.server 8000
```

Y abrir <http://localhost:8000>. `localhost` cuenta como contexto seguro, así
que la PWA se puede probar entera.

Al cambiar archivos, sube `VERSION` en `sw.js` para renovar la caché.
El respaldo offline se usa también ante errores HTTP y, cuando ya hay una
copia en caché, tras 3,5 segundos de espera de la red. Visitar otro documento
del sitio no reemplaza la página de la aplicación guardada sin conexión.

Las comprobaciones del entrenador se ejecutan con Node, sin instalar paquetes:

```bash
node tests/coach.test.cjs
node tests/integrity.test.cjs
node tests/offline.test.cjs
node --check assets/app.js
node --check assets/coach-knowledge.js
node --check assets/boot.js
node --check sw.js
```

Cubren referencias, separación de variantes, consultas, campos pendientes,
conservación de notas, propuestas desactualizadas y deshacer sin pisar ediciones.
También comprueban intención, contexto, preguntas múltiples, cálculos, negaciones
y consultas a ejercicios de otros bloques sin cambiar el registro.
El DOM mínimo de la prueba no sustituye la revisión del chat en el navegador.
Las pruebas de integridad usan datos ficticios para comprobar importaciones,
fallos de escritura, migraciones, orden y comparación. Las de offline simulan
el service worker; no sustituyen una prueba de instalación en Safari/iOS.

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

El contenido del almacén pasa a la versión 5 para añadir `otherDays`, una lista
de fechas locales (`AAAA-MM-DD`) por atleta para las marcas de Otros. Se conserva
la clave `gim.v3` del navegador y se leen las copias de versiones 3 y 4 con esa
lista vacía cuando no existe. Las nuevas copias indican versión 5; se rechazan
fechas inválidas al importar. La versión 4 añadió `note` a cada sesión: los datos
anteriores conservan sensaciones vacías, y las nuevas se validan como texto y se
limitan a 2000 caracteres.

La primera versión guardaba en la clave `gymData` de `localStorage`, y la
siguiente en `gim.v2`. Al abrir el sitio, lo que haya se convierte al formato
actual (`gim.v3`) y queda como un atleta llamado «Manuel», con su historial y lo
que estuviera anotado a medias. Las claves antiguas se conservan intactas.
