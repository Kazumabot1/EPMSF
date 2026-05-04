/**
 * exportExcel.ts
 * Thin wrapper around SheetJS (xlsx) for one-click Excel export.
 * Usage: exportToExcel(rows, columns, 'filename')
 */
import * as XLSX from 'xlsx';

export interface ExportColumn {
  /** Header label shown in Excel */
  header: string;
  /** Key to read from each row object */
  key: string;
}

/**
 * Export an array of objects to a .xlsx file that downloads immediately.
 *
 * @param rows     Array of plain objects (data)
 * @param columns  Column definitions { header, key }
 * @param filename Base filename WITHOUT extension (e.g. "employees_2026")
 */
export function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns: ExportColumn[],
  filename = 'export'
): void {
  // Build header row
  const header = columns.map((c) => c.header);

  // Build data rows
  const data = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      return val;
    })
  );

  // Combine header + data
  const wsData = [header, ...data];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-width columns
  const colWidths = columns.map((c, i) => {
    const maxLen = Math.max(
      c.header.length,
      ...rows.map((row) => String(row[c.key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  // Trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Returns today's date as YYYY-MM-DD for use in filenames */
export const todayStr = (): string => new Date().toISOString().slice(0, 10);
