const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const CARDS = 'credit_cards';

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function cleanPatch(patch = {}) {
  const out = {};
  const allow = [
    'bank_code',
    'custom_bank_name',
    'last4',
    'cardholder_name',
    'bill_day',
    'due_day',
    'repaid_months',
  ];
  allow.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k];
  });
  if (out.bill_day !== undefined) out.bill_day = toInt(out.bill_day, 1);
  if (out.due_day !== undefined) out.due_day = toInt(out.due_day, 1);
  if (typeof out.last4 === 'string') out.last4 = out.last4.replace(/\D/g, '').slice(-4);
  if (typeof out.custom_bank_name === 'string') out.custom_bank_name = out.custom_bank_name.trim().slice(0, 20);
  if (typeof out.cardholder_name === 'string') out.cardholder_name = out.cardholder_name.trim().slice(0, 20);
  if (out.repaid_months && typeof out.repaid_months === 'object') {
    const cleaned = {};
    Object.keys(out.repaid_months).forEach((k) => {
      if (/^\d{4}-\d{2}$/.test(k) && out.repaid_months[k]) cleaned[k] = true;
    });
    out.repaid_months = cleaned;
  }
  return out;
}

async function listCards(openid) {
  // 1) 优先读取当前调用用户的数据
  const mine = await db.collection(CARDS).where({ _openid: openid }).get();
  if (mine.data && mine.data.length) return mine.data;

  // 2) 兼容早期/手工写入（可能没有 _openid）
  const legacy = await db.collection(CARDS).where({ _openid: null }).get();
  if (legacy.data && legacy.data.length) return legacy.data;

  // 3) 兜底：直接拉取集合（单人使用场景便于排障）
  const all = await db.collection(CARDS).get();
  return all.data || [];
}

async function getCard(openid, id) {
  const res = await db.collection(CARDS).where({ _openid: openid, _id: id }).limit(1).get();
  return (res.data && res.data[0]) || null;
}

async function createCard(openid, payload) {
  const now = db.serverDate();
  const body = cleanPatch(payload);
  const required = ['bank_code', 'last4', 'bill_day', 'due_day'];
  const miss = required.find((k) => !body[k]);
  if (miss) throw new Error(`missing:${miss}`);
  const add = await db.collection(CARDS).add({
    data: {
      ...body,
      owner_openid: openid,
      repaid_months: body.repaid_months || {},
      created_at: now,
      updated_at: now,
    },
  });
  return add._id;
}

async function updateCard(openid, id, patch) {
  const body = cleanPatch(patch);
  body.updated_at = db.serverDate();
  const r = await db.collection(CARDS).where({ _openid: openid, _id: id }).update({ data: body });
  return r.stats && r.stats.updated > 0;
}

async function deleteCard(openid, id) {
  const r = await db.collection(CARDS).where({ _openid: openid, _id: id }).remove();
  return r.stats && r.stats.removed > 0;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event && event.action;

  try {
    if (action === 'list') {
      return { ok: true, data: await listCards(openid) };
    }
    if (action === 'get') {
      return { ok: true, data: await getCard(openid, event.id) };
    }
    if (action === 'create') {
      const id = await createCard(openid, event.payload || {});
      return { ok: true, id };
    }
    if (action === 'update') {
      const ok = await updateCard(openid, event.id, event.patch || {});
      return { ok };
    }
    if (action === 'delete') {
      const ok = await deleteCard(openid, event.id);
      return { ok };
    }
    return { ok: false, error: 'unknown_action' };
  } catch (e) {
    return { ok: false, error: e.message || 'cards_failed' };
  }
};
