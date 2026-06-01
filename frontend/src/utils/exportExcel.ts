/**
 * exportExcel.ts
 * Creates presentation-ready Excel workbooks for EPMS reports.
 *
 * The export intentionally uses business-friendly labels and formatted values
 * instead of raw DTO field names or enum values.
 */
import ExcelJS from 'exceljs';

export type ExportCellValue = string | number | boolean | Date | null | undefined;

export interface ExportColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  header: string;
  key?: keyof T | string;
  width?: number;
  numFmt?: string;
  value?: (row: T, index: number) => ExportCellValue;
}

export interface ExportWorkbookOptions {
  title?: string;
  subtitle?: string;
  scopeLabel?: string | null;
  sheetName?: string;
  generatedLabel?: string;
  emptyMessage?: string;
}

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const normalizeFileName = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/\.xlsx$/i, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return cleaned || 'report';
};

const normalizeSheetName = (value?: string) => {
  const cleaned = String(value || 'Report')
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (cleaned || 'Report').slice(0, 31);
};

const normalizeTableName = (value: string) => {
  const cleaned = value
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^\d/, 'T_$&')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return (cleaned || 'Report_Table').slice(0, 200);
};

const resolveCellValue = <T extends Record<string, unknown>>(
  row: T,
  column: ExportColumn<T>,
  index: number,
): ExportCellValue => {
  if (column.value) {
    return column.value(row, index);
  }

  if (!column.key) {
    return '';
  }

  return row[column.key as keyof T] as ExportCellValue;
};

const autoWidth = <T extends Record<string, unknown>>(
  rows: T[],
  column: ExportColumn<T>,
  index: number,
) => {
  if (column.width) return column.width;

  const longestValue = rows.reduce((max, row, rowIndex) => {
    const value = resolveCellValue(row, column, rowIndex);
    return Math.max(max, String(value ?? '').length);
  }, column.header.length);

  return Math.min(Math.max(longestValue + 4, 14), 44);
};

const writeWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: EXCEL_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${normalizeFileName(filename)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export async function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename = 'export',
  options: ExportWorkbookOptions = {},
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(normalizeSheetName(options.sheetName || options.title || 'Report'), {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  workbook.creator = 'EPMS Performance System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const columnCount = Math.max(columns.length, 1);
  const title = options.title || 'Report';
  const subtitle = options.subtitle || 'Prepared from EPMS reporting data.';
  const scopeLabel = options.scopeLabel || 'Current permitted scope';
  const generatedLabel = options.generatedLabel || new Date().toLocaleString();

  worksheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF102A43' } };
  titleCell.alignment = { vertical: 'middle' };

  worksheet.mergeCells(2, 1, 2, columnCount);
  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { size: 11, color: { argb: 'FF52637A' } };

  worksheet.mergeCells(3, 1, 3, columnCount);
  const scopeCell = worksheet.getCell(3, 1);
  scopeCell.value = `Scope: ${scopeLabel}`;
  scopeCell.font = { size: 10, bold: true, color: { argb: 'FF1D4ED8' } };

  worksheet.mergeCells(4, 1, 4, columnCount);
  const generatedCell = worksheet.getCell(4, 1);
  generatedCell.value = `Generated: ${generatedLabel}`;
  generatedCell.font = { size: 10, color: { argb: 'FF64748B' } };

  const tableStartRow = 6;
  const tableRows = rows.map((row, rowIndex) =>
    columns.map((column) => {
      const value = resolveCellValue(row, column, rowIndex);
      return value === null || value === undefined ? '' : value;
    }),
  );

  worksheet.addTable({
    name: normalizeTableName(filename),
    ref: `A${tableStartRow}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: columns.map((column) => ({ name: column.header, filterButton: true })),
    rows: tableRows,
  });

  columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1);
    excelColumn.width = autoWidth(rows, column, index);

    if (column.numFmt) {
      excelColumn.numFmt = column.numFmt;
    }

    excelColumn.alignment = { vertical: 'middle', wrapText: true };
  });

  const headerRow = worksheet.getRow(tableStartRow);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  if (rows.length === 0) {
    const messageRow = worksheet.getRow(tableStartRow + 2);
    messageRow.getCell(1).value = options.emptyMessage || 'No rows are available for the selected report scope.';
    messageRow.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
  }

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  await writeWorkbook(workbook, filename);
}

export const todayStr = (): string => new Date().toISOString().slice(0, 10);
