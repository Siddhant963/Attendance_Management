import { env } from '../config/env.js';

/** Calendar day (YYYY-MM-DD) of an instant in the configured business timezone. */
export function businessDate(instant = new Date(), timeZone = env.timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

export const isDateString = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
