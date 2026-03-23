const localStorage = require('../utils/storage.js');
const { cloudCards, cloudSettings, hasCloud } = require('./cloud-api.js');
const { STORAGE_HIDE_REPAID, STORAGE_VIEW_YM } = require('../utils/constants.js');

function readLocalSettings() {
  let hideRepaid = false;
  let viewYm = '';
  try {
    hideRepaid = wx.getStorageSync(STORAGE_HIDE_REPAID) === true;
    viewYm = wx.getStorageSync(STORAGE_VIEW_YM) || '';
  } catch (e) {
    // ignore
  }
  return { hideRepaid, viewYm };
}

function writeLocalSettings(patch = {}) {
  try {
    if (Object.prototype.hasOwnProperty.call(patch, 'hideRepaid')) {
      wx.setStorageSync(STORAGE_HIDE_REPAID, !!patch.hideRepaid);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'viewYm')) {
      wx.setStorageSync(STORAGE_VIEW_YM, patch.viewYm || '');
    }
    return true;
  } catch (e) {
    return false;
  }
}

function normalizeCloudCard(doc) {
  if (!doc) return null;
  const id = doc.id || doc._id;
  return {
    ...doc,
    id,
  };
}

const dataStore = {
  async listCards() {
    if (hasCloud()) {
      try {
        const list = await cloudCards.list();
        return (Array.isArray(list) ? list : []).map(normalizeCloudCard);
      } catch (e) {
        // fallback to local
      }
    }
    return localStorage.getCards();
  },

  async getCardById(id) {
    if (!id) return null;
    if (hasCloud()) {
      try {
        const card = await cloudCards.get(id);
        return normalizeCloudCard(card);
      } catch (e) {
        // fallback to local
      }
    }
    return localStorage.getCardById(id);
  },

  async addCard(card) {
    if (hasCloud()) {
      try {
        await cloudCards.create(card);
        return true;
      } catch (e) {
        // fallback to local
      }
    }
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return localStorage.addCard({ id, ...card });
  },

  async updateCard(id, patch) {
    if (!id) return false;
    if (hasCloud()) {
      try {
        return await cloudCards.update(id, patch);
      } catch (e) {
        // fallback to local
      }
    }
    return localStorage.updateCard(id, patch);
  },

  async deleteCard(id) {
    if (!id) return false;
    if (hasCloud()) {
      try {
        return await cloudCards.remove(id);
      } catch (e) {
        // fallback to local
      }
    }
    return localStorage.deleteCard(id);
  },

  async getHomeSettings() {
    if (hasCloud()) {
      try {
        const data = await cloudSettings.get();
        const result = {
          hideRepaid: !!data.hideRepaid,
          viewYm: data.viewYm || '',
        };
        writeLocalSettings(result);
        return result;
      } catch (e) {
        // fallback to local
      }
    }
    return readLocalSettings();
  },

  async setHomeSettings(patch = {}) {
    let cloudOk = false;
    if (hasCloud()) {
      try {
        cloudOk = await cloudSettings.set(patch);
      } catch (e) {
        cloudOk = false;
      }
    }
    const localOk = writeLocalSettings(patch);
    return cloudOk || localOk;
  },
};

module.exports = dataStore;
