function hasCloud() {
  return !!(wx && wx.cloud && typeof wx.cloud.callFunction === 'function');
}

async function call(name, data = {}) {
  if (!hasCloud()) {
    throw new Error('cloud_not_ready');
  }
  const res = await wx.cloud.callFunction({ name, data });
  const result = res && res.result ? res.result : {};
  if (!result.ok) {
    throw new Error(result.error || 'cloud_call_failed');
  }
  return result;
}

const cloudCards = {
  async list() {
    const r = await call('cards', { action: 'list' });
    return r.data || [];
  },
  async get(id) {
    const r = await call('cards', { action: 'get', id });
    return r.data || null;
  },
  async create(payload) {
    const r = await call('cards', { action: 'create', payload });
    return r.id;
  },
  async update(id, patch) {
    const r = await call('cards', { action: 'update', id, patch });
    return !!r.ok;
  },
  async remove(id) {
    const r = await call('cards', { action: 'delete', id });
    return !!r.ok;
  },
};

const cloudSettings = {
  async get() {
    const r = await call('settings', { action: 'get' });
    return r.data || { hideRepaid: false, viewYm: '' };
  },
  async set(payload) {
    const r = await call('settings', { action: 'set', payload });
    return !!r.ok;
  },
};

module.exports = {
  hasCloud,
  call,
  cloudCards,
  cloudSettings,
};
