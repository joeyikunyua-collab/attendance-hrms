/** Formats a Date using its LOCAL year/month/day - never round-trip a local
 * date through toISOString() here, since that converts to UTC and silently
 * shifts the calendar day for any timezone ahead of UTC. */
export function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function isWeekend(dateStr: string, weekendDays: number[] = [0, 6]): boolean {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return weekendDays.includes(day);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/** Returns "HH:MM" for the current 30-min check-in reminder slot within
 * [start, end], or null if `now` is outside that window. */
export function checkInReminderSlot(now: Date, start = "09:00", end = "12:00"): string | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < toMinutes(start) || minutes > toMinutes(end)) return null;
  const slotMinutes = Math.floor(minutes / 30) * 30;
  const h = String(Math.floor(slotMinutes / 60)).padStart(2, "0");
  const m = String(slotMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}
