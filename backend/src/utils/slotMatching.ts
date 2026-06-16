import { moscowDateString, moscowTimeParts } from './moscowTime.js';

export function parseTimeSlot(slot: string): { hour: number; minute: number } {
  const [h, m] = slot.split(':').map((v) => Number(v.trim()));
  return { hour: h || 0, minute: m || 0 };
}

/** True if current MSK time is within [slot, slot + windowMinutes). */
export function isInSlotWindow(
  slot: string,
  now = new Date(),
  windowMinutes = 5,
): boolean {
  const { hour, minute } = parseTimeSlot(slot);
  const { hours, minutes } = moscowTimeParts(now);
  const nowTotal = hours * 60 + minutes;
  const slotTotal = hour * 60 + minute;
  return nowTotal >= slotTotal && nowTotal < slotTotal + windowMinutes;
}

export function slotDedupKey(type: string, slot: string, date = moscowDateString()): string {
  return `${type}:${slot}:${date}`;
}

export function isNfoDayTimeOpen(
  publishHour: number,
  publishMinute: number,
  now = new Date(),
): boolean {
  const { hours, minutes } = moscowTimeParts(now);
  return hours * 60 + minutes >= publishHour * 60 + publishMinute;
}
