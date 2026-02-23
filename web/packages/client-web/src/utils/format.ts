/**
 * Formatting utilities for the admin dashboard.
 *
 * Amount conventions:
 * - Payment, Invoice, Payout, Refund types use Int (bani / cents) → use formatCents()
 * - Booking, PlatformStats, Analytics types use Float (RON)    → use formatCurrency()
 */

/** Format a RON amount (Float, already in RON) */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a bani/cents amount (Int, stored as bani) → display as RON */
export function formatCents(amount: number): string {
  return (amount / 100).toFixed(2) + ' lei';
}

/** Format a date string to ro-RO locale short date */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO');
}

/** Format a date string to ro-RO locale date + time */
export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ro-RO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
