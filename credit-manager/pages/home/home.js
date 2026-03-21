const storage = require('../../utils/storage.js');
const { enrichCard, nextDueYmd } = require('../../utils/card-helpers.js');
const { STORAGE_HIDE_REPAID } = require('../../utils/constants.js');

Page({
  data: {
    statusBarHeight: 44,
    navRightPaddingPx: 24,
    cards: [],
    totalCount: 0,
    hideRepaid: false,
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
    this.setData({
      statusBarHeight,
      navRightPaddingPx,
      hideRepaid,
    });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const raw = storage.getCards();
    const all = raw.map(enrichCard);
    const { hideRepaid } = this.data;
    const cards = hideRepaid ? all.filter((c) => !c.repaid_active) : all;
    this.setData({
      cards,
      totalCount: all.length,
    });
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
    const ymd = nextDueYmd(raw.due_day);
    const active = !!(raw.repaid && raw.repaid_for_due_ymd === ymd);
    const patch = active
      ? { repaid: false, repaid_for_due_ymd: '' }
      : { repaid: true, repaid_for_due_ymd: ymd };
    if (!storage.updateCard(id, patch)) return;
    this.refresh();
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/card-form/card-form?mode=add' });
  },

  onOpenCard(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
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
