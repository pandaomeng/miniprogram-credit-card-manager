const { BANK_CUSTOM_CODE } = require('../utils/banks.js');
const appConfig = require('../config/index.js');

const CODE_ALIAS = {
  BCM: 'COMM',
  PAB: 'SPABANK',
  HXB: 'HXBANK',
};
const DEFAULT_CLOUD_ENV_ID = 'prod-d4gfdc0xea6f1fc4c';
const ENV_BUCKETS = {
  'prod-d4gfdc0xea6f1fc4c': '636c-prod-d4gfdc0xea6f1fc4c-1414890388',
};
const STORAGE_KEY = 'bank_logo_src_v2';

const CACHE_TTL_MS = 30 * 60 * 1000;
const _cache = {
  at: 0,
  byCode: {},
  inited: false,
};

/** image 的 src：支持 https 临时链，或云文件 ID cloud://（基础库 ≥2.3.0） */
function isValidLogoSrc(s) {
  return typeof s === 'string' && (/^https?:\/\//.test(s) || /^cloud:\/\//.test(s));
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

function getStaticLogoBase() {
  return String(appConfig.bankLogoStaticBaseUrl || '').trim().replace(/\/+$/, '');
}

function getStaticPathPrefix() {
  return String(appConfig.bankLogoStaticPathPrefix || 'banks').trim().replace(/^\/+|\/+$/g, '');
}

/** 静态资源存储：一般为 https，无对象存储的 cloud:// 文件 ID，与 CLI --remotePath 一致 */
function codeToStaticHttpsUrl(normCode) {
  if (!normCode) return '';
  const base = getStaticLogoBase();
  if (!base) return '';
  const prefix = getStaticPathPrefix();
  return `${base}/${prefix}/${normCode}.png`;
}

/**
 * 云托管对象存储云文件 ID（与 wx.cloud.init 的 env 一致）。
 * image 可直接 src=cloud://…，见 image 组件文档；对象存储说明见云托管存储 API。
 */
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
      if (isValidLogoSrc(raw[k])) byCode[k] = raw[k];
    });
    if (!at || (Date.now() - at) >= CACHE_TTL_MS) return;
    _cache.at = at;
    _cache.byCode = byCode;
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
      if (isValidLogoSrc(_cache.byCode[k])) safe[k] = _cache.byCode[k];
    });
    wx.setStorageSync(STORAGE_KEY, {
      at: _cache.at,
      byCode: safe,
    });
  } catch (e) {
    // ignore
  }
}

/** 真机 image 支持 cloud://；开发者工具里 WebView 会把 cloud:// 当相对路径拼到页面目录，需换临时 HTTPS */
function useCloudFileIdAsImageSrc() {
  try {
    if (typeof wx === 'undefined' || typeof wx.getSystemInfoSync !== 'function') return false;
    return wx.getSystemInfoSync().platform !== 'devtools';
  } catch (e) {
    return false;
  }
}

function fetchTempUrlsByFileIds(codeToFileId) {
  const entries = Object.entries(codeToFileId).filter(([, id]) => id);
  if (!entries.length) return Promise.resolve({});
  const fileList = entries.map(([, fileID]) => fileID);
  return new Promise((resolve) => {
    if (!wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
      resolve({});
      return;
    }
    wx.cloud.getTempFileURL({
      fileList,
      success: (res) => {
        const urlByFileId = {};
        (res.fileList || []).forEach((item) => {
          if (item && item.tempFileURL && item.fileID) urlByFileId[item.fileID] = item.tempFileURL;
        });
        const out = {};
        entries.forEach(([code, fid]) => {
          if (urlByFileId[fid]) out[code] = urlByFileId[fid];
        });
        resolve(out);
      },
      fail: () => resolve({}),
    });
  });
}

async function resolveUrlsByCodes(codes = []) {
  hydrateCacheOnce();
  const normCodes = uniqueCodes(codes);
  if (!normCodes.length) return {};
  const out = {};
  const missCodes = [];
  const fresh = isCacheFresh();

  const canUseCloudSrc = useCloudFileIdAsImageSrc();
  normCodes.forEach((code) => {
    if (fresh && _cache.byCode[code]) {
      const v = _cache.byCode[code];
      if (canUseCloudSrc || !/^cloud:\/\//.test(v)) {
        out[code] = v;
        return;
      }
    }
    missCodes.push(code);
  });

  if (!missCodes.length) return out;

  const staticBase = getStaticLogoBase();
  if (staticBase) {
    const fetched = {};
    missCodes.forEach((code) => {
      const url = codeToStaticHttpsUrl(code);
      if (url) {
        fetched[code] = url;
        out[code] = url;
      }
    });
    if (Object.keys(fetched).length) mergeCache(fetched);
    return out;
  }

  const codeToFid = {};
  missCodes.forEach((code) => {
    const fileId = codeToFileId(code);
    if (fileId) codeToFid[code] = fileId;
  });
  if (!Object.keys(codeToFid).length) return out;

  if (canUseCloudSrc) {
    const fetched = { ...codeToFid };
    Object.assign(out, fetched);
    mergeCache(fetched);
    return out;
  }

  const httpsByCode = await fetchTempUrlsByFileIds(codeToFid);
  if (Object.keys(httpsByCode).length) {
    Object.assign(out, httpsByCode);
    mergeCache(httpsByCode);
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
