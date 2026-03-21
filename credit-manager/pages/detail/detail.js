const storage = require('../../utils/storage.js');
const { enrichCard, nextDueYmd } = require('../../utils/card-helpers.js');

Page({
  data: {
    id: '',
    card: null,
  },

  onLoad(query) {
    this.setData({ id: query.id || '' });
  },

  onShow() {
    const { id } = this.data;
    if (!id) {
      wx.navigateBack();
      return;
    }
    const raw = storage.getCardById(id);
    if (!raw) {
      wx.showToast({ title: '卡片不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    this.setData({ card: enrichCard(raw) });
  },

  onRepaidChange(e) {
    const want = e.detail.value;
    const { id } = this.data;
    const raw = storage.getCardById(id);
    if (!raw) return;
    const ymd = nextDueYmd(raw.due_day);
    const patch = want
      ? { repaid: true, repaid_for_due_ymd: ymd }
      : { repaid: false, repaid_for_due_ymd: '' };
    if (!storage.updateCard(id, patch)) return;
    const next = storage.getCardById(id);
    this.setData({ card: enrichCard(next) });
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
      success: (res) => {
        if (!res.confirm) return;
        if (!storage.deleteCard(id)) return;
        wx.showToast({ title: '已删除', icon: 'success' });
        setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 400);
      },
    });
  },
});
