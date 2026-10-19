'use strict';

// Sin dependencias: prueba el motor real con un DOM mínimo, sin leer datos locales.
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const nodes = new Map();
const context = vm.createContext({
  console, Intl, Date, Map, Set,
  document: { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { value: id === 'coachMode' ? 'repeat' : 'fill', hidden: true, close() {}, focus() {} });
    return nodes.get(id);
  } },
  assert
});
const source = readFileSync(require('node:path').join(__dirname, '../assets/app.js'), 'utf8');
vm.runInContext(readFileSync(require('node:path').join(__dirname, '../assets/coach-knowledge.js'), 'utf8'), context);
vm.runInContext(source.replace(/boot\(\);\s*$/, ''), context);
vm.runInContext(`
const messages = [];
addCoachMessage = text => messages.push(text);
addCoachFollowups = () => {};
saveNow = () => {};
renderLog = () => {};
toast = () => {};
currentUser = { id: 'test', name: 'Prueba' };
const entry = (id, name, load = '20', sets = '3', reps = '10') => ({ exerciseId: id, name, load, sets, reps, note: '' });
const session = (iso, entries, routineId = 'a') => ({ iso, entries, routineId });
const reset = () => { state = emptyLog(); messages.length = 0; coachExerciseId = null; coachUndo = null; coachConversation = newCoachConversation(); };
reset();
assert.ok(buildCoachPlan().rows.every(row => row.values.load === '' && row.values.reps === ''));
state.activeId = 'c';
assert.equal(buildCoachPlan().rows.find(row => row.id === 'c4').values.sets, '');

reset();
state.sessions = [session('2026-10-01', [entry('a1', 'Press de banca inclinado')])];
assert.equal(buildCoachPlan().rows[0].values.reps, '10');
assert.equal(buildCoachPlan('progress').rows[0].values.reps, '11');
assert.equal(buildCoachPlan('short').rows[0].values.sets, '2');
state.sessions[0].entries[0].reps = '12';
assert.equal(buildCoachPlan('progress').rows[0].values.load, '20');
assert.equal(buildCoachPlan('progress').rows[0].values.reps, '12');
state.sessions[0].entries[0].reps = '0';
assert.equal(buildCoachPlan('progress').rows[0].values.reps, '');
state.sessions.push({ iso: 'fecha inválida', routineId: 'a', entries: [null] });
assert.doesNotThrow(() => buildCoachPlan());

// El orden importado no altera cuál es la referencia más reciente.
state.sessions.push(session('2026-10-03', [entry('a1', 'Press de banca inclinado', '25')]));
assert.equal(buildCoachPlan().rows[0].values.load, '25');
answerCoach('¿Qué hice en la última sesión?');
assert.match(messages.at(-1), /25 kg/);
assert.ok(messages.at(-1).includes('03/10/26'));

// Identificadores y modalidades: no se comparan dos remos diferentes.
reset();
state.activeId = 'b';
state.sessions = [session('2026-10-03', [entry('b2', 'Remo en T', '40')], 'b')];
assert.equal(buildCoachPlan().rows.find(row => row.id === 'b2').values.load, '');
state.draft.b = { b2: { variant: 'Remo en T' } };
assert.equal(buildCoachPlan().rows.find(row => row.id === 'b2').values.load, '40');
assert.equal(buildCoachPlan().rows.find(row => row.id === 'b3').values.load, '');

// Prioridad de intenciones y contexto: dolor nunca genera un plan.
reset();
coachPlan = buildCoachPlan();
answerCoach('Me duele el hombro, prepara una sesión');
assert.equal(coachPlan, null);
assert.match(messages.at(-1), /detén/);
answerCoach('¿Cómo va el press?');
assert.equal(coachExerciseId, 'a1');
answerCoach('¿Y la carga?');
assert.match(messages.at(-1), /todavía no hay referencias/);
answerCoach('Resumen semanal');
assert.match(messages.at(-1), /0 sesiones finalizadas/);
state.draft.a = { a1: { load: '20', sets: '', reps: '10', note: '' } };
answerCoach('Revisar borrador');
assert.match(messages.at(-1), /revisa series/);

// No se deduce progreso de la ausencia de tres cifras idénticas.
state.sessions = Array.from({length: 3}, (_, i) => session('2026-10-0' + (i + 1), [entry('a1', 'Press de banca inclinado', String(20 + i))]));
showCoachPlateaus();
assert.match(messages.at(-1), /no demuestra/);

// La intención manda sobre el nombre: técnica y descansos no devuelven historial.
reset();
answerCoach('¿Cómo hago el press inclinado?');
assert.match(messages.at(-1), /Técnica/);
assert.match(messages.at(-1), /topes/);
answerCoach('¿Cuánto descanso entre series?');
assert.match(messages.at(-1), /Descanso entre series/);
assert.equal(coachConversation.minutes, null);
assert.equal(coachPlan, null);
answerCoach('¿Y cuántas series hago?');
assert.match(messages.at(-1), /Series y repeticiones/);
answerCoach('Quiero ganar músculo y soy principiante');
assert.equal(coachConversation.goal, 'ganar músculo');
assert.equal(coachConversation.experience, 'principiante');
answerCoach('¿Qué carga uso?');
assert.match(messages.at(-1), /ganar músculo/);
assert.match(messages.at(-1), /estás empezando/);
answerCoach('Ver estancamientos');
assert.match(messages.at(-1), /tres referencias comparables/);
answerCoach('¿Qué toca hoy?');
assert.match(messages.at(-1), /Estás viendo A/);

// Consultar otro bloque no cambia el bloque ni mezcla el borrador.
answerCoach('¿Cómo hago el jalón?');
assert.equal(state.activeId, 'a');
assert.equal(coachConversation.focus.id, 'b1');
assert.match(messages.at(-1), /apoyo de piernas/);
answerCoach('¿Cómo hago sentadilla?');
assert.equal(coachConversation.focus, null);
assert.match(messages.at(-1), /piernas/);
assert.doesNotMatch(messages.at(-1), /apoyo de piernas/);

// Una ambigüedad conserva la pregunta para responderla después de elegir.
let choices = null;
coachExerciseChoices = (matches, question) => { choices = { matches, question }; };
answerCoach('¿Cómo hago el remo?');
assert.equal(choices.matches.length, 2);
assert.match(choices.question, /Cómo hago/);
coachChooseExercise(choices.matches[1], choices.question);
assert.equal(coachConversation.focus.id, 'b3');
assert.match(messages.at(-1), /remo 2/i);

// Varias preguntas se responden sin confundir descanso con tiempo disponible.
answerCoach('¿Cómo caliento y cuánto descanso entre series?');
assert.match(messages.at(-1), /Calentamiento/);
assert.match(messages.at(-1), /Descanso entre series/);
answerCoach('Tengo 25 minutos');
assert.equal(coachConversation.minutes, 25);
answerCoach('Descanso 2 minutos entre series');
assert.equal(coachConversation.minutes, 25);

// Peso corporal explícito separado de la carga y cálculo con decimales españoles.
answerCoach('En el remo he hecho 3x10 con 20,5 kg');
// «remo» pide aclaración; tras elegir se conserva la intención de cálculo.
answerCoach('He hecho 3x10 con 20,5 kg');
assert.match(messages.at(-1), /615 kg/);
answerCoach('dos');
assert.equal(coachReportedEffort('b3'), 2);
assert.match(messages.at(-1), /RIR 2/);
assert.equal(coachConversation.weight, null);
answerCoach('Peso 80 kg, ¿cuánta proteína necesito?');
assert.equal(coachConversation.weight, 80);
assert.match(messages.at(-1), /112–160 g/);
answerCoach('Mi peso es 80,5 kg');
assert.equal(coachConversation.weight, 80.5);
answerCoach('El peso de la máquina es 90 kg');
assert.equal(coachConversation.weight, 80.5);
assert.equal(coachPerformance('20 kg 0x10'), null);
assert.equal(coachPerformance('20 kg 3x999'), null);
answerCoach('No quiero ganar fuerza');
assert.equal(coachConversation.goal, 'ganar músculo');
answerCoach('Quiero ganar fuerza y no perder grasa');
assert.equal(coachConversation.goal, 'ganar fuerza');
answerCoach('No quiero ganar fuerza');
assert.equal(coachConversation.goal, '');

// Una negación no oculta otro síntoma. Las preguntas genéricas no prometen saberlo todo.
assert.equal(coachHasPain('sin dolor de hombro pero me duele la rodilla'), true);
assert.equal(coachHasPain('sin dolor y con buena tecnica'), false);
assert.equal(coachHasPain('como evitar lesiones'), false);
answerCoach('¿Qué proteína tomo si tengo enfermedad renal?');
assert.match(messages.at(-1), /situación clínica/);
assert.doesNotMatch(messages.at(-1), /112–160/);
answerCoach('¿Cuál es la contraseña del gimnasio?');
assert.match(messages.at(-1), /No tengo una respuesta fiable/);

reset();
state.sessions = [session('2026-10-03', [entry('a1', 'Press de banca inclinado')])];
answerCoach('¿Cómo va el press inclinado?');
answerCoach('He completado la serie y me quedan cero repeticiones');
assert.equal(coachReportedEffort('a1'), 0);
assert.equal(buildCoachPlan('progress').rows[0].values.reps, '10');
answerCoach('En la siguiente me quedan dos repeticiones');
assert.equal(coachReportedEffort('a1'), 2);
assert.equal(buildCoachPlan('progress').rows[0].values.reps, '11');
answerCoach('Hoy estoy cansado');
assert.equal(buildCoachPlan('progress').rows[0].values.reps, '10');
answerCoach('Hoy estoy bien');
assert.equal(buildCoachPlan('progress').rows[0].values.reps, '11');
answerCoach('Resumen últimos 30 días');
assert.match(messages.at(-1), /Últimos 30 días/);
answerCoach('Resumen de este mes');
assert.match(messages.at(-1), /Este mes, desde/);
answerCoach('¿Qué es el RIR?');
const normalLength = messages.at(-1).length;
answerCoach('Más breve');
assert.ok(messages.at(-1).length < normalLength);
answerCoach('Más detalle');
assert.ok(messages.at(-1).length > normalLength);

async function checkApply() {
  reset();
  state.sessions = [session('2026-10-03', [entry('a1', 'Press de banca inclinado')])];
  state.draft.a = { a1: { load: '0', sets: '', reps: '8', note: 'Mi nota' } };
  const before = JSON.stringify(state.draft.a);
  coachPlan = buildCoachPlan('progress');
  await applyCoachPlan();
  assert.equal(state.draft.a.a1.load, '0');
  assert.equal(state.draft.a.a1.sets, '3');
  assert.equal(state.draft.a.a1.reps, '8');
  assert.equal(state.draft.a.a1.note, 'Mi nota');
  undoCoachPlan();
  assert.equal(JSON.stringify(state.draft.a), before);
  coachPlan = buildCoachPlan();
  await applyCoachPlan();
  state.draft.a.a1.note = 'Edición posterior';
  undoCoachPlan();
  assert.equal(state.draft.a.a1.note, 'Edición posterior');
  assert.match(messages.at(-1), /No lo deshago/);

  $('coachApplyMode').value = 'replace';
  coachPlan = buildCoachPlan();
  let asked = false;
  confirmAction = async () => { asked = true; return true; };
  await applyCoachPlan();
  assert.equal(asked, true);
  assert.equal(state.draft.a.a1.load, '20');
  assert.equal(state.draft.a.a1.note, 'Edición posterior');

  // Una propuesta obsoleta se regenera y requiere una segunda acción explícita.
  let regenerated = false;
  showCoachPlan = () => { regenerated = true; };
  coachPlan = buildCoachPlan();
  state.draft.a.a1.load = '99';
  await applyCoachPlan();
  assert.equal(regenerated, true);
  assert.equal(state.draft.a.a1.load, '99');
  regenerated = false;
  coachPlan = buildCoachPlan();
  currentUser = { id: 'other', name: 'Otra persona' };
  await applyCoachPlan();
  assert.equal(regenerated, true);
}
checkApply();
`, context).then(() => console.log('Entrenador: referencias, variantes, consultas, borrador, aplicación y deshacer OK.'));
