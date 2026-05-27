import { todayStr } from './exportExcel';

type ExcelTableColumn<T> = {
  header: string;
  key: keyof T;
  width?: number;
  /** Excel number format, e.g. '0.00' */
  numFmt?: string;
};

export async function exportExcelTable<T extends Record<string, unknown>>(args: {
  sheetName?: string;
  tableName?: string;
  filenameBase: string;
  columns: ExcelTableColumn<T>[];
  rows: T[];
  /** 0-based row indexes to highlight */
  highlightRowIndexes?: number[];
}): Promise<void> {
  const {
    sheetName = 'Report',
    tableName = 'ReportTable',
    filenameBase,
    columns,
    rows,
    highlightRowIndexes = [],
  } = args;

  const exceljs = await import('exceljs');
  const wb = new exceljs.Workbook();
  wb.creator = 'EPMS';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName);
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const safe = (v: unknown): string | number => {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v).trim();
    return s.length === 0 ? '-' : s;
  };

  ws.addTable({
    name: tableName,
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium9',
      showRowStripes: true,
    },
    columns: columns.map((c) => ({ name: c.header, filterButton: true })),
    rows: rows.map((r) => columns.map((c) => safe(r[c.key as string]))),
  });

  columns.forEach((c, idx) => {
    const col = ws.getColumn(idx + 1);
    col.width = c.width ?? Math.min(Math.max(c.header.length + 4, 14), 40);
    if (c.numFmt) col.numFmt = c.numFmt;
  });

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  });

  // Highlight best row(s). Table data starts at row 2.
  const highlightSet = new Set(highlightRowIndexes.filter((n) => Number.isInteger(n) && n >= 0));
  for (const idx of highlightSet) {
    const excelRow = ws.getRow(idx + 2);
    excelRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C4' } };
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = `${filenameBase}_${todayStr()}.xlsx`;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

