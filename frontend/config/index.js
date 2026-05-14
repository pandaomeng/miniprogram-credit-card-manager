/**
 * 可调参数集中在此。修改后需与微信开发者工具里「云环境」、云托管控制台一致。
 *
 * INVALID_HOST（callContainer 返回 404 + data.code）常见原因：
 * - cloudEnvId 不是该云托管服务所在的环境 ID（须与 wx.cloud.init 的 env 一致）
 * - 小程序未绑定该云开发环境，或当前 AppID 无权访问该环境
 * - cloudContainerService 与控制台「服务名称」不一致（勿填版本号如 xxx-002）
 */

module.exports = {
  cloudEnvId: 'cloud1-3ggo73sl430a5422',

  /** 云托管控制台「服务管理」中的服务名称，例如 koa-8fpu；留空则不走 callContainer */
  cloudContainerService: 'koa-8wop',

  /** 直连 HTTP 根地址（不要末尾 /）；与 cloudContainerService 二选一，优先 callContainer */
  apiBaseUrl: '',

  /** 仅配合 apiBaseUrl 本地调试 */
  devOpenid: '',

  enableBootstrapOnLaunch: true,
};
