const storage = require('./utils/storage.js');

const CLOUD_ENV_ID = 'cloud1-3ggo73sl430a5422';

App({
  onLaunch() {
    storage.ensureDemoSeeded();

    if (wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true,
      });

      // 自动初始化云端集合与演示数据（失败不影响本地流程）
      wx.cloud.callFunction({
        name: 'bootstrap',
        data: { withDemo: true },
      }).catch((e) => {
        console.error('[bootstrap] failed:', e);
      });
    }
  },
  globalData: {
    cloudEnvId: CLOUD_ENV_ID,
  },
});
