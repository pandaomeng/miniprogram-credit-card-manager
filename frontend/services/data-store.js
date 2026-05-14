const { cloudCards, cloudSettings, hasDataBackend } = require('./cloud-api.js');

function reportError(tag, e, extra = {}) {
  const msg = e && e.message ? e.message : String(e || 'unknown_error');
  console.error(`[${tag}]`, msg, extra);
  try {
    if (typeof wx !== 'undefined' && typeof wx.reportMonitor === 'function') {
      wx.reportMonitor(tag, 1);
    }
  } catch (ignore) {
    // ignore
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
    if (!hasDataBackend()) {
      reportError('data_backend_not_ready_list', 'data_backend_not_ready');
      return [];
    }
    try {
      const list = await cloudCards.list();
      console.log('[cloudCards.list] ok, count=', Array.isArray(list) ? list.length : 0);
      return (Array.isArray(list) ? list : []).map(normalizeCloudCard);
    } catch (e) {
      reportError('cloud_cards_list_failed', e);
      return [];
    }
  },

  async getCardById(id) {
    if (!id) return null;
    if (!hasDataBackend()) {
      reportError('data_backend_not_ready_get', 'data_backend_not_ready', { id });
      return null;
    }
    try {
      const card = await cloudCards.get(id);
      return normalizeCloudCard(card);
    } catch (e) {
      reportError('cloud_cards_get_failed', e, { id });
      return null;
    }
  },

  async addCard(card) {
    if (!hasDataBackend()) {
      reportError('data_backend_not_ready_create', 'data_backend_not_ready');
      return false;
    }
    try {
      await cloudCards.create(card);
      return true;
    } catch (e) {
      reportError('cloud_cards_create_failed', e);
      return false;
    }
  },

  async updateCard(id, patch) {
    if (!id) return false;
    if (!hasDataBackend()) {
      reportError('data_backend_not_ready_update', 'data_backend_not_ready', { id });
      return false;
    }
    try {
      return await cloudCards.update(id, patch);
    } catch (e) {
      reportError('cloud_cards_update_failed', e, { id });
      return false;
    }
  },

  async deleteCard(id) {
    if (!id) return false;
    if (!hasDataBackend()) {
      reportError('data_backend_not_ready_delete', 'data_backend_not_ready', { id });
      return false;
    }
    try {
      return await cloudCards.remove(id);
    } catch (e) {
      reportError('cloud_cards_delete_failed', e, { id });
      return false;
    }
  },

  async getHomeSettings() {
    if (!hasDataBackend()) {
      reportError('data_backend_not_ready_settings_get', 'data_backend_not_ready');
      return { hideRepaid: false, viewYm: '' };
    }
    try {
      const data = await cloudSettings.get();
      return {
        hideRepaid: !!data.hideRepaid,
        viewYm: data.viewYm || '',
      };
    } catch (e) {
      reportError('cloud_settings_get_failed', e);
      return { hideRepaid: false, viewYm: '' };
    }
  },

  async setHomeSettings(patch = {}) {
    if (!hasDataBackend()) {
      reportError('data_backend_not_ready_settings_set', 'data_backend_not_ready', patch);
      return false;
    }
    try {
      return await cloudSettings.set(patch);
    } catch (e) {
      reportError('cloud_settings_set_failed', e, patch);
      return false;
    }
  },
};

module.exports = dataStore;
