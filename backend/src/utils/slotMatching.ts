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

const CHECKIN_SLOT_LABELS = ['Утренний чек-in', 'Дневной чек-in', 'Вечерний чек-in'];

export function getCheckinSlotLabel(slotIndex: number): string {
  if (slotIndex <= 0) return CHECKIN_SLOT_LABELS[0];
  if (slotIndex === 1) return CHECKIN_SLOT_LABELS[1];
  return CHECKIN_SLOT_LABELS[2];
}

export interface CheckinInterval {
  start: string;
  end: string;
  label?: string;
}

export function getCurrentIntervalIndex(intervals: CheckinInterval[], now = new Date()): number | null {
  if (intervals.length === 0) return null;
  const { hours, minutes } = moscowTimeParts(now);
  const nowTotal = hours * 60 + minutes;

  for (let i = 0; i < intervals.length; i++) {
    const start = slotStartMinutes(intervals[i].start);
    const end = intervals[i].end === '24:00' ? 24 * 60 : slotStartMinutes(intervals[i].end);
    if (nowTotal >= start && nowTotal < end) return i;
  }
  return null;
}

export function getNextInterval(
  intervals: CheckinInterval[],
  now = new Date(),
): { start: string; index: number; label: string } | null {
  if (intervals.length === 0) return null;
  const { hours, minutes } = moscowTimeParts(now);
  const nowTotal = hours * 60 + minutes;

  for (let i = 0; i < intervals.length; i++) {
    const start = slotStartMinutes(intervals[i].start);
    if (nowTotal < start) {
      return {
        start: intervals[i].start,
        index: i,
        label: intervals[i].label ?? getCheckinSlotLabel(i),
      };
    }
  }
  return null;
}

export function mapCheckinToIntervalIndex(createdAt: Date, intervals: CheckinInterval[]): number | null {
  if (intervals.length === 0) return null;
  const { hours, minutes } = moscowTimeParts(createdAt);
  const total = hours * 60 + minutes;

  for (let i = 0; i < intervals.length; i++) {
    const start = slotStartMinutes(intervals[i].start);
    const end = intervals[i].end === '24:00' ? 24 * 60 : slotStartMinutes(intervals[i].end);
    if (total >= start && total < end) return i;
  }
  return null;
}

/** First slot whose MSK window [slot, slot + windowMinutes) contains now. */
export function getActiveCheckinSlot(
  slots: string[],
  now = new Date(),
  windowMinutes = 60,
): { slot: string; index: number } | null {
  for (let i = 0; i < slots.length; i++) {
    if (isInSlotWindow(slots[i], now, windowMinutes)) {
      return { slot: slots[i], index: i };
    }
  }
  return null;
}

function slotStartMinutes(slot: string): number {
  const { hour, minute } = parseTimeSlot(slot);
  return hour * 60 + minute;
}

/** Active slot by interval [slot[i], slot[i+1]) or [last, end of day). */
export function getCurrentCheckinSlotIndex(slots: string[], now = new Date()): number | null {
  if (slots.length === 0) return null;
  const { hours, minutes } = moscowTimeParts(now);
  const nowTotal = hours * 60 + minutes;

  for (let i = 0; i < slots.length; i++) {
    const start = slotStartMinutes(slots[i]);
    const end = i < slots.length - 1 ? slotStartMinutes(slots[i + 1]) : 24 * 60;
    if (nowTotal >= start && nowTotal < end) return i;
  }
  return null;
}

export function getNextCheckinSlot(
  slots: string[],
  now = new Date(),
): { slot: string; index: number; label: string } | null {
  if (slots.length === 0) return null;
  const { hours, minutes } = moscowTimeParts(now);
  const nowTotal = hours * 60 + minutes;

  for (let i = 0; i < slots.length; i++) {
    const start = slotStartMinutes(slots[i]);
    if (nowTotal < start) {
      return { slot: slots[i], index: i, label: getCheckinSlotLabel(i) };
    }
  }
  return null;
}

export function mapCheckinToSlotIndex(createdAt: Date, slots: string[]): number | null {
  if (slots.length === 0) return null;
  const { hours, minutes } = moscowTimeParts(createdAt);
  const total = hours * 60 + minutes;

  for (let i = 0; i < slots.length; i++) {
    const start = slotStartMinutes(slots[i]);
    const end = i < slots.length - 1 ? slotStartMinutes(slots[i + 1]) : 24 * 60;
    if (total >= start && total < end) return i;
  }
  return null;
}
