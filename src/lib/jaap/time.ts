// Naive wall-clock times in Europe/London, formatted "YYYY-MM-DDTHH:mm".
// Kept as plain strings so rule evaluation is deterministic and timezone-free.
export type Naive = string;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const toMin = (t: Naive) =>
  Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10), +t.slice(11, 13), +t.slice(14, 16)) / 60000;

export const fromMin = (m: number): Naive => new Date(m * 60000).toISOString().slice(0, 16);

export const addMin = (t: Naive, m: number) => fromMin(toMin(t) + m);

export const dateOf = (t: Naive) => t.slice(0, 10);

export const at = (date: string, hhmm: string): Naive => `${date}T${hhmm}`;

export const addDays = (date: string, n: number) => fromMin(toMin(`${date}T00:00`) + n * 1440).slice(0, 10);

export const dayOfWeek = (t: Naive) => new Date(toMin(t.length === 10 ? `${t}T00:00` : t) * 60000).getUTCDay();

export const minuteOfDay = (t: Naive) => +t.slice(11, 13) * 60 + +t.slice(14, 16);

export const diffMin = (a: Naive, b: Naive) => toMin(b) - toMin(a);

export const fmtTime = (t: Naive) => t.slice(11, 16);

export const fmtDay = (t: Naive) => {
  const d = new Date(toMin(t.length === 10 ? `${t}T00:00` : t) * 60000);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

export const fmtDT = (t: Naive) => `${fmtDay(t)} · ${fmtTime(t)}`;

export const fmtRange = (a: Naive, b: Naive) =>
  dateOf(a) === dateOf(b) ? `${fmtDay(a)} · ${fmtTime(a)}–${fmtTime(b)}` : `${fmtDT(a)} → ${fmtDT(b)}`;

export const fmtDuration = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
