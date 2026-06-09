/**
 * Formats a date as an ISO calendar date (YYYY-MM-DD).
 */
export function formatDate(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date
  return value.toISOString().slice(0, 10)
}
