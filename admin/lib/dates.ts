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

export function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 366) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  return dates;
}

/** Returns the current week's dates (Monday first) as YYYY-MM-DD strings. */
export function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
}

export function isWeekend(dateStr: string, weekendDays: number[] = [0, 6]): boolean {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return weekendDays.includes(day);
}

/** True once `date` is on or after the day the employee's record was created,
 * so a newly-added employee isn't retroactively marked absent for days before
 * they existed in the system. */
export function hasJoinedBy(createdAt: string | Date, date: string): boolean {
  return toDateStr(new Date(createdAt)) <= date;
}

/** Later of two YYYY-MM-DD strings - useful for clamping a range's start to
 * whichever is more restrictive (e.g. week start vs. an employee's join date). */
export function laterDateStr(a: string, b: string): string {
  return a > b ? a : b;
}

/** Returns "HH:MM" for the current 30-min check-in reminder slot (9:00..12:00),
 * or null if `now` is outside that window. */
export function checkInReminderSlot(now: Date): string | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < 9 * 60 || minutes > 12 * 60) return null;
  const slotMinutes = Math.floor(minutes / 30) * 30;
  const h = String(Math.floor(slotMinutes / 60)).padStart(2, "0");
  const m = String(slotMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}
