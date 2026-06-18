import { runCronJob } from './cron.service.js';

const POLL_INTERVAL_MS = 60_000;
const STARTUP_DELAY_MS = 15_000;

let timer: ReturnType<typeof setInterval> | null = null;
let startupTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;

async function runScheduledBroadcastsTick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await runCronJob('scheduled-broadcasts');
    if ((result.sent ?? 0) > 0) {
      console.info(`[scheduler] Delivered ${result.sent} scheduled broadcast(s)`);
    }
    if (result.vkError) {
      console.error('[scheduler] VK error while sending scheduled broadcasts:', result.vkError);
    }
  } catch (error) {
    console.error('[scheduler] scheduled-broadcasts failed:', error);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (timer || startupTimer) return;
  console.info(
    `[scheduler] Internal scheduler started (first tick in ${STARTUP_DELAY_MS / 1000}s, then every 60s)`,
  );
  // Defer first tick so deploy health checks and traffic spikes don't starve the DB pool.
  startupTimer = setTimeout(() => {
    startupTimer = null;
    void runScheduledBroadcastsTick();
    timer = setInterval(() => void runScheduledBroadcastsTick(), POLL_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

export function stopScheduler(): void {
  if (startupTimer) {
    clearTimeout(startupTimer);
    startupTimer = null;
  }
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
