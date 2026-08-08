import type { CelebrationEmployee } from "@/types";

export type CelebrationType = "birthday" | "anniversary";

export interface Celebration {
  employeeId: string;
  name: string;
  designation: string;
  photoUrl: string | null;
  type: CelebrationType;
  /** This year's occurrence of the date (birthday or hire-date anniversary). */
  occursOn: Date;
  daysUntil: number;
  /** Only meaningful for anniversaries. */
  years: number;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** This year's occurrence of `source`'s month/day, rolled forward to next
 * year if it's already passed - so "days until" is never negative. */
function nextOccurrence(source: Date, today: Date): Date {
  const occurrence = new Date(today.getFullYear(), source.getMonth(), source.getDate());
  if (occurrence < today) {
    occurrence.setFullYear(occurrence.getFullYear() + 1);
  }
  return occurrence;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Builds the full list of upcoming birthdays/anniversaries (including
 * today's) from raw employee records, sorted soonest-first. Anniversary
 * years-count is based on the *next* occurrence's year, so someone hired in
 * 2023 shows "2 Years" both on and immediately after the date in 2025. */
export function buildCelebrations(employees: CelebrationEmployee[], now: Date = new Date()): Celebration[] {
  const today = startOfDay(now);
  const celebrations: Celebration[] = [];

  for (const e of employees) {
    if (e.dateOfBirth) {
      const dob = new Date(e.dateOfBirth);
      const occursOn = nextOccurrence(dob, today);
      celebrations.push({
        employeeId: e._id,
        name: e.name,
        designation: e.designation,
        photoUrl: e.photoUrl,
        type: "birthday",
        occursOn,
        daysUntil: daysBetween(today, occursOn),
        years: 0,
      });
    }
    if (e.hireDate) {
      const hire = new Date(e.hireDate);
      const occursOn = nextOccurrence(hire, today);
      const years = occursOn.getFullYear() - hire.getFullYear();
      if (years > 0) {
        celebrations.push({
          employeeId: e._id,
          name: e.name,
          designation: e.designation,
          photoUrl: e.photoUrl,
          type: "anniversary",
          occursOn,
          daysUntil: daysBetween(today, occursOn),
          years,
        });
      }
    }
  }

  return celebrations.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function formatCelebrationDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function defaultWishMessage(c: Celebration): string {
  if (c.type === "birthday") {
    return `Happy Birthday, ${c.name.split(" ")[0]}! 🎉 Wishing you a fantastic day and a great year ahead.`;
  }
  return `Congratulations on ${c.years} year${c.years === 1 ? "" : "s"} with us, ${c.name.split(" ")[0]}! 🎉 Thank you for everything you bring to the team.`;
}
