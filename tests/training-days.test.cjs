'use strict';

// Resumen real con DOM mínimo y registros ficticios, sin dependencias.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function node(tag) {
  return {
    tag, children: [],
    setAttribute() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; }
  };
}
const hosts = {};
const context = vm.createContext({
  console, Intl, Date, Map, Set, assert, setTimeout, clearTimeout,
  document: {
    getElementById: id => hosts[id] || (hosts[id] = node('div')),
    createElement: node, createTextNode: text => text
  }
});
const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
vm.runInContext(read('assets/coach-knowledge.js'), context);
vm.runInContext(read('assets/app.js').replace(/boot\(\);\s*$/, ''), context);
vm.runInContext(`
  renderWeek = () => {};
  renderActivity = () => {};
  state = emptyLog();
  renderStats();
  renderHome();
`, context);
const stats = () => hosts.homeStats.children.map(item => ({
  label: item.children[0].textContent,
  value: item.children[1].textContent,
  note: item.children[2].textContent
}));
assert.deepEqual(stats().map(item => item.value), ['0', '0', '0']);
assert.equal(hosts.statSessions.textContent, '0');
vm.runInContext(`
  const now = new Date();
  const localIso = (offset, day, hour) => new Date(now.getFullYear(), now.getMonth() + offset, day, hour).toISOString();
  const record = (iso, routineId = 'a') => ({ iso, routineId, code: 'A', name: 'Bloque', entries: [] });
  state.sessions = [
    record(localIso(0, 2, 20), 'b'),
    record(localIso(0, 2, 8)),
    record(localIso(0, 1, 0)),
    record(localIso(-1, 0, 23))
  ];
  state.otherDays = [dateKey(new Date(now.getFullYear(), now.getMonth(), 3))];
  const saved = JSON.stringify(state);
  renderStats();
  renderHome();
  assert.equal(JSON.stringify(state), saved);
`, context);
assert.equal(hosts.statSessions.textContent, '3');
assert.deepEqual(stats(), [
  { label: 'Entrenamientos', value: '3', note: 'días en el historial' },
  { label: 'Este mes', value: '2', note: 'entrenamientos' },
  { label: 'Ritmo', value: '2', note: 'días sin pausas largas' }
]);
vm.runInContext('state.sessions.splice(0, 1); renderHome();', context);
assert.equal(stats()[0].value, '3'); // Queda otro bloque en la misma fecha.
vm.runInContext('state.sessions.splice(0, 1); renderStats(); renderHome();', context);
assert.equal(hosts.statSessions.textContent, '2');
assert.equal(stats()[1].value, '1');
assert.equal(stats()[1].note, 'entrenamiento');
console.log('Entrenamientos: días locales únicos, mes, ritmo, vacío y conservación del historial OK.');
