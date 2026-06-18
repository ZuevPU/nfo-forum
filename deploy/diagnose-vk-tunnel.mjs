/**
 * Diagnose VK Tunnel auth without logging secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const logPath = path.join(root, 'debug-9d5534.log');
const tunnelStorePath = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config/configstore/@vkontakte/vk-tunnel.json',
);
const configPath = path.join(root, 'frontend', 'vk-tunnel-config.json');

function dbg(hypothesisId, message, data) {
  const line = JSON.stringify({
    sessionId: '9d5534',
    runId: 'diagnose',
    hypothesisId,
    location: 'deploy/diagnose-vk-tunnel.mjs',
    message,
    data,
    timestamp: Date.now(),
  });
  fs.appendFileSync(logPath, line + '\n');
}

const cfg = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : null;
const store = fs.existsSync(tunnelStorePath)
  ? JSON.parse(fs.readFileSync(tunnelStorePath, 'utf8'))
  : null;

dbg('H3', 'config loaded', {
  configExists: Boolean(cfg),
  appId: cfg?.app_id ?? null,
  endpoints: cfg?.endpoints ?? null,
  hasTunnelToken: Boolean(store?.accessToken),
  tunnelUserId: store?.userId ?? null,
});

if (!cfg?.app_id) {
  dbg('H3', 'missing app_id in vk-tunnel-config.json', {});
  process.exit(1);
}

if (!store?.accessToken) {
  dbg('H1', 'no tunnel OAuth token in configstore', { storePath: tunnelStorePath });
  process.exit(1);
}

const qs = new URLSearchParams({
  access_token: store.accessToken,
  version: '1',
  v: '5.199',
  app_id: String(cfg.app_id),
  endpoints: (cfg.endpoints || ['mobile']).join(','),
});

const res = await fetch(`https://api.vk.ru/method/apps.getTunnelToken?${qs}`);
const json = await res.json();

if (json.error) {
  dbg('H2', 'apps.getTunnelToken failed', {
    errorCode: json.error.error_code,
    errorMsg: json.error.error_msg,
    appId: cfg.app_id,
    tunnelUserId: store.userId,
  });
  console.log(`FAIL: ${json.error.error_code} ${json.error.error_msg}`);
  process.exit(1);
}

dbg('H2', 'apps.getTunnelToken ok', {
  hasTunnelUrl: Boolean(json.response?.tunnel_url),
  appId: cfg.app_id,
});
console.log('OK: tunnel token received');
