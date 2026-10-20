'use strict';

/* ==========================================================================
   Registro de Fuerza
   Sin cuentas ni servidor: cada atleta tiene su registro en este navegador.
   ========================================================================== */

const THEME_KEY = 'gim.theme';

/* --- El ciclo de entrenamiento ------------------------------------------ */

const SPLIT = [
  {
    id: 'a', code: 'A', name: 'Pecho y tríceps', focus: 'Empuje',
    exercises: [
      { id: 'a1', name: 'Press de banca inclinado', equip: 'Multipower' },
      { id: 'a2', name: 'Aperturas en máquina' },
      { id: 'a3', name: 'Aperturas en polea' },
      { id: 'a4', name: 'Extensión de tríceps', equip: 'Polea' },
      { id: 'a5', name: 'Fondos', tracksLoad: false }
    ]
  },
  {
    id: 'b', code: 'B', name: 'Espalda y bíceps', focus: 'Tracción',
    exercises: [
      { id: 'b1', name: 'Jalón al pecho' },
      {
        id: 'b2', name: 'Remo', legacyName: 'Remo 1', variantLabel: 'Tipo de remo 1',
        variants: ['Remo en máquina de palanca', 'Remo en polea baja', 'Remo de arriba', 'Remo en T'],
        defaultVariant: 'Remo en máquina de palanca'
      },
      {
        id: 'b3', name: 'Remo', legacyName: 'Remo 2', variantLabel: 'Tipo de remo 2',
        variants: ['Remo en máquina de palanca', 'Remo en polea baja', 'Remo de arriba', 'Remo en T'],
        defaultVariant: 'Remo en polea baja'
      },
      { id: 'b4', name: 'Curl de bíceps', equip: 'Barra Z' },
      { id: 'b5', name: 'Curl de bíceps martillo' }
    ]
  },
  {
    id: 'c', code: 'C', name: 'Hombro y abdomen', focus: 'Hombro · core',
    shortName: 'Hombro y abs',
    exercises: [
      { id: 'c1', name: 'Press militar' },
      { id: 'c2', name: 'Elevaciones laterales' },
      {
        id: 'c3', name: 'Extensión de hombro', legacyName: 'Extensión de hombro', equip: 'Polea',
        variantLabel: 'Modalidad de extensión de hombro',
        variants: ['Extensión de hombro bilateral', 'Extensión de hombro unilateral'],
        defaultVariant: 'Extensión de hombro bilateral'
      },
      { id: 'c4', name: 'Abdominales', tracksLoad: false, tracksSetsOnly: true }
    ]
  }
];

const ROUTINE_BY_ID = new Map(SPLIT.map(r => [r.id, r]));

/* --- Estado -------------------------------------------------------------
   Un registro por atleta. El almacén guarda la lista de atletas y, para cada
   uno, su propio ciclo, borrador e historial.
   ------------------------------------------------------------------------ */

function emptyLog() {
  return {
    activeId: SPLIT[0].id,
    nextId: SPLIT[0].id,
    draft: {},      // draft[rutina][ejercicio] = { load, sets, reps, note }
    extra: {},      // extra[rutina] = [{ id, name }]
    sessions: []    // más reciente primero
  };
}

function emptyStore() {
  return { version: 3, users: [], lastUserId: '', logs: {} };
}

let store = emptyStore();
let state = emptyLog();     // el registro del atleta activo
let currentUser = null;
let chartExercise = null;   // ejercicio seleccionado en Progresión
let historyOrder = 'newest'; // orden o bloque visible; no modifica los datos guardados
let tableVisible = false;
let comparisonRoutineId = SPLIT[0].id;
let comparisonSessionIds = ['', '', ''];
let comparisonNeedsDefaults = true;
let managing = false;       // el selector, en modo gestión
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let coachPlan = null;       // propuesta efímera; el historial sigue siendo la fuente
let coachUserId = null;
let coachRoutineId = null;
let coachExerciseId = null;
let coachUndo = null;
let coachConversation = newCoachConversation();

/* --- Utilidades --------------------------------------------------------- */

const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const dateLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dateShort = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
const dateMid = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
const timeShort = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
const relative = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' });

const kg = n => nf1.format(n) + ' kg';

function relativeDay(iso) {
  const then = new Date(iso);
  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((a - b) / 86400000);
  if (Math.abs(days) < 7) return relative.format(days, 'day');
  if (Math.abs(days) < 31) return relative.format(Math.round(days / 7), 'week');
  return dateShort.format(then);
}

const pad2 = n => String(n).padStart(2, '0');

function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid);
  }
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, ...kids) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const kid of kids.flat()) if (kid) node.append(kid);
  return node;
}

const $ = id => document.getElementById(id);

/* --- Persistencia ------------------------------------------------------- */

const STORE_KEY = 'gim.v3';
const LEGACY_V2 = 'gim.v2';
const LEGACY_KEY = 'gymData';
const SESSION_KEY = 'gim.session';

let saveTimer = null;

function writeStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function save(quiet) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      writeStore();
      if (!quiet) $('draftState').textContent = 'Guardado a las ' + timeShort.format(new Date());
    } catch (e) {
      $('draftState').textContent = 'No se pudo guardar: almacenamiento no disponible';
    }
  }, 180);
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try { writeStore(); } catch (e) { /* sin persistencia */ }
}

function normaliseLog(log) {
  const clean = Object.assign(emptyLog(), log || {});
  if (!ROUTINE_BY_ID.has(clean.activeId)) clean.activeId = SPLIT[0].id;
  if (!ROUTINE_BY_ID.has(clean.nextId)) clean.nextId = clean.activeId;
  if (!isDataObject(clean.draft)) clean.draft = {};
  if (!isDataObject(clean.extra)) clean.extra = {};
  if (!Array.isArray(clean.sessions)) clean.sessions = [];
  normaliseExerciseVariants(clean.sessions);
  clean.sessions.sort((a, b) => new Date(b.iso) - new Date(a.iso));
  return clean;
}

/* Las copias se comprueban completas antes de tocar el registro actual.
   Los campos opcionales de versiones anteriores conservan sus valores por defecto. */
function isDataObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeDataId(value) {
  return typeof value === 'string' && value.length > 0
    && !['__proto__', 'prototype', 'constructor'].includes(value);
}

function validRecordFields(row) {
  return isDataObject(row)
    && ['load', 'sets', 'reps'].every(key => row[key] === undefined
      || typeof row[key] === 'string' || (typeof row[key] === 'number' && Number.isFinite(row[key])))
    && ['note', 'variant', 'equip', 'exerciseId'].every(key => row[key] === undefined || typeof row[key] === 'string');
}

function validLogCopy(log) {
  if (!isDataObject(log)) return false;
  if (log.sessions !== undefined && (!Array.isArray(log.sessions) || !log.sessions.every(session =>
    isDataObject(session) && typeof session.iso === 'string' && Number.isFinite(Date.parse(session.iso))
    && ['id', 'routineId', 'code', 'name'].every(key => session[key] === undefined || typeof session[key] === 'string')
    && (session.volume === undefined || (typeof session.volume === 'number' && Number.isFinite(session.volume)))
    && Array.isArray(session.entries) && session.entries.every(entry => validRecordFields(entry) && typeof entry.name === 'string')
  ))) return false;
  if (log.draft !== undefined && (!isDataObject(log.draft) || !Object.entries(log.draft).every(([id, rows]) =>
    safeDataId(id) && isDataObject(rows) && Object.entries(rows).every(([key, row]) => safeDataId(key) && validRecordFields(row))
  ))) return false;
  if (log.extra !== undefined && (!isDataObject(log.extra) || !Object.entries(log.extra).every(([id, rows]) =>
    safeDataId(id) && Array.isArray(rows) && rows.every(row => isDataObject(row) && safeDataId(row.id) && typeof row.name === 'string'
      && ['equip', 'legacyName', 'variantLabel', 'defaultVariant'].every(key => row[key] === undefined || typeof row[key] === 'string')
      && ['tracksLoad', 'tracksSetsOnly', 'custom'].every(key => row[key] === undefined || typeof row[key] === 'boolean')
      && (row.variants === undefined || (Array.isArray(row.variants) && row.variants.every(name => typeof name === 'string'))))
  ))) return false;
  return true;
}

function validStoreCopy(value) {
  if (!isDataObject(value) || !Array.isArray(value.users) || !isDataObject(value.logs)) return false;
  if (value.version !== undefined && value.version !== 3) return false;
  const ids = new Set();
  return value.users.every(user => {
    if (!isDataObject(user) || !safeDataId(user.id) || typeof user.name !== 'string' || ids.has(user.id)) return false;
    ids.add(user.id);
    return validLogCopy(value.logs[user.id]);
  });
}

/* Reclasifica el historial personal anterior a los selectores de variantes.
   Los IDs estables permiten que las sesiones nuevas se relacionen sin depender
   del texto visible; las fechas conservan la clasificación indicada por Manuel. */
function normaliseExerciseVariants(sessions) {
  const rowing = {
    '2026-09-04|Remo 1': ['b2', 'Remo de arriba'],
    '2026-09-04|Remo 2': ['b3', 'Remo en T'],
    '2026-09-10|Remo 1': ['b2', 'Remo en máquina de palanca'],
    '2026-09-17|Remo 1': ['b2', 'Remo en máquina de palanca'],
    '2026-09-17|Remo 2': ['b3', 'Remo en polea baja'],
    '2026-09-22|Remo 1': ['b2', 'Remo en máquina de palanca'],
    '2026-09-22|Remo 2': ['b3', 'Remo en polea baja'],
    '2026-09-27|Remo 1': ['b2', 'Remo en máquina de palanca'],
    '2026-09-27|Remo 2': ['b3', 'Remo en polea baja']
  };
  const unilateralShoulder = new Set(['2026-09-19', '2026-09-28']);
  const rowNames = new Set(['Remo en máquina de palanca', 'Remo en polea baja', 'Remo de arriba', 'Remo en T']);

  sessions.forEach(session => {
    const day = String(session.iso || '').slice(0, 10);
    (Array.isArray(session.entries) ? session.entries : []).forEach(entry => {
      const row = rowing[day + '|' + entry.name];
      if (row) {
        entry.exerciseId = row[0];
        entry.name = row[1];
      } else if (entry.name === 'Extensión de hombro') {
        entry.exerciseId = 'c3';
        entry.name = 'Extensión de hombro ' + (unilateralShoulder.has(day) ? 'unilateral' : 'bilateral');
      } else if (!entry.exerciseId && rowNames.has(entry.name)) {
        entry.exerciseId = entry.name === 'Remo en máquina de palanca' || entry.name === 'Remo de arriba' ? 'b2' : 'b3';
      } else if (!entry.exerciseId && /^Extensión de hombro (?:uni|bi)lateral$/.test(entry.name)) {
        entry.exerciseId = 'c3';
      }
    });
  });
}

function newUserId() {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      store = Object.assign(emptyStore(), parsed);
      if (!Array.isArray(store.users)) store.users = [];
      store.users.forEach(user => { store.logs[user.id] = normaliseLog(store.logs[user.id]); });
      return;
    } catch (e) { /* almacén ilegible: se empieza de cero */ }
  }

  // Registros de versiones anteriores, cuando solo había un atleta.
  const inherited = readV2() || importLegacy();
  if (inherited) {
    const user = { id: newUserId(), name: 'Manuel', created: new Date().toISOString() };
    store = emptyStore();
    store.users.push(user);
    store.logs[user.id] = normaliseLog(inherited);
    store.lastUserId = user.id;
    saveNow();
  }
}

function readV2() {
  try {
    const raw = localStorage.getItem(LEGACY_V2);
    return raw ? normaliseLog(JSON.parse(raw)) : null;
  } catch (e) { return null; }
}

/* El registro original (clave "gymData") se convierte una sola vez.
   No se borra: queda como respaldo en el navegador. */
function importLegacy() {
  let raw = null;
  try { raw = localStorage.getItem(LEGACY_KEY); } catch (e) { return null; }
  if (!raw) return null;

  const ALIAS = {
    'press de banca inclinado (multipower)': 'Press de banca inclinado',
    'aperturas en maquina': 'Aperturas en máquina',
    'apertura en polea': 'Aperturas en polea',
    'extension de triceps': 'Extensión de tríceps',
    'fondos': 'Fondos',
    'jalon al pecho': 'Jalón al pecho',
    'remo 1': 'Remo 1',
    'remo 2': 'Remo 2',
    'curl de biceps en barra z': 'Curl de bíceps',
    'curl de biceps martillo': 'Curl de bíceps martillo',
    'press militar': 'Press militar',
    'elevaciones laterales': 'Elevaciones laterales',
    'extension de hombro con polea': 'Extensión de hombro',
    'abdominales': 'Abdominales'
  };
  const plain = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const rename = name => ALIAS[plain(name)] || String(name || '').trim();

  function parseScheme(text) {
    const m = String(text || '').match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/);
    if (m) return { reps: num(m[1]), sets: num(m[2]) };
    const single = String(text || '').match(/\d+/);
    return { reps: single ? Number(single[0]) : '', sets: '' };
  }

  try {
    const old = JSON.parse(raw);
    const log = emptyLog();

    for (const entry of (old.allHistory || []).slice().reverse()) {
      const routine = SPLIT.find(r => plain(r.name).replace(/&|y/g, '') === plain(entry.routine).replace(/&|y/g, ''))
        || SPLIT.find(r => plain(entry.routine).includes(plain(r.name).split(' ')[0]));
      const [d, m, y] = String(entry.date || '').split('/').map(Number);
      const [hh, mm] = String(entry.time || '00:00').split(':').map(Number);
      const when = (d && m && y) ? new Date(y, m - 1, d, hh || 0, mm || 0) : new Date();
      const entries = (entry.exercises || []).map(ex => {
        const scheme = parseScheme(ex.reps);
        return {
          name: rename(ex.name),
          load: num(ex.weight),
          sets: scheme.sets,
          reps: scheme.reps,
          note: String(ex.notes || '')
        };
      });
      log.sessions.unshift({
        id: 'legacy-' + when.getTime() + '-' + log.sessions.length,
        iso: when.toISOString(),
        routineId: routine ? routine.id : '',
        code: routine ? routine.code : '·',
        name: routine ? routine.name : String(entry.routine || 'Sesión'),
        entries,
        volume: volumeOf(entries)
      });
    }

    for (const [key, value] of Object.entries(old.workoutData || {})) {
      const [ri, ei] = key.split('-').map(Number);
      const routine = SPLIT[ri];
      const exercise = routine && routine.exercises[ei];
      if (!routine || !exercise) continue;
      const scheme = parseScheme(value.reps);
      if (!log.draft[routine.id]) log.draft[routine.id] = {};
      log.draft[routine.id][exercise.id] = {
        load: value.weight === undefined || value.weight === '' ? '' : String(value.weight),
        sets: scheme.sets === '' ? '' : String(scheme.sets),
        reps: scheme.reps === '' ? '' : String(scheme.reps),
        note: String(value.notes || '')
      };
    }

    const idx = Number(old.currentRoutineIndex) || 0;
    log.activeId = (SPLIT[idx] || SPLIT[0]).id;
    log.nextId = log.activeId;
    return log;
  } catch (e) {
    return null;
  }
}

/* --- Atletas ------------------------------------------------------------ */

function openUser(id) {
  const user = store.users.find(u => u.id === id);
  if (!user) return;
  currentUser = user;
  store.logs[id] = normaliseLog(store.logs[id]);
  state = store.logs[id];
  store.lastUserId = id;
  chartExercise = null;
  historyOrder = 'newest';
  comparisonSessionIds = ['', '', ''];
  comparisonNeedsDefaults = true;
  try { sessionStorage.setItem(SESSION_KEY, id); } catch (e) { /* sin persistencia */ }
  saveNow();
  showApp();
}

function createUser(name) {
  const user = { id: newUserId(), name: name, created: new Date().toISOString() };
  store.users.push(user);
  store.logs[user.id] = emptyLog();
  saveNow();
  return user;
}

function leaveUser() {
  currentUser = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* sin persistencia */ }
  showGate();
}

function num(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : '';
}

function decimalText(value) {
  let clean = String(value || '').replace(/[^0-9.,]/g, '');
  const separator = clean.search(/[.,]/);
  if (separator >= 0) clean = clean.slice(0, separator + 1) + clean.slice(separator + 1).replace(/[.,]/g, '');
  return clean;
}

function draftOf(routineId, exerciseId) {
  const row = (state.draft[routineId] || {})[exerciseId];
  return row || { load: '', sets: '', reps: '', note: '' };
}

function volumeOf(entries) {
  return entries.reduce((total, e) => {
    const load = num(e.load), sets = num(e.sets), reps = num(e.reps);
    if (load > 0 && sets > 0 && reps > 0) return total + load * sets * reps;
    return total;
  }, 0);
}

function exercisesOf(routineId) {
  const routine = ROUTINE_BY_ID.get(routineId);
  const extra = (state.extra[routineId] || []).map(e => Object.assign({ custom: true }, e));
  return routine.exercises.concat(extra);
}

/* Última carga registrada para un ejercicio, para saber por dónde seguir. */
function selectedExerciseName(exercise, values) {
  if (!exercise.variants) return exercise.name;
  return exercise.variants.includes(values && values.variant)
    ? values.variant
    : exercise.defaultVariant || exercise.variants[0];
}

function lastRecordOf(name, exerciseId, legacyName) {
  for (const session of state.sessions) {
    const hit = session.entries.find(e => ((e.exerciseId === exerciseId && (!legacyName || e.name === name))
      || (!e.exerciseId && (e.name === name || e.name === legacyName)))
      && (num(e.load) > 0 || num(e.reps) > 0 || num(e.sets) > 0));
    if (hit) return { record: hit, iso: session.iso };
  }
  return null;
}

/* --- Carril: ciclo y resumen -------------------------------------------- */

function renderSplit() {
  const list = $('splitList');
  list.replaceChildren(...SPLIT.map(routine => {
    const isActive = routine.id === state.activeId;
    // Solo se marca la programada cuando no es la que está abierta.
    const isNext = routine.id === state.nextId && !isActive;
    return el('li', {},
      el('button', {
        class: 'split__btn',
        type: 'button',
        'aria-pressed': String(isActive),
        dataset: { routine: routine.id }
      },
        el('span', { class: 'split__code', text: routine.code, 'aria-hidden': 'true' }),
        el('span', { class: 'split__name' },
          routine.shortName || routine.name,
          el('span', { class: 'split__focus', text: routine.focus })
        ),
        isNext && state.sessions.length > 0
          ? el('span', { class: 'split__flag', text: 'Programada' })
          : null
      )
    );
  }));
}

/* --- Entrenador local --------------------------------------------------
   No simula conocimiento externo: compara el historial del atleta y aplica
   reglas pequeñas, explicables y conservadoras de sobrecarga progresiva.
   ------------------------------------------------------------------------ */

function coachSessions() {
  return state.sessions.filter(session => session && Array.isArray(session.entries) && Number.isFinite(Date.parse(session.iso)))
    .slice().sort((a, b) => new Date(b.iso) - new Date(a.iso));
}

function coachHistory(routineId, exerciseName, exerciseId, legacyName) {
  const rows = [];
  for (const session of coachSessions()) {
    if (session.routineId !== routineId) continue;
    const entry = session.entries.find(item => item && ((item.exerciseId === exerciseId && (!legacyName || item.name === exerciseName))
      || (!item.exerciseId && (item.name === exerciseName || item.name === legacyName))));
    if (entry && [entry.load, entry.sets, entry.reps].some(value => num(value) > 0)) rows.push({ entry, iso: session.iso });
  }
  return rows;
}

function samePerformance(a, b) {
  return num(a.load) === num(b.load) && num(a.reps) === num(b.reps) && num(a.sets) === num(b.sets);
}

function coachSnapshot() {
  return JSON.stringify([currentUser && currentUser.id, state.activeId, state.draft, state.extra, state.sessions,
    coachConversation.reports, coachConversation.readiness, coachConversation.minutes]);
}

function buildCoachPlan(mode = 'repeat', routineId = state.activeId) {
  const routine = ROUTINE_BY_ID.get(routineId);
  const rows = exercisesOf(routine.id).filter(exercise => (exercise.name || '').trim()).map(exercise => {
    const valuesToday = draftOf(routine.id, exercise.id);
    const exerciseName = selectedExerciseName(exercise, valuesToday);
    const historyRows = coachHistory(routine.id, exerciseName, exercise.id, exercise.legacyName);
    const latest = historyRows[0] && historyRows[0].entry;
    const plateau = historyRows.length >= 3
      && samePerformance(historyRows[0].entry, historyRows[1].entry)
      && samePerformance(historyRows[1].entry, historyRows[2].entry);
    const tracksLoad = exercise.tracksLoad !== false;

    if (exercise.tracksSetsOnly) {
      return {
        id: exercise.id, name: exerciseName,
        values: { load: '', sets: latest && num(latest.sets) > 0 ? String(mode === 'short' ? Math.min(2, num(latest.sets)) : num(latest.sets)) : '', reps: '', note: '' },
        plateau: false,
        latest: historyRows[0],
        reason: latest ? (mode === 'short' ? 'Como máximo dos series de la referencia; los detalles van en las notas.' : 'Repite las series registradas; los detalles van en las notas.') : 'Sin referencia: anota las series que decidas realizar.'
      };
    }

    if (!latest) {
      return {
        id: exercise.id,
        name: exerciseName,
        values: { load: '', sets: '', reps: '', note: '', variant: valuesToday.variant || exercise.defaultVariant || '' },
        plateau: false,
        reason: 'Sin historial comparable: elige y registra tu referencia; no calculo una carga inicial.'
      };
    }

    const load = num(latest.load);
    const sets = num(latest.sets);
    const reps = num(latest.reps);
    const values = {
      load: !tracksLoad || load === '' || load < 0 ? '' : String(load),
      sets: sets > 0 && Number.isInteger(sets) ? String(sets) : '',
      reps: reps > 0 && Number.isInteger(reps) ? String(reps) : '',
      note: '',
      variant: valuesToday.variant || exercise.defaultVariant || ''
    };
    let reason = 'Mantener la última referencia.';

    const effort = coachReportedEffort(exercise.id);
    const hold = coachConversation.readiness === 'fatigue' || effort !== null && effort <= 1;
    if (mode === 'progress' && !hold && values.reps && reps < 12 && values.sets && (!tracksLoad || load > 0)) {
      values.reps = String(reps + 1);
      reason = plateau
        ? 'Tres referencias iguales. Una repetición extra es opcional si mantienes técnica y margen de esfuerzo.'
        : 'Opción: una repetición más, solo si la última referencia resultó controlada. La app no mide tu esfuerzo.';
    } else if (mode === 'progress') {
      reason = hold ? 'Por la fatiga o el poco margen de esfuerzo que has indicado en el chat, no añado repeticiones. Decide si conviene reducir la exigencia.'
        : 'Repite la referencia: no hay base suficiente para subir automáticamente la carga o las repeticiones.';
    }

    if (mode === 'short' && sets > 2) {
      values.sets = '2';
      reason = 'Propuesta abreviada: dos series en lugar de ' + sets + '; no estima la duración ni aumenta la carga.';
    }

    return { id: exercise.id, name: exerciseName, values, plateau, reason, latest: historyRows[0] };
  });

  return { routine, rows, mode, snapshot: coachSnapshot(), userId: currentUser && currentUser.id };
}

function coachLine(row) {
  const values = row.values;
  const parts = [];
  if (values.load !== '') parts.push(values.load + ' kg');
  if (values.sets !== '') parts.push(values.sets + ' series');
  if (values.reps !== '') parts.push(values.reps + ' reps');
  return '• ' + row.name + ': ' + (parts.join(' × ') || 'ajuste libre') + (row.plateau ? ' · revisar' : '');
}

function addCoachMessage(text, user) {
  const messages = $('coachMessages');
  const message = el('article', { class: 'coach__message' + (user ? ' coach__message--user' : '') },
    el('p', { class: 'coach__speaker', text: user ? 'Tú' : 'Entrenador local' }),
    el('p', { class: 'coach__bubble', text })
  );
  messages.append(message);
  while (messages.children.length > 60) messages.firstElementChild.remove();
  if (user) messages.scrollTop = messages.scrollHeight;
  else messages.scrollTop += message.getBoundingClientRect().top - messages.getBoundingClientRect().top - 12;
}

function openModal(dialog) {
  document.querySelectorAll('dialog[open]').forEach(open => {
    if (open !== dialog) open.close('cancel');
  });
  if (!dialog.open) dialog.showModal();
}

function coachWelcome() {
  const routine = ROUTINE_BY_ID.get(state.activeId);
  const previous = coachSessions().find(session => session.routineId === routine.id);
  const context = previous
    ? 'La última vez que hiciste este bloque fue ' + relativeDay(previous.iso) + '.'
    : 'Todavía no tienes una sesión anterior de este bloque.';
  const next = ROUTINE_BY_ID.get(state.nextId);
  $('coachContext').textContent = coachContextLabel();
  addCoachMessage('Estás viendo ' + routine.code + ': ' + routine.name + '. El siguiente bloque del ciclo es ' + next.code + '.\n' + context
    + '\nCuéntame qué quieres conseguir o pregúntame por técnica, cargas, descansos, alimentación o tu progreso. Puedo usar tu historial y recordar lo que me cuentes durante esta conversación. ¿Qué necesitas hoy?');
  addCoachFollowups(['Soy principiante', 'Quiero ganar músculo', '¿Cómo voy esta semana?']);
}

function coachContextLabel() {
  const count = state.sessions.length;
  return currentUser.name + ' · bloque ' + ROUTINE_BY_ID.get(state.activeId).code + ' · ' + count + (count === 1 ? ' sesión registrada' : ' sesiones registradas')
    + (coachConversation.goal ? ' · ' + coachConversation.goal : '')
    + (coachConversation.minutes ? ' · ' + coachConversation.minutes + ' min disponibles' : '');
}

function openCoach() {
  const dialog = $('coachDialog');
  if (coachUserId !== currentUser.id || coachRoutineId !== state.activeId) {
    if (coachUserId !== currentUser.id) coachConversation = newCoachConversation();
    coachConversation.focus = null;
    coachConversation.pending = null;
    coachConversation.awaiting = '';
    coachConversation.lastTopics = [];
    $('coachMessages').replaceChildren();
    coachPlan = null;
    coachUserId = currentUser.id;
    coachRoutineId = state.activeId;
    coachExerciseId = null;
    coachUndo = null;
    $('coachMode').value = 'repeat';
    $('coachApplyMode').value = 'fill';
    $('undoCoachPlan').hidden = true;
    coachWelcome();
  } else if (!$('coachMessages').children.length) {
    coachWelcome();
  }
  if (coachPlan && coachPlan.snapshot !== coachSnapshot()) invalidateCoachPlan();
  $('coachPlanActions').hidden = !coachPlan;
  $('coachContext').textContent = coachContextLabel();
  openModal(dialog);
  $('coachInput').focus();
}

function showCoachPlan(mode = $('coachMode').value) {
  $('coachMode').value = mode;
  coachExerciseId = null;
  coachPlan = buildCoachPlan(mode);
  const previous = coachSessions().find(session => session.routineId === coachPlan.routine.id);
  const intro = previous
    ? 'He usado tu última sesión del bloque ' + coachPlan.routine.code + ' y las anteriores comparables:'
    : 'No hay historial de este bloque: los campos sin referencia quedan vacíos para que los decidas tú.';
  const labels = { repeat: 'Repetir referencias', progress: 'Probar una repetición más', short: 'Reducir series' };
  addCoachMessage(labels[mode] + ' · bloque ' + coachPlan.routine.code + '\n' + intro);
  const cards = el('div', { class: 'coach__cards' });
  coachPlan.rows.forEach(row => {
    cards.append(el('section', { class: 'coach__card' },
      el('h3', { text: row.name }),
      el('p', { class: 'coach__target', text: coachLine(row).replace('• ' + row.name + ': ', '') }),
      el('p', { text: row.latest ? 'Referencia del ' + dateShort.format(new Date(row.latest.iso)) + ': ' + coachValues(row.latest.entry) : 'Sin referencia comparable con cifras registradas.' }),
      el('p', { class: 'coach__reason', text: row.reason })
    ));
  });
  const messages = $('coachMessages');
  messages.lastElementChild.append(cards);
  messages.scrollTop = messages.scrollHeight;
  $('coachPlanActions').hidden = false;
}

function showCoachPlateaus() {
  const plan = buildCoachPlan();
  const plateaus = plan.rows.filter(row => row.plateau);
  if (!plateaus.length) {
    addCoachMessage(state.sessions.length < 3
      ? 'Aún no hay tres referencias comparables iguales. Sigue registrando carga, series y repeticiones.'
      : 'No encuentro tres referencias comparables seguidas e idénticas en este bloque. Eso no demuestra que estés progresando: consulta un ejercicio para ver sus cifras.');
    return;
  }
  addCoachMessage('He encontrado ' + plateaus.length + (plateaus.length === 1 ? ' posible estancamiento:' : ' posibles estancamientos:')
    + '\n' + plateaus.map(row => '• ' + row.name + ': las tres últimas referencias son iguales.').join('\n')
    + '\nRepetir cifras no confirma un estancamiento: puede ser intencionado. Revisa las notas y tus sensaciones antes de cambiar objetivos.');
}

function explainCoachPlan() {
  addCoachMessage('Comparo registros del mismo bloque y ejercicio, separando sus variantes. Por defecto repito tu referencia más reciente. En «Una repetición más» solo añado una si hay series y repeticiones válidas por debajo de 12 (y carga si corresponde); es una opción, no una evaluación física. «Menos series» limita a dos las referencias con más de dos series. No subo kilos automáticamente ni conozco tu técnica, esfuerzo o recuperación. Tres referencias iguales son una señal para revisar, no un diagnóstico.\nAl aplicar puedes completar solo campos vacíos o sustituir valores tras confirmarlo. Las notas se conservan. El chat y sus ajustes se reinician al recargar; tus entrenamientos siguen guardados.');
}

function normalizeCoachText(value) {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function coachValues(entry) {
  const parts = [];
  if (num(entry.load) !== '' && num(entry.load) >= 0) parts.push(kg(num(entry.load)));
  if (num(entry.sets) > 0) parts.push(nf1.format(num(entry.sets)) + ' series');
  if (num(entry.reps) > 0) parts.push(nf1.format(num(entry.reps)) + ' reps');
  return parts.join(' · ') || 'Sin valores';
}

function showCoachSummary(days = 7) {
  coachExerciseId = null;
  const now = new Date();
  const calendarMonth = days === 'month';
  const start = new Date(now.getFullYear(), now.getMonth(), calendarMonth ? 1 : now.getDate() - days + 1);
  const recent = coachSessions().filter(session => new Date(session.iso) >= start && new Date(session.iso) <= now);
  const counts = SPLIT.map(routine => routine.code + ': ' + recent.filter(session => session.routineId === routine.id).length);
  const volume = recent.reduce((sum, session) => sum + volumeOf(session.entries.filter(entry => entry && typeof entry === 'object')), 0);
  const period = calendarMonth ? 'Este mes, desde el ' + dateShort.format(start) : 'Últimos ' + days + ' días, incluido hoy';
  addCoachMessage(period + ' · ' + recent.length + (recent.length === 1 ? ' sesión finalizada.\n' : ' sesiones finalizadas.\n')
    + counts.join(' · ') + '\nTonelaje registrado: ' + kg(volume) + ' (carga × series × repeticiones). No incluye trabajo sin carga registrada ni el borrador.\n'
    + (recent.length ? 'La distribución describe tus registros; no permite valorar por sí sola tu recuperación o la calidad del entrenamiento.' : 'No hay sesiones finalizadas en este periodo. Puedes consultar tus referencias anteriores por ejercicio.'));
}

function showCoachLastSession(routineId = state.activeId) {
  coachExerciseId = null;
  const session = coachSessions().find(item => item.routineId === routineId);
  if (!session) {
    addCoachMessage('Todavía no hay una sesión finalizada de este bloque. «Revisar borrador» muestra lo que llevas anotado ahora.');
    return;
  }
  const entries = session.entries.filter(entry => entry && typeof entry === 'object');
  addCoachMessage('Última sesión del bloque ' + ROUTINE_BY_ID.get(routineId).code + ' · ' + dateShort.format(new Date(session.iso)) + '\n'
    + entries.map(entry => '• ' + String(entry.name || 'Ejercicio') + ': ' + coachValues(entry) + (entry.note ? '\n  Nota: ' + entry.note : '')).join('\n')
    + '\nTonelaje registrado: ' + kg(volumeOf(entries)) + '. Puedes consultar un ejercicio para comparar sus referencias.');
}

function showCoachDraft() {
  coachExerciseId = null;
  const exercises = exercisesOf(state.activeId).filter(exercise => exercise.name.trim());
  const issues = [];
  let started = 0;
  exercises.forEach(exercise => {
    const values = draftOf(state.activeId, exercise.id);
    if (![values.load, values.sets, values.reps, values.note].some(value => value !== '' && value != null)) return;
    started++;
    const missing = [];
    if (!(num(values.sets) > 0)) missing.push('series');
    if (!exercise.tracksSetsOnly && !(num(values.reps) > 0)) missing.push('repeticiones');
    if (exercise.tracksLoad !== false && (num(values.load) === '' || num(values.load) < 0)) missing.push('carga');
    if (missing.length) issues.push('• ' + selectedExerciseName(exercise, values) + ': revisa ' + missing.join(', ') + '.');
  });
  addCoachMessage('Borrador del bloque ' + ROUTINE_BY_ID.get(state.activeId).code + ': ' + started + ' de ' + exercises.length + ' ejercicios con anotaciones.\n'
    + (issues.join('\n') || (started ? 'Los ejercicios iniciados tienen sus campos numéricos básicos. Revisa que las cifras reflejen lo que has hecho.' : 'Aún no has anotado nada. Puedes partir de una propuesta o de la última sesión.'))
    + '\nNo he cambiado nada ni he finalizado la sesión.');
}

function coachExerciseChoices(matches, question = '') {
  coachConversation.pending = question;
  addCoachMessage('Para responder a eso necesito concretar el ejercicio. Elige una de estas opciones:');
  const choices = el('div', { class: 'coach__choices' });
  matches.forEach(exercise => {
    const routineId = exercise.routineId || state.activeId;
    const suffix = exercise.id === 'b2' ? ' · remo 1' : exercise.id === 'b3' ? ' · remo 2' : '';
    choices.append(el('button', {
      type: 'button', text: selectedExerciseName(exercise, draftOf(routineId, exercise.id)) + suffix + ' · ' + ROUTINE_BY_ID.get(routineId).code,
      dataset: { coachExercise: exercise.id, coachRoutine: routineId, coachQuestion: question }
    }));
  });
  $('coachMessages').lastElementChild.append(choices);
}

function showCoachExercise(exercise, routineId = state.activeId) {
  coachExerciseId = exercise.id;
  coachConversation.focus = { id: exercise.id, routineId };
  const name = selectedExerciseName(exercise, draftOf(routineId, exercise.id));
  const rows = coachHistory(routineId, name, exercise.id, exercise.legacyName).slice(0, 3);
  if (!rows.length) {
    addCoachMessage(name + ': todavía no hay referencias comparables para esta variante. Registra una sesión con sus cifras para poder comparar.');
    return;
  }
  const lines = rows.map(row => '• ' + dateShort.format(new Date(row.iso)) + ': ' + coachValues(row.entry) + (row.entry.note ? '\n  Nota: ' + row.entry.note : ''));
  let comparison = 'Necesito una segunda referencia comparable para mostrar cambios.';
  if (rows.length > 1) {
    const a = rows[0].entry, b = rows[1].entry;
    const deltas = [['load', 'kg'], ['sets', 'series'], ['reps', 'reps']].filter(([key]) => num(a[key]) !== '' && num(b[key]) !== '')
      .map(([key, unit]) => { const delta = num(a[key]) - num(b[key]); return (delta > 0 ? '+' : '') + nf1.format(delta) + ' ' + unit; });
    comparison = 'Cambio frente a la referencia anterior: ' + (deltas.join(' · ') || 'faltan campos comparables') + '. No equivale por sí solo a ganar o perder fuerza.';
  }
  const planRow = buildCoachPlan($('coachMode').value, routineId).rows.find(row => row.id === exercise.id);
  addCoachMessage(name + ' · últimas referencias\n' + lines.join('\n') + '\n' + comparison + '\nSiguiente referencia: ' + coachValues(planRow.values) + '. ' + planRow.reason);
}

function invalidateCoachPlan() {
  coachPlan = null;
  $('coachPlanActions').hidden = true;
}

/* --- Conversación: contexto explícito, intención y respuestas compuestas --- */

function newCoachConversation() {
  return { goal: '', experience: '', minutes: null, days: null, weight: null, readiness: '', focus: null, pending: null, awaiting: '', lastTopics: [], reports: {}, concise: false, detailed: false };
}

function coachCatalog() {
  return SPLIT.flatMap(routine => exercisesOf(routine.id).filter(exercise => String(exercise.name || '').trim())
    .map(exercise => Object.assign({}, exercise, { routineId: routine.id })));
}

function coachFocus() {
  const focus = coachConversation.focus;
  return focus && coachCatalog().find(exercise => exercise.id === focus.id && exercise.routineId === focus.routineId);
}

function addCoachFollowups(questions) {
  const message = $('coachMessages').lastElementChild;
  if (!message) return;
  const choices = el('div', { class: 'coach__choices', 'aria-label': 'Continuar la conversación' });
  questions.slice(0, 3).forEach(question => choices.append(el('button', {
    type: 'button', text: question, dataset: { coachFollowup: question }
  })));
  message.append(choices);
}

function coachRespond(text, questions = []) {
  addCoachMessage(text);
  addCoachFollowups(questions);
}

function updateCoachProfile(intent, raw = intent) {
  const changes = [];
  const positive = intent.replace(/\bno (?:quiero|busco) (?:ganar |perder )?(?:fuerza|musculo|masa muscular|grasa|peso|adelgazar)\b/g, '')
    .replace(/\bno (?:ganar|perder) (?:fuerza|musculo|masa muscular|grasa|peso)\b/g, '')
    .replace(/\bno soy (?:principiante|novato)\b/g, '');
  const goalNegations = { 'ganar músculo': /no (?:quiero |busco )?(?:ganar )?(?:musculo|masa muscular)/, 'ganar fuerza': /no (?:quiero |busco )?(?:ganar )?fuerza/, 'perder grasa': /no (?:quiero |busco )?(?:perder (?:grasa|peso)|adelgazar)/ };
  if (coachConversation.goal && goalNegations[coachConversation.goal].test(intent)) {
    coachConversation.goal = '';
    changes.push('Dejo de usar el objetivo anterior. Dime cuál prefieres ahora.');
  }
  if (/\b(?:estoy (?:cansad[oa]|agotad[oa])|he dormido mal|dormi mal|tengo fatiga)\b/.test(intent)) coachConversation.readiness = 'fatigue';
  if (/\b(?:estoy (?:descansad[oa]|recuperad[oa])|hoy estoy bien|ya no estoy cansad[oa])\b/.test(intent)) coachConversation.readiness = '';
  const goals = [
    ['ganar músculo', /(?:quiero|busco|objetivo|para mi).*?(?:muscul|hipertrof|masa)|^(?:hipertrofia|ganar musculo)$/],
    ['ganar fuerza', /(?:quiero|busco|objetivo).*?(?:fuerza|fuerte)|^(?:fuerza|ganar fuerza)$/],
    ['perder grasa', /(?:quiero|busco|objetivo).*?(?:perder grasa|perder peso|adelgaz|definir)|^(?:perder grasa|adelgazar|definir)$/]
  ];
  goals.forEach(([goal, pattern]) => {
    if (pattern.test(positive)) { coachConversation.goal = goal; changes.push('Objetivo: ' + goal + '.'); }
  });
  if (/\b(?:soy|estoy empezando|nivel|llevo poco|acabo de empezar)\b.*(?:principiante|novato)|^soy principiante$|^estoy empezando$/.test(positive)) {
    coachConversation.experience = 'principiante';
    changes.push('Tendré en cuenta que estás empezando.');
  } else if (/no soy principiante|(?:llevo|entreno desde hace) \d+ anos|soy (?:avanzado|intermedio)/.test(intent)) {
    coachConversation.experience = 'con experiencia';
    changes.push('Tendré en cuenta que ya tienes experiencia.');
  }
  const minutes = intent.match(/(?:tengo|dispongo de|solo tengo|sesion de)\s*(\d{1,3})\s*(?:minutos|min)\b/);
  if (minutes && +minutes[1] >= 5 && +minutes[1] <= 180) {
    coachConversation.minutes = +minutes[1];
    changes.push('Tiempo disponible: ' + minutes[1] + ' minutos; no es una duración garantizada.');
  }
  const days = intent.match(/(?:puedo (?:ir|entrenar)|entreno|tengo disponibles)\s*(?:los )?(\d)\s*dias/);
  if (days && +days[1] >= 1 && +days[1] <= 7) {
    coachConversation.days = +days[1];
    changes.push('Disponibilidad que me has indicado: ' + days[1] + ' días por semana.');
  }
  const weight = String(raw).trim().toLowerCase().match(/(?:^(?:yo )?peso|\bmi peso(?: corporal)?(?: es| de)?)\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilos)\b/);
  if (weight && +weight[1].replace(',', '.') >= 30 && +weight[1].replace(',', '.') <= 300) {
    coachConversation.weight = +weight[1].replace(',', '.');
    changes.push('Peso corporal indicado: ' + kg(coachConversation.weight) + '. Solo lo usaré en esta conversación.');
  }
  return changes;
}

function findCoachExercises(intent) {
  const catalog = coachCatalog();
  // Una mención específica gana a una palabra compartida como «press» o «curl».
  const scored = catalog.map(exercise => {
    const guide = COACH_KNOWLEDGE.exercises[exercise.id];
    const names = [exercise.name, selectedExerciseName(exercise, draftOf(exercise.routineId, exercise.id))].concat(guide ? guide.aliases : []);
    let score = 0;
    names.forEach(name => {
      const phrase = normalizeCoachText(name);
      if (phrase && (' ' + intent + ' ').includes(' ' + phrase + ' ')) score = Math.max(score, phrase.split(' ').length * 10);
    });
    if (!score) {
      const tokens = normalizeCoachText(exercise.name).split(' ').filter(word => word.length > 3 && !['maquina', 'polea', 'barra', 'hombro'].includes(word));
      score = tokens.reduce((sum, word) => sum + (intent.split(' ').includes(word) ? 1 : 0), 0);
    }
    return { exercise, score };
  });
  const best = Math.max(0, ...scored.map(item => item.score));
  if (!best) return [];
  const matches = scored.filter(item => item.score === best).map(item => item.exercise);
  const local = matches.filter(exercise => exercise.routineId === state.activeId);
  return local.length ? local : matches;
}

function coachTopicMatches(intent) {
  return COACH_KNOWLEDGE.topics.filter(topic => topic.patterns.some(pattern => pattern.test(intent)));
}

function coachPerformance(text) {
  const normalized = String(text).toLowerCase().replace(/,/g, '.');
  const scheme = normalized.match(/\b(\d{1,2})\s*[x×]\s*(\d{1,3})\b/);
  const series = normalized.match(/\b(\d{1,2})\s*series?\b/);
  const reps = normalized.match(/\b(\d{1,3})\s*(?:reps?|repeticiones)\b/) || normalized.match(/series?\s*(?:de|a)\s*(\d{1,3})\b/);
  const load = normalized.match(/\b(\d{1,3}(?:\.\d{1,2})?)\s*(?:kg|kilos)\b/);
  const values = { load: load ? +load[1] : null, sets: series ? +series[1] : scheme ? +scheme[1] : null, reps: reps ? +reps[1] : scheme ? +scheme[2] : null };
  if (!(values.load >= 0 && values.load !== null && values.sets > 0 && values.sets <= 50 && values.reps > 0 && values.reps <= 200)) return null;
  return values;
}

function coachReportedEffort(exerciseId) {
  const text = normalizeCoachText(coachConversation.reports[exerciseId] || '');
  const numbers = { cero: 0, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
  const hits = [...text.matchAll(/\b(?:rir\s*(?:de\s*)?|me (?:quedan|quedaban|sobran|sobraban)\s*)(\d|cero|una|uno|dos|tres|cuatro|cinco)\b/g)];
  if (!hits.length) return /(?:al fallo|no (?:me quedaban|podia hacer) mas)/.test(text) ? 0 : null;
  const value = hits[hits.length - 1][1];
  return Object.hasOwn(numbers, value) ? numbers[value] : Number(value);
}

function showCoachCalculation(values, exercise) {
  coachConversation.awaiting = exercise ? 'effort' : '';
  const volume = values.load * values.sets * values.reps;
  coachRespond((exercise ? exercise.name + '\n' : '') + 'Con las cifras que has escrito: ' + kg(values.load) + ' × ' + values.sets + ' series × ' + values.reps + ' repeticiones = ' + kg(volume) + ' de tonelaje.\n'
    + 'He interpretado series × repeticiones; si querías decir otra cosa, corrígeme. Es una cuenta, no una medida de calidad, esfuerzo o calorías. No he guardado esas cifras como entrenamiento.\n'
    + 'Para valorar si conviene cambiar la referencia, dime si completaste el recorrido con control y cuántas repeticiones crees que te quedaban.', ['¿Qué es el RIR?', '¿Cómo registro el esfuerzo?']);
}

function coachReference(exercise) {
  if (!exercise) return '';
  const name = selectedExerciseName(exercise, draftOf(exercise.routineId, exercise.id));
  const rows = coachHistory(exercise.routineId, name, exercise.id, exercise.legacyName);
  return rows.length
    ? 'En tu registro, ' + name + ': ' + coachValues(rows[0].entry) + ' el ' + dateShort.format(new Date(rows[0].iso)) + '.'
    : 'Para ' + name + ' todavía no hay una referencia comparable en tu historial.';
}

function coachPersonalize(topic, exercise) {
  const parts = [];
  if (coachConversation.goal && ['rest', 'load', 'reps', 'frequency', 'order', 'muscle', 'strength', 'fatloss'].includes(topic.id)) {
    parts.push('Con tu objetivo de ' + coachConversation.goal + ', prioriza ' + (coachConversation.goal === 'ganar fuerza' ? 'repetir el movimiento y llegar con margen a las series importantes.' : 'un trabajo que puedas sostener y comparar a lo largo del tiempo.'));
  }
  if (exercise && ['load', 'reps', 'rest', 'effort', 'plateau', 'technique', 'warmup', 'logging'].includes(topic.id)) parts.push(coachReference(exercise));
  if (['technique', 'warmup'].includes(topic.id) && exercise) {
    const guide = COACH_KNOWLEDGE.exercises[exercise.id];
    parts.push(guide ? guide.cue : 'Es un ejercicio extra: dime qué movimiento y material utilizas para no asumir una técnica por su nombre.');
  }
  if (topic.id === 'protein') {
    if (coachConversation.weight) {
      const weight = coachConversation.weight;
      parts.push('Con los ' + kg(weight) + ' que me has indicado, ese intervalo general equivale a unos ' + nf0.format(weight * 1.4) + '–' + nf0.format(weight * 2) + ' g al día. Es una cuenta orientativa para un adulto sano, no una valoración de tus necesidades.');
    } else {
      parts.push('Si eres un adulto sano y quieres ver la cuenta orientativa, dime «peso 80 kg», usando tu peso real. No confundiré la carga de un ejercicio con tu peso corporal.');
    }
  }
  if (topic.id === 'frequency' && coachConversation.days) parts.push('Me has dicho ' + coachConversation.days + ' días por semana. Puedes recorrer A → B → C en ese orden y continuar el ciclo la semana siguiente; eso describe el ciclo existente, que no cubre piernas.');
  if (topic.id === 'order' && exercise) parts.push('Si ' + exercise.name + ' es tu prioridad, compara sus referencias en una posición parecida dentro de la sesión.');
  if (['load', 'effort'].includes(topic.id) && exercise) {
    const report = coachConversation.reports[exercise.id];
    if (report) parts.push('Además, me has contado: ' + report + '. Lo tengo como información del chat, sin añadirlo a tu historial.');
    const effort = coachReportedEffort(exercise.id);
    if (effort !== null) parts.push(effort <= 1
      ? 'Has descrito poco o ningún margen (RIR ' + effort + '). La propuesta de progresión no añadirá repeticiones por defecto con esa información; revisa si hoy debes reducir la exigencia.'
      : 'Has estimado RIR ' + effort + '. Eso sugiere margen según tu percepción, pero no confirma que debas subir kilos. Compara también técnica, recorrido y todas las series.');
    if (coachConversation.experience === 'principiante') parts.push('Como estás empezando, construye primero una referencia controlada; no necesitas buscar tu máximo.');
  }
  if (topic.id === 'rest') parts.push('Como punto de partida práctico, puedes cronometrar unos dos minutos y comprobar si recuperas el control para la siguiente serie. Amplía la pausa cuando lo necesites; ese tiempo no es una regla universal.');
  if (topic.id === 'recovery') {
    const latest = coachSessions()[0];
    if (latest) parts.push('Tu última sesión finalizada fue ' + relativeDay(latest.iso) + '; esa fecha por sí sola no determina si hoy conviene entrenar.');
  }
  if (topic.id === 'alternatives' && exercise && exercise.variants) parts.push('En ' + exercise.name + ' tienes estas variantes: ' + exercise.variants.join(', ') + '. Selecciónala en el registro; cada una conserva sus referencias.');
  if (topic.id === 'alternatives' && exercise && COACH_KNOWLEDGE.substitutions[exercise.id]) parts.push('Opciones para valorar: ' + COACH_KNOWLEDGE.substitutions[exercise.id] + '. Registra un ejercicio distinto como extra y empieza su propia referencia.');
  return parts.join('\n');
}

function showCoachKnowledge(topics, exercise) {
  const profileTopics = ['beginner', 'muscle', 'strength', 'fatloss'];
  const specific = topics.filter(topic => !profileTopics.includes(topic.id));
  if (specific.length) topics = specific;
  coachConversation.lastTopics = topics.map(topic => topic.id);
  const used = new Set();
  const blocks = topics.slice(0, 3).map(topic => {
    let body = topic.text;
    if (!coachConversation.detailed || coachConversation.concise) body = body.split(/(?<=\.)\s/).slice(0, coachConversation.concise ? 2 : 3).join(' ');
    const personalized = coachPersonalize(topic, exercise).split('\n').filter(line => {
      if (!line || used.has(line)) return false;
      used.add(line);
      return true;
    }).join('\n');
    return topic.title + (exercise && ['technique', 'warmup', 'load', 'reps', 'rest', 'effort'].includes(topic.id) ? ' · ' + selectedExerciseName(exercise, draftOf(exercise.routineId, exercise.id)) : '') + '\n' + body + (personalized ? '\n\n' + personalized : '');
  });
  const needsExercise = !exercise && topics.some(topic => ['technique', 'load', 'plateau'].includes(topic.id));
  if (needsExercise) blocks.push('¿De qué ejercicio hablamos? Puedes escribir su nombre, aunque esté en otro bloque.');
  if (topics.length > 3) blocks.push('He respondido a los tres primeros temas; pregunta por separado el que quieras ampliar.');
  coachRespond(blocks.join('\n\n'), exercise
    ? ['¿Cómo va este ejercicio?', '¿Qué carga uso?', '¿Cómo registro el esfuerzo?']
    : needsExercise ? ['Consultar ejercicios', 'Planificar sesión'] : ['¿Cómo voy esta semana?', 'Planificar sesión']);
}

function coachChooseExercise(exercise, question = '') {
  coachExerciseId = exercise.id;
  coachConversation.focus = { id: exercise.id, routineId: exercise.routineId || state.activeId };
  coachConversation.pending = null;
  const performance = coachPerformance(question);
  if (performance && /tonelaje|volumen|calcula|he hecho|he completado|hice/.test(normalizeCoachText(question))) {
    coachConversation.reports[exercise.id] = question;
    showCoachCalculation(performance, exercise);
    return;
  }
  const topics = coachTopicMatches(normalizeCoachText(question));
  if (topics.length) showCoachKnowledge(topics, Object.assign({}, exercise, { routineId: exercise.routineId || state.activeId }));
  else showCoachExercise(exercise, exercise.routineId || state.activeId);
}

function coachHasPain(intent) {
  // La negación solo afecta a su propia frase, no a otros síntomas del mensaje.
  const stripped = intent.replace(/\b(?:sin|no tengo|no siento|no hay) (?:dolor|molestias?|mareos?)\b/g, '')
    .replace(/\bno me duele\b/g, '').replace(/\b(?:evitar|prevenir) (?:lesiones|dolor)\b/g, '');
  return /\b(?:dolor|duele|duelen|lesion|lesionado|lesionada|mareo|mareado|pinchazo|molestia|molestias|desmayo)\b/.test(stripped);
}

function answerCoach(raw) {
  const text = String(raw || '').trim().slice(0, 800);
  if (!text) return;
  addCoachMessage(text, true);
  const intent = normalizeCoachText(text);
  if (coachHasPain(intent)) {
    invalidateCoachPlan();
    coachRespond('Si aparece dolor, mareo o un pinchazo durante el ejercicio, detén ese ejercicio. No puedo saber la causa ni proponerte una carga segura a partir del chat. Si persiste, consulta a un profesional sanitario; si el síntoma es intenso o repentino, busca atención urgente.\nPuedes dejar constancia en las notas del registro. He retirado la propuesta pendiente.', ['Revisar borrador']);
    return;
  }
  if (/\b(?:enfermedad|renal|embaraz|medicacion|diabetes|rehabilitacion|operacion)\b/.test(intent)) {
    invalidateCoachPlan();
    coachRespond('Ese contexto puede cambiar qué ejercicio o alimentación te conviene. Necesitas una pauta de quien conoce tu situación clínica; no voy a calcular una carga, dieta o rehabilitación desde tus registros. Puedo ayudarte a consultar lo que has anotado para revisarlo con ese profesional.', ['Última sesión', 'Revisar borrador']);
    return;
  }
  if (/^(?:olvida(?: lo que te he dicho)?|reinicia(?:r)? (?:el )?chat|nueva conversacion|borra (?:el )?chat)$/.test(intent)) { resetCoachChat(); return; }
  if (/mas (?:corto|breve)|resumelo/.test(intent)) { coachConversation.concise = true; coachConversation.detailed = false; }
  if (/mas (?:detalle|largo)|explicamelo mejor|amplia/.test(intent)) { coachConversation.concise = false; coachConversation.detailed = true; }
  const changes = updateCoachProfile(intent, text);
  const matches = findCoachExercises(intent);
  if (matches.length > 1) { coachExerciseChoices(matches, text); return; }
  if (matches.length === 1) {
    coachExerciseId = matches[0].id;
    coachConversation.focus = { id: matches[0].id, routineId: matches[0].routineId };
  }
  let focus = coachFocus();
  const shortEffort = /^(?:[0-5]|cero|una|uno|dos|tres|cuatro|cinco)(?: repeticiones)?$/.test(intent);
  if (focus && coachConversation.awaiting === 'effort' && shortEffort) {
    const report = 'Me quedan ' + intent + ' repeticiones';
    coachConversation.reports[focus.id] = ((coachConversation.reports[focus.id] || '') + ' ' + report).trim().slice(-1200);
    coachConversation.awaiting = '';
    showCoachKnowledge(COACH_KNOWLEDGE.topics.filter(topic => topic.id === 'effort'), focus);
    return;
  }
  if (!shortEffort) coachConversation.awaiting = '';
  if (focus && /\b(?:he hecho|he completado|hoy hice|me quedan|me quedaban|me sobran|me sobraban|rir)\b/.test(intent)) {
    coachConversation.reports[focus.id] = ((coachConversation.reports[focus.id] || '') + ' ' + text).trim().slice(-1200);
  }
  const topics = coachTopicMatches(intent);
  if (!matches.length && (topics.some(topic => topic.id === 'legs') || topics.some(topic => topic.id === 'technique') && !/\b(?:lo|este|ese|eso)\b/.test(intent))) {
    focus = null;
    coachConversation.focus = null;
    coachExerciseId = null;
  }
  if (changes.length) {
    addCoachMessage(changes.join('\n'));
    $('coachContext').textContent = coachContextLabel();
  }
  if (/^(?:ver|revisar|analizar) estancamientos$/.test(intent)) {
    showCoachPlateaus();
    addCoachFollowups(['¿Cómo reviso un estancamiento?', 'Consultar ejercicios']);
    return;
  }
  if (/\b(?:que toca|bloque actual|siguiente bloque)\b/.test(intent)) { coachWelcome(); return; }
  const performance = coachPerformance(text);
  if (performance && /\b(?:tonelaje|volumen|calcula|he hecho|he completado|hice)\b/.test(intent)) {
    showCoachCalculation(performance, focus);
    return;
  }
  // Preguntas específicas antes de órdenes genéricas que contengan «sesión».
  if (topics.length) {
    if (!focus && topics.some(topic => ['technique', 'load', 'plateau'].includes(topic.id))) coachConversation.pending = text;
    showCoachKnowledge(topics, focus);
    return;
  }
  if (/mas (?:corto|breve|detalle|largo)|resumelo|explicamelo mejor|amplia/.test(intent) && coachConversation.lastTopics.length) {
    showCoachKnowledge(COACH_KNOWLEDGE.topics.filter(topic => coachConversation.lastTopics.includes(topic.id)), focus);
    return;
  }
  if (/^(?:y )?(?:por que|por que eso|explicamelo)$/.test(intent)) {
    coachRespond('Las respuestas combinan una guía general incluida en la app y los datos que sí has registrado o contado. No deduzco tu técnica ni recuperación de los kilos. '
      + (focus ? coachReference(focus) : 'Cuando concretas un ejercicio puedo comprobar qué referencias comparables hay.')
      + '\nSi preguntas por una propuesta aplicada al borrador, puedo explicar cada regla.', ['¿Cómo funciona?', 'Consultar ejercicios']);
    return;
  }
  if (/\b(ultima sesion|ultimo entrenamiento|ultima vez|que hice)\b/.test(intent)) {
    showCoachLastSession(matches.length === 1 ? matches[0].routineId : state.activeId);
    return;
  }
  if (/\b(?:resumen|balance|tonelaje|volumen|esta semana|este mes)\b/.test(intent)) {
    showCoachSummary(/este mes/.test(intent) ? 'month' : /mes|mensual|30 dias/.test(intent) ? 30 : 7);
    return;
  }
  if (/\b(?:borrador|anotado|falta|faltan|revisar)\b/.test(intent)) { showCoachDraft(); return; }
  if (/\b(?:estancamientos|progresion|progreso|avance|mejoro)\b/.test(intent) && !focus) { showCoachPlateaus(); return; }
  if (/\b(?:calcula|calculado|criterio|criterios|como funciona)\b/.test(intent)) { explainCoachPlan(); return; }
  if (/\b(?:plan|planificar|prepara|preparar|propuesta|sesion corta|menos series|entreno|entrenar hoy)\b/.test(intent)) {
    showCoachPlan(/corta|menos|poco tiempo/.test(intent) || coachConversation.minutes && coachConversation.minutes <= 30 ? 'short' : $('coachMode').value);
    return;
  }
  if (/\b(?:toca|bloque|hoy|dia)\b/.test(intent) && !focus && !changes.length) { coachWelcome(); return; }
  if (focus && (matches.length || /\b(?:este|ese|carga|peso|repeticiones|progreso|como va|y la|y el)\b/.test(intent))) {
    showCoachExercise(focus, focus.routineId);
    addCoachFollowups(['¿Cómo lo hago?', '¿Qué carga uso?', '¿Cuánto descanso entre series?']);
    return;
  }
  if (/\b(?:ejercicio|ejercicios|comparar|comparacion|como voy)\b/.test(intent)) { coachExerciseChoices(coachCatalog(), coachConversation.pending || text); return; }
  if (changes.length) {
    coachRespond('Lo tendré presente mientras sigamos en este chat. ' + (!coachConversation.goal ? '¿Tu objetivo principal es ganar músculo, fuerza o perder grasa?' : '¿Qué ejercicio o duda quieres revisar con ese objetivo?'), ['¿Cuántas series hago?', 'Planificar sesión']);
  } else if (/^(?:hola|buenas|buenos dias|hey|gracias|vale|ok|si)$/.test(intent)) {
    coachRespond(/gracias/.test(intent) ? 'Cuando quieras seguimos. ¿Qué te gustaría revisar ahora?' : 'Hola, ' + currentUser.name + '. Puedo ayudarte con tus registros y dudas de gimnasio. ¿Qué quieres trabajar hoy?', ['Quiero ganar músculo', '¿Cómo voy esta semana?', 'Planificar sesión']);
  } else {
    coachRespond('No tengo una respuesta fiable para «' + text + '» con la guía disponible. Para concretar, dime el ejercicio y si quieres revisar técnica, carga, descansos o progreso. También puedo explicar alimentación, esfuerzo y cómo organizar el entrenamiento. Si falta información, prefiero pedirla a inventar una respuesta.', ['Consultar ejercicios', '¿Qué es el RIR?', '¿Cómo caliento?']);
  }
}

function resetCoachChat() {
  coachConversation = newCoachConversation();
  coachExerciseId = null;
  coachUndo = null;
  $('undoCoachPlan').hidden = true;
  invalidateCoachPlan();
  $('coachMode').value = 'repeat';
  $('coachApplyMode').value = 'fill';
  $('coachMessages').replaceChildren();
  coachWelcome();
  $('coachInput').value = '';
  $('coachInput').focus();
}

async function applyCoachPlan() {
  if (!coachPlan || coachPlan.userId !== currentUser.id || coachPlan.snapshot !== coachSnapshot()) {
    addCoachMessage('El registro ha cambiado. He actualizado la propuesta: revísala antes de aplicarla.');
    showCoachPlan();
    return;
  }
  const plan = coachPlan;
  const current = state.draft[state.activeId] || {};
  const replace = $('coachApplyMode').value === 'replace';
  const written = Object.values(current).some(row => row.load !== '' || row.sets !== '' || row.reps !== '');
  if (written && replace) {
    const ok = await confirmAction('Aplicar propuesta',
      'Se sustituirán las cifras del borrador del bloque ' + plan.routine.code + '. Las notas se conservan. Podrás deshacerlo desde el entrenador.',
      'Aplicar propuesta');
    if (!ok) { openCoach(); return; }
    if (plan.snapshot !== coachSnapshot()) { invalidateCoachPlan(); openCoach(); return; }
  }
  const before = JSON.stringify(current);
  const draft = JSON.parse(before);
  plan.rows.forEach(row => {
    const values = draft[row.id] || {};
    // Nunca mezclar cifras de variantes distintas, ni siquiera al completar huecos.
    if (!replace && values.variant && values.variant !== row.values.variant) return;
    ['load', 'sets', 'reps', 'variant'].forEach(key => {
      if (row.values[key] !== undefined && (replace || values[key] === '' || values[key] == null)) values[key] = row.values[key];
    });
    draft[row.id] = values;
  });
  state.draft[state.activeId] = draft;
  coachUndo = { userId: currentUser.id, routineId: state.activeId, before, after: JSON.stringify(draft) };
  $('undoCoachPlan').hidden = false;
  invalidateCoachPlan();
  saveNow();
  renderLog();
  $('coachDialog').close();
  toast('Propuesta aplicada · revisa las cargas antes de empezar');
}

function undoCoachPlan() {
  if (!coachUndo || coachUndo.userId !== currentUser.id || coachUndo.routineId !== state.activeId) return;
  if (JSON.stringify(state.draft[state.activeId]) !== coachUndo.after) {
    addCoachMessage('Has editado el borrador después de aplicar la propuesta. No lo deshago para conservar esas anotaciones.');
  } else {
    state.draft[state.activeId] = JSON.parse(coachUndo.before);
    saveNow();
    renderLog();
    invalidateCoachPlan();
    addCoachMessage('Propuesta deshecha. He recuperado tu borrador anterior.');
  }
  coachUndo = null;
  $('undoCoachPlan').hidden = true;
  $('coachInput').focus();
}

function applyRoutineAccent() {
  const routine = ROUTINE_BY_ID.get(state.activeId);
  if (routine) document.documentElement.dataset.routine = routine.id;
}

function renderStats() {
  const sessions = state.sessions;
  $('statSessions').textContent = nf0.format(sessions.length);

  const last = sessions[0];
  const statLast = $('statLast');
  if (last) {
    statLast.replaceChildren(
      document.createTextNode(relativeDay(last.iso)),
      el('span', { class: 'stat__note', text: last.code + ' · ' + last.name })
    );
  } else {
    statLast.textContent = 'Sin registrar';
  }

  $('historyCount').textContent = sessions.length === 0
    ? 'Sin sesiones'
    : nf0.format(sessions.length) + (sessions.length === 1 ? ' sesión cerrada' : ' sesiones cerradas');
}

/* --- Inicio personal --------------------------------------------------- */

function bestLoads() {
  const best = new Map();
  for (const session of state.sessions) {
    for (const entry of session.entries) {
      const load = num(entry.load);
      if (!(load > 0)) continue;
      const current = best.get(entry.name);
      if (!current || load > current.load) best.set(entry.name, { name: entry.name, load, iso: session.iso });
    }
  }
  return [...best.values()].sort((a, b) => b.load - a.load);
}

function currentStreak() {
  const keys = [...new Set(state.sessions.map(session => dateKey(new Date(session.iso))))].sort().reverse();
  if (!keys.length) return 0;
  let streak = 1;
  for (let index = 1; index < keys.length; index += 1) {
    const newer = new Date(keys[index - 1] + 'T12:00:00');
    const older = new Date(keys[index] + 'T12:00:00');
    const days = Math.round((newer - older) / 86400000);
    if (days > 7) break;
    streak += 1;
  }
  return streak;
}

function renderHome() {
  const routine = ROUTINE_BY_ID.get(state.nextId) || ROUTINE_BY_ID.get(state.activeId);
  const last = state.sessions[0];
  const recent = state.sessions.slice(0, 4);
  const best = bestLoads().slice(0, 4);

  $('homeEyebrow').textContent = state.sessions.length ? 'Tu próximo entrenamiento' : 'Tu punto de partida';
  $('homeTitle').textContent = 'Bloque ' + routine.code + ' · ' + routine.name;
  $('homeCode').textContent = routine.code;
  $('homeSub').textContent = last
    ? 'Última sesión ' + relativeDay(last.iso) + '. Tienes tus referencias listas para continuar.'
    : 'Tu rutina personal de tres bloques está preparada. Empieza cuando quieras.';

  const thisMonth = state.sessions.filter(session => {
    const when = new Date(session.iso);
    const now = new Date();
    return when.getMonth() === now.getMonth() && when.getFullYear() === now.getFullYear();
  }).length;
  const homeStat = (label, value, note) => el('div', { class: 'home-stat' },
    el('dt', { class: 'home-stat__label', text: label }),
    el('dd', { class: 'home-stat__value', text: value }),
    el('span', { class: 'home-stat__note', text: note })
  );
  $('homeStats').replaceChildren(
    homeStat('Sesiones', nf0.format(state.sessions.length), 'historial completo'),
    homeStat('Este mes', nf0.format(thisMonth), thisMonth === 1 ? 'entrenamiento' : 'entrenamientos'),
    homeStat('Ritmo', nf0.format(currentStreak()), 'sesiones sin pausas largas')
  );

  $('homeRecent').replaceChildren(recent.length
    ? el('ol', { class: 'home-list' }, recent.map(session => el('li', { class: 'home-list__item' },
        el('span', { class: 'home-list__code home-list__code--' + session.routineId, text: session.code }),
        el('span', { class: 'home-list__main' }, session.name,
          el('small', { text: dateShort.format(new Date(session.iso)) + ' · ' + session.entries.length + ' ejercicios' })),
        el('strong', { text: session.volume ? nf0.format(Math.round(session.volume)) + ' kg' : '—' })
      )))
    : el('div', { class: 'empty empty--compact' },
        el('p', { class: 'empty__title', text: 'Aún no hay referencias' }),
        el('p', { text: 'Tu primera sesión empezará a construir este resumen.' }))
  );

  $('homeBests').replaceChildren(best.length
    ? el('ol', { class: 'home-list' }, best.map((record, index) => el('li', { class: 'home-list__item' },
        el('span', { class: 'home-list__rank', text: pad2(index + 1) }),
        el('span', { class: 'home-list__main' }, record.name,
          el('small', { text: relativeDay(record.iso) })),
        el('strong', { text: kg(record.load) })
      )))
    : el('div', { class: 'empty empty--compact' },
        el('p', { class: 'empty__title', text: 'Tus marcas aparecerán aquí' }),
        el('p', { text: 'Se actualizan al cerrar cada entrenamiento.' }))
  );
  renderActivity();
}

let activityTimer = null;

function renderActivity() {
  const host = $('activityHeatmap');
  const byDay = new Map();
  state.sessions.forEach(session => {
    const key = dateKey(new Date(session.iso));
    byDay.set(key, (byDay.get(key) || 0) + (num(session.volume) || 1));
  });
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 111);
  const values = [...byDay.values()].filter(Boolean);
  const max = Math.max(...values, 1);
  const weekdays = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const cells = Array.from({ length: 7 }, (_, index) => el('span', {
    class: 'activity__day',
    text: weekdays[(start.getDay() + index) % 7],
    'aria-hidden': 'true'
  }));
  let trained = 0;
  for (let index = 0; index < 112; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const value = byDay.get(dateKey(day)) || 0;
    if (value) trained += 1;
    const level = value ? Math.max(1, Math.ceil((value / max) * 4)) : 0;
    cells.push(el('span', {
      class: 'activity__cell activity__cell--' + level,
      title: dayLong.format(day) + (value ? ' · ' + nf0.format(Math.round(value)) + ' kg' : ' · descanso'),
      'aria-hidden': 'true'
    }));
  }
  host.replaceChildren(...cells);
  host.setAttribute('aria-label', trained + (trained === 1 ? ' día entrenado' : ' días entrenados')
    + ' durante las últimas 16 semanas. Las filas siguen los días de la semana; la última corresponde a hoy, '
    + new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(end) + '.');
  $('activityTotal').textContent = trained + (trained === 1 ? ' día activo' : ' días activos');
  const midnight = new Date(end);
  midnight.setHours(24, 0, 0, 0);
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => { if (currentUser) renderActivity(); }, midnight.getTime() - Date.now());
}

/* --- Calendario -------------------------------------------------------- */

const monthLong = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const dayLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

function dateKey(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function sessionsByDay() {
  const days = new Map();
  for (const session of state.sessions) {
    const when = new Date(session.iso);
    if (Number.isNaN(when.getTime())) continue;
    const routine = ROUTINE_BY_ID.get(session.routineId)
      || SPLIT.find(item => item.code === session.code);
    if (!routine) continue;
    const key = dateKey(when);
    const records = days.get(key) || [];
    records.push({ routine, session });
    days.set(key, records);
  }
  return days;
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lunes es la primera columna
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = dateKey(new Date());
  const byDay = sessionsByDay();

  $('calendarMonth').textContent = monthLong.format(first);
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(el('li', { class: 'calendar__cell', 'aria-hidden': 'true' }));

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const records = byDay.get(key) || [];
    const routineIds = [...new Set(records.map(record => record.routine.id))];
    const labels = records.map(record => 'Bloque ' + record.routine.code + ': ' + record.routine.name);
    const classes = ['calendar__day'];
    if (key === today) classes.push('calendar__day--today');
    if (routineIds.length === 1) classes.push('calendar__day--' + routineIds[0]);
    if (routineIds.length > 1) classes.push('calendar__day--multiple');
    const description = labels.length ? ': ' + labels.join('; ') : ': sin entrenamiento registrado';
    const markers = routineIds.length > 1
      ? el('span', { class: 'calendar__markers', 'aria-hidden': 'true' },
          routineIds.map(id => el('span', { class: 'calendar__marker calendar__marker--' + id }))
        )
      : null;
    cells.push(el('li', { class: 'calendar__cell' },
      el('span', {
        class: classes.join(' '),
        'aria-current': key === today ? 'date' : null,
        'aria-label': dayLong.format(date) + description
      }, String(day), markers)
    ));
  }
  $('calendarGrid').replaceChildren(...cells);
}

/* --- Panel de sesión ---------------------------------------------------- */

function renderSessionHead() {
  const routine = ROUTINE_BY_ID.get(state.activeId);
  $('routineTag').textContent = 'Bloque ' + routine.code + ' · ' + routine.focus;
  $('routineTitle').textContent = routine.name;
  $('bibNumber').textContent = pad2(state.sessions.length + 1);

  const today = new Date();
  const time = $('todayDate');
  time.dateTime = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
  time.textContent = dateLong.format(today);

  const previous = state.sessions.find(s => s.routineId === routine.id);
  $('prevHint').textContent = previous
    ? ' · último bloque ' + routine.code + ' ' + relativeDay(previous.iso)
    : ' · primer bloque ' + routine.code;
}

function renderLog() {
  const routineId = state.activeId;
  const rows = exercisesOf(routineId).map((exercise, index) => {
    const values = draftOf(routineId, exercise.id);
    const tracksLoad = exercise.tracksLoad !== false;
    const setsOnly = exercise.tracksSetsOnly === true;
    const exerciseName = selectedExerciseName(exercise, values);
    const previous = lastRecordOf(exerciseName, exercise.id, exercise.legacyName);
    const plan = buildCoachPlan().rows.find(row => row.id === exercise.id);
    const inputId = suffix => 'f-' + routineId + '-' + exercise.id + '-' + suffix;

    const nameBlock = exercise.custom
      ? el('div', { class: 'ex__name' },
          el('input', {
            class: 'ex__nameinput', type: 'text', value: exercise.name,
            placeholder: 'Nombre del ejercicio', 'aria-label': 'Nombre del ejercicio',
            dataset: { field: 'name' }
          })
        )
      : el('div', { class: 'ex__name' },
          el('span', { class: 'ex__title', text: exercise.name }),
          exercise.equip ? el('span', { class: 'ex__equip', text: exercise.equip }) : null,
          exercise.variants ? el('label', { class: 'ex__variant' },
            el('span', { class: 'sr', text: exercise.variantLabel }),
            el('select', {
              'aria-label': exercise.variantLabel,
              dataset: { field: 'variant' }
            }, exercise.variants.map(variant => el('option', {
              value: variant,
              text: variant.replace(exercise.name + ' ', ''),
              selected: variant === exerciseName ? true : null
            })))
          ) : null,
          previous
            ? el('span', { class: 'ex__last' },
                'Última: ',
                el('b', { text: previousLabel(previous.record, tracksLoad, setsOnly) }),
                ' · ' + relativeDay(previous.iso))
            : el('span', { class: 'ex__last', text: 'Sin registro previo' }),
          plan ? el('span', { class: 'ex__target' },
            el('span', { text: 'Objetivo' }),
            el('b', { text: previousLabel(plan.values, tracksLoad, setsOnly) })
          ) : null
        );

    const loadField = tracksLoad
      ? el('p', { class: 'field field--unit' },
          el('label', { class: 'field__label', for: inputId('load'), text: 'Carga' }),
          el('span', { class: 'field__box' },
            el('input', {
              id: inputId('load'), class: 'input--decimal', type: 'text', inputmode: 'decimal',
              pattern: '[0-9]*[.,]?[0-9]*', autocomplete: 'off',
              value: values.load, placeholder: '—', dataset: { field: 'load' }
            }),
            el('span', { class: 'field__unit', text: 'kg', 'aria-hidden': 'true' })
          )
        )
      : el('p', { class: 'field' },
          el('span', { class: 'field__label', text: 'Carga' }),
          el('span', { class: 'ex__last', text: 'Peso corporal' })
        );

    return el('li', {
      class: 'ex' + (setsOnly ? ' ex--sets-only' : '') + (isRowDone(values, tracksLoad, setsOnly) ? ' ex--done' : ''),
      dataset: { ex: exercise.id }
    },
      el('span', { class: 'ex__num', text: pad2(index + 1), 'aria-hidden': 'true' }),
      nameBlock,
      el('div', { class: 'ex__fields' },
        setsOnly ? null : loadField,
        el('p', { class: 'field' },
          el('label', { class: 'field__label', for: inputId('sets'), text: 'Series' }),
          el('input', {
            id: inputId('sets'), type: 'number', inputmode: 'numeric', step: '1', min: '0',
            value: values.sets, placeholder: '—', dataset: { field: 'sets' }
          })
        ),
        setsOnly ? null : el('p', { class: 'field' },
          el('label', { class: 'field__label', for: inputId('reps'), text: 'Reps' }),
          el('input', {
            id: inputId('reps'), type: 'number', inputmode: 'numeric', step: '1', min: '0',
            value: values.reps, placeholder: '—', dataset: { field: 'reps' }
          })
        )
      ),
      el('p', { class: 'field ex__note' },
        el('label', { class: 'field__label', for: inputId('note'), text: setsOnly ? 'Notas' : 'Nota' }),
        el('input', {
          id: inputId('note'), type: 'text', value: values.note,
          placeholder: 'Sensaciones, ajustes…', dataset: { field: 'note' }
        })
      ),
      el('span', { class: 'ex__tools' },
        exercise.custom
          ? el('button', {
              class: 'iconbtn', type: 'button',
              dataset: { remove: exercise.id },
              title: 'Quitar del bloque'
            },
              el('span', { class: 'sr', text: 'Quitar ' + exercise.name }),
              iconTrash()
            )
          : null
      )
    );
  });

  $('logRows').replaceChildren(...rows);
}

function previousLabel(record, tracksLoad, setsOnly = false) {
  if (setsOnly && num(record.sets) > 0) return num(record.sets) + ' series';
  const parts = [];
  if (tracksLoad && num(record.load) > 0) parts.push(kg(num(record.load)));
  const sets = num(record.sets), reps = num(record.reps);
  if (sets > 0 && reps > 0) parts.push(sets + '×' + reps);
  else if (reps > 0) parts.push(reps + ' reps');
  return parts.join(' · ') || '—';
}

function isRowDone(values, tracksLoad, setsOnly = false) {
  const sets = num(values.sets), reps = num(values.reps);
  if (setsOnly) return sets > 0;
  if (!(sets > 0 && reps > 0)) return false;
  return tracksLoad ? num(values.load) > 0 : true;
}

function iconTrash() {
  return svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'aria-hidden': 'true', width: '16', height: '16' },
    svg('path', { d: 'M4 7h16M9.5 7V4.8h5V7M6.5 7l1 12.2h9l1-12.2M10.5 10.5v6M13.5 10.5v6' })
  );
}

/* --- Historial ---------------------------------------------------------- */

function historySessions(sessions, order) {
  const routine = ROUTINE_BY_ID.get(order);
  const visible = routine ? sessions.filter(session => session.routineId === routine.id) : sessions.slice();
  const direction = order === 'oldest' ? 1 : -1;
  return visible.sort((a, b) => direction * (new Date(a.iso) - new Date(b.iso)));
}

function renderHistory() {
  const host = $('historyList');
  const routine = ROUTINE_BY_ID.get(historyOrder);
  const sessions = historySessions(state.sessions, historyOrder);
  $('historyDescription').textContent = routine
    ? 'Bloque ' + routine.code + ' · ' + routine.name + ', de la más reciente a la más antigua.'
    : 'Todas las sesiones, de la ' + (historyOrder === 'oldest' ? 'más antigua a la más reciente.' : 'más reciente a la más antigua.');
  $('historyCount').textContent = routine
    ? nf0.format(sessions.length) + ' de ' + nf0.format(state.sessions.length) + ' sesiones'
    : state.sessions.length === 0 ? 'Sin sesiones' : nf0.format(state.sessions.length) + (state.sessions.length === 1 ? ' sesión' : ' sesiones');
  $('historySort').value = historyOrder;
  if (sessions.length === 0) {
    host.replaceChildren(el('div', { class: 'empty' },
      el('p', { class: 'empty__title', text: routine ? 'Todavía no hay sesiones del bloque ' + routine.code : 'Todavía no hay sesiones' }),
      el('p', { text: routine
        ? 'Elige otro bloque o una opción de fecha para ver el resto del historial.'
        : 'Rellena la sesión de hoy y ciérrala: quedará aquí con la carga, las series y el tonelaje de cada ejercicio.' })
    ));
    return;
  }

  const ledger = el('div', { class: 'ledger' }, sessions.map(session => {
    const when = new Date(session.iso);
    return el('article', { class: 'entry' },
      el('div', { class: 'entry__head' },
        el('span', { class: 'entry__code', text: session.code, 'aria-hidden': 'true' }),
        el('h3', { class: 'entry__name' },
          session.name,
          el('span', { class: 'entry__date', text: dateShort.format(when) + ' · ' + timeShort.format(when) })
        ),
        el('p', { class: 'entry__vol', text: session.volume ? nf0.format(Math.round(session.volume)) + ' kg' : '—' }),
        el('span', { class: 'entry__tools' },
          el('button', {
            class: 'iconbtn', type: 'button', dataset: { editSession: session.id },
            title: 'Editar sesión'
          },
            el('span', { class: 'sr', text: 'Editar la sesión del ' + dateShort.format(when) }),
            iconPencil()
          ),
          el('button', {
            class: 'iconbtn', type: 'button', dataset: { deleteSession: session.id },
            title: 'Eliminar sesión'
          },
            el('span', { class: 'sr', text: 'Eliminar la sesión del ' + dateShort.format(when) }),
            iconTrash()
          )
        )
      ),
      session.entries.length
        ? el('div', { class: 'entry__body' },
            el('div', { class: 'entry__list' }, session.entries.map(entry => el('div', { class: 'entry__item' },
              el('span', { class: 'entry__item-name' },
                entry.name,
                entry.note ? el('span', { class: 'entry__item-note', text: entry.note }) : null
              ),
              el('span', { class: 'entry__item-load', text: historyEntryLabel(session, entry) })
            )))
          )
        : null
    );
  }));

  host.replaceChildren(ledger);
}

/* --- Progresión: filtros, serie y fichas -------------------------------- */

/* Nombres que aparecen en el historial con carga registrada. */
function trackedNames() {
  const seen = new Map();
  for (const session of state.sessions) {
    for (const entry of session.entries) {
      if (num(entry.load) > 0) seen.set(entry.name, (seen.get(entry.name) || 0) + 1);
    }
  }
  return seen;
}

function renderExerciseFilter() {
  const select = $('exerciseFilter');
  const counts = trackedNames();
  const placed = new Set();
  const groups = SPLIT.map(routine => {
    const names = [];
    exercisesOf(routine.id).filter(ex => ex.tracksLoad !== false).forEach(exercise => {
      (exercise.variants || [exercise.name]).forEach(name => {
        if (!names.includes(name)) names.push(name);
      });
    });
    const options = names.map(name => {
        placed.add(name);
        const n = counts.get(name) || 0;
        return el('option', {
          value: name,
          text: name + (n ? ' (' + n + ')' : ' — sin datos'),
          disabled: n === 0 ? true : null
        });
      });
    return el('optgroup', { label: 'Bloque ' + routine.code + ' · ' + routine.name }, options);
  });

  const orphans = [...counts.keys()].filter(name => !placed.has(name));
  if (orphans.length) {
    groups.push(el('optgroup', { label: 'Fuera del ciclo actual' },
      orphans.map(name => el('option', { value: name, text: name + ' (' + counts.get(name) + ')' }))));
  }

  const withData = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (!withData.length) {
    select.replaceChildren(el('option', { text: 'Todavía sin ejercicios registrados' }));
    select.disabled = true;
    chartExercise = null;
    return;
  }

  select.replaceChildren(...groups);
  select.disabled = false;
  if (!chartExercise || !counts.has(chartExercise)) chartExercise = withData[0][0];
  select.value = chartExercise;
}

function seriesFor(name, limit) {
  const rows = [];
  for (const session of state.sessions) {
    const hit = session.entries.find(e => e.name === name && num(e.load) > 0);
    if (hit) {
      rows.push({
        iso: session.iso,
        value: num(hit.load),
        sets: num(hit.sets),
        reps: num(hit.reps),
        code: session.code
      });
    }
  }
  rows.reverse();
  return limit > 0 ? rows.slice(-limit) : rows;
}

function renderProgress() {
  renderExerciseFilter();
  const limit = Number($('rangeFilter').value) || 0;
  const name = chartExercise;
  const rows = name ? seriesFor(name, limit) : [];

  $('chartTitle').textContent = name || 'Carga máxima';
  $('chartSub').textContent = name
    ? 'Carga máxima por sesión, en kilogramos' + (limit ? ' · últimas ' + limit + ' sesiones con registro' : ' · historial completo')
    : 'Kilogramos por sesión';

  const toggle = $('toggleTable');
  toggle.hidden = rows.length === 0;
  if (!rows.length && tableVisible) {
    tableVisible = false;
    $('chartTable').hidden = true;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'Ver tabla';
  }

  drawChart(rows, name);
  renderChartTable(rows, name);
  renderTiles(rows, name);
  renderComparison();
}

function renderTiles(rows, name) {
  const host = $('progressTiles');
  if (!rows.length) { host.replaceChildren(); host.hidden = true; return; }
  host.hidden = false;

  const best = rows.reduce((a, b) => (b.value > a.value ? b : a), rows[0]);
  const last = rows[rows.length - 1];
  const first = rows[0];
  const delta = last.value - first.value;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const word = delta > 0 ? 'Subiendo' : delta < 0 ? 'Bajando' : 'Estable';
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '■';

  const tile = (label, value, unit, note) => el('div', { class: 'tile' },
    el('dt', { class: 'tile__label', text: label }),
    el('dd', {},
      el('span', { class: 'tile__value' }, value, unit ? el('small', { text: ' ' + unit }) : null),
      el('span', { class: 'tile__note', text: note })
    )
  );

  host.replaceChildren(
    tile('Mejor carga', nf1.format(best.value), 'kg', 'Bloque ' + best.code + ' · ' + dateShort.format(new Date(best.iso))),
    tile('Última', nf1.format(last.value), 'kg',
      (last.sets > 0 && last.reps > 0 ? last.sets + '×' + last.reps + ' · ' : '') + relativeDay(last.iso)),
    el('div', { class: 'tile' },
      el('dt', { class: 'tile__label', text: 'Variación' }),
      el('dd', {},
        el('span', { class: 'tile__value' },
          el('span', { class: 'delta delta--' + direction },
            el('span', { 'aria-hidden': 'true', text: arrow }),
            (delta > 0 ? '+' : '') + nf1.format(delta),
            el('small', { text: ' kg' })
          )
        ),
        el('span', { class: 'tile__note', text: word + ' · ' + rows.length + (rows.length === 1 ? ' registro' : ' registros') + ' de ' + name })
      )
    )
  );
}

function renderChartTable(rows, name) {
  const host = $('chartTable');
  if (!rows.length) { host.replaceChildren(); return; }
  host.replaceChildren(el('table', {},
    el('caption', { text: 'Carga máxima por sesión · ' + name }),
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col', text: 'Fecha' }),
      el('th', { scope: 'col', text: 'Bloque' }),
      el('th', { scope: 'col', text: 'Carga (kg)' }),
      el('th', { scope: 'col', text: 'Series × reps' })
    )),
    el('tbody', {}, rows.slice().reverse().map(row => el('tr', {},
      el('td', { text: dateShort.format(new Date(row.iso)) }),
      el('td', { text: row.code }),
      el('td', { text: nf1.format(row.value) }),
      el('td', { text: row.sets > 0 && row.reps > 0 ? row.sets + '×' + row.reps : '—' })
    )))
  ));
}

/* --- El gráfico: una serie, dibujada a mano en SVG ---------------------- */

const CHART = { height: 268, top: 26, right: 58, bottom: 34, left: 48 };
let chartRows = [];
let chartName = '';
let activeIndex = -1;

function niceScale(min, max, count) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0, 1], lo: 0, hi: 1 };
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; }
  const rough = (max - min) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalised = rough / magnitude;
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Number(v.toFixed(4)));
  return { ticks, lo, hi };
}

function drawChart(rows, name) {
  chartRows = rows;
  chartName = name || '';
  activeIndex = -1;
  paintChart();
}

function paintChart() {
  const host = $('chart');
  const rows = chartRows;

  if (!rows.length) {
    host.replaceChildren(el('div', { class: 'empty' },
      el('p', { class: 'empty__title', text: 'Sin cargas registradas' }),
      el('p', { text: 'La curva necesita al menos una sesión cerrada con carga en este ejercicio. Cierra la sesión de hoy y vuelve aquí.' })
    ));
    return;
  }

  const width = Math.max(320, host.clientWidth || 640);
  const height = CHART.height;
  const plotW = width - CHART.left - CHART.right;
  const plotH = height - CHART.top - CHART.bottom;

  const values = rows.map(r => r.value);
  const scale = niceScale(Math.min(...values), Math.max(...values), 4);
  const x = i => CHART.left + (rows.length === 1 ? plotW / 2 : (plotW * i) / (rows.length - 1));
  const y = v => CHART.top + plotH - ((v - scale.lo) / (scale.hi - scale.lo || 1)) * plotH;

  const frame = svg('svg', {
    viewBox: '0 0 ' + width + ' ' + height,
    width: width,
    height: height,
    role: 'img',
    tabindex: '0',
    'aria-label': chartSummary()
  });

  // Retícula y escala vertical
  for (const tick of scale.ticks) {
    frame.append(svg('line', { class: 'grid', x1: CHART.left, x2: width - CHART.right, y1: y(tick), y2: y(tick) }));
    frame.append(svg('text', {
      class: 'axis-label', x: CHART.left - 10, y: y(tick) + 4, 'text-anchor': 'end',
      text: nf1.format(tick)
    }));
  }

  // Escala horizontal: una etiqueta cada n sesiones, para que no se solapen
  const step = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor(plotW / 74))));
  rows.forEach((row, i) => {
    if (i % step !== 0 && i !== rows.length - 1) return;
    frame.append(svg('text', {
      class: 'axis-label', x: x(i), y: height - CHART.bottom + 20, 'text-anchor': 'middle',
      text: dateMid.format(new Date(row.iso)).replace('.', '')
    }));
  });

  // Relleno y línea
  if (rows.length > 1) {
    const line = rows.map((r, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(r.value)).join(' ');
    frame.append(svg('path', {
      class: 'area',
      d: line + ' L' + x(rows.length - 1) + ' ' + (CHART.top + plotH) + ' L' + x(0) + ' ' + (CHART.top + plotH) + ' Z'
    }));
    frame.append(svg('path', { class: 'line', d: line }));
  }

  rows.forEach((row, i) => {
    frame.append(svg('circle', { class: 'dot', cx: x(i), cy: y(row.value), r: 4 }));
  });

  // Etiquetas directas: el último valor y el máximo, si no coinciden
  const lastIndex = rows.length - 1;
  const maxIndex = values.indexOf(Math.max(...values));
  frame.append(svg('text', {
    class: 'value-label', x: x(lastIndex) + 10, y: y(rows[lastIndex].value) + 4, 'text-anchor': 'start',
    text: nf1.format(rows[lastIndex].value) + ' kg'
  }));
  // El máximo solo se rotula si aporta algo: ni repetido ni pegado al último.
  if (maxIndex !== lastIndex
      && values[maxIndex] !== values[lastIndex]
      && Math.abs(x(maxIndex) - x(lastIndex)) > 56) {
    frame.append(svg('text', {
      class: 'value-label', x: x(maxIndex), y: y(rows[maxIndex].value) - 12, 'text-anchor': 'middle',
      text: nf1.format(rows[maxIndex].value) + ' kg'
    }));
  }

  // Capa de interacción: la vertical busca la sesión más cercana
  const crosshair = svg('line', { class: 'crosshair', x1: 0, x2: 0, y1: CHART.top, y2: CHART.top + plotH, opacity: '0' });
  const marker = svg('circle', { class: 'dot dot--active', cx: 0, cy: 0, r: 6, opacity: '0' });
  frame.append(crosshair, marker);

  const hit = svg('rect', {
    class: 'hit', x: CHART.left - 12, y: CHART.top, width: plotW + 24, height: plotH, fill: 'transparent'
  });
  frame.append(hit);

  const tip = el('div', { class: 'chart__tip', hidden: true });
  host.replaceChildren(frame, tip);

  function show(index) {
    if (index < 0 || index >= rows.length) return;
    activeIndex = index;
    const row = rows[index];
    const px = x(index), py = y(row.value);
    crosshair.setAttribute('x1', px);
    crosshair.setAttribute('x2', px);
    crosshair.setAttribute('opacity', '1');
    marker.setAttribute('cx', px);
    marker.setAttribute('cy', py);
    marker.setAttribute('opacity', '1');

    tip.replaceChildren(
      el('p', { class: 'chart__tip-value' }, nf1.format(row.value), el('span', { text: ' kg' })),
      el('p', { class: 'chart__tip-date', text: dateShort.format(new Date(row.iso)) + (row.sets > 0 && row.reps > 0 ? ' · ' + row.sets + '×' + row.reps : '') }),
      el('p', { class: 'chart__tip-series' }, el('span', { class: 'chart__tip-key' }), chartName)
    );
    tip.hidden = false;
    const ratio = host.clientWidth / width;
    tip.style.left = Math.min(Math.max(px * ratio, 76), host.clientWidth - 76) + 'px';
    tip.style.top = (py * ratio - 14) + 'px';
  }

  function hide() {
    activeIndex = -1;
    crosshair.setAttribute('opacity', '0');
    marker.setAttribute('opacity', '0');
    tip.hidden = true;
  }

  function nearest(clientX) {
    const box = frame.getBoundingClientRect();
    const local = ((clientX - box.left) / box.width) * width;
    let best = 0, bestDistance = Infinity;
    rows.forEach((row, i) => {
      const distance = Math.abs(x(i) - local);
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    });
    return best;
  }

  hit.addEventListener('pointermove', event => show(nearest(event.clientX)));
  hit.addEventListener('pointerdown', event => show(nearest(event.clientX)));
  hit.addEventListener('pointerleave', hide);
  frame.addEventListener('blur', hide);
  frame.addEventListener('focus', () => show(activeIndex < 0 ? rows.length - 1 : activeIndex));
  frame.addEventListener('keydown', event => {
    const keys = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in keys) {
      event.preventDefault();
      show(Math.min(rows.length - 1, Math.max(0, (activeIndex < 0 ? rows.length - 1 : activeIndex) + keys[event.key])));
    } else if (event.key === 'Home') { event.preventDefault(); show(0); }
    else if (event.key === 'End') { event.preventDefault(); show(rows.length - 1); }
    else if (event.key === 'Escape') hide();
  });
}

function chartSummary() {
  if (!chartRows.length) return 'Sin datos';
  const values = chartRows.map(r => r.value);
  return 'Carga de ' + chartName + ' en ' + chartRows.length + ' sesiones: de '
    + kg(values[0]) + ' a ' + kg(values[values.length - 1])
    + ', máximo ' + kg(Math.max(...values)) + '. La tabla equivalente está bajo el botón «Ver tabla».';
}

/* --- Comparación de sesiones ------------------------------------------- */

const COMPARISON = { height: 268, top: 26, right: 24, bottom: 38, left: 48 };
let comparisonRows = [];
let comparisonSessions = [];

function comparisonSessionsFor(routineId) {
  return state.sessions.filter(session => session.routineId === routineId);
}

function comparisonSessionLabel(session) {
  return dateShort.format(new Date(session.iso)) + ' · ' + timeShort.format(new Date(session.iso));
}

function syncComparisonFilters() {
  const sessions = comparisonSessionsFor(comparisonRoutineId);
  const valid = new Set(sessions.map(session => session.id));
  comparisonSessionIds = comparisonSessionIds.map((id, index) => {
    if (valid.has(id)) return id;
    return comparisonNeedsDefaults && sessions[index] ? sessions[index].id : '';
  });
  comparisonNeedsDefaults = false;

  for (let index = 0; index < 3; index += 1) {
    const select = $('comparisonSession' + (index + 1));
    const options = [el('option', { value: '', text: sessions.length ? 'No comparar' : 'Sin sesiones en este bloque' })];
    sessions.forEach(session => options.push(el('option', {
      value: session.id,
      text: comparisonSessionLabel(session)
    })));
    select.replaceChildren(...options);
    select.value = comparisonSessionIds[index];
    select.disabled = sessions.length === 0;
  }
}

function comparisonData(sessions) {
  // Un ejercicio omitido no desplaza las cargas de los demás. Las variantes
  // y los dos huecos de remo conservan referencias independientes.
  const idsByName = new Map();
  sessions.forEach(session => session.entries.forEach(entry => {
    if (!entry.exerciseId) return;
    if (!idsByName.has(entry.name)) idsByName.set(entry.name, new Set());
    idsByName.get(entry.name).add(entry.exerciseId);
  }));
  const keyOf = (entry, session) => {
    const routine = ROUTINE_BY_ID.get(session.routineId);
    const exercise = routine && routine.exercises.find(item => item.name === entry.name
      || item.legacyName === entry.name || (item.variants || []).includes(entry.name));
    const ids = idsByName.get(entry.name);
    const id = entry.exerciseId || (exercise && exercise.id) || (ids && ids.size === 1 ? [...ids][0] : '');
    return JSON.stringify([id, entry.name]);
  };
  const references = new Map();
  const entriesBySession = sessions.map(session => {
    const entries = new Map();
    session.entries.forEach(entry => {
      const key = keyOf(entry, session);
      if (!references.has(key)) references.set(key, entry);
      entries.set(key, entry);
    });
    return entries;
  });
  return [...references].map(([key, reference]) => {
    return {
      name: reference.name,
      values: sessions.map((session, index) => {
        const entry = entriesBySession[index].get(key);
        if (!entry) return null;
        const load = num(entry.load);
        const reps = num(entry.reps);
        const setsOnly = isAbdominalEntry(session, entry) && num(entry.sets) > 0;
        return {
          value: setsOnly ? num(entry.sets) : (load > 0 ? load : reps),
          unit: setsOnly ? 'series' : (load > 0 ? 'kg' : 'reps'),
          load,
          sets: num(entry.sets),
          reps
        };
      })
    };
  });
}

function renderComparison() {
  if (!ROUTINE_BY_ID.has(comparisonRoutineId)) comparisonRoutineId = SPLIT[0].id;
  $('comparisonBlock').value = comparisonRoutineId;
  syncComparisonFilters();

  const byId = new Map(state.sessions.map(session => [session.id, session]));
  comparisonSessions = comparisonSessionIds.map(id => byId.get(id)).filter(Boolean);
  comparisonRows = comparisonData(comparisonSessions);
  const routine = ROUTINE_BY_ID.get(comparisonRoutineId);

  $('comparisonChartTitle').textContent = 'Comparación del bloque ' + routine.code;
  $('comparisonChartSub').textContent = comparisonSessions.length
    ? comparisonSessions.length + (comparisonSessions.length === 1 ? ' sesión elegida' : ' sesiones elegidas') + ' · peso por ejercicio'
    : 'Elige al menos una sesión para empezar a comparar.';

  renderComparisonLegend();
  paintComparisonChart();
  renderComparisonTable();
}

function renderComparisonLegend() {
  const host = $('comparisonLegend');
  host.dataset.routine = comparisonRoutineId;
  if (!comparisonSessions.length) { host.replaceChildren(); return; }
  host.replaceChildren(...comparisonSessions.map((session, index) => el('span', { class: 'comparison-legend__item' },
    el('i', { class: 'comparison-series comparison-series--' + (index + 1), 'aria-hidden': 'true' }),
    dateShort.format(new Date(session.iso))
  )));
}

function paintComparisonChart() {
  const host = $('comparisonChart');
  host.dataset.routine = comparisonRoutineId;
  const rows = comparisonRows;
  const loads = rows.flatMap(row => row.values.filter(item => item && item.load > 0).map(item => item.load));
  if (!comparisonSessions.length || !rows.length) {
    host.replaceChildren(el('div', { class: 'empty' },
      el('p', { class: 'empty__title', text: comparisonSessions.length ? 'Sin valores para comparar' : 'Sin sesiones elegidas' }),
      el('p', { text: comparisonSessions.length
        ? 'Las sesiones elegidas no tienen pesos registrados.'
        : 'Selecciona uno o más días en los desplegables superiores.' })
    ));
    return;
  }

  if (!loads.length) {
    host.replaceChildren(el('div', { class: 'empty' },
      el('p', { class: 'empty__title', text: 'Sin pesos para comparar' }),
      el('p', { text: 'Los ejercicios sin carga siguen disponibles en la tabla inferior.' })
    ));
    return;
  }

  const compact = (host.clientWidth || 720) < 520;
  const frameSize = compact
    ? { height: 210, top: 18, right: 10, bottom: 30, left: 36 }
    : COMPARISON;
  const width = Math.max(compact ? 280 : 560, host.clientWidth || 720);
  const height = frameSize.height;
  const plotW = width - frameSize.left - frameSize.right;
  const plotH = height - frameSize.top - frameSize.bottom;
  const scale = niceScale(Math.min(...loads), Math.max(...loads), 4);
  const x = index => frameSize.left + (rows.length === 1 ? plotW / 2 : (plotW * index) / (rows.length - 1));
  const y = value => frameSize.top + plotH - ((value - scale.lo) / (scale.hi - scale.lo || 1)) * plotH;

  const frame = svg('svg', {
    viewBox: '0 0 ' + width + ' ' + height,
    width,
    height,
    role: 'img',
    'aria-label': 'Comparación de pesos de ' + comparisonSessions.length + ' sesiones del bloque ' + ROUTINE_BY_ID.get(comparisonRoutineId).code + '. Cada punto representa un ejercicio en el orden de la sesión. La tabla equivalente aparece debajo.'
  });

  scale.ticks.forEach(tick => {
    frame.append(svg('line', { class: 'grid', x1: frameSize.left, x2: width - frameSize.right, y1: y(tick), y2: y(tick) }));
    frame.append(svg('text', { class: 'axis-label', x: frameSize.left - 7, y: y(tick) + 4, 'text-anchor': 'end', text: nf1.format(tick) }));
  });

  rows.forEach((row, index) => {
    frame.append(svg('text', {
      class: 'axis-label', x: x(index), y: height - frameSize.bottom + 18, 'text-anchor': 'middle',
      text: String(index + 1)
    }));
  });

  comparisonSessions.forEach((session, sessionIndex) => {
    const points = rows.map((row, rowIndex) => {
      const item = row.values[sessionIndex];
      return item && item.load > 0 ? { item, row, rowIndex } : null;
    }).filter(Boolean);
    if (points.length > 1) {
      frame.append(svg('path', {
        class: 'comparison-line comparison-line--' + (sessionIndex + 1),
        d: points.map((point, index) => (index ? 'L' : 'M') + x(point.rowIndex) + ' ' + y(point.item.load)).join(' ')
      }));
    }
    points.forEach(point => frame.append(svg('circle', {
      class: 'comparison-dot comparison-dot--' + (sessionIndex + 1),
      cx: x(point.rowIndex),
      cy: y(point.item.load),
      r: 4
    }, svg('title', { text: 'Ejercicio ' + (point.rowIndex + 1) + ' · ' + dateShort.format(new Date(session.iso)) + ': ' + nf1.format(point.item.load) + ' kg' }))));
  });
  host.replaceChildren(frame);
}

function comparisonCell(item) {
  if (!item) return '—';
  if (item.load > 0) {
    return nf1.format(item.load) + ' kg' + (item.sets > 0 && item.reps > 0 ? ' · ' + item.sets + '×' + item.reps : '');
  }
  return item.reps > 0 ? item.reps + ' reps' + (item.sets > 0 ? ' · ' + item.sets + ' series' : '')
    : (item.sets > 0 ? item.sets + ' series' : '—');
}

function renderComparisonTable() {
  const host = $('comparisonTable');
  if (!comparisonSessions.length || !comparisonRows.length) { host.replaceChildren(); return; }
  host.replaceChildren(el('table', {},
    el('caption', { text: 'Detalle de las sesiones comparadas' }),
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col', text: 'Ejercicio' }),
      comparisonSessions.map(session => el('th', { scope: 'col', text: dateShort.format(new Date(session.iso)) }))
    )),
    el('tbody', {}, comparisonRows.map(row => el('tr', {},
      el('th', { scope: 'row', text: row.name }),
      row.values.map(item => el('td', { text: comparisonCell(item) }))
    )))
  ));
}

/* --- Avisos y confirmaciones -------------------------------------------- */

let toastTimer = null;

function toast(message, highlight) {
  const node = $('toast');
  node.textContent = message;
  node.classList.toggle('toast--record', !!highlight);
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 2600);
}

function confirmAction(title, text, confirmLabel) {
  const dialog = $('confirmDialog');
  $('dialogField').hidden = true;
  $('dialogTitle').textContent = title;
  $('dialogText').textContent = text;
  $('dialogConfirm').textContent = confirmLabel;
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.returnValue = 'cancel';
    openModal(dialog);
    $('dialogConfirm').focus();
  });
}

/* Igual que confirmAction, pero con un campo de texto. Devuelve null si se cancela. */
function promptAction(title, text, confirmLabel, value) {
  const dialog = $('confirmDialog');
  const input = $('dialogInput');
  $('dialogTitle').textContent = title;
  $('dialogText').textContent = text;
  $('dialogConfirm').textContent = confirmLabel;
  $('dialogField').hidden = false;
  input.value = value || '';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => {
      $('dialogField').hidden = true;
      resolve(dialog.returnValue === 'ok' ? input.value : null);
    }, { once: true });
    dialog.returnValue = 'cancel';
    openModal(dialog);
    input.focus();
    input.select();
  });
}

/* --- Acciones ----------------------------------------------------------- */

function selectRoutine(routineId) {
  if (!ROUTINE_BY_ID.has(routineId) || routineId === state.activeId) return;
  state.activeId = routineId;
  save(true);
  applyRoutineAccent();
  renderSplit();
  renderSessionHead();
  renderLog();
}

function updateDraft(exerciseId, field, value) {
  const routineId = state.activeId;
  if (!state.draft[routineId]) state.draft[routineId] = {};
  const row = state.draft[routineId][exerciseId] || { load: '', sets: '', reps: '', note: '' };
  row[field] = value;
  state.draft[routineId][exerciseId] = row;
  save();
}

function renameExtra(exerciseId, value) {
  const list = state.extra[state.activeId] || [];
  const found = list.find(e => e.id === exerciseId);
  if (found) { found.name = value; save(); }
}

function addExtraExercise() {
  const routineId = state.activeId;
  if (!state.extra[routineId]) state.extra[routineId] = [];
  const id = 'x' + Date.now().toString(36);
  state.extra[routineId].push({ id, name: '' });
  save(true);
  renderLog();
  const input = $('logRows').querySelector('[data-ex="' + id + '"] .ex__nameinput');
  if (input) input.focus();
}

async function removeExtraExercise(exerciseId) {
  const list = state.extra[state.activeId] || [];
  const found = list.find(e => e.id === exerciseId);
  const label = found && found.name ? '«' + found.name + '»' : 'este ejercicio';
  const ok = await confirmAction('Quitar ejercicio',
    'Se quita ' + label + ' del bloque y se borra lo que hayas anotado hoy. Las sesiones ya cerradas no se tocan.',
    'Quitar');
  if (!ok) return;
  state.extra[state.activeId] = list.filter(e => e.id !== exerciseId);
  if (state.draft[state.activeId]) delete state.draft[state.activeId][exerciseId];
  save(true);
  renderLog();
  toast('Ejercicio quitado del bloque');
}

async function completeSession() {
  const routine = ROUTINE_BY_ID.get(state.activeId);
  const entries = [];

  for (const exercise of exercisesOf(routine.id)) {
    const values = draftOf(routine.id, exercise.id);
    const load = num(values.load), sets = num(values.sets), reps = num(values.reps);
    const name = (selectedExerciseName(exercise, values) || '').trim();
    const setsOnly = exercise.tracksSetsOnly === true;
    if (!name) continue;
    if (!(sets > 0 || values.note || (!setsOnly && (load > 0 || reps > 0)))) continue;
    entries.push({
      exerciseId: exercise.id,
      name,
      equip: exercise.equip || '',
      load: setsOnly ? '' : (load === '' ? '' : load),
      sets: sets === '' ? '' : sets,
      reps: setsOnly ? '' : (reps === '' ? '' : reps),
      note: String(values.note || '').trim()
    });
  }

  if (!entries.length) {
    toast('Anota al menos un ejercicio antes de cerrar');
    return;
  }

  const ok = await confirmAction('Terminar entrenamiento',
    'Se guardan ' + entries.length + (entries.length === 1 ? ' ejercicio' : ' ejercicios')
    + ' en el historial y el registro pasa al bloque siguiente.',
    'Terminar entrenamiento');
  if (!ok) return;

  const records = entries.filter(entry => {
    const load = num(entry.load);
    if (!(load > 0)) return false;
    const previousBest = Math.max(0, ...state.sessions.flatMap(session =>
      session.entries.filter(item => item.name === entry.name).map(item => num(item.load) || 0)));
    return load > previousBest;
  });
  const now = new Date();
  state.sessions.unshift({
    id: 's' + now.getTime().toString(36),
    iso: now.toISOString(),
    routineId: routine.id,
    code: routine.code,
    name: routine.name,
    entries,
    volume: volumeOf(entries)
  });

  delete state.draft[routine.id];
  const index = SPLIT.findIndex(r => r.id === routine.id);
  const next = SPLIT[(index + 1) % SPLIT.length];
  state.nextId = next.id;
  state.activeId = next.id;

  save(true);
  renderAll();
  if (records.length) {
    toast('Nueva mejor marca · ' + records.map(record => record.name + ' ' + kg(num(record.load))).join(' · '), true);
  } else {
    toast('Entrenamiento terminado · toca el bloque ' + next.code + ': ' + next.name);
  }
}

/* Rellena el bloque con lo que se hizo la última vez: en el gimnasio se parte
   de ahí y se ajusta, no de una hoja en blanco. */
async function repeatLast() {
  const routineId = state.activeId;
  const previous = state.sessions.find(s => s.routineId === routineId);
  if (!previous) {
    toast('Todavía no hay una sesión anterior de este bloque');
    return;
  }

  const current = state.draft[routineId] || {};
  const written = Object.values(current).some(row => row.load || row.sets || row.reps || row.note);
  if (written) {
    const ok = await confirmAction('Copiar la última sesión',
      'Se sustituye lo anotado hoy en este bloque por los valores del '
      + dateShort.format(new Date(previous.iso)) + '.',
      'Copiar');
    if (!ok) return;
  }

  const unused = previous.entries.slice();
  const draft = {};
  for (const exercise of exercisesOf(routineId)) {
    let hitIndex = unused.findIndex(entry => entry.exerciseId === exercise.id);
    if (hitIndex < 0 && exercise.variants) hitIndex = unused.findIndex(entry => exercise.variants.includes(entry.name));
    if (hitIndex < 0) hitIndex = unused.findIndex(entry => entry.name === exercise.name || entry.name === exercise.legacyName);
    const hit = hitIndex >= 0 ? unused.splice(hitIndex, 1)[0] : null;
    if (!hit) continue;
    draft[exercise.id] = {
      load: hit.load === '' ? '' : String(hit.load),
      sets: hit.sets === '' ? '' : String(hit.sets),
      reps: hit.reps === '' ? '' : String(hit.reps),
      note: '',    // las notas son de aquel día, no de hoy
      variant: exercise.variants && exercise.variants.includes(hit.name) ? hit.name : (exercise.defaultVariant || '')
    };
  }

  state.draft[routineId] = draft;
  saveNow();
  renderLog();
  toast('Copiada la sesión del ' + dateShort.format(new Date(previous.iso)));
}

async function clearDraft() {
  const routine = ROUTINE_BY_ID.get(state.activeId);
  const ok = await confirmAction('Vaciar el bloque ' + routine.code,
    'Se borra lo anotado hoy en «' + routine.name + '». El historial no cambia.',
    'Vaciar');
  if (!ok) return;
  delete state.draft[routine.id];
  save(true);
  renderLog();
  toast('Bloque vaciado');
}

async function deleteSession(id) {
  const session = state.sessions.find(s => s.id === id);
  if (!session) return;
  const ok = await confirmAction('Eliminar sesión',
    'Se elimina la sesión de ' + session.name + ' del ' + dateShort.format(new Date(session.iso)) + '. No se puede deshacer.',
    'Eliminar');
  if (!ok) return;
  state.sessions = state.sessions.filter(s => s.id !== id);
  save(true);
  renderAll();
  toast('Sesión eliminada');
}

function editNumberField(label, field, value) {
  return el('label', { class: 'field' },
    el('span', { class: 'field__label', text: label }),
    el('input', {
      type: 'number', inputmode: field === 'load' ? 'decimal' : 'numeric',
      step: field === 'load' ? '2.5' : '1', min: '0', value,
      dataset: { editField: field }
    })
  );
}

function editSession(id) {
  const session = state.sessions.find(item => item.id === id);
  if (!session) return;
  const dialog = $('editSessionDialog');
  dialog.dataset.sessionId = id;
  $('editSessionText').textContent = session.name + ' · ' + dateShort.format(new Date(session.iso));
  $('editSessionEntries').replaceChildren(...session.entries.map((entry, index) => {
    const setsOnly = isAbdominalEntry(session, entry);
    return el('fieldset', { class: 'edit-session__entry', dataset: { editEntry: String(index) } },
      el('legend', { class: 'edit-session__name', text: entry.name }),
      el('div', { class: 'edit-session__fields' },
        setsOnly ? null : editNumberField('Carga (kg)', 'load', entry.load),
        editNumberField('Series', 'sets', entry.sets),
        setsOnly ? null : editNumberField('Repeticiones', 'reps', entry.reps),
        el('label', { class: 'field edit-session__note' },
          el('span', { class: 'field__label', text: 'Nota' }),
          el('input', { type: 'text', value: entry.note || '', dataset: { editField: 'note' } })
        )
      )
    );
  }));
  openModal(dialog);
  const first = dialog.querySelector('input');
  if (first) first.focus();
}

function saveEditedSession(event) {
  event.preventDefault();
  const dialog = $('editSessionDialog');
  const session = state.sessions.find(item => item.id === dialog.dataset.sessionId);
  if (!session) { dialog.close(); return; }
  dialog.querySelectorAll('[data-edit-entry]').forEach(row => {
    const entry = session.entries[Number(row.dataset.editEntry)];
    if (!entry) return;
    row.querySelectorAll('[data-edit-field]').forEach(input => {
      const field = input.dataset.editField;
      entry[field] = field === 'note' ? input.value.trim() : num(input.value);
    });
    if (isAbdominalEntry(session, entry)) {
      entry.load = '';
    }
  });
  session.volume = volumeOf(session.entries);
  save(true);
  dialog.close();
  renderAll();
  toast('Sesión actualizada');
}

function exportData() {
  const payload = {
    app: 'registro-de-fuerza',
    version: store.version,
    exportedAt: new Date().toISOString(),
    store
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = el('a', {
    href: url,
    download: 'registro-fuerza-' + new Date().toISOString().slice(0, 10) + '.json'
  });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Copia descargada');
}

async function importData(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (e) {
    toast('El archivo no es una copia válida');
    return;
  }

  const incoming = payload && (payload.store || payload.state) ? (payload.store || payload.state) : payload;
  if (!incoming || typeof incoming !== 'object') {
    toast('El archivo no es una copia válida');
    return;
  }

  // Copia completa (todos los atletas)
  if (Array.isArray(incoming.users)) {
    if (!validStoreCopy(incoming)) { toast('El archivo no es una copia válida'); return; }
    const restored = Object.assign(emptyStore(), incoming, { logs: {} });
    restored.users.forEach(user => { restored.logs[user.id] = normaliseLog(incoming.logs[user.id]); });
    const ok = await confirmAction('Restaurar copia',
      'La copia trae ' + incoming.users.length + (incoming.users.length === 1 ? ' atleta' : ' atletas')
      + ' y sustituye todo lo guardado en este dispositivo.',
      'Restaurar');
    if (!ok) return;
    // Si Safari no permite escribir, el registro anterior sigue intacto.
    try { localStorage.setItem(STORE_KEY, JSON.stringify(restored)); }
    catch (e) { toast('No se pudo restaurar: almacenamiento no disponible'); return; }
    clearTimeout(saveTimer);
    saveTimer = null;
    store = restored;
    leaveUser();
    toast('Copia restaurada');
    return;
  }

  // Copia antigua: un único registro, que entra en el atleta abierto
  if (Array.isArray(incoming.sessions)) {
    if (!validLogCopy(incoming)) { toast('El archivo no es una copia válida'); return; }
    if (!currentUser) { toast('Abre un atleta antes de restaurar'); return; }
    const ok = await confirmAction('Restaurar copia',
      'La copia trae ' + incoming.sessions.length + (incoming.sessions.length === 1 ? ' sesión' : ' sesiones')
      + ' y sustituye el registro de ' + currentUser.name + '.',
      'Restaurar');
    if (!ok) return;
    const restored = normaliseLog(incoming);
    const restoredStore = Object.assign({}, store, { logs: Object.assign({}, store.logs, { [currentUser.id]: restored }) });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(restoredStore)); }
    catch (e) { toast('No se pudo restaurar: almacenamiento no disponible'); return; }
    clearTimeout(saveTimer);
    saveTimer = null;
    state = restored;
    store = restoredStore;
    chartExercise = null;
    comparisonSessionIds = ['', '', ''];
    comparisonNeedsDefaults = true;
    renderAll();
    toast('Copia restaurada');
    return;
  }

  toast('El archivo no contiene sesiones');
}

async function resetData() {
  const ok = await confirmAction('Borrar el registro',
    'Se borran las ' + state.sessions.length + ' sesiones de ' + currentUser.name
    + ' y lo anotado hoy. El resto de atletas no se toca. Descarga una copia antes si quieres conservarlo.',
    'Borrar');
  if (!ok) return;
  state = emptyLog();
  store.logs[currentUser.id] = state;
  chartExercise = null;
  comparisonSessionIds = ['', '', ''];
  comparisonNeedsDefaults = true;
  saveNow();
  renderAll();
  toast('Registro vacío');
}

/* --- Selector de atleta ------------------------------------------------- */

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function summaryOf(userId) {
  const log = store.logs[userId];
  if (!log || !log.sessions.length) return 'Sin sesiones todavía';
  const count = log.sessions.length;
  return count + (count === 1 ? ' sesión · ' : ' sesiones · ') + relativeDay(log.sessions[0].iso);
}

function renderProfiles() {
  const list = $('profileList');
  list.replaceChildren(...store.users.map(user => {
    const card = el('li', { class: 'profiles__item' },
      el('button', {
        class: 'profile' + (managing ? ' profile--managing' : ''),
        type: 'button',
        dataset: { user: user.id },
        disabled: managing ? true : null
      },
        el('span', { class: 'profile__mark', text: initials(user.name), 'aria-hidden': 'true' }),
        el('span', { class: 'profile__body' },
          el('span', { class: 'profile__name', text: user.name }),
          el('span', { class: 'profile__meta', text: summaryOf(user.id) })
        ),
        store.users.length > 1 && user.id === store.lastUserId && !managing
          ? el('span', { class: 'profile__flag', text: 'Último' })
          : null
      )
    );

    if (managing) {
      card.append(el('span', { class: 'profile__tools' },
        el('button', { class: 'btn btn--quiet btn--compact', type: 'button', dataset: { rename: user.id }, text: 'Renombrar' }),
        el('button', { class: 'btn btn--quiet btn--compact profile__delete', type: 'button', dataset: { removeUser: user.id }, text: 'Eliminar' })
      ));
    }
    return card;
  }));

  $('manageUsers').hidden = store.users.length === 0;
  $('manageUsers').setAttribute('aria-pressed', String(managing));
  $('manageUsers').textContent = managing ? 'Listo' : 'Gestionar';
}

function showGate() {
  managing = false;
  const empty = store.users.length === 0;
  $('gateTitle').textContent = empty ? 'Crea tu registro' : '¿Quién entrena?';
  $('gateSub').textContent = empty
    ? 'Escribe tu nombre para empezar. Después podrás añadir a quien quieras.'
    : 'Cada atleta lleva su propio registro en este dispositivo.';
  document.documentElement.dataset.view = 'gate';
  $('app').hidden = true;
  $('gate').hidden = false;
  renderProfiles();
  toggleNewUser(empty, !empty);
  if (!empty) {
    const first = $('profileList').querySelector('.profile');
    if (first) first.focus();
  }
}

function showApp() {
  document.documentElement.dataset.view = 'app';
  $('gate').hidden = true;
  $('app').hidden = false;
  $('athleteName').textContent = currentUser.name;
  renderAll();
  selectTab(tabFromHash(), false);
}

function toggleNewUser(open, focus) {
  const form = $('newUserForm');
  form.hidden = !open;
  $('addUser').hidden = open;
  // Sin nadie creado todavía no hay adónde volver.
  $('cancelNewUser').hidden = store.users.length === 0;
  $('newUserError').hidden = true;
  if (open) {
    $('newUserName').value = '';
    if (focus !== false) $('newUserName').focus();
  }
}

function submitNewUser(event) {
  event.preventDefault();
  const name = $('newUserName').value.trim().replace(/\s+/g, ' ');
  const error = $('newUserError');
  if (!name) {
    error.textContent = 'Escribe un nombre para el registro.';
    error.hidden = false;
    return;
  }
  if (store.users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
    error.textContent = 'Ya hay un atleta con ese nombre.';
    error.hidden = false;
    return;
  }
  const user = createUser(name);
  toggleNewUser(false);
  openUser(user.id);
  toast('Registro creado para ' + user.name);
}

async function renameUser(id) {
  const user = store.users.find(u => u.id === id);
  if (!user) return;
  const name = await promptAction('Renombrar atleta', 'El registro y el historial se mantienen.', 'Guardar', user.name);
  if (name === null) return;
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) { toast('El nombre no puede quedar vacío'); return; }
  user.name = clean;
  saveNow();
  renderProfiles();
  if (currentUser && currentUser.id === id) $('athleteName').textContent = clean;
  toast('Atleta renombrado');
}

async function removeUser(id) {
  const user = store.users.find(u => u.id === id);
  if (!user) return;
  const log = store.logs[id];
  const count = log ? log.sessions.length : 0;
  const ok = await confirmAction('Eliminar a ' + user.name,
    'Se borra su registro completo' + (count ? ', con sus ' + count + ' sesiones' : '') + '. No se puede deshacer.',
    'Eliminar');
  if (!ok) return;
  store.users = store.users.filter(u => u.id !== id);
  delete store.logs[id];
  if (store.lastUserId === id) store.lastUserId = '';
  saveNow();
  if (store.users.length === 0) managing = false;
  renderProfiles();
  if (store.users.length === 0) toggleNewUser(true);
  toast('Atleta eliminado');
}

/* --- Pestañas ----------------------------------------------------------- */

const TABS = ['inicio', 'registro', 'progreso', 'historial'];
const VIEWS = TABS.concat('calendario');

function tabFromHash() {
  const name = decodeURIComponent(location.hash.replace('#', ''));
  return VIEWS.includes(name) ? name : TABS[0];
}

function iconPencil() {
  return svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', width: '16', height: '16' },
    svg('path', { d: 'M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4' })
  );
}

function isAbdominalEntry(session, entry) {
  return session.routineId === 'c' && entry.name === 'Abdominales';
}

function historyEntryLabel(session, entry) {
  if (isAbdominalEntry(session, entry)) {
    const sets = num(entry.sets);
    if (sets > 0) return sets + ' series';
    const reps = num(entry.reps);
    return reps > 0 ? reps + ' reps' : '—';
  }
  return previousLabel(entry, num(entry.load) > 0);
}

function selectTab(name, focus) {
  if (!VIEWS.includes(name)) name = TABS[0];
  const calendarOpen = name === 'calendario';
  TABS.forEach(id => {
    const tab = $('tab-' + id);
    const panel = $(id);
    const selected = id === name;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panel.hidden = calendarOpen || !selected;
  });
  $('calendario').hidden = !calendarOpen;
  $('calendarToggle').setAttribute('aria-pressed', String(calendarOpen));
  $('calendarToggle').setAttribute('aria-label', calendarOpen ? 'Cerrar calendario' : 'Abrir calendario');
  if (focus) (calendarOpen ? $('calendario') : $('tab-' + name)).focus();
  if (name === 'progreso') renderProgress();
  if (calendarOpen) renderCalendar();

  // El accesorio de la app instalada abre directamente una sección.
  const target = name === TABS[0] ? location.pathname : '#' + name;
  if (location.hash !== (name === TABS[0] ? '' : '#' + name)) {
    history.replaceState(null, '', target);
  }
}

/* --- Aplicación instalable ---------------------------------------------- */

let installPrompt = null;

function setupInstall() {
  const button = $('installApp');

  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    button.hidden = true;
    if (choice.outcome !== 'accepted') toast('Puedes instalarla más tarde desde el menú del navegador');
  });

  addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
    toast('Instalada: ya la tienes junto al resto de aplicaciones');
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => { /* sin modo sin conexión */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('Nueva versión disponible. Recarga para aplicarla; tu borrador se conserva.');
  });
}

/* --- Tema --------------------------------------------------------------- */

function currentTheme() {
  const stamped = document.documentElement.dataset.theme;
  if (stamped) return stamped;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function syncThemeButton() {
  const button = $('themeToggle');
  const dark = currentTheme() === 'dark';
  button.setAttribute('aria-pressed', String(dark));
  button.querySelector('.sr').textContent = dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* sin persistencia */ }
  syncThemeButton();
  if (!$('progreso').hidden) {
    paintChart();
    paintComparisonChart();
  }
}

/* --- Arranque ----------------------------------------------------------- */

function renderAll() {
  applyRoutineAccent();
  renderSplit();
  renderSessionHead();
  renderLog();
  renderStats();
  renderHistory();
  renderCalendar();
  renderHome();
  if (!$('progreso').hidden) renderProgress();
}

function bindEvents() {
  // Selector de atleta
  $('profileList').addEventListener('click', event => {
    const open = event.target.closest('[data-user]');
    if (open) { openUser(open.dataset.user); return; }
    const rename = event.target.closest('[data-rename]');
    if (rename) { renameUser(rename.dataset.rename); return; }
    const remove = event.target.closest('[data-remove-user]');
    if (remove) removeUser(remove.dataset.removeUser);
  });
  $('addUser').addEventListener('click', () => toggleNewUser(true));
  $('cancelNewUser').addEventListener('click', () => {
    toggleNewUser(false);
    $('addUser').focus();
  });
  $('newUserForm').addEventListener('submit', submitNewUser);
  $('newUserName').addEventListener('keydown', event => {
    if (event.key === 'Enter') submitNewUser(event);
  });
  $('manageUsers').addEventListener('click', () => {
    managing = !managing;
    renderProfiles();
  });
  $('switchUser').addEventListener('click', leaveUser);
  $('startTraining').addEventListener('click', () => {
    selectRoutine(state.nextId);
    selectTab('registro', true);
  });

  $('coachToggle').addEventListener('click', openCoach);
  $('closeCoach').addEventListener('click', () => $('coachDialog').close());
  $('coachSuggestions').addEventListener('click', event => {
    const button = event.target.closest('[data-coach-prompt]');
    if (!button) return;
    const prompts = {
      plan: 'Planificar la sesión',
      plateau: 'Ver estancamientos',
      today: '¿Qué toca hoy?',
      summary: 'Resumen semanal',
      draft: 'Revisar borrador',
      exercises: 'Consultar ejercicios',
      last: 'Última sesión',
      technique: '¿Cómo hago este ejercicio?',
      rest: '¿Cuánto descanso entre series?',
      effort: '¿Qué es el RIR?'
    };
    answerCoach(prompts[button.dataset.coachPrompt]);
  });
  $('coachForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('coachInput');
    answerCoach(input.value);
    input.value = '';
    input.focus();
  });
  $('coachInput').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    $('coachForm').requestSubmit();
  });
  $('resetCoachChat').addEventListener('click', resetCoachChat);
  $('applyCoachPlan').addEventListener('click', applyCoachPlan);
  $('explainCoachPlan').addEventListener('click', explainCoachPlan);
  $('coachMode').addEventListener('change', () => showCoachPlan());
  $('undoCoachPlan').addEventListener('click', undoCoachPlan);
  $('coachMessages').addEventListener('click', event => {
    const followup = event.target.closest('[data-coach-followup]');
    if (followup) { answerCoach(followup.dataset.coachFollowup); $('coachInput').focus(); return; }
    const button = event.target.closest('[data-coach-exercise]');
    if (!button) return;
    const exercise = coachCatalog().find(item => item.id === button.dataset.coachExercise && item.routineId === button.dataset.coachRoutine);
    if (!exercise) return;
    addCoachMessage(button.textContent, true);
    coachChooseExercise(exercise, button.dataset.coachQuestion);
    $('coachInput').focus();
  });

  $('splitList').addEventListener('click', event => {
    const button = event.target.closest('[data-routine]');
    if (button) selectRoutine(button.dataset.routine);
  });

  const rows = $('logRows');
  rows.addEventListener('input', event => {
    const field = event.target.dataset.field;
    const row = event.target.closest('[data-ex]');
    if (!field || !row) return;
    if (field === 'name') renameExtra(row.dataset.ex, event.target.value);
    else {
      if (field === 'load') event.target.value = decimalText(event.target.value);
      updateDraft(row.dataset.ex, field, event.target.value);
    }
  });
  rows.addEventListener('change', event => {
    const row = event.target.closest('[data-ex]');
    if (!row || !event.target.dataset.field) return;
    if (event.target.dataset.field === 'variant') {
      updateDraft(row.dataset.ex, 'variant', event.target.value);
      renderLog();
      return;
    }
    const inputs = row.querySelectorAll('input[data-field], select[data-field]');
    const values = {};
    inputs.forEach(input => { values[input.dataset.field] = input.value; });
    const tracksLoad = !!row.querySelector('[data-field="load"]');
    row.classList.toggle('ex--done', isRowDone(values, tracksLoad, row.classList.contains('ex--sets-only')));
  });
  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (button) removeExtraExercise(button.dataset.remove);
  });

  $('addExercise').addEventListener('click', addExtraExercise);
  $('repeatLast').addEventListener('click', repeatLast);
  $('completeSession').addEventListener('click', completeSession);
  $('saveDraft').addEventListener('click', () => { save(); toast('Registro guardado'); });
  $('clearDraft').addEventListener('click', clearDraft);

  $('calendarToggle').addEventListener('click', () => {
    selectTab($('calendario').hidden ? 'calendario' : 'registro', true);
  });
  $('calendarPrevious').addEventListener('click', () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  $('calendarNext').addEventListener('click', () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  $('historySort').addEventListener('change', event => {
    historyOrder = event.target.value;
    renderHistory();
  });

  $('historyList').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-session]');
    if (edit) { editSession(edit.dataset.editSession); return; }
    const button = event.target.closest('[data-delete-session]');
    if (button) deleteSession(button.dataset.deleteSession);
  });

  $('exerciseFilter').addEventListener('change', event => {
    chartExercise = event.target.value;
    renderProgress();
  });
  $('rangeFilter').addEventListener('change', renderProgress);
  $('comparisonBlock').addEventListener('change', event => {
    comparisonRoutineId = event.target.value;
    comparisonSessionIds = ['', '', ''];
    comparisonNeedsDefaults = true;
    renderComparison();
  });
  for (let index = 0; index < 3; index += 1) {
    $('comparisonSession' + (index + 1)).addEventListener('change', event => {
      comparisonSessionIds[index] = event.target.value;
      renderComparison();
    });
  }
  $('toggleTable').addEventListener('click', event => {
    tableVisible = !tableVisible;
    $('chartTable').hidden = !tableVisible;
    $('chart').hidden = false;
    event.currentTarget.setAttribute('aria-pressed', String(tableVisible));
    event.currentTarget.textContent = tableVisible ? 'Ocultar tabla' : 'Ver tabla';
  });

  TABS.forEach(id => {
    const tab = $('tab-' + id);
    tab.addEventListener('click', () => selectTab(id));
    tab.addEventListener('keydown', event => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const index = (TABS.indexOf(id) + step + TABS.length) % TABS.length;
      selectTab(TABS[index], true);
    });
  });

  $('exportData').addEventListener('click', exportData);
  $('importData').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    if (file) importData(file);
    event.target.value = '';
  });
  $('resetData').addEventListener('click', resetData);

  $('confirmDialog').addEventListener('click', event => {
    const button = event.target.closest('[data-close]');
    if (button) $('confirmDialog').close(button.dataset.close);
  });
  $('dialogInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('confirmDialog').close('ok');
    }
  });
  $('editSessionForm').addEventListener('submit', saveEditedSession);
  $('cancelEditSession').addEventListener('click', () => $('editSessionDialog').close());
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close('cancel');
    });
  });

  addEventListener('hashchange', () => {
    if (currentUser) selectTab(tabFromHash());
  });

  $('themeToggle').addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  let resizeTimer = null;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!$('progreso').hidden) {
        paintChart();
        paintComparisonChart();
      }
    }, 120);
  });
  observer.observe($('chart'));
  observer.observe($('comparisonChart'));

  // Si el móvil se bloquea o se cierra la pestaña, no se pierde lo último.
  addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && saveTimer) saveNow();
    if (!document.hidden && currentUser) renderActivity();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (document.documentElement.dataset.theme) return;
    syncThemeButton();
    if (!$('progreso').hidden) {
      paintChart();
      paintComparisonChart();
    }
  });
}

function boot() {
  load();
  bindEvents();
  setupInstall();
  syncThemeButton();
  registerServiceWorker();

  let openId = null;
  try { openId = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* sin persistencia */ }
  const user = openId ? store.users.find(u => u.id === openId) : null;

  if (user) {
    currentUser = user;
    store.logs[user.id] = normaliseLog(store.logs[user.id]);
    state = store.logs[user.id];
    showApp();
  } else {
    showGate();
  }
}

boot();
