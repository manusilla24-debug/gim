'use strict';

// Regresiones con funciones reales y almacenamiento ficticio, sin dependencias.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const values = new Map();
let blocked = false;
const context = vm.createContext({
  console, Intl, Date, Map, Set, assert, setTimeout, clearTimeout,
  localStorage: {
    getItem: key => values.get(key) || null,
    setItem(key, value) { if (blocked) throw new Error('Sin espacio'); values.set(key, value); }
  },
  document: { getElementById: () => ({ textContent: '' }) }
});
const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
vm.runInContext(read('assets/coach-knowledge.js'), context);
vm.runInContext(read('assets/app.js').replace(/boot\(\);\s*$/, ''), context);

(async () => {
  await vm.runInContext(`(async () => {
    const notices = [];
    toast = message => notices.push(message);
    let confirmations = 0;
    let approve = true;
    confirmAction = async () => { confirmations++; return approve; };
    leaveUser = () => { currentUser = null; };
    renderAll = () => {};
    const entry = (id, name, load) => ({ exerciseId: id, name, load, sets: 3, reps: 10, note: '' });
    const session = (id, iso, entries, routineId = 'a') => ({ id, iso, entries, routineId, code: routineId.toUpperCase(), name: 'Bloque', volume: volumeOf(entries) });
    const old = session('old', '2026-10-01T12:00:00Z', [entry('a1', 'Press de banca inclinado', 40), entry('a2', 'Aperturas en máquina', 20)]);
    const recent = session('recent', '2026-10-03T12:00:00Z', [entry('a2', 'Aperturas en máquina', 25)]);
    const payload = { version: 3, users: [{ id: 'test', name: 'Prueba' }], logs: { test: { ...emptyLog(), sessions: [old, recent], draft: { a: { a1: { load: '42,5', sets: '3', reps: '10', note: 'Nota' } } } } } };
    const file = value => ({ text: async () => JSON.stringify(value) });
    store = emptyStore();
    saveNow();
    const before = localStorage.getItem(STORE_KEY);
    for (const invalid of [
      { users: [null], logs: {} },
      { users: [{ id: 'bad', name: 'Bad' }], logs: { bad: { draft: null, sessions: [] } } },
      { users: [{ id: '__proto__', name: 'Bad' }], logs: {} },
      { sessions: [null] },
      { sessions: [{ iso: 'fecha inválida', entries: [] }] },
      { sessions: [{ iso: old.iso, entries: [null] }] },
      { ...payload, logs: { test: { extra: { a: {} } } } },
      { ...payload, logs: { test: { extra: { a: [{ id: 'x1', name: 'Extra', variants: {} }] } } } },
      { ...payload, users: [payload.users[0], payload.users[0]] },
      { ...payload, version: 999 }
    ]) {
      await importData(file(invalid));
      assert.equal(localStorage.getItem(STORE_KEY), before);
      assert.equal(store.users.length, 0);
    }
    await importData({ text: async () => '{' });
    assert.equal(localStorage.getItem(STORE_KEY), before);
    assert.equal(confirmations, 0);
    approve = false;
    await importData(file(payload));
    assert.equal(localStorage.getItem(STORE_KEY), before);
    approve = true;
    await importData(file({ app: 'registro-de-fuerza', store: payload }));
    assert.equal(store.users[0].name, 'Prueba');
    state = store.logs.test;
    currentUser = store.users[0];
    assert.equal(state.sessions[0].id, 'recent');
    assert.equal(draftOf('a', 'a1').load, '42,5');
    assert.equal(lastRecordOf('Aperturas en máquina', 'a2').record.load, 25);
    assert.deepEqual(Array.from(seriesFor('Aperturas en máquina', 0), row => row.value), [20, 25]);
    assert.equal(volumeOf([{ load: '42,5', sets: 3, reps: 10 }]), 1275);
    const rows = comparisonData([old, recent]);
    assert.equal(rows[0].name, 'Press de banca inclinado');
    assert.equal(rows[0].values[1], null);
    assert.equal(rows[1].values[1].load, 25);
    const legacyEntry = { ...old.entries[0] }; delete legacyEntry.exerciseId;
    assert.equal(comparisonData([old, { ...old, entries: [legacyEntry] }]).length, 2);
    const variantRows = comparisonData([
      session('r1', old.iso, [entry('b2', 'Remo en T', 30)], 'b'),
      session('r2', recent.iso, [entry('b2', 'Remo de arriba', 40)], 'b'),
      session('r3', recent.iso, [entry('b3', 'Remo en T', 50)], 'b')
    ]);
    assert.equal(variantRows.length, 3);
    assert.equal(variantRows[0].values[1], null);
    assert.equal(variantRows[0].values[2], null);
    await importData(file({ sessions: [old] }));
    assert.equal(state.sessions.length, 1);
    assert.deepEqual(Object.keys(state.draft), []);
    const legacy = { ...emptyLog(), sessions: [old] };
    localStorage.setItem(LEGACY_V2, JSON.stringify(legacy));
    assert.equal(readV2().sessions.length, 1);
    assert.equal(localStorage.getItem(LEGACY_V2), JSON.stringify(legacy));
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ allHistory: [], workoutData: {}, currentRoutineIndex: 1 }));
    assert.equal(importLegacy().activeId, 'b');
    assert.ok(localStorage.getItem(LEGACY_KEY));
    globalThis.importFileForFailure = file(payload);
  })()`, context);

  const beforeFailure = values.get('gim.v3');
  blocked = true;
  await vm.runInContext(`(async () => {
    const previous = store;
    const previousState = state;
    await importData(importFileForFailure);
    assert.equal(store, previous);
    assert.equal(state, previousState);
    await importData({ text: async () => JSON.stringify({ sessions: [] }) });
    assert.equal(store, previous);
    assert.equal(state, previousState);
  })()`, context);
  assert.equal(values.get('gim.v3'), beforeFailure);
  console.log('Integridad: copias, rechazo sin pérdida, fallo de escritura, migraciones, orden y comparación OK.');
})().catch(error => { console.error(error); process.exitCode = 1; });
