/**
 * 可调参数集中在此。数据读写仅通过云托管（callContainer）或直连 HTTP，不再使用云函数。
 *
 * INVALID_HOST（callContainer 返回 404 + data.code）常见原因：
 * - cloudEnvId 不是该云托管服务所在的环境 ID（须与 wx.cloud.init 的 env 一致）
 * - 小程序未绑定该云开发环境，或当前 AppID 无权访问该环境
 * - cloudContainerService 与控制台「服务名称」不一致（勿填版本号如 xxx-002）
 */

module.exports = {
  cloudEnvId: 'prod-d4gfdc0xea6f1fc4c',

  /**
   * 银行图标（静态资源存储）：根 URL（https，不要末尾 /）。
   * 静态资源走 CDN，一般没有对象存储那种 cloud:// 文件 ID；若已用 CLI 传到静态存储，在此填控制台「静态资源存储」默认访问域名，
   * 图标地址为 `${bankLogoStaticBaseUrl}/banks/ICBC.png`（banks 与 bankLogoStaticPathPrefix、上传 --remotePath 一致）。
   * 须在小程序后台将该域名配置为 downloadFile 合法域名。
   *
   * 留空时：真机用对象存储云文件 ID（cloud://…）作 image 的 src（基础库 ≥2.3.0）；开发者工具内 WebView 会把 cloud:// 误拼成页面相对路径，
   * 此时会自动 getTempFileURL 换临时 HTTPS。文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/guide/storage/api.html
   * 与 https://developers.weixin.qq.com/miniprogram/dev/component/image.html
   */
  bankLogoStaticBaseUrl: 'https://prod-d4gfdc0xea6f1fc4c-1431177038.tcloudbaseapp.com',

  /** 与 wxcloud storage:upload 的 --remotePath 一致，默认 banks */
  bankLogoStaticPathPrefix: 'banks',

  /** 云托管控制台「服务管理」中的服务名称，例如 koa-8fpu；留空则不走 callContainer */
  cloudContainerService: 'koa-ie25',

  /** 直连 HTTP 根地址（不要末尾 /）；与 cloudContainerService 二选一，优先 callContainer */
  apiBaseUrl: '',

  /** 仅配合 apiBaseUrl 本地调试 */
  devOpenid: '',
};
