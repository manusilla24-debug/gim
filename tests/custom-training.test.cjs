'use strict';

// Flujo del bloque E con funciones reales y almacenamiento ficticio.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function node(tag) {
  return {
    tag, children: [], attrs: {}, value: '', dataset: {},
    addEventListener() {},
    setAttribute(key, value) { this.attrs[key] = value; },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; }
  };
}
const hosts = {};
const context = vm.createContext({
  console, Intl, Date, Map, Set, assert,
  document: {
    getElementById: id => hosts[id] || (hosts[id] = node('div')),
    createElement: node, createElementNS: (_, tag) => node(tag)
  }
});
const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
vm.runInContext(read('assets/coach-knowledge.js'), context);
vm.runInContext(read('assets/app.js').replace(/boot\(\);\s*$/, ''), context);
vm.runInContext(`(async () => {
  state = normaliseLog({ activeId: 'a', sessions: [] });
  assert.equal(state.activeId, 'a');
  assert.equal(exercisesOf('e').length, 0);
  assert.equal(recommendedRoutine().id, 'a');
  assert.equal(validLogCopy({ extra: { e: 'inválido' } }), false);
  const record = (exerciseId, name, load = 20, note = '') => ({ exerciseId, name, load, sets: 3, reps: 10, note });
  state.sessions = [{ id: 'old', routineId: 'a', iso: '2026-10-01T12:00:00Z', entries: [
    record('a1', 'Press de banca inclinado'), record('b2', 'Remo en polea baja'),
    record('b3', 'Remo en polea baja')
  ] }];
  assert.ok(personalExerciseNames().includes('Sentadilla libre'));
  assert.ok(personalExerciseNames().includes('Extensión de hombro unilateral'));
  assert.equal(personalExerciseNames().filter(name => name === 'Remo en polea baja').length, 1);
  assert.deepEqual(personalExerciseGroups().map(group => group.routine.code), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(personalExerciseNames()[0], 'Press de banca inclinado');
  assert.ok(personalExerciseNames().indexOf('Fondos') < personalExerciseNames().indexOf('Jalón al pecho'));
  assert.ok(personalExerciseNames().indexOf('Press militar') < personalExerciseNames().indexOf('Sentadilla libre'));
  state.activeId = 'e';
  state.extra.e = [
    { id: 'xpress', name: 'Press de banca inclinado' },
    { id: 'xnew', name: 'Ejercicio propio' },
    { id: 'xfondos', name: 'Fondos' },
    { id: 'xabs', name: 'Abdominales' }
  ];
  state.draft.e = {
    xpress: { load: '25', sets: '3', reps: '8', note: '' },
    xnew: { load: '15', sets: '2', reps: '12', note: '' },
    xfondos: { load: '99', sets: '3', reps: '10', note: '10 9 8' },
    xabs: { load: '99', sets: '4', reps: '50', note: '' }
  };
  state = normaliseLog(JSON.parse(JSON.stringify(state)));
  assert.equal(validLogCopy(state), true);
  assert.equal(state.activeId, 'e');
  assert.equal(state.draft.e.xnew.load, '15');
  assert.equal(exercisesOf('e')[2].tracksLoad, false);
  assert.equal(exercisesOf('e')[3].tracksSetsOnly, true);
  assert.equal(lastRecordOf('Press de banca inclinado', 'xpress').record.load, 20);
  assert.equal(lastRecordOf('Remo en máquina', 'xpress'), null);
  confirmAction = async () => true;
  const realRenderLog = renderLog;
  save = () => {};
  saveNow = () => {};
  renderAll = () => {};
  renderLog = () => {};
  toast = () => {};
  await completeSession();
  const finished = state.sessions[0];
  const copy = { version: 5, users: [{ id: 'test', name: 'Prueba' }], lastUserId: 'test', logs: { test: JSON.parse(JSON.stringify(state)) } };
  assert.equal(validStoreCopy(copy), true);
  assert.equal(normaliseLog(copy.logs.test).sessions[0].routineId, 'e');
  assert.equal(finished.routineId, 'e');
  assert.equal(finished.name, 'Entreno personalizado');
  assert.equal(finished.entries.length, 4);
  assert.equal(finished.entries[0].exerciseId, 'a1');
  assert.equal(finished.entries[2].load, '');
  assert.equal(progressValue(finished.entries[2]), 9);
  assert.equal(finished.entries[3].reps, '');
  assert.equal(historyEntryLabel(finished, finished.entries[3]), '4 series');
  assert.equal(finished.volume, 960);
  assert.equal(state.activeId, 'b');
  assert.ok(personalExerciseNames().includes('Ejercicio propio'));
  assert.ok(personalExerciseGroups()[4].names.includes('Ejercicio propio'));
  assert.ok(!personalExerciseGroups()[4].names.includes('Press de banca inclinado'));
  assert.equal(comparisonSessionsFor('e').length, 1);
  historyOrder = 'e';
  assert.equal(historySessions(state.sessions, historyOrder).length, 1);
  assert.equal(seriesFor('Ejercicio propio', 0).length, 1);
  assert.equal(seriesFor('Press de banca inclinado', 0).length, 2);
  renderExerciseFilter();
  const options = document.getElementById('exerciseFilter').children.flatMap(group => group.children);
  const names = options.map(option => option.attrs.value);
  assert.equal(names.length, new Set(names).size);
  assert.equal(names.filter(name => name === 'Press de banca inclinado').length, 1);
  assert.ok(names.includes('Ejercicio propio'));
  assert.deepEqual(calendarColors([{ routine: ROUTINE_BY_ID.get('e') }], false), ['e']);
  // Quitar una fila y añadir el mismo nombre después mantiene la comparación.
  const another = { ...finished, entries: [record('xanother', 'Ejercicio propio', 18)] };
  const comparison = comparisonData([finished, another]);
  const own = comparison.find(row => row.name === 'Ejercicio propio');
  assert.equal(own.values[0].value, 15);
  assert.equal(own.values[1].value, 18);
  state.activeId = 'e';
  await repeatLast();
  assert.equal(state.draft.e.xpress.load, '25');
  assert.equal(state.draft.e.xnew.load, '15');
  await removeExtraExercise('xnew');
  assert.ok(personalExerciseNames().includes('Ejercicio propio'));
  assert.equal(state.sessions[0].entries.length, 4);
  state = emptyLog();
  assert.ok(personalExerciseNames().includes('Press de banca inclinado'));
  assert.ok(!personalExerciseNames().includes('Ejercicio propio'));
  // Todos los extras comparten el selector y sus referencias por nombre.
  const descendants = item => [item, ...(item.children || []).flatMap(child => typeof child === 'object' ? descendants(child) : [])];
  for (const routine of SPLIT) {
    state = emptyLog();
    state.activeId = routine.id;
    state.extra[routine.id] = [{ id: 'xshared', name: 'Press de banca inclinado' }];
    realRenderLog();
    const controls = descendants(document.getElementById('logRows'));
    assert.ok(controls.some(item => item.tag === 'input' && item.dataset.field === 'name'));
    const select = controls.find(item => item.tag === 'select' && item.dataset.field === 'savedExercise');
    assert.ok(select, routine.id);
    assert.equal(select.attrs['aria-label'], 'Elegir ya existente');
    assert.equal(exercisesOf(routine.id).find(item => item.custom).historyId, 'a1');
    await completeSession();
    assert.equal(state.sessions[0].routineId, routine.id);
    assert.equal(state.sessions[0].entries.length, 1);
    assert.equal(state.sessions[0].entries[0].name, 'Press de banca inclinado');
    assert.equal(state.sessions[0].entries[0].load, '');
    assert.equal(state.sessions[0].volume, 0);
  }
  state = emptyLog();
  state.activeId = 'b';
  state.extra.b = [
    { id: 'xcinta', name: 'Cinta' }, { id: 'xdistance', name: '3 km en cinta' },
    { id: 'xpress', name: 'Press de banca inclinado' }, { id: 'xblank', name: '   ' }
  ];
  state.draft.b = {
    xcinta: { note: '3 km', load: '', sets: '', reps: '' },
    xpress: { load: '30', sets: '3', reps: '10', note: '' }
  };
  state.sessions = [
    { id: 'earlier', iso: '2026-11-01T12:00:00Z', routineId: 'a', entries: [record('old-extra-id', 'Press de banca inclinado', 25)] }
  ];
  assert.equal(lastRecordOf('Press de banca inclinado', 'a1').record.load, 25);
  await completeSession();
  const mixed = state.sessions[0];
  assert.equal(mixed.entries.length, 3); // No arrastra ejercicios programados vacíos.
  assert.equal(mixed.entries.find(item => item.name === 'Cinta').note, '3 km');
  assert.ok(mixed.entries.some(item => item.name === '3 km en cinta' && item.load === ''));
  assert.equal(mixed.volume, 900);
  assert.equal(seriesFor('Cinta', 0).length, 0);
  assert.equal(seriesFor('Press de banca inclinado', 0).length, 2);
  assert.ok(personalExerciseGroups()[4].names.includes('Cinta'));
  assert.ok(!personalExerciseGroups()[1].names.includes('Cinta'));
  assert.ok(personalExerciseGroups()[0].names.includes('Press de banca inclinado'));
  assert.ok(!personalExerciseGroups()[4].names.includes('Press de banca inclinado'));
  assert.equal(comparisonData(state.sessions).filter(item => item.name === 'Press de banca inclinado').length, 1);
  const savedLog = JSON.parse(JSON.stringify(state));
  assert.ok(validLogCopy(savedLog));
  state = normaliseLog(savedLog);
  assert.equal(state.sessions[0].entries.find(item => item.name === 'Cinta').note, '3 km');
  state.extra.d = [{ id: 'xbody', name: 'Fondos' }, { id: 'xabs', name: 'Abdominales' }];
  assert.equal(exercisesOf('d').find(item => item.id === 'xbody').tracksLoad, false);
  assert.equal(exercisesOf('d').find(item => item.id === 'xabs').tracksSetsOnly, true);
  // Un nombre repetido dentro del mismo entrenamiento tiene un solo punto.
  state.sessions = [{ id: 'same', iso: '2026-11-18T12:00:00Z', routineId: 'a', entries: [
    record('a1', 'Press de banca inclinado', 20), record('xduplicate', 'Press de banca inclinado', 30)
  ] }];
  assert.equal(trackedNames().get('Press de banca inclinado'), 1);
  assert.equal(seriesFor('Press de banca inclinado', 0).length, 1);
  assert.equal(seriesFor('Press de banca inclinado', 0)[0].value, 30);
  assert.equal(comparisonData(state.sessions)[0].values[0].value, 30);
  assert.equal(state.sessions[0].entries.length, 2); // Se conserva el historial original.
  // Una copia antigua puede conservar el extra pero haber omitido su ejecución.
  // Normalizar no permite adivinar en qué fechas se hizo.
  state = normaliseLog({ activeId: 'a', extra: { a: [{ id: 'xcardio', name: '3km cinta' }] },
    sessions: [{ id: 'past', routineId: 'a', iso: '2026-11-12T13:00:00Z', entries: [] }] });
  assert.equal(state.sessions[0].entries.length, 0);
  await completeSession();
  assert.equal(state.sessions[0].entries.length, 1);
  assert.equal(state.sessions[0].entries[0].name, '3km cinta');
  assert.equal(state.sessions[0].entries[0].load, '');
  assert.equal(state.sessions[0].volume, 0);
  assert.equal(state.sessions[1].entries.length, 0); // No inventa un registro pasado.
  state = emptyLog();
  state.activeId = 'e';
  state.extra.e = [{ id: 'xcardio6', name: '6km cinta 3x2000' }];
  await completeSession();
  assert.equal(state.sessions[0].entries[0].name, '6km cinta 3x2000');
  assert.equal(state.sessions[0].entries[0].sets, '');
  assert.equal(state.sessions[0].entries[0].reps, '');
  assert.equal(state.sessions[0].volume, 0);
})()`, context).then(() => console.log('Bloque E: historial, reutilización, campos, recarga, comparación y aislamiento OK.'))
  .catch(error => { console.error(error); process.exitCode = 1; });
