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
    hour12: false,
  });
}

/**
 * Export an array of objects as a CSV file download.
 * @param rows - Array of flat objects (each key becomes a column header)
 * @param filename - Filename for the downloaded CSV
 */
export function exportToCSV(rows: Record<string, string | number | null | undefined>[], filename: string): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ];

  const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
