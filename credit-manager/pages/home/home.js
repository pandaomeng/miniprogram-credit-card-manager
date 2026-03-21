const storage = require('../../utils/storage.js');
const {
  enrichCard,
  currentYm,
  normalizeYm,
  ymDisplayLabel,
  ymFromDatePickerValue,
  migrateRepaidMonths,
} = require('../../utils/card-helpers.js');
const { STORAGE_HIDE_REPAID, STORAGE_VIEW_YM } = require('../../utils/constants.js');

function readStoredViewYm() {
  try {
    const s = wx.getStorageSync(STORAGE_VIEW_YM);
    if (typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)) {
      return normalizeYm(s);
    }
  } catch (e) {
    /* ignore */
  }
  return currentYm();
}

Page({
  data: {
    statusBarHeight: 44,
    navRightPaddingPx: 24,
    cards: [],
    totalCount: 0,
    hideRepaid: false,
    viewYm: '',
    ymDisplay: '',
    ymPickerValue: '',
    isCurrentViewMonth: true,
    repaidLineText: '本月已标记还款',
  },

  onLoad() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : {};
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = win.statusBarHeight || sys.statusBarHeight || 44;
    let navRightPaddingPx = 24;
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      const ww = sys.windowWidth || win.windowWidth;
      if (menu && typeof menu.left === 'number' && ww) {
        const gapPx = 8;
        navRightPaddingPx = Math.max(24, Math.ceil(ww - menu.left + gapPx));
      }
    } catch (e) {
      navRightPaddingPx = 96;
    }
    let hideRepaid = false;
    try {
      hideRepaid = wx.getStorageSync(STORAGE_HIDE_REPAID) === true;
    } catch (e) {
      hideRepaid = false;
    }
    const viewYm = readStoredViewYm();
    this.setData({
      statusBarHeight,
      navRightPaddingPx,
      hideRepaid,
      ...this._ymUi(viewYm),
    });
  },

  _ymUi(ym) {
    const n = normalizeYm(ym);
    return {
      viewYm: n,
      ymDisplay: ymDisplayLabel(n),
      ymPickerValue: `${n}-01`,
      isCurrentViewMonth: n === currentYm(),
    };
  },

  _persistViewYm(ym) {
    try {
      wx.setStorageSync(STORAGE_VIEW_YM, normalizeYm(ym));
    } catch (e) {
      wx.showToast({ title: '月份未保存', icon: 'none' });
    }
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const raw = storage.getCards();
    const { viewYm, hideRepaid, ymDisplay, isCurrentViewMonth } = this.data;
    const ym = normalizeYm(viewYm || currentYm());
    const all = raw.map((c) => enrichCard(c, ym));
    const cards = hideRepaid ? all.filter((c) => !c.repaid_active) : all;
    const repaidLineText = isCurrentViewMonth
      ? '本月已标记还款'
      : `${ymDisplay} 已标记还款`;
    this.setData({
      cards,
      totalCount: all.length,
      repaidLineText,
    });
  },

  onYmPickerChange(e) {
    const next = ymFromDatePickerValue(e.detail.value);
    this._persistViewYm(next);
    this.setData(this._ymUi(next), () => this.refresh());
  },

  onGoCurrentMonth() {
    const n = currentYm();
    this._persistViewYm(n);
    this.setData(this._ymUi(n), () => this.refresh());
  },

  onHideRepaidChange(e) {
    const hideRepaid = !!e.detail.value;
    try {
      wx.setStorageSync(STORAGE_HIDE_REPAID, hideRepaid);
    } catch (err) {
      wx.showToast({ title: '设置未保存', icon: 'none' });
      return;
    }
    this.setData({ hideRepaid }, () => this.refresh());
  },

  onShowRepaidCards() {
    try {
      wx.setStorageSync(STORAGE_HIDE_REPAID, false);
    } catch (err) {
      wx.showToast({ title: '设置未保存', icon: 'none' });
      return;
    }
    this.setData({ hideRepaid: false }, () => this.refresh());
  },

  onToggleRepaid(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    const raw = storage.getCardById(id);
    if (!raw) return;
    const ym = normalizeYm(this.data.viewYm || currentYm());
    const card = migrateRepaidMonths(raw);
    const months = { ...card.repaid_months };
    if (months[ym]) {
      delete months[ym];
    } else {
      months[ym] = true;
    }
    if (!storage.updateCard(id, { repaid_months: months })) return;
    this.refresh();
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/card-form/card-form?mode=add' });
  },

  onOpenCard(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    const ym = encodeURIComponent(normalizeYm(this.data.viewYm || currentYm()));
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}&ym=${ym}` });
  },

  onLongPressCard(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.showModal({
      title: '删除信用卡',
      content: '确定从列表中移除该卡片？本地数据将删除且不可恢复。',
      confirmText: '删除',
      confirmColor: '#c62828',
      success: (res) => {
        if (!res.confirm) return;
        if (!storage.deleteCard(id)) return;
        wx.showToast({ title: '已删除', icon: 'success' });
        this.refresh();
      },
    });
  },
});
