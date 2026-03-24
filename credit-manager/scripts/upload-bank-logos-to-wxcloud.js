#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 使用官方 wxcloud CLI 上传 bank.logo 图标
 * 流程：登录 -> 先上传 1 张验证 -> 再全量上传
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');

function readText(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (e) {
    return '';
  }
}

function firstNonEmpty(list) {
  for (const p of list) {
    const v = readText(p);
    if (v) return v;
  }
  return '';
}

const envId = process.env.WX_CLOUD_ENV_ID || firstNonEmpty([
  process.env.WX_CLOUD_ENV_ID_FILE,
  path.resolve(PROJECT_ROOT, '.env.wx_cloud_env_id'),
  path.resolve(WORKSPACE_ROOT, '.env.wx_cloud_env_id'),
]);
const appId = process.env.WX_APPID || firstNonEmpty([
  process.env.WX_APPID_FILE,
  path.resolve(PROJECT_ROOT, '.env.wx_appid'),
  path.resolve(WORKSPACE_ROOT, '.env.wx_appid'),
]) || 'wx430b4ef45ec467c8';
const privateKey = process.env.WXCLOUD_PRIVATE_KEY || firstNonEmpty([
  process.env.WXCLOUD_PRIVATE_KEY_FILE,
  path.resolve(PROJECT_ROOT, '.env.cloud_key'),
  path.resolve(WORKSPACE_ROOT, '.env.cloud_key'),
]);
const repoUrl = process.env.BANK_LOGO_REPO_URL || 'https://github.com/burningmyself/bank.logo.git';
const tmpDir = path.resolve(PROJECT_ROOT, process.env.BANK_LOGO_TMP_DIR || '.tmp-bank-logo-repo');
const sourceSubdir = process.env.BANK_LOGO_SOURCE_SUBDIR || 'resource/logo';
const remotePath = process.env.BANK_LOGO_REMOTE_PATH || '/banks';
const outputJson = path.resolve(PROJECT_ROOT, process.env.BANK_LOGO_OUTPUT_JSON || 'assets/bank-logo-fileids.json');

function runOrThrow(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, {
    cwd: options.cwd || PROJECT_ROOT,
    encoding: 'utf8',
    stdio: options.stdio || 'inherit',
  });
  if (r.status !== 0) {
    throw new Error(`命令失败: ${cmd} ${args.join(' ')}`);
  }
}

function runCapture(cmd, args, cwd = PROJECT_ROOT) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  if (r.status !== 0) {
    const detail = [r.stdout || '', r.stderr || ''].filter(Boolean).join('\n');
    throw new Error(`命令失败: ${cmd} ${args.join(' ')}\n${detail}`);
  }
  return r.stdout || '';
}

function assertInputs() {
  if (!envId) throw new Error('缺少 envId，请设置 WX_CLOUD_ENV_ID 或 .env.wx_cloud_env_id');
  if (!privateKey) throw new Error('缺少 privateKey，请设置 WXCLOUD_PRIVATE_KEY 或 .env.cloud_key');
}

function ensureRepo() {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log('> 克隆图标仓库...');
  runOrThrow('git', ['clone', '--depth', '1', repoUrl, tmpDir], { stdio: 'pipe' });
}

function listPngFiles() {
  const dir = path.resolve(tmpDir, sourceSubdir);
  if (!fs.existsSync(dir)) throw new Error(`图标目录不存在: ${dir}`);
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.png$/i.test(d.name))
    .map((d) => path.resolve(dir, d.name))
    .sort();
}

function loginWxcloud() {
  console.log('> 登录 wxcloud CLI...');
  runOrThrow('wxcloud', ['login', '-a', appId, '-k', privateKey]);
}

function uploadOne(filePath) {
  console.log(`> 先上传 1 张验证: ${path.basename(filePath)}`);
  runOrThrow('wxcloud', [
    'storage:upload',
    filePath,
    '-e',
    envId,
    '-m',
    'storage',
    '-r',
    remotePath,
  ]);
}

function uploadAll(dirPath) {
  console.log('> 开始全量上传...');
  runOrThrow('wxcloud', [
    'storage:upload',
    dirPath,
    '-e',
    envId,
    '-m',
    'storage',
    '-r',
    remotePath,
  ]);
}

function writeMapping(files) {
  const normRemote = remotePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const map = {};
  files.forEach((f) => {
    const name = path.basename(f);
    const code = name.replace(/\.png$/i, '');
    map[code] = `cloud://${envId}/${normRemote}/${name}`;
  });
  fs.mkdirSync(path.dirname(outputJson), { recursive: true });
  fs.writeFileSync(outputJson, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  console.log(`> 已写入映射: ${path.relative(PROJECT_ROOT, outputJson)}`);
}

function checkWxcloudInstalled() {
  try {
    runCapture('wxcloud', ['--help']);
  } catch (e) {
    throw new Error('未检测到 wxcloud CLI，请先执行: npm i -g @wxcloud/cli');
  }
}

function main() {
  assertInputs();
  checkWxcloudInstalled();
  ensureRepo();
  const files = listPngFiles();
  if (!files.length) throw new Error('未找到 png 图标');
  loginWxcloud();
  uploadOne(files[0]);
  uploadAll(path.resolve(tmpDir, sourceSubdir));
  writeMapping(files);
  console.log(`> 上传完成，共 ${files.length} 张`);
}

try {
  main();
} catch (e) {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
}
