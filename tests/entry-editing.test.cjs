'use strict';

// Regresiones de cargas libres y cambios de variante con datos ficticios.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const stored = new Map();
const context = vm.createContext({
  assert, console, setTimeout, clearTimeout,
  localStorage: {
    getItem: key => stored.get(key) || null,
    setItem: (key, value) => stored.set(key, value)
  }
});
const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
vm.runInContext(read('assets/coach-knowledge.js'), context);
vm.runInContext(read('assets/app.js').replace(/boot\(\);\s*$/, ''), context);

(async () => {
  await vm.runInContext(`(async () => {
    state = emptyLog();
    state.activeId = 'b';
    store.users = [{ id: 'test', name: 'Prueba' }];
    store.logs.test = state;
    const exercise = exercisesOf('b').find(item => item.id === 'b2');
    const first = selectedExerciseName(exercise, {});
    const second = exercise.variants.find(name => name !== first);
    state.draft.b = {
      b2: { load: '42,7', sets: '3', reps: '10', note: 'Máquina' },
      b3: { load: '20', sets: '2', reps: '8', note: '' }
    };
    const other = JSON.stringify(state.draft.b.b3);
    const before = JSON.stringify(state.draft.b.b2);
    let confirmations = 0;
    let approve = false;
    confirmAction = async () => { confirmations++; return approve; };
    await changeDraftVariant('b2', second);
    assert.equal(JSON.stringify(state.draft.b.b2), before);
    assert.equal(confirmations, 1);
    approve = true;
    await changeDraftVariant('b2', second);
    assert.equal(selectedExerciseName(exercise, draftOf('b', 'b2')), second);
    for (const field of ['load', 'sets', 'reps', 'note']) assert.equal(draftOf('b', 'b2')[field], '');
    assert.equal(JSON.stringify(state.draft.b.b3), other);
    saveNow();
    load();
    state = store.logs.test;
    assert.equal(draftOf('b', 'b2').variant, second);
    assert.equal(draftOf('b', 'b2').load, '');
    await changeDraftVariant('b2', first);
    assert.equal(confirmations, 2); // Cambiar campos vacíos no requiere confirmar.
    updateDraft('b2', 'load', '0');
    await changeDraftVariant('b2', second);
    assert.equal(confirmations, 3);
    updateDraft('b2', 'note', 'Nota sin cifras');
    approve = false;
    await changeDraftVariant('b2', first);
    assert.equal(draftOf('b', 'b2').note, 'Nota sin cifras');
    await changeDraftVariant('b2', 'Variante inexistente');
    assert.equal(draftOf('b', 'b2').variant, second);
    saveNow();

    // Mismo formato libre de carga en el editor, sin min/max ni step.
    el = (tag, attrs, ...children) => ({ tag, attrs, children });
    for (const value of ['42,7', '43.123', '0', '0,125', '9999.99', '']) {
      const input = editNumberField('Carga (kg)', 'load', value).children[1];
      assert.equal(input.attrs.type, 'text');
      assert.equal(input.attrs.step, null);
      assert.equal(input.attrs.min, null);
      assert.equal(input.attrs.max, undefined);
      assert.ok(new RegExp('^' + input.attrs.pattern + '$').test(value));
      assert.equal(num(decimalText(value)), num(value));
    }
    assert.equal(editNumberField('Series', 'sets', 3).children[1].attrs.step, '1');
    console.log('Edición: cargas decimales libres, cancelar variante, vaciar, aislamiento y recarga OK.');
  })()`, context);
})().catch(error => { console.error(error); process.exitCode = 1; });
