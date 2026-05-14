const dataStore = require('../../services/data-store.js');
const bankLogo = require('../../services/bank-logo.js');
const {
  enrichCard,
  currentYm,
  normalizeYm,
  ymDisplayLabel,
  migrateRepaidMonths,
  sortCardsByDueDayAsc,
} = require('../../utils/card-helpers.js');

const YM_PICK_START_YEAR = 2018;
const YM_PICK_END_YEAR = 2037;



const YM_MULTI_RANGE = (() => {
  const years = [];
  for (let y = YM_PICK_START_YEAR; y <= YM_PICK_END_YEAR; y += 1) {
    years.push(`${y}年`);
  }
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  return [years, months];
})();

function ymToMultiIndex(ym) {
  const n = normalizeYm(ym);
  const parts = n.split('-');
  let y = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  y = Math.max(YM_PICK_START_YEAR, Math.min(YM_PICK_END_YEAR, y));
  const yi = y - YM_PICK_START_YEAR;
  const mi = Math.max(0, Math.min(11, month - 1));
  return [yi, mi];
}

function multiIndexToYm(yi, mi) {
  const y = YM_PICK_START_YEAR + yi;
  const m = String(mi + 1).padStart(2, '0');
  return `${y}-${m}`;
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
    ymMultiRange: YM_MULTI_RANGE,
    ymMultiIndex: [0, 0],
    isCurrentViewMonth: true,
    repaidLineText: '本月已标记还款',
    openSwipeId: '',
    firstLoading: true,
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
      ...this._ymUi(currentYm()),
    });
  },

  _ymUi(ym) {
    const n = normalizeYm(ym);
    const [yi, mi] = ymToMultiIndex(n);
    return {
      viewYm: n,
      ymDisplay: ymDisplayLabel(n),
      ymMultiIndex: [yi, mi],
      isCurrentViewMonth: n === currentYm(),
    };
  },

  async _loadSettingsAndApply() {
    const settings = await dataStore.getHomeSettings();

    const ym = normalizeYm(settings.viewYm || currentYm());
    this.setData({
      hideRepaid: !!settings.hideRepaid,
      ...this._ymUi(ym),
    });
  },

  onShow() {
    this.initAndRefresh();
  },

  async initAndRefresh() {
    try {
      await this._loadSettingsAndApply();
      await this.refresh();
    } finally {
      if (this.data.firstLoading) {
        this.setData({ firstLoading: false });
      }
    }
  },

  async refresh() {
    const raw = await dataStore.listCards();
    const { viewYm, hideRepaid, ymDisplay, isCurrentViewMonth } = this.data;
    const ym = normalizeYm(viewYm || currentYm());
    const all = raw.map((c) => enrichCard(c, ym));
    const logoByCode = await bankLogo.resolveUrlsByCards(all);
    const allWithLogo = sortCardsByDueDayAsc(
      all.map((c) => ({
        ...c,
        logo_path: logoByCode[c.bank_code] || '',
      })),
    );
    const cards = hideRepaid ? allWithLogo.filter((c) => !c.repaid_active) : allWithLogo;
    const repaidLineText = isCurrentViewMonth
      ? '本月已标记还款'
      : `${ymDisplay} 已标记还款`;
    this.setData({
      cards,
      totalCount: allWithLogo.length,
      repaidLineText,
    });
  },

  async onYmMultiChange(e) {
    const idx = e.detail.value;
    const yi = Number(idx[0]);
    const mi = Number(idx[1]);
    const next = multiIndexToYm(yi, mi);
    const ok = await dataStore.setHomeSettings({ viewYm: next });
    if (!ok) {
      wx.showToast({ title: '月份未保存', icon: 'none' });
    }
    this.setData(this._ymUi(next), () => this.refresh());
  },

  async onGoCurrentMonth() {
    const n = currentYm();
    const ok = await dataStore.setHomeSettings({ viewYm: n });
    if (!ok) {
      wx.showToast({ title: '月份未保存', icon: 'none' });
    }
    this.setData(this._ymUi(n), () => this.refresh());
  },

  async onHideRepaidChange(e) {
    const hideRepaid = !!e.detail.value;
    const ok = await dataStore.setHomeSettings({ hideRepaid });
    if (!ok) {
      wx.showToast({ title: '设置未保存', icon: 'none' });
      return;
    }
    this.setData({ hideRepaid }, () => this.refresh());
  },

  async onShowRepaidCards() {
    const ok = await dataStore.setHomeSettings({ hideRepaid: false });
    if (!ok) {
      wx.showToast({ title: '设置未保存', icon: 'none' });
      return;
    }
    this.setData({ hideRepaid: false }, () => this.refresh());
  },

  async onToggleRepaid(e) {
    if (this._updatingRepaid) return;
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    this._updatingRepaid = true;
    wx.showLoading({ title: '更新中...', mask: true });
    try {
      const raw = await dataStore.getCardById(id);
      if (!raw) return;
      const ym = normalizeYm(this.data.viewYm || currentYm());
      const card = migrateRepaidMonths(raw);
      const months = { ...card.repaid_months };
      if (months[ym]) {
        months[ym] = false;
      } else {
        months[ym] = true;
      }
      const ok = await dataStore.updateCard(id, {
        repaid_months: months,
      });
      if (!ok) {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        return;
      }
      await this.refresh();
    } finally {
      this._updatingRepaid = false;
      wx.hideLoading();
    }
  },

  onAdd() {
    this._closeSwipe();
    wx.navigateTo({ url: '/pages/card-form/card-form?mode=add' });
  },

  onOpenCard(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    if (this.data.openSwipeId) {
      if (this.data.openSwipeId === id) {
        this._closeSwipe();
        return;
      }
      this._closeSwipe();
      return;
    }
    const ym = encodeURIComponent(normalizeYm(this.data.viewYm || currentYm()));
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}&ym=${ym}` });
  },

  _closeSwipe() {
    if (!this.data.openSwipeId) return;
    this.setData({ openSwipeId: '' });
  },

  onPageTap() {
    this._closeSwipe();
  },

  onCardTouchStart(e) {
    const { id } = e.currentTarget.dataset;
    const touch = e.touches && e.touches[0];
    if (!id || !touch) return;
    this._touchCardId = id;
    this._touchStartX = touch.pageX;
    this._touchStartY = touch.pageY;
    this._touchHandled = false;
  },

  onCardTouchMove(e) {
    if (this._touchHandled) return;
    const { id } = e.currentTarget.dataset;
    const touch = e.touches && e.touches[0];
    if (!id || !touch || this._touchCardId !== id) return;
    const dx = touch.pageX - this._touchStartX;
    const dy = touch.pageY - this._touchStartY;
    if (Math.abs(dx) < 24 || Math.abs(dx) <= Math.abs(dy)) return;
    this._touchHandled = true;
    if (dx < 0) {
      this.setData({ openSwipeId: id });
    } else {
      this._closeSwipe();
    }
  },

  onCardTouchEnd() {
    this._touchCardId = '';
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchHandled = false;
  },

  async _confirmDeleteById(id) {
    if (!id) return;
    this._closeSwipe();
    wx.showModal({
      title: '删除信用卡',
      content: '确定从列表中移除该卡片？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#c62828',
      success: async (res) => {
        if (!res.confirm) return;
        const ok = await dataStore.deleteCard(id);
        if (!ok) {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
          return;
        }
        wx.showToast({ title: '已删除', icon: 'success' });
        this.refresh();
      },
    });
  },

  onSwipeDelete(e) {
    const { id } = e.currentTarget.dataset;
    this._confirmDeleteById(id);
  },

  onLongPressCard(e) {
    const { id } = e.currentTarget.dataset;
    this._confirmDeleteById(id);
  },
});
