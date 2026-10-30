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
    // Semanas locales: lunes, cambio de año y horario de verano.
    assert.equal(dateKey(weekStart(new Date(2027, 0, 3))), '2026-12-28');
    assert.equal(dateKey(weekStart(new Date(2026, 9, 26))), '2026-10-26');
    assert.equal(dateKey(weekStart(new Date(2026, 9, 25))), '2026-10-19');
    const originalRenderWeek = renderWeek;
    let weekRenders = 0;
    renderWeek = () => { weekRenders++; };
    weekSelectedDay = new Date(2026, 9, 22, 12);
    moveWeek(1);
    assert.equal(dateKey(weekSelectedDay), '2026-10-29');
    moveWeek(-1);
    assert.equal(dateKey(weekSelectedDay), '2026-10-22');
    assert.equal(weekRenders, 2);
    renderWeek = originalRenderWeek;
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
      { sessions: [], otherDays: '2026-10-01' },
      { sessions: [], otherDays: ['2026-02-30'] },
      { sessions: [], otherDays: [null] },
      { sessions: [{ iso: 'fecha inválida', entries: [] }] },
      { sessions: [{ iso: old.iso, entries: [null] }] },
      { sessions: [{ ...old, note: { text: 'No es texto' } }] },
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

    // Sesiones anteriores sin sensaciones y copias nuevas con texto multilínea.
    const withoutNote = { ...old }; delete withoutNote.note;
    assert.equal(normaliseLog({ sessions: [withoutNote] }).sessions[0].note, '');
    assert.equal(emptyStore().version, 5);
    const withNote = { ...payload, version: 4, logs: { test: { ...emptyLog(), sessions: [{ ...old, note: '  Buena energía.\\nÚltima serie difícil.  ' }] } } };
    await importData(file(withNote));
    state = store.logs.test;
    assert.equal(state.sessions[0].note, 'Buena energía.\\nÚltima serie difícil.');
    assert.equal(store.version, 5);
    const savedNote = JSON.parse(localStorage.getItem(STORE_KEY));
    assert.equal(savedNote.logs.test.sessions[0].note, state.sessions[0].note);
    await importData(file(savedNote));
    assert.equal(store.logs.test.sessions[0].note, state.sessions[0].note);
    assert.equal(normaliseLog({ sessions: [{ ...old, note: 'x'.repeat(2500) }] }).sessions[0].note.length, 2000);
    await importData(file(payload));
    assert.equal(store.version, 5);
    assert.equal(store.logs.test.sessions[0].note, '');
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    load();
    assert.equal(store.version, 5);
    assert.equal(store.logs.test.sessions[0].note, '');
    assert.equal(normaliseLog({ sessions: [] }).sessions.length, 0);
    // Otros solo conserva fechas válidas, sin modificar el historial ni el ciclo.
    assert.deepEqual(Array.from(normaliseLog({}).otherDays), []);
    assert.deepEqual(Array.from(normaliseLog({ otherDays: ['2026-10-01', null, '2026-02-30', '2026-10-01'] }).otherDays), ['2026-10-01']);
    assert.equal(validDayKey('2024-02-29'), true);
    assert.equal(validDayKey('2026-02-29'), false);
    currentUser = store.users[0];
    state = store.logs.test;
    const unchangedSessions = JSON.stringify(state.sessions);
    const unchangedDraft = JSON.stringify(state.draft);
    const unchangedCycle = state.nextId;
    assert.equal(setOtherDay('2026-10-01', true), true);
    assert.equal(setOtherDay('2026-10-01', true), true);
    assert.deepEqual(Array.from(state.otherDays), ['2026-10-01']);
    assert.equal(JSON.stringify(state.sessions), unchangedSessions);
    assert.equal(JSON.stringify(state.draft), unchangedDraft);
    assert.equal(state.nextId, unchangedCycle);
    assert.equal(setOtherDay('2099-01-01', true), false);
    assert.equal(setOtherDay('2026-02-30', true), false);
    assert.deepEqual(Array.from(calendarColors([{ routine: SPLIT[0] }, { routine: SPLIT[0] }], true)), ['a', 'others']);
    assert.deepEqual(Array.from(calendarColors([{ routine: SPLIT[0] }, { routine: SPLIT[1] }], false)), ['a', 'b']);
    const otherCopy = JSON.parse(localStorage.getItem(STORE_KEY));
    await importData(file(otherCopy));
    state = store.logs.test;
    currentUser = store.users[0];
    assert.deepEqual(Array.from(state.otherDays), ['2026-10-01']);
    store.users.push({ id: 'second', name: 'Otro atleta' });
    store.logs.second = emptyLog();
    assert.deepEqual(Array.from(store.logs.second.otherDays), []);
    assert.equal(setOtherDay('2026-10-01', false), true);
    assert.deepEqual(Array.from(state.otherDays), []);
    globalThis.importFileForFailure = file(payload);
  })()`, context);

  const beforeFailure = values.get('gim.v3');
  blocked = true;
  await vm.runInContext(`(async () => {
    const previous = store;
    const previousState = state;
    assert.equal(setOtherDay('2026-10-02', true), false);
    assert.deepEqual(Array.from(state.otherDays), []);
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
