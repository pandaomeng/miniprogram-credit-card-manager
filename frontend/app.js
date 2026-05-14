const appConfig = require('./config/index.js');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: appConfig.cloudEnvId,
        traceUser: true,
      });

      if (appConfig.enableBootstrapOnLaunch) {
        wx.cloud
          .callFunction({
            name: 'bootstrap',
            data: { withDemo: true },
          })
          .catch((e) => {
            console.error('[bootstrap] failed:', e);
          });
      }
    }
  },
  globalData: {
    cloudEnvId: appConfig.cloudEnvId,
    cloudContainerService: appConfig.cloudContainerService,
    apiBaseUrl: appConfig.apiBaseUrl,
    devOpenid: appConfig.devOpenid,
  },
});
