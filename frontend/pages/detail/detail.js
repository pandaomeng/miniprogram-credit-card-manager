const dataStore = require('../../services/data-store.js');
const bankLogo = require('../../services/bank-logo.js');
const {
  enrichCard,
  currentYm,
  normalizeYm,
  ymDisplayLabel,
} = require('../../utils/card-helpers.js');

Page({
  data: {
    id: '',
    viewYm: '',
    ymDisplay: '',
    isCurrentViewMonth: true,
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
    const card = enrichCard(raw, ym);
    const logoByCode = await bankLogo.resolveUrlsByCards([card]);
    this.setData({
      viewYm: ym,
      ymDisplay: ymDisplayLabel(ym),
      isCurrentViewMonth,
      card: {
        ...card,
        logo_path: logoByCode[card.bank_code] || '',
      },
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
