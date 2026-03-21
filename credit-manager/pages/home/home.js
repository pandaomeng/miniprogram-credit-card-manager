const storage = require('../../utils/storage.js');
const { enrichCard } = require('../../utils/card-helpers.js');

Page({
  data: {
    statusBarHeight: 44,
    navRightPaddingPx: 24,
    cards: [],
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
    this.setData({
      statusBarHeight,
      navRightPaddingPx,
    });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const raw = storage.getCards();
    const cards = raw.map(enrichCard);
    this.setData({ cards });
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
