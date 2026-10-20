'use strict';

const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync(path.join(__dirname, '../sw.js'), 'utf8');

function worker(fetchImpl, cached = new Response('app guardada', { headers: { 'content-type': 'text/html' } }), cacheBlocked = false) {
  const handlers = {};
  const writes = [];
  const cache = {
    match: async key => key === '/index.html' ? cached && cached.clone() : undefined,
    put: async (key, response) => { writes.push([key, await response.text()]); }
  };
  const timers = new Map();
  let nextTimer = 0;
  const context = vm.createContext({
    URL, Request, Response, console,
    fetch: fetchImpl,
    caches: { open: async () => { if (cacheBlocked) throw new Error('Caché no disponible'); return cache; } },
    self: { location: { origin: 'https://prueba.local' }, addEventListener: (type, handler) => { handlers[type] = handler; } },
    setTimeout(callback, delay) { assert.equal(delay, 3500); timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(source, context);
  return {
    writes, timers, context,
    request(url = '/', mode = 'navigate') {
      let result;
      const work = [];
      handlers.fetch({
        request: { url: 'https://prueba.local' + url, mode, method: 'GET' },
        respondWith: promise => { result = promise; },
        waitUntil: promise => { work.push(promise); }
      });
      return { response: result, work };
    }
  };
}

(async () => {
  const html = () => new Response('app nueva', { headers: { 'content-type': 'text/html' } });
  const online = worker(async () => html());
  const request = online.request();
  assert.equal(await (await request.response).text(), 'app nueva');
  await Promise.all(request.work);
  assert.deepEqual(online.writes, [['/index.html', 'app nueva']]);
  assert.equal(online.timers.size, 0);
  const shell = vm.runInContext('SHELL', online.context);
  shell.forEach(file => assert.ok(existsSync(path.join(__dirname, '..', file === '/' ? 'index.html' : file)), file));
  assert.ok(shell.includes('/assets/icon-maskable-512.png'));

  for (const [url, type] of [['/assets/icon.svg', 'image/svg+xml'], ['/docs/entrenador.md', 'text/plain'], ['/', 'image/svg+xml']]) {
    const other = worker(async () => new Response('otro documento', { headers: { 'content-type': type } }));
    const navigation = other.request(url);
    await navigation.response;
    await Promise.all(navigation.work);
    assert.equal(other.writes.length, 0);
  }
  const offline = worker(async () => { throw new Error('Sin red'); });
  assert.equal(await (await offline.request('/cualquier-ruta').response).text(), 'app guardada');
  for (const status of [404, 503]) {
    const failed = worker(async () => new Response('error', { status }));
    assert.equal(await (await failed.request().response).text(), 'app guardada');
    assert.equal(failed.writes.length, 0);
  }
  const missing = worker(async () => { throw new Error('Sin red'); });
  assert.equal((await missing.request('/ausente.js', 'cors').response).type, 'error');
  const uncached = worker(async () => new Response('error', { status: 503 }), null);
  assert.equal((await uncached.request().response).status, 503);
  const unavailable = worker(async () => html(), null, true);
  assert.equal(await (await unavailable.request().response).text(), 'app nueva');

  let resolveNetwork;
  const slow = worker(() => new Promise(resolve => { resolveNetwork = resolve; }));
  const pending = slow.request();
  for (let turn = 0; turn < 10 && !slow.timers.size; turn++) await Promise.resolve();
  assert.equal(slow.timers.size, 1);
  [...slow.timers.values()][0]();
  assert.equal(await (await pending.response).text(), 'app guardada');
  resolveNetwork(html());
  await Promise.all(pending.work);
  assert.deepEqual(slow.writes, [['/index.html', 'app nueva']]);
  console.log('Offline: shell, navegación aislada, caída de red, HTTP 404/503 y espera limitada OK.');
})().catch(error => { console.error(error); process.exitCode = 1; });
