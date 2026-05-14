const appConfig = require('../config/index.js');

function getApiConfig() {
  return {
    baseUrl: String(appConfig.apiBaseUrl || '').trim().replace(/\/$/, ''),
    devOpenid: String(appConfig.devOpenid || '').trim(),
    cloudContainerService: String(appConfig.cloudContainerService || '').trim(),
    cloudEnvId: String(appConfig.cloudEnvId || '').trim(),
  };
}

function hasHttpApi() {
  const { baseUrl, cloudContainerService } = getApiConfig();
  return !!(baseUrl || cloudContainerService);
}

function canUseCallContainer() {
  const { cloudContainerService } = getApiConfig();
  return !!(
    cloudContainerService &&
    typeof wx !== 'undefined' &&
    wx.cloud &&
    typeof wx.cloud.callContainer === 'function'
  );
}

function parseContainerBody(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function formatContainerError(statusCode, body) {
  if (body && typeof body === 'object') {
    const code = body.code || body.error;
    const msg = body.message || body.error;
    if (code || msg) {
      const parts = [code, msg].filter(Boolean);
      if (parts.length) return parts.join(': ');
    }
  }
  return `container_http_${statusCode}`;
}

/**
 * 微信云托管：走 callContainer 才会带 x-wx-openid。
 * INVALID_HOST 等为 CloudBase 网关错误，见 config/index.js 顶部说明。
 */
function containerRequest(method, path, data) {
  const { cloudContainerService, cloudEnvId } = getApiConfig();
  if (!cloudContainerService || !cloudEnvId) {
    return Promise.reject(new Error('container_config_incomplete'));
  }
  const opts = {
    config: { env: cloudEnvId },
    path,
    method,
    header: {
      'X-WX-SERVICE': cloudContainerService,
      'Content-Type': 'application/json',
    },
  };
  if (method !== 'GET' && method !== 'DELETE' && data !== undefined) {
    opts.data = data;
  }
  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      ...opts,
      success(res) {
        const statusCode = res && res.statusCode != null ? res.statusCode : 0;
        const body = parseContainerBody(res && res.data);
        if (statusCode >= 200 && statusCode < 300) {
          if (body.ok === false) {
            reject(new Error(body.error || 'container_request_failed'));
            return;
          }
          resolve(body);
          return;
        }
        reject(new Error(formatContainerError(statusCode, body)));
      },
      fail(err) {
        reject(err && err.errMsg ? new Error(err.errMsg) : new Error('callContainer_failed'));
      },
    });
  });
}

function hasCloud() {
  return !!(wx && wx.cloud && typeof wx.cloud.callFunction === 'function');
}

function hasDataBackend() {
  return hasHttpApi() || hasCloud();
}

function httpRequest(method, path, data) {
  if (canUseCallContainer()) {
    return containerRequest(method, path, data);
  }

  const { baseUrl, devOpenid } = getApiConfig();
  if (!baseUrl) {
    return Promise.reject(new Error('http_api_not_configured'));
  }
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (devOpenid) {
    headers['X-Dev-Openid'] = devOpenid;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data: method === 'GET' || method === 'DELETE' ? undefined : data,
      header: headers,
      success(res) {
        const body = res.data && typeof res.data === 'object' ? res.data : {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body.ok === false) {
            reject(new Error(body.error || 'http_request_failed'));
            return;
          }
          resolve(body);
          return;
        }
        reject(new Error(body.error || formatContainerError(res.statusCode, body)));
      },
      fail(err) {
        reject(err && err.errMsg ? new Error(err.errMsg) : new Error('wx_request_failed'));
      },
    });
  });
}

async function callCloud(name, data = {}) {
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
    if (hasHttpApi()) {
      const r = await httpRequest('GET', '/api/cards');
      return r.data || [];
    }
    const r = await callCloud('cards', { action: 'list' });
    return r.data || [];
  },
  async get(id) {
    if (hasHttpApi()) {
      const enc = encodeURIComponent(id);
      const r = await httpRequest('GET', `/api/cards/${enc}`);
      return r.data || null;
    }
    const r = await callCloud('cards', { action: 'get', id });
    return r.data || null;
  },
  async create(payload) {
    if (hasHttpApi()) {
      const r = await httpRequest('POST', '/api/cards', payload);
      return r.id;
    }
    const r = await callCloud('cards', { action: 'create', payload });
    return r.id;
  },
  async update(id, patch) {
    if (hasHttpApi()) {
      const enc = encodeURIComponent(id);
      const r = await httpRequest('PATCH', `/api/cards/${enc}`, patch);
      return !!r.ok;
    }
    const r = await callCloud('cards', { action: 'update', id, patch });
    return !!r.ok;
  },
  async remove(id) {
    if (hasHttpApi()) {
      const enc = encodeURIComponent(id);
      const r = await httpRequest('DELETE', `/api/cards/${enc}`);
      return !!r.ok;
    }
    const r = await callCloud('cards', { action: 'delete', id });
    return !!r.ok;
  },
};

const cloudSettings = {
  async get() {
    if (hasHttpApi()) {
      const r = await httpRequest('GET', '/api/settings');
      return r.data || { hideRepaid: false, viewYm: '' };
    }
    const r = await callCloud('settings', { action: 'get' });
    return r.data || { hideRepaid: false, viewYm: '' };
  },
  async set(payload) {
    if (hasHttpApi()) {
      const r = await httpRequest('PATCH', '/api/settings', payload);
      return !!r.ok;
    }
    const r = await callCloud('settings', { action: 'set', payload });
    return !!r.ok;
  },
};

module.exports = {
  hasCloud,
  hasHttpApi,
  hasDataBackend,
  call: callCloud,
  cloudCards,
  cloudSettings,
};
