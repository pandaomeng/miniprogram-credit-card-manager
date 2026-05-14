const { BANK_CUSTOM_CODE } = require('../utils/banks.js');

const CODE_ALIAS = {
  BCM: 'COMM',
  PAB: 'SPABANK',
  HXB: 'HXBANK',
};
const DEFAULT_CLOUD_ENV_ID = 'prod-d4gfdc0xea6f1fc4c';
const ENV_BUCKETS = {
  'prod-d4gfdc0xea6f1fc4c': '636c-prod-d4gfdc0xea6f1fc4c-1414890388',
};
const STORAGE_KEY = 'bank_logo_temp_urls_v1';

const CACHE_TTL_MS = 30 * 60 * 1000;
const _cache = {
  at: 0,
  byCode: {},
  inited: false,
  loggedFail: false,
  loggedStat: false,
};

function isValidImageUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url);
}

function normalizeCode(code) {
  if (!code || code === BANK_CUSTOM_CODE) return '';
  return CODE_ALIAS[code] || code;
}

function getCloudEnvId() {
  try {
    if (typeof getApp === 'function') {
      const app = getApp();
      const env = app && app.globalData && app.globalData.cloudEnvId;
      if (env) return env;
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_CLOUD_ENV_ID;
}

function codeToFileId(code) {
  const n = normalizeCode(code);
  if (!n) return '';
  const envId = getCloudEnvId();
  const bucket = ENV_BUCKETS[envId];
  if (!bucket) return `cloud://${envId}/banks/${n}.png`;
  return `cloud://${envId}.${bucket}/banks/${n}.png`;
}

function isCacheFresh() {
  return _cache.at > 0 && (Date.now() - _cache.at) < CACHE_TTL_MS;
}

function mergeCache(next = {}) {
  _cache.byCode = { ..._cache.byCode, ...next };
  _cache.at = Date.now();
  persistCache();
}

function uniqueCodes(codes = []) {
  const set = new Set();
  (codes || []).forEach((c) => {
    const n = normalizeCode(c);
    if (n) set.add(n);
  });
  return Array.from(set);
}

function hydrateCacheOnce() {
  if (_cache.inited) return;
  _cache.inited = true;
  try {
    if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return;
    const saved = wx.getStorageSync(STORAGE_KEY);
    if (!saved || typeof saved !== 'object') return;
    const at = Number(saved.at || 0);
    const raw = saved.byCode && typeof saved.byCode === 'object' ? saved.byCode : {};
    const byCode = {};
    Object.keys(raw).forEach((k) => {
      if (isValidImageUrl(raw[k])) byCode[k] = raw[k];
    });
    if (!at || (Date.now() - at) >= CACHE_TTL_MS) return;
    _cache.at = at;
    _cache.byCode = byCode;
    // 清理掉历史错误缓存（如 cloud://...）
    if (Object.keys(raw).length !== Object.keys(byCode).length) {
      persistCache();
    }
  } catch (e) {
    // ignore
  }
}

function persistCache() {
  try {
    if (typeof wx === 'undefined' || typeof wx.setStorageSync !== 'function') return;
    const safe = {};
    Object.keys(_cache.byCode || {}).forEach((k) => {
      if (isValidImageUrl(_cache.byCode[k])) safe[k] = _cache.byCode[k];
    });
    wx.setStorageSync(STORAGE_KEY, {
      at: _cache.at,
      byCode: safe,
    });
  } catch (e) {
    // ignore
  }
}

async function fetchTempUrlsByFileIds(fileIds = []) {
  if (!fileIds.length) return {};
  if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
    return {};
  }

  const byFileId = {};
  const chunkSize = 50;
  for (let i = 0; i < fileIds.length; i += chunkSize) {
    const part = fileIds.slice(i, i + chunkSize);
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: part });
      const list = (res && res.fileList) || [];
      list.forEach((item, idx) => {
        const reqFileId = part[idx];
        if (item && item.fileID && item.tempFileURL) {
          if (isValidImageUrl(item.tempFileURL)) {
            byFileId[item.fileID] = item.tempFileURL;
            if (reqFileId) {
              byFileId[reqFileId] = item.tempFileURL;
            }
          }
        }
      });
      if (!_cache.loggedStat) {
        _cache.loggedStat = true;
        const okCount = list.filter((x) => x && isValidImageUrl(x.tempFileURL)).length;
        console.log('[bankLogo.getTempFileURL] stats:', { request: part.length, ok: okCount });
      }
      // 只在出现异常项时打印一次详细日志，便于排查无法取到 tempFileURL 的根因
      if (!_cache.loggedFail) {
        const failed = list.filter((item) => !item || !item.tempFileURL);
        if (failed.length) {
          _cache.loggedFail = true;
          console.error('[bankLogo.getTempFileURL] failed items:', failed.map((item) => ({
            fileID: item && item.fileID,
            status: item && item.status,
            errMsg: item && item.errMsg,
          })));
        }
      }
    } catch (e) {
      console.error('[bankLogo.fetchTempUrlsByFileIds] failed:', e);
    }
  }
  return byFileId;
}

async function resolveUrlsByCodes(codes = []) {
  hydrateCacheOnce();
  const normCodes = uniqueCodes(codes);
  if (!normCodes.length) return {};
  // cloud:// fileID -> getTempFileURL
  const out = {};
  const missCodes = [];
  const fresh = isCacheFresh();

  normCodes.forEach((code) => {
    if (fresh && _cache.byCode[code]) {
      out[code] = _cache.byCode[code];
      return;
    }
    missCodes.push(code);
  });

  if (!missCodes.length) return out;

  const fileIds = missCodes
    .map((c) => codeToFileId(c))
    .filter(Boolean);
  const byFileId = await fetchTempUrlsByFileIds(fileIds);
  const fetched = {};
  missCodes.forEach((code) => {
    const fileId = codeToFileId(code);
    if (!fileId) return;
    // 仅使用临时链接；失败时由调用方回退本地图标
    const url = byFileId[fileId] || '';
    if (url) {
      fetched[code] = url;
      out[code] = url;
    }
  });
  if (Object.keys(fetched).length) {
    mergeCache(fetched);
  }
  return out;
}

async function resolveUrlsByCards(cards = []) {
  const rawCodes = (cards || []).map((c) => c && c.bank_code).filter(Boolean);
  const normToUrl = await resolveUrlsByCodes(rawCodes);
  const byRawCode = {};
  rawCodes.forEach((raw) => {
    const n = normalizeCode(raw);
    if (n && normToUrl[n]) {
      byRawCode[raw] = normToUrl[n];
    }
  });
  return byRawCode;
}

module.exports = {
  resolveUrlsByCards,
};
