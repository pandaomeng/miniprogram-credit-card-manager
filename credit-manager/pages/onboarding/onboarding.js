const onboarding = require('../../utils/onboarding.js');

Page({
  data: {
    statusBarHeight: 44,
    slides: [
      {
        title: '集中管理所有信用卡',
        desc: '账单日、还款日一目了然，告别多张卡分散记录。',
      },
      {
        title: '还款提醒更安心',
        desc: '自动计算距离下次还款天数，临近还款高亮提示。',
      },
      {
        title: '防止逾期',
        desc: '本地保存卡号后四位与日期信息，合理规划资金。',
      },
    ],
  },

  onLoad() {
    if (onboarding.isDone()) {
      wx.redirectTo({ url: '/pages/home/home' });
      return;
    }
    const win = wx.getWindowInfo ? wx.getWindowInfo() : {};
    const sys = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: win.statusBarHeight || sys.statusBarHeight || 44,
    });
  },

  goHome() {
    if (!onboarding.markDone()) return;
    wx.reLaunch({ url: '/pages/home/home' });
  },

  onStart() {
    this.goHome();
  },

  onSkip() {
    this.goHome();
  },
});
