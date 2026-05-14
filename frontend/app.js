const appConfig = require('./config/index.js');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: appConfig.cloudEnvId,
        traceUser: true,
      });
    }
  },
  globalData: {
    cloudEnvId: appConfig.cloudEnvId,
    cloudContainerService: appConfig.cloudContainerService,
    apiBaseUrl: appConfig.apiBaseUrl,
    devOpenid: appConfig.devOpenid,
  },
});
