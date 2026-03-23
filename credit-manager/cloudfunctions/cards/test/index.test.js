const test = require('node:test');
const assert = require('node:assert/strict');

const mod = require('../index.js');

function makeDbForList({ mine = [], legacy = [], all = [] } = {}) {
  return {
    serverDate: () => 'NOW',
    collection() {
      return {
        where(query) {
          return {
            async get() {
              if (Object.prototype.hasOwnProperty.call(query, '_openid')) {
                if (query._openid === 'u1') return { data: mine };
                if (query._openid === null) return { data: legacy };
              }
              return { data: [] };
            },
            limit() { return this; },
            async update() { return { stats: { updated: 1 } }; },
            async remove() { return { stats: { removed: 1 } }; },
          };
        },
        async get() { return { data: all }; },
        async add({ data }) { return { _id: 'new-id', data }; },
      };
    },
  };
}

test('cleanPatch keeps/normalizes allowed fields', () => {
  const out = mod.__test.cleanPatch({
    bank_code: 'CMB',
    last4: '12a3b4',
    custom_bank_name: '  自定义银行名称很长很长很长很长  ',
    cardholder_name: '  张三  ',
    bill_day: '8',
    due_day: '20',
    repaid_months: { '2026-03': true, bad: true, '2026-99': true },
    ignored: 1,
  });
  assert.equal(out.last4, '1234');
  assert.equal(out.bill_day, 8);
  assert.equal(out.due_day, 20);
  assert.equal(out.custom_bank_name.length <= 20, true);
  assert.deepEqual(out.repaid_months, { '2026-03': true });
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'ignored'), false);
});

test('listCards returns mine first', async () => {
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db: makeDbForList({ mine: [{ _id: 'a' }], legacy: [{ _id: 'b' }], all: [{ _id: 'c' }] }) });
  const res = await mod.main({ action: 'list' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, [{ _id: 'a' }]);
  mod.__test.__resetRuntime();
});

test('listCards falls back to legacy then all', async () => {
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db: makeDbForList({ mine: [], legacy: [{ _id: 'legacy' }], all: [{ _id: 'all' }] }) });
  let res = await mod.main({ action: 'list' });
  assert.deepEqual(res.data, [{ _id: 'legacy' }]);

  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db: makeDbForList({ mine: [], legacy: [], all: [{ _id: 'all' }] }) });
  res = await mod.main({ action: 'list' });
  assert.deepEqual(res.data, [{ _id: 'all' }]);
  mod.__test.__resetRuntime();
});

test('create action validates required fields', async () => {
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db: makeDbForList() });
  const res = await mod.main({ action: 'create', payload: { bank_code: 'CMB' } });
  assert.equal(res.ok, false);
  assert.match(res.error, /missing:/);
  mod.__test.__resetRuntime();
});

test('create action writes open_id/owner_openid', async () => {
  let created = null;
  const db = {
    serverDate: () => 'NOW',
    collection() {
      return {
        async add({ data }) {
          created = data;
          return { _id: 'id-1' };
        },
        where() {
          return {
            limit() { return this; },
            async get() { return { data: [] }; },
            async update() { return { stats: { updated: 1 } }; },
            async remove() { return { stats: { removed: 1 } }; },
          };
        },
        async get() { return { data: [] }; },
      };
    },
  };
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db });
  const res = await mod.main({ action: 'create', payload: { bank_code: 'CMB', last4: '1234', bill_day: 5, due_day: 23 } });
  assert.equal(res.ok, true);
  assert.equal(created.open_id, 'u1');
  assert.equal(created.owner_openid, 'u1');
  mod.__test.__resetRuntime();
});

test('update/delete and unknown action', async () => {
  const db = {
    serverDate: () => 'NOW',
    collection() {
      return {
        where() {
          return {
            async update() { return { stats: { updated: 0 } }; },
            async remove() { return { stats: { removed: 1 } }; },
            limit() { return this; },
            async get() { return { data: [] }; },
          };
        },
        async get() { return { data: [] }; },
        async add() { return { _id: 'id' }; },
      };
    },
  };
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1' }) }, db });
  let r = await mod.main({ action: 'update', id: 'x', patch: { bill_day: 10 } });
  assert.equal(r.ok, false);
  r = await mod.main({ action: 'delete', id: 'x' });
  assert.equal(r.ok, true);
  r = await mod.main({ action: 'what' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'unknown_action');
  mod.__test.__resetRuntime();
});
