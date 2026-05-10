const test = require('node:test');
const assert = require('node:assert/strict');

const mod = require('../index.js');

function makeDb({ hasSetting = false, hasCards = false, createCollectionError = null } = {}) {
  let adds = [];
  return {
    adds,
    serverDate: () => 'NOW',
    async createCollection(name) {
      if (createCollectionError) throw createCollectionError;
      return { ok: true, name };
    },
    collection(name) {
      return {
        where() {
          return {
            limit() { return this; },
            async get() {
              if (name === 'user_settings') return { data: hasSetting ? [{ _id: 's1' }] : [] };
              if (name === 'credit_cards') return { data: hasCards ? [{ _id: 'c1' }] : [] };
              return { data: [] };
            },
          };
        },
        async add({ data }) {
          adds.push({ name, data });
          return { _id: `${name}-id` };
        },
      };
    },
  };
}

test('bootstrap creates settings and demo cards when empty', async () => {
  const db = makeDb({ hasSetting: false, hasCards: false });
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1', ENV: 'e1' }) }, db });
  const r = await mod.main({ withDemo: true });
  assert.equal(r.ok, true);
  const settingAdds = db.adds.filter((x) => x.name === 'user_settings');
  const cardAdds = db.adds.filter((x) => x.name === 'credit_cards');
  assert.equal(settingAdds.length, 1);
  assert.equal(cardAdds.length, mod.__test.DEMO_CARDS.length);
  assert.equal(cardAdds[0].data.open_id, 'u1');
  mod.__test.__resetRuntime();
});

test('bootstrap skips demo when cards exist', async () => {
  const db = makeDb({ hasSetting: true, hasCards: true });
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1', ENV: 'e1' }) }, db });
  const r = await mod.main({ withDemo: true });
  assert.equal(r.ok, true);
  const cardAdds = db.adds.filter((x) => x.name === 'credit_cards');
  assert.equal(cardAdds.length, 0);
  mod.__test.__resetRuntime();
});

test('ensureCollection ignores already exists errors', async () => {
  const db = makeDb({ createCollectionError: new Error('already exists') });
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1', ENV: 'e1' }) }, db });
  const r = await mod.main({ withDemo: false });
  assert.equal(r.ok, true);
  mod.__test.__resetRuntime();
});

test('bootstrap returns error on unexpected createCollection failure', async () => {
  const db = makeDb({ createCollectionError: new Error('permission denied') });
  mod.__test.__setRuntime({ cloud: { getWXContext: () => ({ OPENID: 'u1', ENV: 'e1' }) }, db });
  const r = await mod.main({ withDemo: false });
  assert.equal(r.ok, false);
  assert.match(r.error, /permission denied/);
  mod.__test.__resetRuntime();
});
