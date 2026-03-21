const { BANKS, BANK_CUSTOM_CODE } = require('../../utils/banks.js');

Page({
  data: {
    keyword: '',
    list: [],
    all: [],
    showCustomPanel: false,
    customName: '',
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
    const { all } = this.data;
    const list = !kw
      ? all
      : all.filter(
          (b) =>
            b.name.toLowerCase().includes(kw) ||
            b.code.toLowerCase().includes(kw),
        );
    this.setData({ keyword: raw, list });
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

  toggleCustom() {
    this.setData({ showCustomPanel: !this.data.showCustomPanel });
  },

  onCustomInput(e) {
    this.setData({ customName: e.detail.value });
  },

  onConfirmCustom() {
    const name = (this.data.customName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入银行名称', icon: 'none' });
      return;
    }
    if (name.length > 20) {
      wx.showToast({ title: '名称最长 20 字', icon: 'none' });
      return;
    }
    this._emitPick({
      bank_code: BANK_CUSTOM_CODE,
      bank_name: name,
      custom_bank_name: name,
    });
  },

  _emitPick(payload) {
    if (this._ec && typeof this._ec.emit === 'function') {
      this._ec.emit('bankPicked', payload);
    }
    wx.navigateBack();
  },
});
