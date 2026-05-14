const CLOUD_ENV_ID = 'cloud1-3ggo73sl430a5422';

App({
  onLaunch() {
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
    /**
     * 自建后端根地址（不要末尾斜杠）。设置后卡片与首页设置走 HTTP，与云函数二选一以本字段为准。
     * 本地示例: http://127.0.0.1:3000（需在开发者工具中关闭「不校验合法域名」或为该域名配置合法请求域名）
     */
    apiBaseUrl: '',
    /**
     * 仅本地/非云托管联调：后端从请求头 X-Dev-Openid 识别用户。微信云托管线上请求会由平台注入 x-wx-openid，可不填。
     */
    devOpenid: '',
  },
});
