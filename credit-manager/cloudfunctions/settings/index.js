const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const SETTINGS = 'user_settings';

async function getSettings(openid) {
  const res = await db.collection(SETTINGS).where({ _openid: openid }).limit(1).get();
  if (!res.data || !res.data.length) {
    return { hideRepaid: false, viewYm: '' };
  }
  const d = res.data[0];
  return {
    hideRepaid: !!d.hideRepaid,
    viewYm: d.viewYm || '',
  };
}

async function setSettings(openid, payload = {}) {
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(payload, 'hideRepaid')) {
    patch.hideRepaid = !!payload.hideRepaid;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'viewYm')) {
    const v = String(payload.viewYm || '');
    patch.viewYm = /^\d{4}-\d{2}$/.test(v) ? v : '';
  }

  const existed = await db.collection(SETTINGS).where({ _openid: openid }).limit(1).get();
  if (!existed.data || !existed.data.length) {
    await db.collection(SETTINGS).add({
      data: {
        ...patch,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
    });
    return true;
  }

  const id = existed.data[0]._id;
  const r = await db.collection(SETTINGS).doc(id).update({
    data: {
      ...patch,
      updated_at: db.serverDate(),
    },
  });
  return r.stats && r.stats.updated > 0;
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const action = event && event.action;
  try {
    if (action === 'get') {
      return { ok: true, data: await getSettings(openid) };
    }
    if (action === 'set') {
      const ok = await setSettings(openid, event.payload || {});
      return { ok };
    }
    return { ok: false, error: 'unknown_action' };
  } catch (e) {
    return { ok: false, error: e.message || 'settings_failed' };
  }
};
