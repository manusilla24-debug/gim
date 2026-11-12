'use strict';

// Flujo del bloque E con funciones reales y almacenamiento ficticio.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function node(tag) {
  return {
    tag, children: [], attrs: {}, value: '',
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
    createElement: node
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
})()`, context).then(() => console.log('Bloque E: historial, reutilización, campos, recarga, comparación y aislamiento OK.'))
  .catch(error => { console.error(error); process.exitCode = 1; });
