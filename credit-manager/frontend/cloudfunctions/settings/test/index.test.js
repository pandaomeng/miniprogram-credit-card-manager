const test = require('node:test');
const assert = require('node:assert/strict');

const mod = require('../index.js');

function makeDb({ existed = null, updated = 1 } = {}) {
  let added = null;
  let updatedData = null;
  return {
    get added() { return added; },
    get updatedData() { return updatedData; },
    serverDate: () => 'NOW',
    collection() {
      return {
        where() {
          return {
            limit() { return this; },
            async get() {
              return { data: existed ? [existed] : [] };
            },
          };
        },
        async add({ data }) {
          added = data;
          return { _id: 's1' };
        },
        doc() {
          return {
            async update({ data }) {
              updatedData = data;
              return { stats: { updated } };
            },
          };
        },
      };
    },
  };
}

test('get returns default when none', async () => {
  const db = makeDb({ existed: null });
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db });
  const r = await mod.main({ action: 'get' });
  assert.deepEqual(r, { ok: true, data: { hideRepaid: false, viewYm: '' } });
  mod.__test.__resetRuntime();
});

test('set creates new settings and normalizes viewYm', async () => {
  const db = makeDb({ existed: null });
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db });
  const r = await mod.main({ action: 'set', payload: { hideRepaid: 1, viewYm: 'bad' } });
  assert.equal(r.ok, true);
  assert.equal(db.added.hideRepaid, true);
  assert.equal(db.added.viewYm, '');
  mod.__test.__resetRuntime();
});

test('set updates existing settings', async () => {
  const db = makeDb({ existed: { _id: 's1' }, updated: 1 });
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db });
  const r = await mod.main({ action: 'set', payload: { viewYm: '2026-03' } });
  assert.equal(r.ok, true);
  assert.equal(db.updatedData.viewYm, '2026-03');
  mod.__test.__resetRuntime();
});

test('unknown action', async () => {
  const db = makeDb();
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db });
  const r = await mod.main({ action: 'x' });
  assert.deepEqual(r, { ok: false, error: 'unknown_action' });
  mod.__test.__resetRuntime();
});
