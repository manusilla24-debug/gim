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
      { id: 'b2', name: 'Remo 1' },
      { id: 'b3', name: 'Remo 2' },
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
      { id: 'c3', name: 'Extensión de hombro', equip: 'Polea' },
      { id: 'c4', name: 'Abdominales', tracksLoad: false }
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
let tableVisible = false;
let managing = false;       // el selector, en modo gestión
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let coachPlan = null;       // propuesta efímera; el historial sigue siendo la fuente
let coachUserId = null;

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
  if (!Array.isArray(clean.sessions)) clean.sessions = [];
  return clean;
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
function lastRecordOf(name) {
  for (const session of state.sessions) {
    const hit = session.entries.find(e => e.name === name && (num(e.load) > 0 || num(e.reps) > 0));
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

function coachHistory(routineId, exerciseName) {
  const rows = [];
  for (const session of state.sessions) {
    if (session.routineId !== routineId) continue;
    const entry = session.entries.find(item => item.name === exerciseName);
    if (entry) rows.push({ entry, iso: session.iso });
  }
  return rows;
}

function samePerformance(a, b) {
  return num(a.load) === num(b.load) && num(a.reps) === num(b.reps) && num(a.sets) === num(b.sets);
}

function buildCoachPlan() {
  const routine = ROUTINE_BY_ID.get(state.activeId);
  const rows = exercisesOf(routine.id).filter(exercise => (exercise.name || '').trim()).map(exercise => {
    const historyRows = coachHistory(routine.id, exercise.name);
    const latest = historyRows[0] && historyRows[0].entry;
    const plateau = historyRows.length >= 3
      && samePerformance(historyRows[0].entry, historyRows[1].entry)
      && samePerformance(historyRows[1].entry, historyRows[2].entry);
    const tracksLoad = exercise.tracksLoad !== false;

    if (!latest) {
      return {
        id: exercise.id,
        name: exercise.name,
        values: { load: '', sets: tracksLoad ? '3' : '', reps: '10', note: '' },
        plateau: false,
        reason: 'Sin historial: referencia inicial moderada; ajusta las repeticiones al ejercicio.'
      };
    }

    const load = num(latest.load);
    const sets = num(latest.sets);
    const reps = num(latest.reps);
    const values = {
      load: load === '' ? '' : String(load),
      sets: sets === '' ? '' : String(sets),
      reps: reps === '' ? '' : String(reps),
      note: ''
    };
    let reason = 'Mantener la última referencia.';

    if (!tracksLoad || load === '') {
      if (reps > 0) values.reps = String(reps + 1);
      reason = 'Progresión suave: una repetición más que la última vez.';
    } else if (reps >= 12 && !plateau) {
      values.load = String(Math.round((load + 2.5) * 2) / 2);
      values.reps = '8';
      reason = 'Completaste 12 o más repeticiones: pequeña subida de carga y vuelta a 8 repeticiones.';
    } else if (reps > 0) {
      values.reps = String(reps + 1);
      reason = plateau
        ? 'Posible estancamiento: mantén la carga e intenta solo una repetición más.'
        : 'Sobrecarga conservadora: misma carga y una repetición más.';
    }

    return { id: exercise.id, name: exercise.name, values, plateau, reason };
  });

  return { routine, rows };
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
  messages.scrollTop = messages.scrollHeight;
}

function coachWelcome() {
  const routine = ROUTINE_BY_ID.get(state.activeId);
  const previous = state.sessions.find(session => session.routineId === routine.id);
  const context = previous
    ? 'La última vez que hiciste este bloque fue ' + relativeDay(previous.iso) + '.'
    : 'Todavía no tienes una sesión anterior de este bloque.';
  addCoachMessage('Hoy está programado el bloque ' + routine.code + ': ' + routine.name + '.\n' + context
    + ' Puedo prepararte una propuesta o revisar posibles estancamientos.');
}

function openCoach() {
  const dialog = $('coachDialog');
  if (coachUserId !== currentUser.id) {
    $('coachMessages').replaceChildren();
    coachPlan = null;
    coachUserId = currentUser.id;
    coachWelcome();
  } else if (!$('coachMessages').children.length) {
    coachWelcome();
  }
  $('coachPlanActions').hidden = !coachPlan || coachPlan.routine.id !== state.activeId;
  dialog.showModal();
  $('coachInput').focus();
}

function showCoachPlan() {
  coachPlan = buildCoachPlan();
  const previous = state.sessions.find(session => session.routineId === coachPlan.routine.id);
  const intro = previous
    ? 'He usado tu última sesión del bloque ' + coachPlan.routine.code + ' y las anteriores comparables:'
    : 'Como aún no hay historial para este bloque, te dejo referencias iniciales editables:';
  addCoachMessage(intro + '\n' + coachPlan.rows.map(coachLine).join('\n'));
  $('coachPlanActions').hidden = false;
}

function showCoachPlateaus() {
  const plan = buildCoachPlan();
  const plateaus = plan.rows.filter(row => row.plateau);
  if (!plateaus.length) {
    addCoachMessage(state.sessions.length < 3
      ? 'Aún no hay tres registros iguales comparables para confirmar un estancamiento. Sigue registrando carga, series y repeticiones.'
      : 'No veo tres sesiones consecutivas idénticas en los ejercicios de este bloque. La progresión parece activa.');
    return;
  }
  addCoachMessage('He encontrado ' + plateaus.length + (plateaus.length === 1 ? ' posible estancamiento:' : ' posibles estancamientos:')
    + '\n' + plateaus.map(row => '• ' + row.name + ': las tres últimas referencias son iguales.').join('\n')
    + '\nNo hace falta cambiarlo todo: prueba primero una repetición más con la misma carga.');
}

function explainCoachPlan() {
  addCoachMessage('Uso reglas transparentes: comparo solo sesiones del bloque actual; con 8–11 repeticiones propongo una más, y al superar 12 propongo subir 2,5 kg y volver a 8. Tres registros idénticos señalan un posible estancamiento. Es una referencia, no una orden: adapta la carga a tu técnica y sensaciones.');
}

function answerCoach(raw) {
  const text = String(raw || '').trim();
  if (!text) return;
  addCoachMessage(text, true);
  const intent = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/plan|prepar|propon|sesion|entreno/.test(intent)) showCoachPlan();
  else if (/estanc|progres|mejor|avance/.test(intent)) showCoachPlateaus();
  else if (/toca|bloque|hoy|dia/.test(intent)) coachWelcome();
  else if (/como|calcula|por que|criterio/.test(intent)) explainCoachPlan();
  else addCoachMessage('Puedo ayudarte a “planificar la sesión”, “ver estancamientos”, decirte “qué toca hoy” o explicar “cómo lo calculo”. No envío tus datos ni consulto servicios externos.');
}

async function applyCoachPlan() {
  if (!coachPlan || coachPlan.routine.id !== state.activeId) {
    showCoachPlan();
    return;
  }
  const current = state.draft[state.activeId] || {};
  const written = Object.values(current).some(row => row.load || row.sets || row.reps || row.note);
  if (written) {
    const ok = await confirmAction('Aplicar propuesta',
      'Se sustituye lo que hayas anotado hoy en el bloque ' + coachPlan.routine.code + '. Después podrás editar cualquier valor.',
      'Aplicar propuesta');
    if (!ok) return;
  }
  const draft = {};
  coachPlan.rows.forEach(row => { draft[row.id] = Object.assign({}, row.values); });
  state.draft[state.activeId] = draft;
  saveNow();
  renderLog();
  $('coachDialog').close();
  toast('Propuesta aplicada · revisa las cargas antes de empezar');
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
    const previous = lastRecordOf(exercise.name);
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
          previous
            ? el('span', { class: 'ex__last' },
                'Última: ',
                el('b', { text: previousLabel(previous.record, tracksLoad) }),
                ' · ' + relativeDay(previous.iso))
            : el('span', { class: 'ex__last', text: 'Sin registro previo' })
        );

    const loadField = tracksLoad
      ? el('p', { class: 'field field--unit' },
          el('label', { class: 'field__label', for: inputId('load'), text: 'Carga' }),
          el('span', { class: 'field__box' },
            el('input', {
              id: inputId('load'), type: 'number', inputmode: 'decimal', step: '2.5', min: '0',
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
      class: 'ex' + (isRowDone(values, tracksLoad) ? ' ex--done' : ''),
      dataset: { ex: exercise.id }
    },
      el('span', { class: 'ex__num', text: pad2(index + 1), 'aria-hidden': 'true' }),
      nameBlock,
      el('div', { class: 'ex__fields' },
        loadField,
        el('p', { class: 'field' },
          el('label', { class: 'field__label', for: inputId('sets'), text: 'Series' }),
          el('input', {
            id: inputId('sets'), type: 'number', inputmode: 'numeric', step: '1', min: '0',
            value: values.sets, placeholder: '—', dataset: { field: 'sets' }
          })
        ),
        el('p', { class: 'field' },
          el('label', { class: 'field__label', for: inputId('reps'), text: 'Reps' }),
          el('input', {
            id: inputId('reps'), type: 'number', inputmode: 'numeric', step: '1', min: '0',
            value: values.reps, placeholder: '—', dataset: { field: 'reps' }
          })
        )
      ),
      el('p', { class: 'field ex__note' },
        el('label', { class: 'field__label', for: inputId('note'), text: 'Nota' }),
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

function previousLabel(record, tracksLoad) {
  const parts = [];
  if (tracksLoad && num(record.load) > 0) parts.push(kg(num(record.load)));
  const sets = num(record.sets), reps = num(record.reps);
  if (sets > 0 && reps > 0) parts.push(sets + '×' + reps);
  else if (reps > 0) parts.push(reps + ' reps');
  return parts.join(' · ') || '—';
}

function isRowDone(values, tracksLoad) {
  const sets = num(values.sets), reps = num(values.reps);
  if (!(sets > 0 && reps > 0)) return false;
  return tracksLoad ? num(values.load) > 0 : true;
}

function iconTrash() {
  return svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'aria-hidden': 'true', width: '16', height: '16' },
    svg('path', { d: 'M4 7h16M9.5 7V4.8h5V7M6.5 7l1 12.2h9l1-12.2M10.5 10.5v6M13.5 10.5v6' })
  );
}

/* --- Historial ---------------------------------------------------------- */

function renderHistory() {
  const host = $('historyList');
  if (state.sessions.length === 0) {
    host.replaceChildren(el('div', { class: 'empty' },
      el('p', { class: 'empty__title', text: 'Todavía no hay sesiones' }),
      el('p', { text: 'Rellena la sesión de hoy y ciérrala: quedará aquí con la carga, las series y el tonelaje de cada ejercicio.' })
    ));
    return;
  }

  const ledger = el('div', { class: 'ledger' }, state.sessions.map(session => {
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
    const options = exercisesOf(routine.id)
      .filter(ex => ex.tracksLoad !== false)
      .map(ex => {
        placed.add(ex.name);
        const n = counts.get(ex.name) || 0;
        return el('option', {
          value: ex.name,
          text: ex.name + (n ? ' (' + n + ')' : ' — sin datos'),
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

/* --- Avisos y confirmaciones -------------------------------------------- */

let toastTimer = null;

function toast(message) {
  const node = $('toast');
  node.textContent = message;
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
    dialog.showModal();
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
    dialog.showModal();
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
    const name = (exercise.name || '').trim();
    if (!name) continue;
    if (!(load > 0 || sets > 0 || reps > 0 || values.note)) continue;
    const repetitionsOnly = routine.id === 'c' && exercise.id === 'c4';
    entries.push({
      name,
      equip: exercise.equip || '',
      load: repetitionsOnly ? '' : (load === '' ? '' : load),
      sets: repetitionsOnly ? '' : (sets === '' ? '' : sets),
      reps: reps === '' ? '' : reps,
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
  toast('Entrenamiento terminado · toca el bloque ' + next.code + ': ' + next.name);
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

  const byName = new Map(previous.entries.map(entry => [entry.name, entry]));
  const draft = {};
  for (const exercise of exercisesOf(routineId)) {
    const hit = byName.get(exercise.name);
    if (!hit) continue;
    draft[exercise.id] = {
      load: hit.load === '' ? '' : String(hit.load),
      sets: hit.sets === '' ? '' : String(hit.sets),
      reps: hit.reps === '' ? '' : String(hit.reps),
      note: ''    // las notas son de aquel día, no de hoy
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
    const repetitionsOnly = isAbdominalEntry(session, entry);
    return el('fieldset', { class: 'edit-session__entry', dataset: { editEntry: String(index) } },
      el('legend', { class: 'edit-session__name', text: entry.name }),
      el('div', { class: 'edit-session__fields' },
        repetitionsOnly ? null : editNumberField('Carga (kg)', 'load', entry.load),
        repetitionsOnly ? null : editNumberField('Series', 'sets', entry.sets),
        editNumberField('Repeticiones', 'reps', entry.reps),
        el('label', { class: 'field edit-session__note' },
          el('span', { class: 'field__label', text: 'Nota' }),
          el('input', { type: 'text', value: entry.note || '', dataset: { editField: 'note' } })
        )
      )
    );
  }));
  dialog.showModal();
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
      entry.sets = '';
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
    const ok = await confirmAction('Restaurar copia',
      'La copia trae ' + incoming.users.length + (incoming.users.length === 1 ? ' atleta' : ' atletas')
      + ' y sustituye todo lo guardado en este dispositivo.',
      'Restaurar');
    if (!ok) return;
    store = Object.assign(emptyStore(), incoming);
    store.users.forEach(user => { store.logs[user.id] = normaliseLog(store.logs[user.id]); });
    saveNow();
    leaveUser();
    toast('Copia restaurada');
    return;
  }

  // Copia antigua: un único registro, que entra en el atleta abierto
  if (Array.isArray(incoming.sessions)) {
    if (!currentUser) { toast('Abre un atleta antes de restaurar'); return; }
    const ok = await confirmAction('Restaurar copia',
      'La copia trae ' + incoming.sessions.length + (incoming.sessions.length === 1 ? ' sesión' : ' sesiones')
      + ' y sustituye el registro de ' + currentUser.name + '.',
      'Restaurar');
    if (!ok) return;
    state = normaliseLog(incoming);
    store.logs[currentUser.id] = state;
    chartExercise = null;
    saveNow();
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

const TABS = ['registro', 'progreso', 'historial'];
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
  navigator.serviceWorker.register('/sw.js').catch(() => { /* sin modo sin conexión */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('Actualizada a la última versión');
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
  if (!$('progreso').hidden) paintChart();
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

  $('coachToggle').addEventListener('click', openCoach);
  $('closeCoach').addEventListener('click', () => $('coachDialog').close());
  $('coachSuggestions').addEventListener('click', event => {
    const button = event.target.closest('[data-coach-prompt]');
    if (!button) return;
    const prompts = {
      plan: 'Planificar la sesión',
      plateau: 'Ver estancamientos',
      today: '¿Qué toca hoy?'
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
  $('applyCoachPlan').addEventListener('click', applyCoachPlan);
  $('explainCoachPlan').addEventListener('click', explainCoachPlan);

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
    else updateDraft(row.dataset.ex, field, event.target.value);
  });
  rows.addEventListener('change', event => {
    const row = event.target.closest('[data-ex]');
    if (!row || !event.target.dataset.field) return;
    const inputs = row.querySelectorAll('input[data-field]');
    const values = {};
    inputs.forEach(input => { values[input.dataset.field] = input.value; });
    const tracksLoad = !!row.querySelector('[data-field="load"]');
    row.classList.toggle('ex--done', isRowDone(values, tracksLoad));
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

  addEventListener('hashchange', () => {
    if (currentUser) selectTab(tabFromHash());
  });

  $('themeToggle').addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  let resizeTimer = null;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!$('progreso').hidden) paintChart(); }, 120);
  });
  observer.observe($('chart'));

  // Si el móvil se bloquea o se cierra la pestaña, no se pierde lo último.
  addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && saveTimer) saveNow();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (document.documentElement.dataset.theme) return;
    syncThemeButton();
    if (!$('progreso').hidden) paintChart();
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
