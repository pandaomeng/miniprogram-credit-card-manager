const {
  STORAGE_CARDS,
  STORAGE_DEMO_SEEDED,
} = require('./constants.js');

function toastFail() {
  wx.showToast({
    title: '网络异常，请稍后重试',
    icon: 'none',
    duration: 2000,
  });
}

function safeGet(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === undefined ? fallback : v;
  } catch (e) {
    toastFail();
    return fallback;
  }
}

function safeSet(key, data) {
  try {
    wx.setStorageSync(key, data);
    return true;
  } catch (e) {
    toastFail();
    return false;
  }
}

const DEMO_CARDS = [
  {
    id: 'demo-cmb',
    bank_code: 'CMB',
    last4: '8888',
    cardholder_name: '李雷',
    bill_day: 5,
    due_day: 23,
  },
  {
    id: 'demo-ccb',
    bank_code: 'CCB',
    last4: '6666',
    cardholder_name: '李雷',
    bill_day: 10,
    due_day: 28,
  },
  {
    id: 'demo-icbc',
    bank_code: 'ICBC',
    last4: '1234',
    cardholder_name: '李雷',
    bill_day: 1,
    due_day: 20,
  },
];

function ensureDemoSeeded() {
  if (safeGet(STORAGE_DEMO_SEEDED, false)) return;
  const existing = safeGet(STORAGE_CARDS, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    safeSet(STORAGE_DEMO_SEEDED, true);
    return;
  }
  if (safeSet(STORAGE_CARDS, DEMO_CARDS)) {
    safeSet(STORAGE_DEMO_SEEDED, true);
  }
}

function getCards() {
  ensureDemoSeeded();
  const list = safeGet(STORAGE_CARDS, []);
  return Array.isArray(list) ? list : [];
}

function setCards(list) {
  return safeSet(STORAGE_CARDS, list);
}

function getCardById(id) {
  return getCards().find((c) => c.id === id) || null;
}

function addCard(card) {
  const list = getCards();
  list.unshift(card);
  return setCards(list);
}

function updateCard(id, patch) {
  const list = getCards();
  const i = list.findIndex((c) => c.id === id);
  if (i === -1) return false;
  list[i] = { ...list[i], ...patch };
  return setCards(list);
}

function deleteCard(id) {
  const list = getCards().filter((c) => c.id !== id);
  return setCards(list);
}

module.exports = {
  getCards,
  setCards,
  getCardById,
  addCard,
  updateCard,
  deleteCard,
  ensureDemoSeeded,
  toastFail,
};
