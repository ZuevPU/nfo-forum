import type ExcelJS from 'exceljs';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const INFO_FONT: Partial<ExcelJS.Font> = {
  italic: true,
  color: { argb: 'FF666666' },
};

export function applyHeaderStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
  row.height = 22;
}

export function applyInfoStyle(row: ExcelJS.Row, mergeToCol: number): void {
  row.eachCell((cell) => {
    cell.font = INFO_FONT;
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  if (mergeToCol > 1) {
    row.worksheet.mergeCells(row.number, 1, row.number, mergeToCol);
  }
}

export function addSectionTitle(ws: ExcelJS.Worksheet, text: string, colSpan = 1): ExcelJS.Row {
  const row = ws.addRow([text]);
  row.font = { bold: true, size: 12 };
  if (colSpan > 1) ws.mergeCells(row.number, 1, row.number, colSpan);
  row.height = 20;
  return row;
}

export function setColumnWidths(ws: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

export function freezeHeader(ws: ExcelJS.Worksheet, rowCount = 1): void {
  ws.views = [{ state: 'frozen', ySplit: rowCount }];
}

export function addInfoRows(ws: ExcelJS.Worksheet, lines: string[], colSpan: number): void {
  for (const line of lines) {
    const row = ws.addRow([`ℹ️ ${line}`]);
    applyInfoStyle(row, colSpan);
  }
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCCCCCC' } };
  return { top: side, left: side, bottom: side, right: side };
}

export function applyDataBorders(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.border = thinBorder();
    cell.alignment = { vertical: 'top', wrapText: true };
  });
}

export function displayValue(value: string | number | null | undefined): string | number {
  if (value == null || (typeof value === 'number' && Number.isNaN(value))) return '—';
  return value;
}
