const { BANKS, BANK_CUSTOM_CODE } = require('../../utils/banks.js');

function findExactBank(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;
  const byName = BANKS.find((b) => b.name === t);
  if (byName) return byName;
  const byCode = BANKS.find((b) => b.code.toLowerCase() === t.toLowerCase());
  return byCode || null;
}

Page({
  data: {
    keyword: '',
    keywordTrim: '',
    list: [],
    all: [],
  },

  onLoad() {
    this.setData({ all: BANKS, list: BANKS });
    if (typeof this.getOpenerEventChannel === 'function') {
      this._ec = this.getOpenerEventChannel();
    }
  },

  onSearchInput(e) {
    const raw = e.detail.value || '';
    const kw = raw.trim().toLowerCase();
    const keywordTrim = raw.trim();
    const { all } = this.data;
    const list = !kw
      ? all
      : all.filter(
          (b) =>
            b.name.toLowerCase().includes(kw) ||
            b.code.toLowerCase().includes(kw),
        );
    this.setData({ keyword: raw, keywordTrim, list });
  },

  onPickBank(e) {
    const { code, name } = e.currentTarget.dataset;
    if (!code || !name) return;
    this._emitPick({
      bank_code: code,
      bank_name: name,
      custom_bank_name: '',
    });
  },

  onSearchConfirm() {
    const raw = (this.data.keyword || '').trim();
    if (!raw) {
      wx.showToast({ title: '请输入银行名称', icon: 'none' });
      return;
    }
    const hit = findExactBank(raw);
    if (hit) {
      this._emitPick({
        bank_code: hit.code,
        bank_name: hit.name,
        custom_bank_name: '',
      });
      return;
    }
    const { list } = this.data;
    if (list.length > 0) {
      wx.showToast({ title: '请从列表点选银行', icon: 'none' });
      return;
    }
    if (raw.length > 20) {
      wx.showToast({ title: '名称最长 20 字', icon: 'none' });
      return;
    }
    this._emitPick({
      bank_code: BANK_CUSTOM_CODE,
      bank_name: raw,
      custom_bank_name: raw,
    });
  },

  _emitPick(payload) {
    if (this._ec && typeof this._ec.emit === 'function') {
      this._ec.emit('bankPicked', payload);
    }
    wx.navigateBack();
  },
});
