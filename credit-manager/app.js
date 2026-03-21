const storage = require('./utils/storage.js');

App({
  onLaunch() {
    storage.ensureDemoSeeded();
  },
  globalData: {},
});
