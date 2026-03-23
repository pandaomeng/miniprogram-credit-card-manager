const dataStore = require('../../services/data-store.js');
const {
  enrichCard,
  currentYm,
  normalizeYm,
  ymDisplayLabel,
  migrateRepaidMonths,
} = require('../../utils/card-helpers.js');

Page({
  data: {
    id: '',
    viewYm: '',
    ymDisplay: '',
    isCurrentViewMonth: true,
    repaySwitchLabel: '本月已还款',
    card: null,
  },

  onLoad(query) {
    const id = query.id || '';
    const ym = normalizeYm(query.ym ? decodeURIComponent(query.ym) : currentYm());
    const isCurrentViewMonth = ym === currentYm();
    this.setData({
      id,
      viewYm: ym,
      ymDisplay: ymDisplayLabel(ym),
      isCurrentViewMonth,
      repaySwitchLabel: isCurrentViewMonth ? '本月已还款' : `${ymDisplayLabel(ym)} 已还款`,
    });
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const { id, viewYm } = this.data;
    if (!id) {
      wx.navigateBack();
      return;
    }
    const raw = await dataStore.getCardById(id);
    if (!raw) {
      wx.showToast({ title: '卡片不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    const ym = normalizeYm(viewYm || currentYm());
    const isCurrentViewMonth = ym === currentYm();
    this.setData({
      viewYm: ym,
      ymDisplay: ymDisplayLabel(ym),
      isCurrentViewMonth,
      repaySwitchLabel: isCurrentViewMonth ? '本月已还款' : `${ymDisplayLabel(ym)} 已还款`,
      card: enrichCard(raw, ym),
    });
  },

  async onRepaidChange(e) {
    const want = !!e.detail.value;
    const { id, viewYm } = this.data;
    const ym = normalizeYm(viewYm || currentYm());
    const raw = await dataStore.getCardById(id);
    if (!raw) return;
    const card = migrateRepaidMonths(raw);
    const months = { ...card.repaid_months };
    if (want) {
      months[ym] = true;
    } else {
      delete months[ym];
    }
    const ok = await dataStore.updateCard(id, {
      repaid_months: months,
      repaid: false,
      repaid_for_due_ymd: '',
    });
    if (!ok) {
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
      return;
    }
    const next = await dataStore.getCardById(id);
    const isCurrentViewMonth = ym === currentYm();
    this.setData({
      card: enrichCard(next, ym),
      repaySwitchLabel: isCurrentViewMonth ? '本月已还款' : `${ymDisplayLabel(ym)} 已还款`,
    });
  },

  onEdit() {
    const { id } = this.data;
    wx.navigateTo({ url: `/pages/card-form/card-form?mode=edit&id=${id}` });
  },

  onDelete() {
    const { id } = this.data;
    wx.showModal({
      title: '删除信用卡',
      content: '确定删除该卡片？此操作不可恢复。',
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
        setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 400);
      },
    });
  },
});
