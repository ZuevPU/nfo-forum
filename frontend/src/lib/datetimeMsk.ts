const MSK = 'Europe/Moscow';

function mskParts(iso: string): { year: string; month: string; day: string; hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MSK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** ISO UTC → value for `<input type="datetime-local">` (interpreted as Moscow wall time). */
export function isoToDatetimeLocalMsk(iso: string): string {
  const { year, month, day, hour, minute } = mskParts(iso);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** datetime-local value → ISO UTC, treating input as Moscow (+03:00). */
export function datetimeLocalMskToIso(value: string): string {
  if (!value) return new Date().toISOString();
  return new Date(`${value}:00+03:00`).toISOString();
}

/** Hour/minute in Moscow → "HH:MM" for `<input type="time">`. */
export function mskTimeToInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** `<input type="time">` value → { hour, minute }. */
export function inputTimeToMskParts(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':');
  return {
    hour: Math.min(23, Math.max(0, Number(h) || 0)),
    minute: Math.min(59, Math.max(0, Number(m) || 0)),
  };
}
