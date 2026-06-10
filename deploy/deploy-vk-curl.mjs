/**
 * VK Hosting deploy workaround: curl upload (node-fetch ECONNRESET on Windows).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const configPath = path.join(frontend, 'vk-hosting-config.json');
const tokenPath = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config/configstore/@vkontakte/vk-miniapps-deploy.json',
);

const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const vault = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const accessToken = process.env.MINI_APPS_ACCESS_TOKEN || vault.access_token;
if (!accessToken) throw new Error('Run vk-miniapps-deploy once to save access token');

const appId = Number(process.env.MINI_APPS_APP_ID || cfg.app_id);
if (!appId) throw new Error('Set app_id in vk-hosting-config.json');

const deployEnv = (process.env.MINI_APPS_ENVIRONMENT || 'dev').toLowerCase();
const isDevOnly = deployEnv === 'dev';

function getHostingParams() {
  if (isDevOnly) {
    return { environment: '1', update_prod: '0', update_dev: '1' };
  }
  return {
    environment: '2',
    update_prod: String(cfg.update_prod ?? 1),
    update_dev: String(cfg.update_dev ?? 1),
  };
}

const staticPath = cfg.static_path || 'dist';
const zipPath = path.join(frontend, cfg.bundleFile?.replace('./', '') || 'dist.zip');
const distDir = path.join(frontend, staticPath);

if (!fs.existsSync(distDir)) throw new Error(`Missing ${distDir} — run npm run build -w frontend`);

function zipDist() {
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${path.join(distDir, '*')}' -DestinationPath '${zipPath}' -Force`,
    ],
    { stdio: 'inherit' },
  );
}

async function vkApiRaw(method, params) {
  const qs = new URLSearchParams({
    access_token: accessToken,
    v: '5.131',
    cli_version: '2',
    ...params,
  });
  const res = await fetch(`https://api.vk.ru/method/${method}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.error_code}: ${json.error.error_msg}`);
  return json.response;
}

async function vkApi(method, extra = {}) {
  const hosting = getHostingParams();
  const base = {
    access_token: accessToken,
    v: '5.131',
    cli_version: '2',
    app_id: String(appId),
    environment: hosting.environment,
    update_prod: hosting.update_prod,
    update_dev: hosting.update_dev,
    endpoint_mobile: cfg.endpoints.mobile,
    endpoint_web: cfg.endpoints.web,
    endpoint_mvk: cfg.endpoints.mvk,
    ...extra,
  };
  const qs = new URLSearchParams(base);
  const res = await fetch(`https://api.vk.ru/method/${method}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.error_code}: ${json.error.error_msg}`);
  return json.response;
}

function curlUpload(uploadUrl) {
  const out = execFileSync(
    'curl.exe',
    ['-s', '-S', '-X', 'POST', '-F', `file=@${zipPath};type=application/zip`, uploadUrl],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

const URL_LABELS = {
  m_iframe_secure_url: 'mobile',
  iframe_secure_url: 'web',
  vk_mini_app_mvk_url: 'mvk',
  vk_app_dev_url: 'mobile_dev',
  vk_app_desktop_dev_url: 'web_dev',
  vk_mini_app_mvk_dev_url: 'mvk_dev',
};

const HOSTING_URL_KEYS = Object.keys(URL_LABELS);

async function fetchHostingUrlsFromApi() {
  try {
    const app = await vkApiRaw('apps.get', { app_id: String(appId) });
    const urls = {};
    for (const key of HOSTING_URL_KEYS) {
      if (app[key]) urls[key] = app[key];
    }
    return Object.keys(urls).length > 0 ? urls : null;
  } catch (error) {
    console.warn('apps.get fallback failed:', error.message);
    return null;
  }
}

function printUrls(urls) {
  console.log('\nURLs (для раздела «Размещение» в dev.vk.com):');
  for (const [k, v] of Object.entries(urls)) {
    if (k === 'iframe_url') continue;
    const label = URL_LABELS[k] || k;
    console.log(`  ${label}: ${v}`);
  }
}

function isDeployComplete(handled) {
  if (isDevOnly) return handled.dev;
  return handled.production && handled.dev;
}

function processQueueEvent(event, handled) {
  if (event.type === 'error') {
    throw new Error(`Deploy error #${event.code}: ${event.message || ''}`);
  }
  if (event.type !== 'success') return { needsConfirmCode: false };

  if (event.code === 200) console.log('Deploy success...');
  if (event.code === 203) console.log('Подтвердите деплой в приложении VK на телефоне.');
  if (event.code === 204) console.log('Деплой подтверждён.');
  if (event.code === 205) {
    console.log('VK отправил код подтверждения в сообщения «Администрация».');
    return { needsConfirmCode: true };
  }

  if (event.code === 201 && event.message?.urls) {
    console.log('\nURLs updated:');
    printUrls(event.message.urls);
    if (event.message.is_production) handled.production = true;
    else handled.dev = true;
  }

  if (event.code === 202) {
    if (Number(event.message?.environment) === 2) handled.production = true;
    if (Number(event.message?.environment) === 1) handled.dev = true;
  }

  return { needsConfirmCode: false };
}

async function promptConfirmCode(version) {
  if (process.env.VK_DEPLOY_CONFIRM_CODE) {
    const code = process.env.VK_DEPLOY_CONFIRM_CODE.trim();
    await vkApiRaw('apps.confirmDeploy', {
      app_id: String(appId),
      version: String(version),
      code,
    });
    console.log('Код подтверждения отправлен.');
    return true;
  }

  const rl = createInterface({ input, output });
  console.log('\nПроверьте сообщения VK от «Администрация» (или push на телефон).');
  const code = (await rl.question('Введите код подтверждения деплоя (Enter = пропустить): ')).trim();
  rl.close();
  if (!code) return false;

  await vkApiRaw('apps.confirmDeploy', {
    app_id: String(appId),
    version: String(version),
    code,
  });
  console.log('Код подтверждения отправлен.');
  return true;
}

async function pollQueue(version, { maxPolls = 120, emptyPromptAfter = 6 } = {}) {
  const sub = await vkApi('apps.subscribeToHostingQueue', { version: String(version) });
  let ts = sub.ts;
  let handled = { production: false, dev: false };
  let emptyStreak = 0;
  let confirmPrompted = false;
  const allowConfirm = !isDevOnly;

  for (let i = 0; i < maxPolls; i++) {
    const url = `${sub.base_url}?act=a_check&key=${sub.key}&ts=${ts}&id=${sub.app_id}&wait=5`;
    const res = await fetch(url);
    const data = await res.json();
    ts = data.ts;

    const events = data.events || [];

    if (events.length === 0) {
      emptyStreak += 1;
      if (allowConfirm && !confirmPrompted && emptyStreak >= emptyPromptAfter) {
        confirmPrompted = true;
        const confirmed = await promptConfirmCode(version);
        if (confirmed) {
          emptyStreak = 0;
          continue;
        }
      }
    } else {
      emptyStreak = 0;
    }

    let needsConfirmCode = false;
    for (const ev of events) {
      const result = processQueueEvent(ev.data, handled);
      if (result.needsConfirmCode) needsConfirmCode = true;
    }

    if (allowConfirm && needsConfirmCode && !confirmPrompted) {
      confirmPrompted = true;
      const confirmed = await promptConfirmCode(version);
      if (confirmed) continue;
    }

    if (isDeployComplete(handled)) {
      console.log(`\nDone (${deployEnv}). Open https://vk.com/app${appId}`);
      return true;
    }
  }

  return false;
}

console.log(`=== VK Hosting deploy (curl upload, mode: ${deployEnv}) ===`);
zipDist();
console.log(`Zip: ${zipPath} (${Math.round(fs.statSync(zipPath).size / 1024)} KB)`);

const { upload_url: uploadUrl } = await vkApi('apps.getGoHostingUploadServer');
console.log('Uploading via curl...');
const uploadResponse = curlUpload(uploadUrl);
console.log('Upload OK, creating hosting task...');

const uploadB64 = Buffer.from(JSON.stringify(uploadResponse)).toString('base64');
const task = await vkApi('apps.createGoHostingTask', { upload_response: uploadB64 });
console.log(`Uploaded version ${task.version}`);
const queueOk = await pollQueue(task.version);

if (!queueOk) {
  console.log('\nФайлы загружены (version ' + task.version + '), но VK не подтвердил обновление URL.');
  const fallbackUrls = await fetchHostingUrlsFromApi();
  if (fallbackUrls) {
    console.log('\nТекущие URL из apps.get (вставьте в dev.vk.com → Размещение):');
    printUrls(fallbackUrls);
  }
  if (isDevOnly) {
    console.log('Попробуйте снова через несколько минут или проверьте лимит 24 деплоя/сутки.');
    console.log('Чеклист кабинета: deploy/VK_CABINET_CHECKLIST.md');
  } else {
    console.log('1. Откройте сообщения VK от «Администрация» и найдите код подтверждения.');
    console.log('2. Запустите:');
    console.log('   $env:VK_DEPLOY_CONFIRM_CODE="ВАШ_КОД"; npm run deploy:vk:prod');
    console.log('   Либо выключите debug-режим в dev.vk.com и повторите деплой.');
  }
  process.exit(1);
}
