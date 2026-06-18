import { appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../../debug-9d5534.log');

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  const payload = {
    sessionId: '9d5534',
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
  };

  // #region agent log
  try {
    appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore */
  }
  fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '9d5534' },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
