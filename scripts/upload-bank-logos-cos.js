#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 使用微信云托管官方 CLI 将本地银行图标上传到「对象存储」或「静态存储」。
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/guide/cli/
 * 对应命令：wxcloud login、wxcloud storage:upload（--mode=storage | staticstorage）
 *
 * 默认上传目录：仓库根 .tmp-bank-logo-repo/resource/logo（若无则尝试 resouce/logo）
 *
 * 配置（环境变量优先，否则读 scripts 下「单行」文本；说明见 cos-env.example）：
 * - WXCLOUD_ENV_ID / WX_CLOUD_ENV_ID 或 .env.wx-cloud-env-id，或仓库根 .env.wx_cloud_env_id
 * - WX_APPID / WX_APP_ID 或 .env.app-id（小程序 AppID）
 * - WXCLOUD_PRIVATE_KEY 或 .env.cli-key（控制台「设置 - CLI 密钥」生成，登录用私钥）
 * - 可选地域：WXCLOUD_REGION 或 .env.cos-region（CLI 默认 ap-shanghai）
 *
 * 用法：
 *   cd scripts && npm install && node upload-bank-logos-cos.js
 *   node upload-bank-logos-cos.js --dry-run
 *   node upload-bank-logos-cos.js --prefix banks --concurrency 10
 *   node upload-bank-logos-cos.js --mode staticstorage   # 静态存储，上传目录内全部 PNG
 *   node upload-bank-logos-cos.js --max 20 --skip-login   # 已执行过 wxcloud login 时可跳过
 *   node upload-bank-logos-cos.js --mode staticstorage --max 1   # 静态存储，只传 1 张
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const scriptDir = __dirname;
const repoRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(repoRoot, '..');

const WXCLOUD_CLI_RUN = path.join(scriptDir, 'node_modules', '@wxcloud', 'cli', 'bin', 'run');

function readText(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
}

function readScriptsEnv(name) {
  return readText(path.join(scriptDir, name));
}

function firstNonEmpty(paths) {
  for (const p of paths) {
    const v = readText(p);
    if (v) return v;
  }
  return '';
}

function parseArgs(argv) {
  const out = {
    dryRun: false,
    source: '',
    prefix: (process.env.COS_KEY_PREFIX || 'banks').replace(/^\/+|\/+$/g, ''),
    max: 0,
    concurrency: 8,
    skipLogin: false,
    region: '',
    mode: (process.env.WXCLOUD_STORAGE_MODE || 'storage').trim().toLowerCase(),
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--skip-login') out.skipLogin = true;
    else if (a === '--source' && argv[i + 1]) out.source = argv[++i];
    else if (a === '--prefix' && argv[i + 1]) out.prefix = argv[++i].replace(/^\/+|\/+$/g, '');
    else if (a === '--max' && argv[i + 1]) out.max = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--concurrency' && argv[i + 1]) out.concurrency = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (a === '--region' && argv[i + 1]) out.region = argv[++i].trim();
    else if (a === '--mode' && argv[i + 1]) {
      const m = argv[++i].trim().toLowerCase();
      out.mode = m === 'static' ? 'staticstorage' : m;
    } else if (a.startsWith('--mode=')) {
      const m = a.slice('--mode='.length).trim().toLowerCase();
      out.mode = m === 'static' ? 'staticstorage' : m;
    }
  }
  if (out.mode !== 'storage' && out.mode !== 'staticstorage') {
    console.error('--mode 仅支持 storage（对象存储）或 staticstorage（静态存储）');
    process.exit(1);
  }
  return out;
}

function defaultLogoDir() {
  const a = path.join(repoRoot, '.tmp-bank-logo-repo', 'resource', 'logo');
  const b = path.join(repoRoot, '.tmp-bank-logo-repo', 'resouce', 'logo');
  if (fs.existsSync(a)) return a;
  if (fs.existsSync(b)) return b;
  return a;
}

function listPngFiles(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.toLowerCase().endsWith('.png'))
    .map((n) => path.join(dir, n))
    .sort();
}

function assertCliInstalled() {
  if (!fs.existsSync(WXCLOUD_CLI_RUN)) {
    console.error('未找到 @wxcloud/cli，请在 scripts 目录执行：npm install');
    process.exit(1);
  }
}

function runWxcloud(args) {
  assertCliInstalled();
  const r = spawnSync(process.execPath, [WXCLOUD_CLI_RUN, ...args], {
    stdio: 'inherit',
    cwd: scriptDir,
    env: process.env,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function main() {
  const opts = parseArgs(process.argv);

  const envId = (process.env.WXCLOUD_ENV_ID || process.env.WX_CLOUD_ENV_ID || '').trim()
    || readScriptsEnv('.env.wx-cloud-env-id')
    || firstNonEmpty([
      path.join(repoRoot, '.env.wx_cloud_env_id'),
      path.join(workspaceRoot, '.env.wx_cloud_env_id'),
    ]);

  const appId = (process.env.WX_APPID || process.env.WX_APP_ID || '').trim()
    || readScriptsEnv('.env.app-id');

  const privateKey = (process.env.WXCLOUD_PRIVATE_KEY || '').trim()
    || readScriptsEnv('.env.cli-key');

  const region = (opts.region || process.env.WXCLOUD_REGION || '').trim()
    || readScriptsEnv('.env.cos-region');

  const logoDirBase = opts.source ? path.resolve(opts.source) : defaultLogoDir();
  const allPng = listPngFiles(logoDirBase);
  if (!allPng.length) {
    console.error(`未找到 PNG：${logoDirBase}\n请放置 .tmp-bank-logo-repo/resource/logo 或使用 --source`);
    process.exit(1);
  }

  const fileCount = opts.max > 0 ? Math.min(opts.max, allPng.length) : allPng.length;

  let uploadDir = logoDirBase;
  let cleanup = null;
  if (!opts.dryRun && opts.max > 0) {
    const subset = allPng.slice(0, opts.max);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bank-logos-wxcloud-'));
    subset.forEach((src) => {
      fs.copyFileSync(src, path.join(tmp, path.basename(src)));
    });
    uploadDir = tmp;
    cleanup = () => {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch (e) {
        console.warn('清理临时目录失败:', e.message);
      }
    };
  }

  const displayDir = opts.dryRun && opts.max > 0 ? `${logoDirBase}（前 ${fileCount} 个）` : uploadDir;
  console.log(`本地目录: ${displayDir}`);
  console.log(`云环境 envId: ${envId || '(未配置)'}  上传模式: ${opts.mode}  远端前缀 remotePath: ${opts.prefix}/  将上传文件数: ${fileCount}`);
  if (region) console.log(`地域 --region: ${region}`);

  if (opts.dryRun) {
    const show = opts.max > 0 ? allPng.slice(0, opts.max) : allPng.slice(0, Math.min(15, allPng.length));
    show.forEach((p) => console.log('  [dry-run]', path.basename(p)));
    if (fileCount > show.length) console.log(`  … 共 ${fileCount} 个`);
    else if (!opts.max && allPng.length > 15) console.log(`  … 共 ${allPng.length} 个`);
    if (!envId || !appId || !privateKey) {
      console.warn('\n（dry-run）缺少 envId / appId / CLI 私钥时实际上传会失败，请配置见脚本头部与 cos-env.example');
    } else {
      console.log('\n（dry-run）实际上传将执行：');
      console.log(`  wxcloud login --appId <appId> --privateKey <私钥>`);
      const tmpPreview = opts.max > 0 ? '<临时目录>' : uploadDir;
      console.log(`  wxcloud storage:upload "${tmpPreview}" --envId=${envId} --mode=${opts.mode} --remotePath=${opts.prefix} --concurrency=${opts.concurrency}${region ? ` --region=${region}` : ''}`);
      if (opts.max > 0) {
        console.log('  （--max>0 时实际上传会先复制到临时目录再上传该目录）');
      }
    }
    return;
  }

  if (!envId || !appId || !privateKey) {
    console.error('缺少配置：需要 envId、AppID、CLI 私钥。请设置环境变量或 scripts/.env.wx-cloud-env-id、.env.app-id、.env.cli-key（见 cos-env.example）');
    if (cleanup) cleanup();
    process.exit(1);
  }

  if (!opts.skipLogin) {
    console.log('wxcloud login …');
    runWxcloud(['login', '--appId', appId, '--privateKey', privateKey]);
  } else {
    console.log('已跳过 wxcloud login（--skip-login）');
  }

  const uploadArgs = [
    'storage:upload',
    uploadDir,
    '--envId', envId,
    '--mode', opts.mode,
    '--remotePath', opts.prefix,
    '--concurrency', String(opts.concurrency),
  ];
  if (region) uploadArgs.push('--region', region);

  console.log('wxcloud storage:upload …');
  runWxcloud(uploadArgs);

  if (cleanup) cleanup();
  console.log('\n上传命令已执行结束（若 CLI 报错请根据终端输出排查）。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
