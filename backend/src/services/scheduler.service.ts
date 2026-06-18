import { runCronJob } from './cron.service.js';

const POLL_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;
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
  if (timer) return;
  console.info('[scheduler] Internal scheduler started (scheduled-broadcasts every 60s)');
  void runScheduledBroadcastsTick();
  timer = setInterval(() => void runScheduledBroadcastsTick(), POLL_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
