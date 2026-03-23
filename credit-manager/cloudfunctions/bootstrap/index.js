const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const CARDS = 'credit_cards';
const SETTINGS = 'user_settings';
const _runtime = { cloud, db };

function __setRuntime(runtime = {}) {
  if (runtime.cloud) _runtime.cloud = runtime.cloud;
  if (runtime.db) _runtime.db = runtime.db;
}

function __resetRuntime() {
  _runtime.cloud = cloud;
  _runtime.db = db;
}

const DEMO_CARDS = [
  
];

async function ensureCollection(name) {
  try {
    await _runtime.db.createCollection(name);
  } catch (e) {
    const msg = String((e && e.message) || e || '');
    // 已存在时忽略，其他错误继续抛出
    if (!/already exists|已存在|60100/.test(msg)) {
      throw e;
    }
  }
}

exports.main = async (event, context) => {
  const wxContext = _runtime.cloud.getWXContext();
  const openid = wxContext.OPENID;
  const withDemo = !!(event && event.withDemo);

  try {
    // 先确保集合存在，避免首次查询时报「集合不存在」。
    await ensureCollection(SETTINGS);
    await ensureCollection(CARDS);

    const existedSetting = await _runtime.db.collection(SETTINGS).where({ _openid: openid }).limit(1).get();
    if (!existedSetting.data || !existedSetting.data.length) {
      await _runtime.db.collection(SETTINGS).add({
        data: {
          hideRepaid: false,
          viewYm: '',
          created_at: _runtime.db.serverDate(),
          updated_at: _runtime.db.serverDate(),
        },
      });
    }

    if (withDemo) {
      const cardsRes = await _runtime.db.collection(CARDS).where({ _openid: openid }).limit(1).get();
      if (!cardsRes.data || !cardsRes.data.length) {
        for (const c of DEMO_CARDS) {
          await _runtime.db.collection(CARDS).add({
            data: {
              ...c,
              open_id: openid,
              owner_openid: openid,
              custom_bank_name: '',
              repaid_months: {},
              created_at: _runtime.db.serverDate(),
              updated_at: _runtime.db.serverDate(),
            },
          });
        }
      }
    }

    return {
      ok: true,
      envId: wxContext.ENV,
      openid,
      collections: [CARDS, SETTINGS],
    };
  } catch (e) {
    return { ok: false, error: e.message || 'bootstrap_failed' };
  }
};

exports.__test = {
  ensureCollection,
  DEMO_CARDS,
  __setRuntime,
  __resetRuntime,
};
