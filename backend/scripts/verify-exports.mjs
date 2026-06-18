/**
 * Verify admin CSV exports and main analytics workbook structure/content.
 * Usage: npm run test:exports
 */
import ExcelJS from 'exceljs';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distRoot = join(__dirname, '..', 'dist');

const { EXPORT_GENERATORS } = await import(pathToFileURL(join(distRoot, 'services', 'export.service.js')).href);
const { buildReportWorkbook } = await import(pathToFileURL(join(distRoot, 'services', 'analytics', 'excel', 'buildReportWorkbook.js')).href);

const EXPECTED_HEADERS = {
  reflection: ['Имя', 'Фамилия', 'Трек', 'Вопрос', 'Ответ', 'Дата'],
  tasks: ['Имя', 'Фамилия', 'Трек', 'Задание', 'Ответ', 'Фото', 'Статус', 'Дата'],
  exchange: [
    'Вопрос',
    'Имя автора вопроса',
    'Фамилия автора вопроса',
    'Трек автора',
    'Ответ',
    'Имя автора ответа',
    'Фамилия автора ответа',
    'Дата',
  ],
  rating: ['ID', 'Имя', 'Фамилия', 'Трек', 'Баллы', 'Уровень рефлексии', 'Баллы рефлексии', 'Дата регистрации'],
  checkins: ['Имя', 'Фамилия', 'Трек', 'Эмоция', 'Энергия', 'Комментарий', 'Дата'],
  'nfo-day': ['Имя', 'Фамилия', 'Трек', 'Дата программы', 'Время ответа', 'Тезис', 'Понимание', 'Факторы', 'Дополнительно'],
  feedback: ['Имя', 'Фамилия', 'Трек', 'Сообщение', 'Дата'],
  'points-history': ['Имя', 'Фамилия', 'Трек', 'Баллы', 'Источник', 'Комментарий', 'Дата'],
  activity: ['Имя', 'Фамилия', 'Трек', 'Действие', 'Время'],
};

const MAIN_SHEET_NAMES = [
  '👥 Участники',
  '💬 Вопросы и чек-ин',
  '🎯 Диагностика тренера',
  '⭐ Задания',
  '💡 Обмен опытом',
  '🏆 Рейтинг и баллы',
  '📊 Аналитика',
  '📈 Динамика состояния',
  '😊 Эмоции по слотам',
  '🌡️ Активность по дням',
  '🔍 Факторы по трекам',
  '⏱️ Задания — тайминг',
  '📝 Глубина рефлексии',
];

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseCsv(csv) {
  const lines = csv.replace(/^\uFEFF/, '').split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

let failures = 0;

for (const [type, generator] of Object.entries(EXPORT_GENERATORS)) {
  if (type === 'diagnostics') continue;
  const expected = EXPECTED_HEADERS[type];
  if (!expected) {
    fail(`no expected headers for ${type}`);
    failures++;
    continue;
  }

  try {
    const csv = await generator();
    const { headers, rows } = parseCsv(csv);

    if (headers.join('|') !== expected.join('|')) {
      fail(`${type}: headers mismatch\n  got: ${headers.join(', ')}\n  exp: ${expected.join(', ')}`);
      failures++;
      continue;
    }

    const firstNameIdx = headers.indexOf('Имя');
    if (firstNameIdx >= 0 && rows.length > 0) {
      const bad = rows.filter((r) => !(r[firstNameIdx] ?? '').trim()).length;
      if (bad > 0) {
        fail(`${type}: ${bad} row(s) with empty «Имя»`);
        failures++;
        continue;
      }
    }

    ok(`${type} CSV — ${rows.length} rows, headers OK`);
  } catch (e) {
    fail(`${type}: ${e instanceof Error ? e.message : e}`);
    failures++;
  }
}

try {
  const wb = await buildReportWorkbook();
  const names = wb.worksheets.map((ws) => ws.name);

  for (const expectedName of MAIN_SHEET_NAMES) {
    if (!names.includes(expectedName)) {
      fail(`main workbook missing sheet: ${expectedName}`);
      failures++;
    }
  }

  const participants = wb.getWorksheet('👥 Участники');
  if (participants) {
    const headerRow = participants.getRow(1);
    const h2 = String(headerRow.getCell(2).value ?? '');
    const h3 = String(headerRow.getCell(3).value ?? '');
    if (h2 !== 'Фамилия' || h3 !== 'Имя') {
      fail(`participants sheet headers: expected Фамилия/Имя, got ${h2}/${h3}`);
      failures++;
    } else {
      let dataRows = 0;
      let emptyNames = 0;
      participants.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const firstName = String(row.getCell(3).value ?? '').trim();
        if (!firstName) return;
        dataRows++;
        if (!String(row.getCell(3).value ?? '').trim()) emptyNames++;
      });
      if (dataRows > 0 && emptyNames > 0) {
        fail(`participants sheet: ${emptyNames} rows with empty Имя`);
        failures++;
      } else {
        ok(`main workbook — ${names.length} sheets, participants: ${dataRows} rows`);
      }
    }
  }
} catch (e) {
  fail(`main workbook: ${e instanceof Error ? e.message : e}`);
  failures++;
}

if (failures === 0 && !process.exitCode) {
  console.log('\n=== EXPORT VERIFICATION PASSED ===');
} else {
  console.error(`\n=== EXPORT VERIFICATION FAILED (${failures} issue(s)) ===`);
  process.exit(1);
}
