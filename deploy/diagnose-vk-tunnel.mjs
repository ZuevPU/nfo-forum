/**
 * Diagnose VK Tunnel auth without logging secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tunnelStorePath = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config/configstore/@vkontakte/vk-tunnel.json',
);
const configPath = path.join(root, 'frontend', 'vk-tunnel-config.json');

const cfg = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : null;
const store = fs.existsSync(tunnelStorePath)
  ? JSON.parse(fs.readFileSync(tunnelStorePath, 'utf8'))
  : null;

if (!cfg?.app_id) {
  console.log('FAIL: missing app_id in frontend/vk-tunnel-config.json');
  process.exit(1);
}

if (!store?.accessToken) {
  console.log(`FAIL: no tunnel OAuth token in configstore (${tunnelStorePath})`);
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
  console.log(`FAIL: ${json.error.error_code} ${json.error.error_msg}`);
  process.exit(1);
}

console.log('OK: tunnel token received');
