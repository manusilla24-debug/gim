# Entrenador conversacional local

El entrenador combina una guía incluida en la aplicación con referencias del
atleta y contexto que este haya indicado en el chat. No descarga un modelo, no
consulta una API y no llama a otras aplicaciones. Está diseñado para preguntas
de gimnasio dentro de su cobertura; no genera conocimiento nuevo ni comprende
cualquier frase como lo haría un modelo de lenguaje.

## Ejemplos de conversación

- «Soy principiante y quiero ganar músculo». Después: «¿Cuánto descanso entre series?».
- «¿Cómo hago el press inclinado?» para técnica; «¿Cómo va el press?» para referencias.
- «¿Cómo hago el remo?» pide elegir entre los dos remos y después responde sobre técnica.
- «¿Cómo hago el jalón?» consulta el bloque B aunque estés anotando el bloque A.
- «He hecho 3×10 con 20,5 kg» calcula tonelaje; no guarda esos valores como sesión.
- «Me quedan dos repeticiones» conserva esa percepción de esfuerzo para el ejercicio.
- «Hoy estoy cansado» frena el incremento opcional de repeticiones. «Hoy estoy bien»
  permite actualizar ese contexto. No constituye una evaluación de recuperación.
- «Tengo 25 minutos». Después: «Planificar sesión» ofrece menos series, sin garantizar duración.
- «Peso 80 kg, ¿cuánta proteína necesito?» diferencia peso corporal y carga.
- «Más breve» y «Más detalle» cambian la extensión de la última orientación general.
- «Resumen de este mes» consulta desde el primer día del mes; «Resumen últimos
  30 días» consulta un periodo móvil, incluido hoy.
- El botón de nueva conversación borra el contexto del chat, nunca los entrenamientos.

## Qué se usa y qué se conserva

La guía de `assets/coach-knowledge.js` contiene temas, alias y puntos de atención
para los ejercicios existentes. `assets/app.js` decide intención, aclaraciones,
contexto, consultas y acciones. La guía forma parte de `SHELL` en `sw.js`.

Los mensajes y las preferencias del chat solo están en memoria de la pestaña.
No se guardan datos de peso corporal, objetivos o esfuerzo en `gim.v3`; el formato
de almacenamiento y las copias JSON no cambian. El historial sigue siendo la
fuente de las referencias. Los mensajes se limitan a sesenta nodos; el contexto
resumido puede conservarse hasta recargar, cambiar de atleta o reiniciar el chat.
Cambiar de bloque limpia los mensajes y el ejercicio, conservando el contexto
del mismo atleta. Cerrar y abrir el diálogo conserva la conversación.

Al hablar de ejercicios de otro bloque solo se consulta: aplicar una propuesta
sigue afectando al bloque abierto y requiere una acción explícita. Se conserva
el modo de completar huecos, la confirmación para sustituir y deshacer mientras
no se haya editado el borrador. Las cifras del chat no se guardan automáticamente.
Cambiar información de esfuerzo o tiempo deja obsoleta una propuesta anterior,
que debe volver a revisarse antes de aplicarla.

## Alcance de las orientaciones

La guía ofrece educación general, no una pauta clínica ni una revisión visual
de técnica. No diagnostica lesiones, calcula cargas seguras, estima calorías ni
promete ganar músculo o perder grasa. Una pregunta sobre síntomas retira la
propuesta pendiente. Las negaciones solo afectan al síntoma concreto: «sin dolor
de hombro pero me duele la rodilla» mantiene la precaución.

El intervalo de proteína es una referencia para adultos sanos que entrenan;
el cálculo a partir del peso indicado es aritmético, no una valoración dietética.
Ante enfermedad, embarazo o medicación no ofrece una pauta individual.
Los tiempos de descanso se presentan como un punto de partida ajustable.
Las propuestas de repetir, añadir una repetición o limitar series son decisiones
del producto, no fórmulas validadas para cualquier persona o ejercicio.

## Fuentes revisadas el 19 de octubre de 2026

Son referencias editoriales; la app no las consulta al responder y sus autores
no han validado este entrenador. La redacción y las reglas son propias.

- [ACSM, actualización de entrenamiento de fuerza de 2026](https://acsm.org/resistance-training-guidelines-update-2026/): individualización y límites de reglas universales.
- [NHS, calentamiento](https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/): preparación gradual para la actividad.
- [Mayo Clinic, técnica con cargas](https://sportsmedicine.mayoclinic.org/news/weight-training-dos-and-donts-of-proper-technique/): control, calentamiento y aprendizaje presencial.
- [ACE, remo sentado](https://www.acefitness.org/resources/everyone/exercise-library/48/seated-row/): puntos generales de control del movimiento.
- [Singer y colaboradores, 2024](https://pubmed.ncbi.nlm.nih.gov/39205815/): revisión de descansos entre series y límites de una duración universal.
- [ISSN, proteína y ejercicio](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/): referencia general de 1,4–2,0 g/kg/día para adultos sanos que entrenan.

Al ampliar la guía, comprobar frases positivas y negativas, preguntas con varios
temas, ejercicios ambiguos, modalidades y consultas sin datos. No añadir
conocimiento fingido para evitar una aclaración. Ejecutar `node tests/coach.test.cjs`
y comprobar en navegador teclado, textos largos, temas y funcionamiento offline.
