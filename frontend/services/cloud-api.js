function getAppGlobal() {
  try {
    if (typeof getApp === "function") {
      const app = getApp();
      return app && app.globalData ? app.globalData : {};
    }
  } catch (e) {
    // ignore
  }
  return {};
}

function getApiConfig() {
  const g = getAppGlobal();
  return {
    baseUrl: String(g.apiBaseUrl || "").trim().replace(/\/$/, ""),
    devOpenid: String(g.devOpenid || "").trim(),
  };
}

function hasHttpApi() {
  return !!getApiConfig().baseUrl;
}

function hasCloud() {
  return !!(wx && wx.cloud && typeof wx.cloud.callFunction === "function");
}

function hasDataBackend() {
  return hasHttpApi() || hasCloud();
}

function httpRequest(method, path, data) {
  const { baseUrl, devOpenid } = getApiConfig();
  const url = `${baseUrl}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (devOpenid) {
    headers["X-Dev-Openid"] = devOpenid;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data: method === "GET" || method === "DELETE" ? undefined : data,
      header: headers,
      success(res) {
        const body = res.data && typeof res.data === "object" ? res.data : {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body.ok === false) {
            reject(new Error(body.error || "http_request_failed"));
            return;
          }
          resolve(body);
          return;
        }
        reject(new Error(body.error || `http_${res.statusCode}`));
      },
      fail(err) {
        reject(err && err.errMsg ? new Error(err.errMsg) : new Error("wx_request_failed"));
      },
    });
  });
}

async function callCloud(name, data = {}) {
  if (!hasCloud()) {
    throw new Error("cloud_not_ready");
  }
  const res = await wx.cloud.callFunction({ name, data });
  const result = res && res.result ? res.result : {};
  if (!result.ok) {
    throw new Error(result.error || "cloud_call_failed");
  }
  return result;
}

const cloudCards = {
  async list() {
    if (hasHttpApi()) {
      const r = await httpRequest("GET", "/api/cards");
      return r.data || [];
    }
    const r = await callCloud("cards", { action: "list" });
    return r.data || [];
  },
  async get(id) {
    if (hasHttpApi()) {
      const enc = encodeURIComponent(id);
      const r = await httpRequest("GET", `/api/cards/${enc}`);
      return r.data || null;
    }
    const r = await callCloud("cards", { action: "get", id });
    return r.data || null;
  },
  async create(payload) {
    if (hasHttpApi()) {
      const r = await httpRequest("POST", "/api/cards", payload);
      return r.id;
    }
    const r = await callCloud("cards", { action: "create", payload });
    return r.id;
  },
  async update(id, patch) {
    if (hasHttpApi()) {
      const enc = encodeURIComponent(id);
      const r = await httpRequest("PATCH", `/api/cards/${enc}`, patch);
      return !!r.ok;
    }
    const r = await callCloud("cards", { action: "update", id, patch });
    return !!r.ok;
  },
  async remove(id) {
    if (hasHttpApi()) {
      const enc = encodeURIComponent(id);
      const r = await httpRequest("DELETE", `/api/cards/${enc}`);
      return !!r.ok;
    }
    const r = await callCloud("cards", { action: "delete", id });
    return !!r.ok;
  },
};

const cloudSettings = {
  async get() {
    if (hasHttpApi()) {
      const r = await httpRequest("GET", "/api/settings");
      return r.data || { hideRepaid: false, viewYm: "" };
    }
    const r = await callCloud("settings", { action: "get" });
    return r.data || { hideRepaid: false, viewYm: "" };
  },
  async set(payload) {
    if (hasHttpApi()) {
      const r = await httpRequest("PATCH", "/api/settings", payload);
      return !!r.ok;
    }
    const r = await callCloud("settings", { action: "set", payload });
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
