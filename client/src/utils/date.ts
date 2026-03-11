/**
 * Format a Date as YYYY-MM-DD using local timezone (not UTC).
 * Avoids the off-by-one bug caused by toISOString() converting to UTC.
 */
export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
