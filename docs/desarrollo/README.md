# Perfiles de trabajo de Registro de Fuerza

Estos perfiles son guías para el asistente que ayuda a desarrollar la app.
Permiten mirar una tarea desde distintas especialidades sin cambiar su esencia:
un registro personal, rápido y utilizable sin conexión. No tienes que saber
informática ni aprender sus nombres: basta explicar qué quieres conseguir.

## Qué cambia y qué sigue igual

| Elemento | Función |
| --- | --- |
| `AGENTS.md` | Reglas comunes del proyecto; los perfiles las complementan. |
| `docs/desarrollo/` | Documentación versionada para trabajar en este repositorio. |
| HTML, CSS, JavaScript, manifiesto y service worker | Código de la app; esta integración documental no los modifica. |
| Configuración personal de ChatGPT/Codex | No se modifica ni se instala nada global. |

Los perfiles no se cargan en la app, no almacenan entrenamientos y no necesitan
dependencias, backend, cuentas o servicios remotos. No añaden IA al entrenador
local. Son archivos de texto, no programas ni especialistas humanos.

Su alcance es este proyecto y las tareas donde se leen. Un chat nuevo debe
volver a leer las instrucciones aplicables. No garantizan memoria entre chats,
no conceden permisos y no ejecutan otros agentes. Si se publican estos documentos
con el sitio estático, su contenido puede ser público: no incluyas datos privados.

## Elegir una perspectiva

| Perfil | Cuándo ayuda | Fuentes agrupadas |
| --- | --- | --- |
| [Revisión](perfiles/revision.md) | Comprobar un cambio y evitar regresiones. | Revisión, cambios mínimos y arquitectura. |
| [Frontend y accesibilidad](perfiles/frontend-accesibilidad.md) | Pantallas, formularios, móvil, teclado y legibilidad. | Frontend, interfaz y auditoría accesible. |
| [PWA y offline](perfiles/pwa-offline.md) | Instalación, caché, actualizaciones y falta de cobertura. | Perfil propio; criterios de fiabilidad y despliegue. |
| [QA y persistencia](perfiles/qa-persistencia.md) | Borradores, historial, copias y conservación de datos. | Evidencias, comprobación funcional y análisis de resultados. |
| [UX de gimnasio](perfiles/ux-gimnasio.md) | Registrar con menos esfuerzo y corregir sin confusiones. | Investigación UX, recorridos y organización de flujos. |
| [Seguridad y privacidad](perfiles/seguridad-privacidad.md) | Entradas, importaciones, datos privados y publicación. | Seguridad de aplicaciones, privacidad y límites de confianza. |
| [Rendimiento y gráficos](perfiles/rendimiento-graficos.md) | Lentitud y representación clara de la progresión. | Medición, visualización y revisión estadística puntual. |
| [Producto e investigación](perfiles/producto-investigacion.md) | Elegir mejoras útiles y comprobar sus fundamentos. | Producto, prioridades, feedback e investigación. |
| [Documentación y mantenimiento](perfiles/documentacion-mantenimiento.md) | Explicar, retomar el proyecto y mantener coherencia. | Documentación, onboarding, auditoría del código y Git. |

No hace falta crear un archivo por cada agente externo. La selección de
esenciales, recomendables y referencias puntuales está en [FUENTES.md](FUENTES.md).
Las fuentes no se activan automáticamente ni se copian sobre el proyecto.

## Cómo usarlos en Codex

1. Abre una conversación vinculada a este repositorio.
2. Describe el problema y si quieres analizar, proponer o implementar.
3. El asistente lee `AGENTS.md` y elige el mínimo de perfiles necesario; también
   puedes indicarle uno por su nombre o ruta.
4. El asistente indica la perspectiva elegida y trabaja dentro del alcance pedido.
5. Al terminar explica el resultado y qué ha comprobado realmente.

Un Markdown normal no tiene descubrimiento automático de skills. La selección
se guía por el apartado de perfiles en `AGENTS.md` y por tu petición; no hemos
creado comandos, skills, plugins, tareas en segundo plano ni configuración global.
No es necesario confirmar cada elección de perfil. Editar o publicar requiere
que la tarea lo autorice; elegir un perfil no concede esa autorización.

Normalmente basta un perfil principal y uno complementario. Para trabajos
amplios, aplicar las perspectivas por etapas resulta más claro que cargar todas.
Si se contradicen con AGENTS.md, se descarta la regla incompatible y se explica
el conflicto. No se crean instrucciones que sustituyan las reglas de la raíz.

## Ejemplos que puedes copiar

Todos se interpretan desde la raíz del repositorio y tras leer `AGENTS.md`.

| Perfil | Petición |
| --- | --- |
| Revisión | «Usa `docs/desarrollo/perfiles/revision.md`. Revisa el cambio actual y dime si puede romper algo. No edites.» |
| Frontend y accesibilidad | «Usa `docs/desarrollo/perfiles/frontend-accesibilidad.md`. Revisa el diálogo de edición en móvil y con teclado. Propón mejoras sin editar.» |
| PWA y offline | «Usa `docs/desarrollo/perfiles/pwa-offline.md`. Comprueba que la app se puede volver a abrir sin cobertura, sin cambiarla.» |
| QA y persistencia | «Usa `docs/desarrollo/perfiles/qa-persistencia.md`. Prueba con datos ficticios que recargar conserva el borrador y que un JSON inválido no borra nada.» |
| UX de gimnasio | «Usa `docs/desarrollo/perfiles/ux-gimnasio.md`. Busca tres maneras de facilitar el registro con una mano. No implementes todavía.» |
| Seguridad y privacidad | «Usa `docs/desarrollo/perfiles/seguridad-privacidad.md`. Revisa cómo se importan y exportan los datos. No los publiques ni edites archivos.» |
| Rendimiento y gráficos | «Usa `docs/desarrollo/perfiles/rendimiento-graficos.md`. Investiga si el historial grande ralentiza la app y compara gráfico y tabla.» |
| Producto e investigación | «Usa `docs/desarrollo/perfiles/producto-investigacion.md`. Ordena estas propuestas por utilidad para mi entrenamiento y esfuerzo.» |
| Documentación y mantenimiento | «Usa `docs/desarrollo/perfiles/documentacion-mantenimiento.md`. Comprueba que las instrucciones explican lo que hace la app. No edites todavía.» |

También puedes decir: «Revisa que no se pierda lo que anoto» o «Quiero que este
botón sea más cómodo en el móvil». El asistente se encarga de elegir la guía.
Para combinar: «Analiza el registro con UX de gimnasio y contrasta la propuesta
con Frontend y accesibilidad; todavía no cambies nada».

## Procedimiento de integración y comprobación

1. **Diseño:** agrupar responsabilidades reales en nueve perfiles breves.
2. **Archivos:** redactar instrucciones propias, guía, fuentes y referencias en
   AGENTS.md y README; no incorporar el catálogo ni sus instaladores.
3. **Flujo:** selección por tarea, explicación breve y respeto del alcance.
4. **Ejemplos:** mantener peticiones sencillas y ejemplos explícitos por perfil.
5. **Verificación:** revisar estado inicial/final, diferencias y archivos nuevos;
   una integración documental no debe modificar recursos de la aplicación.
6. **Mantenimiento:** actualizar solo cuando una necesidad real lo justifique.

Comprobaciones para un cambio exclusivamente documental como este:

```powershell
git status --short
git diff --name-status
git diff --check
git diff -- index.html assets sw.js vercel.json
```

La última orden debe estar vacía. Revisa aparte los documentos nuevos y, antes
de confirmar el commit, `git diff --cached --name-status` y
`git diff --cached --check`. No añadas exportaciones JSON, `.vercel/` ni datos
personales. No subas la versión de caché por documentación y no añadas perfiles
a `SHELL`. Las pruebas funcionales se eligen si cambia código, según AGENTS.md.

Esta verificación comprueba el alcance documental; no demuestra que se haya
probado toda la app en un navegador ni que un despliegue de Vercel haya terminado.

## Mantenimiento futuro

- Revisa el perfil afectado cuando cambie el comportamiento o aparezca un fallo
  que su lista de comprobaciones no contemplaba.
- Mantén AGENTS.md como fuente de las reglas comunes; evita duplicarlo entero.
- Mantén las instrucciones cortas. Combina perfiles repetidos y elimina reglas
  que ya no ayuden. No añadas perfiles por aumentar su número.
- Registra en FUENTES.md cualquier nueva referencia, revisión y adaptación.
  No sincronices automáticamente los cambios de Agency Agents.
- Para un cambio documental no hacen falta instalaciones ni pruebas invasivas.
- Si se propone una herramienta nueva, explica primero para qué sirve, su coste
  de mantenimiento y la alternativa sin ella. No cambia la decisión de mantener
  la aplicación sin dependencias.

Limitación común: las guías ayudan a trabajar con orden, pero pueden quedar
obsoletas y el asistente puede equivocarse. Las conclusiones necesitan evidencia.
