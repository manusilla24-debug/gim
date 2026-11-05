'use strict';

// Historial ficticio: la recomendación no depende del orden ni de nextId heredado.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({
  console, Intl, Date, Map, Set, assert,
  document: { getElementById: () => ({ value: '' }) }
});
const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
vm.runInContext(read('assets/coach-knowledge.js'), context);
vm.runInContext(read('assets/app.js').replace(/boot\(\);\s*$/, ''), context);

(async () => {
  await vm.runInContext(`(async () => {
    const session = (routineId, day, id = routineId) => ({
      id, routineId, iso: '2026-01-' + day + 'T12:00:00Z', entries: []
    });
    assert.equal(recommendedRoutine([]).id, 'a');
    const acSameDay = [session('c', '03'), session('a', '03')];
    assert.equal(recommendedRoutine(acSameDay).id, 'b');
    assert.equal(recommendedRoutine([...acSameDay, session('b', '04')]).id, 'd');
    const history = [session('a', '09'), session('b', '08'), session('c', '07'), session('d', '10')];
    const before = JSON.stringify(history);
    assert.equal(recommendedRoutine(history).id, 'c');
    assert.equal(recommendedRoutine(history.slice().reverse()).id, 'c');
    // Una sesión vieja adicional no sustituye a la última del mismo bloque.
    assert.equal(recommendedRoutine([...history, session('a', '01', 'old-a')]).id, 'c');
    assert.equal(JSON.stringify(history), before);
    assert.equal(recommendedRoutine([
      session('d', '03'), session('c', '03'), session('b', '03'), session('a', '03')
    ]).id, 'a');
    assert.equal(recommendedRoutine([null, { routineId: 'a', iso: 'inválida' }, session('unknown', '01')]).id, 'a');
    state = normaliseLog({
      activeId: 'a', nextId: 'b', sessions: history,
      draft: { c: { c1: { load: '20', sets: '3', reps: '8', note: '' } } },
      otherDays: ['2026-01-11']
    });
    assert.equal(recommendedRoutine().id, 'c');
    // Recargar los datos existentes conserva los borradores y calcula por historial.
    state = normaliseLog(JSON.parse(JSON.stringify(state)));
    assert.equal(recommendedRoutine().id, 'c');
    assert.equal(state.draft.c.c1.load, '20');
    confirmAction = async () => true;
    save = () => {};
    renderAll = () => {};
    toast = () => {};
    state.activeId = 'c';
    await completeSession();
    assert.equal(state.sessions[0].routineId, 'c');
    assert.equal(state.activeId, 'b'); // No salta de C a D por orden.
    assert.equal(state.nextId, 'b');
    assert.equal(recommendedRoutine().id, 'b');
    // Eliminar la sesión recién cerrada devuelve la prioridad al bloque C.
    await deleteSession(state.sessions[0].id);
    assert.equal(recommendedRoutine().id, 'c');
    state = emptyLog();
    assert.equal(recommendedRoutine().id, 'a');
  })()`, context);
  console.log('Recomendación: bloques sin sesiones, antigüedad, empates, recarga, cierre y eliminación OK.');
})().catch(error => { console.error(error); process.exitCode = 1; });
