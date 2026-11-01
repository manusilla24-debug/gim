'use strict';

// Renderizado real con un DOM mínimo y fechas ficticias, sin dependencias.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function node(tag) {
  return {
    tag, children: [], attrs: {}, events: {},
    setAttribute(key, value) { this.attrs[key] = value; },
    addEventListener(key, value) { this.events[key] = value; },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; }
  };
}
const hosts = { calendarMonth: node('h3'), calendarGrid: node('ol') };
const context = vm.createContext({
  console, Intl, Date, Map, Set, assert, setTimeout, clearTimeout,
  document: {
    getElementById: id => hosts[id], createElement: node,
    createElementNS: (_, tag) => node(tag)
  }
});
const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
vm.runInContext(read('assets/coach-knowledge.js'), context);
vm.runInContext(read('assets/app.js').replace(/boot\(\);\s*$/, ''), context);
vm.runInContext(`
  state = emptyLog();
  state.sessions = [{ iso: '2026-10-26T12:00:00', routineId: 'a' }];
  state.otherDays = ['2026-10-26', '2026-12-01'];
  let opened = '';
  openHistoryDay = key => { opened = key; };
  calendarMonth = new Date(2026, 10, 1);
  renderCalendar();
`, context);
const days = () => hosts.calendarGrid.children.map(cell => cell.children[0]);
assert.equal(days().length, 42);
assert.equal(days()[0].children[0], '26');
assert.match(days()[0].attrs['aria-label'], /octubre.*mes anterior/);
assert.match(days()[0].className, /calendar__day--outside/);
assert.equal(days()[0].tag, 'button');
assert.equal(days()[0].children[1].children.length, 2); // gimnasio + Otros
days()[0].events.click();
assert.equal(vm.runInContext('opened', context), '2026-10-26');
assert.equal(days()[6].children[0], '1');
assert.doesNotMatch(days()[6].className, /calendar__day--outside/);
assert.equal(days()[36].children[0], '1');
assert.match(days()[36].attrs['aria-label'], /diciembre.*mes siguiente.*Otros/);
assert.equal(days()[36].children[1].children.length, 1);
assert.equal(days()[41].children[0], '6');
vm.runInContext('calendarMonth = new Date(2027, 0, 1); renderCalendar();', context);
assert.equal(days()[0].children[0], '28');
assert.match(days()[0].attrs['aria-label'], /diciembre.*mes anterior/);
vm.runInContext('calendarMonth = new Date(2024, 1, 1); renderCalendar();', context);
assert.equal(days().filter(day => !day.className.includes('calendar__day--outside')).length, 29);
vm.runInContext('calendarMonth = new Date(2027, 1, 1); renderCalendar();', context);
assert.equal(days().length, 28); // mes completo de lunes a domingo: no añade semanas vacías
assert.equal(days().filter(day => day.className.includes('calendar__day--outside')).length, 0);
console.log('Calendario: semanas completas, fechas adyacentes, círculos, historial, año nuevo y febrero OK.');
