/* eslint-disable no-console */
/**
 * 临时脚本：验证 cloud fileId 对应的临时下载 URL。
 * 腾讯云 SecretId / SecretKey 从环境变量或本地 env 文件读取（勿写入仓库）。
 * 可在仓库根目录或 credit-manager 目录放置（与 upload-bank-logos-to-wxcloud.js 一致）：
 *   .env.wx_cloud_secret_id、.env.wx_cloud_secret_key（各一行明文）
 *   .env.wx_cloud_env_id（云开发环境 ID）
 */
const fs = require('node:fs');
const path = require('node:path');
const tcb = require('@cloudbase/node-sdk');

const scriptDir = __dirname;
const creditManagerRoot = path.basename(scriptDir) === 'frontend'
  ? path.resolve(scriptDir, '..')
  : scriptDir;
const workspaceRoot = path.resolve(creditManagerRoot, '..');

function readText(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
}

function firstNonEmpty(paths) {
  for (const p of paths) {
    const v = readText(p);
    if (v) return v;
  }
  return '';
}

const secretId = (process.env.TENCENTCLOUD_SECRET_ID || '').trim()
  || firstNonEmpty([
    path.resolve(creditManagerRoot, '.env.wx_cloud_secret_id'),
    path.resolve(workspaceRoot, '.env.wx_cloud_secret_id'),
  ]);

const secretKey = (process.env.TENCENTCLOUD_SECRET_KEY || '').trim()
  || firstNonEmpty([
    path.resolve(creditManagerRoot, '.env.wx_cloud_secret_key'),
    path.resolve(workspaceRoot, '.env.wx_cloud_secret_key'),
  ]);

const env = (process.env.WX_CLOUD_ENV_ID || '').trim()
  || firstNonEmpty([
    path.resolve(creditManagerRoot, '.env.wx_cloud_env_id'),
    path.resolve(workspaceRoot, '.env.wx_cloud_env_id'),
  ]);

if (!secretId || !secretKey || !env) {
  console.error(
    '缺少腾讯云凭证或环境 ID。请设置 TENCENTCLOUD_SECRET_ID、TENCENTCLOUD_SECRET_KEY、WX_CLOUD_ENV_ID，\n'
    + '或在仓库根 / credit-manager 下创建 .env.wx_cloud_secret_id、.env.wx_cloud_secret_key、.env.wx_cloud_env_id（各一行）。',
  );
  process.exit(1);
}

const app = tcb.init({ env, secretId, secretKey });

async function run() {
  const fileList = [
    `cloud://${env}/banks/ICBC.png`,
    `cloud://${env}.636c-${env}-1414890388/banks/ICBC.png`,
  ];
  const res = await app.getTempFileURL({ fileList });
  console.log(JSON.stringify(res, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });
