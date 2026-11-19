import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import initSqlJs from 'sql.js';
import worker from '../counter/worker.js';
import { visitCounter } from '../src/lib/visits.js';

const endpoint = 'https://counter.example/visits';
const siteOrigin = 'https://docxed.github.io';

test('counter stores an aggregate, and reading or rejecting requests does not add visits', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  try {
    const schema = readFileSync(new URL('../counter/schema.sql', import.meta.url), 'utf8');
    db.run(schema);
    const env = {
      SITE_ORIGIN: siteOrigin,
      DB: { prepare: sql => ({ first: () => ({ total: db.exec(sql)[0].values[0][0] }) }) }
    };
    const call = (method, origin = siteOrigin, path = endpoint, body) =>
      worker.fetch(new Request(path, { method, headers: { Origin: origin }, body }), env);
    assert.equal((await call('POST', 'https://another.example')).status, 403);
    assert.equal((await call('POST', siteOrigin, endpoint + '?game=test')).status, 404);
    assert.equal((await call('POST', siteOrigin, endpoint, 'unexpected payload')).status, 400);
    assert.equal((await call('DELETE')).status, 405);
    assert.deepEqual(await (await call('GET')).json(), { total: 0 });
    const result = await call('POST');
    assert.equal(result.headers.get('Access-Control-Allow-Origin'), siteOrigin);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await result.json(), { total: 1 });
    const visits = await Promise.all([call('POST'), call('POST')]);
    assert.deepEqual(await Promise.all(visits.map(response => response.json())), [{ total: 2 }, { total: 3 }]);
    db.run(schema);
    assert.deepEqual(await (await call('GET')).json(), { total: 3 });
  } finally {
    db.close();
  }
});

test('browser counts once per session and sends an empty, credential-free request', async () => {
  const methods = [];
  const request = async (url, options) => {
    assert.equal(url, endpoint);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.body, undefined);
    methods.push(options.method);
    return Response.json({ total: 7 });
  };
  const storage = new Map();
  const getStorage = () => ({ getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) });
  const first = visitCounter(endpoint, request, getStorage);
  await Promise.all([first.record(), first.record()]);
  await visitCounter(endpoint, request, getStorage).record();
  assert.equal(await first.total(), 7);
  assert.deepEqual(methods, ['POST', 'GET']);

  const disabled = visitCounter(undefined, request, getStorage);
  await disabled.record();
  assert.equal(await disabled.total(), null);
  await visitCounter(endpoint, request, () => { throw new Error('Storage blocked'); }).record();
  assert.deepEqual(methods, ['POST', 'GET']);

  const invalid = visitCounter(endpoint, async () => Response.json({ total: '7' }), getStorage);
  await assert.rejects(invalid.total(), /Invalid visit total/);
});
