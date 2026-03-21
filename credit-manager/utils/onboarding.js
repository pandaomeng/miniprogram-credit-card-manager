const { STORAGE_ONBOARDING } = require('./constants.js');
const { toastFail } = require('./storage.js');

function isDone() {
  try {
    return !!wx.getStorageSync(STORAGE_ONBOARDING);
  } catch (e) {
    toastFail();
    return true;
  }
}

function markDone() {
  try {
    wx.setStorageSync(STORAGE_ONBOARDING, true);
    return true;
  } catch (e) {
    toastFail();
    return false;
  }
}

module.exports = { isDone, markDone };
