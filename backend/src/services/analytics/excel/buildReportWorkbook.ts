import ExcelJS from 'exceljs';
import { TRACKS } from '../../../constants/tracks.js';
import { DIAGNOSTICS_DATA } from '../../../data/samodiagnostika.js';
import { getMainReportFilename } from '../../../constants/exportMeta.js';
import { getAnalyticsBundle } from '../index.js';
import { SKILL_COLUMNS } from '../rawData.loader.js';
import {
  formatDelta,
  formatNullableNumber,
  formatPercent,
} from '../analyticsTime.js';
import type { AnalyticsBundle } from '../analytics.types.js';
import {
  addInfoRows,
  addSectionTitle,
  applyDataBorders,
  applyHeaderStyle,
  displayValue,
  freezeHeader,
  setColumnWidths,
} from './excelStyles.js';

function buildParticipantsSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('👥 Участники');
  const headers = ['№', 'Фамилия', 'Имя', 'Направление (трек)', 'Дата регистрации', 'Баллов всего', 'Уровень рефлексии'];
  const headerRow = ws.addRow(headers);
  applyHeaderStyle(headerRow);
  addInfoRows(ws, ['Только зарегистрированные участники. Не зарегистрировавшиеся в выгрузке не отображаются.'], headers.length);
  freezeHeader(ws, 1);

  bundle.raw.participants.forEach((p, i) => {
    const row = ws.addRow([
      i + 1,
      p.lastName ?? '',
      p.firstName,
      p.track ?? '',
      p.createdAt.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }),
      p.totalPoints,
      p.reflectionLevel,
    ]);
    applyDataBorders(row);
  });
  setColumnWidths(ws, [5, 18, 14, 28, 16, 14, 18]);
}

function buildQuestionsSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('💬 Вопросы и чек-ин');
  const headers = ['№', 'Фамилия', 'Имя', 'Трек', 'Дата', 'Время', 'Вопрос', 'Ответ / текст', 'Факторы (мультивыбор)', 'Тип вопроса'];
  applyHeaderStyle(ws.addRow(headers));
  addInfoRows(ws, [
    'Все вопросы в одной вкладке. Тип вопроса: Входной / Рефлексия / Чек-ин / Выходной',
    'Чек-ин: колонка «Ответ» = эмоция + энергия. Колонка «Факторы» пустая для чек-инов.',
  ], headers.length);
  freezeHeader(ws, 1);

  bundle.raw.questionCheckinRows.forEach((r, i) => {
    const row = ws.addRow([i + 1, r.lastName ?? '', r.firstName, r.track ?? '', r.date, r.time, r.question, r.answer, r.factors, r.questionType]);
    applyDataBorders(row);
  });
  setColumnWidths(ws, [5, 16, 14, 22, 12, 8, 30, 40, 24, 22]);
}

function buildDiagnosticsSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('🎯 Диагностика тренера');
  const skillHeaders = SKILL_COLUMNS.map((s) => s.shortTitle);
  const headers = ['№', 'Фамилия', 'Имя', 'Трек', 'Тип', ...skillHeaders, 'Средний балл', 'Дата прохождения'];
  applyHeaderStyle(ws.addRow(headers));
  addInfoRows(ws, [
    'Тип: Входная / Выходная. Оценки по шкале 1–5.',
    'Треки: Обучение тренеров, Аттестация тренеров.',
  ], headers.length);
  freezeHeader(ws, 1);

  bundle.raw.diagnosticRows.forEach((r, i) => {
    const scores = DIAGNOSTICS_DATA.skills.map((s) => displayValue(r.scores[s.id] ?? null));
    const row = ws.addRow([
      i + 1,
      r.lastName ?? '',
      r.firstName,
      r.track ?? '',
      r.attemptType,
      ...scores,
      displayValue(r.avgScore),
      r.completedAt.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }),
    ]);
    applyDataBorders(row);
  });
  setColumnWidths(ws, [5, 16, 14, 22, 12, ...skillHeaders.map(() => 12), 12, 16]);
}

function buildTasksSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('⭐ Задания');
  const headers = ['№', 'Фамилия', 'Имя', 'Трек', 'Задание', 'Дата / время', 'Ответ участника', 'Фото (ссылка)', 'Баллы', 'Статус'];
  applyHeaderStyle(ws.addRow(headers));
  addInfoRows(ws, ['Статус: Выполнено / На проверке. Фото — ссылка на файл в хранилище.'], headers.length);
  freezeHeader(ws, 1);

  bundle.raw.taskRows.forEach((r, i) => {
    const row = ws.addRow([i + 1, r.lastName ?? '', r.firstName, r.track ?? '', r.taskTitle, r.dateTime, r.answer, r.photo, r.points, r.status]);
    applyDataBorders(row);
  });
  setColumnWidths(ws, [5, 16, 14, 22, 24, 18, 36, 24, 8, 14]);
}

function buildExchangeSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('💡 Обмен опытом');
  addSectionTitle(ws, 'ВОПРОСЫ УЧАСТНИКОВ', 8);
  const qHeaders = ['№', 'Фамилия', 'Имя', 'Трек', 'Текст вопроса', 'Аудитория', 'Дата / время', 'Ответов получено'];
  applyHeaderStyle(ws.addRow(qHeaders));
  addInfoRows(ws, ['Аудитория: Всем участникам / Только моему треку'], qHeaders.length);

  bundle.raw.exchangeQuestions.forEach((r, i) => {
    applyDataBorders(ws.addRow([i + 1, r.lastName ?? '', r.firstName, r.track ?? '', r.text, r.audience, r.dateTime, r.answersCount]));
  });

  ws.addRow([]);
  addSectionTitle(ws, 'ОТВЕТЫ УЧАСТНИКОВ', 7);
  const aHeaders = ['№', 'Фамилия', 'Имя', 'Трек', 'Вопрос (к которому ответ)', 'Ответ', 'Дата / время'];
  applyHeaderStyle(ws.addRow(aHeaders));
  addInfoRows(ws, ['Ответы анонимны для других участников. Администратор видит авторов.'], aHeaders.length);

  bundle.raw.exchangeAnswers.forEach((r, i) => {
    applyDataBorders(ws.addRow([i + 1, r.lastName ?? '', r.firstName, r.track ?? '', r.questionText, r.answer, r.dateTime]));
  });
  setColumnWidths(ws, [5, 16, 14, 22, 36, 20, 18, 14]);
}

function buildRankingSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('🏆 Рейтинг и баллы');
  addSectionTitle(ws, 'РЕЙТИНГ УЧАСТНИКОВ', 10);
  const pHeaders = ['Место', 'Фамилия', 'Имя', 'Трек', 'Итого баллов', 'За вопросы', 'За задания', 'За чекины', 'За обмен опытом', 'Уровень рефлексии'];
  applyHeaderStyle(ws.addRow(pHeaders));
  addInfoRows(ws, ['Сортировка по убыванию баллов. Обновляется в реальном времени.'], pHeaders.length);

  for (const r of bundle.ranking.participants) {
    applyDataBorders(ws.addRow([
      r.position,
      r.lastName ?? '',
      r.firstName,
      r.track ?? '',
      r.totalPoints,
      r.pointsBreakdown.questions,
      r.pointsBreakdown.tasks,
      r.pointsBreakdown.checkins,
      r.pointsBreakdown.exchange,
      r.reflectionLevel,
    ]));
  }

  ws.addRow([]);
  ws.addRow([]);
  addSectionTitle(ws, 'РЕЙТИНГ ПО ТРЕКАМ', 5);
  const tHeaders = ['Место', 'Трек', 'Сумма баллов', 'Средние баллы', 'Участников'];
  applyHeaderStyle(ws.addRow(tHeaders));

  for (const r of bundle.ranking.tracks) {
    applyDataBorders(ws.addRow([r.position, r.track, r.totalPoints, displayValue(r.avgPoints), r.participants]));
  }
  setColumnWidths(ws, [8, 18, 14, 24, 14, 12, 12, 12, 16, 16]);
}

function buildAnalyticsSummarySheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('📊 Аналитика');
  const dayLabels = bundle.raw.forumDays.map((d) => d.label);

  addSectionTitle(ws, 'АКТИВНОСТЬ УЧАСТНИКОВ', dayLabels.length + 1);
  applyHeaderStyle(ws.addRow(['Показатель', ...dayLabels, 'Итого']));
  const activityRows = [
    ['Зарегистрировано (накопит.)', ...bundle.activity.rows.map((r) => r.registeredCumulative), bundle.activity.rows.at(-1)?.registeredCumulative ?? '—'],
    ['Заходили в приложение', ...bundle.activity.rows.map((r) => r.visited), bundle.activity.rows.reduce((s, r) => s + r.visited, 0)],
    ['% активных', ...bundle.activity.rows.map((r) => formatPercent(r.activePercent)), '—'],
    ['Ответили на вопрос дня', ...bundle.activity.rows.map((r) => r.answeredQuestion), bundle.activity.rows.reduce((s, r) => s + r.answeredQuestion, 0)],
    ['% ответивших', ...bundle.activity.rows.map((r) => formatPercent(r.answeredPercent)), '—'],
  ];
  for (const row of activityRows) applyDataBorders(ws.addRow(row));

  ws.addRow([]);
  addSectionTitle(ws, 'ЧЕК-ИН: СРЕДНЯЯ ЭНЕРГИЯ (шкала 0–10)', dayLabels.length + 1);
  applyHeaderStyle(ws.addRow(['Слот', ...dayLabels]));
  const slotLabels = [...new Set(bundle.energy.byDaySlot.map((e) => e.slotLabel))];
  for (const slot of slotLabels) {
    applyDataBorders(ws.addRow([
      slot,
      ...bundle.raw.forumDays.map((d) => {
        const found = bundle.energy.byDaySlot.find((e) => e.dayKey === d.key && e.slotLabel === slot);
        return formatNullableNumber(found?.avgEnergy ?? null);
      }),
    ]));
  }

  ws.addRow([]);
  addSectionTitle(ws, 'ЧЕК-ИН: ТОП-5 ЭМОЦИЙ ЗА ФОРУМ', 3);
  applyHeaderStyle(ws.addRow(['Эмоция', 'Кол-во выборов', '% от всех чекинов']));
  for (const e of bundle.emotions.topOverall) {
    applyDataBorders(ws.addRow([e.emotion, e.count, formatPercent(e.percent)]));
  }

  ws.addRow([]);
  addSectionTitle(ws, 'РЕФЛЕКСИЯ: ТОП ФАКТОРОВ (мультивыбор за все дни)', 3 + dayLabels.length);
  applyHeaderStyle(ws.addRow(['Фактор', 'Кол-во выборов', '% от ответивших', ...dayLabels]));
  for (const f of bundle.factors.topOverall.slice(0, 10)) {
    applyDataBorders(ws.addRow([
      f.factor,
      f.count,
      formatPercent(f.percent),
      ...f.byDay.map((d) => d.count),
    ]));
  }

  ws.addRow([]);
  addSectionTitle(ws, 'ЗАДАНИЯ: ВЫПОЛНЕНИЕ', 4);
  applyHeaderStyle(ws.addRow(['Задание', 'Доступно для', 'Выполнено', '% выполнения']));
  for (const t of bundle.tasks.completion) {
    applyDataBorders(ws.addRow([t.taskTitle, t.availableFor, t.completed, formatPercent(t.completionPercent)]));
  }

  ws.addRow([]);
  addSectionTitle(ws, 'САМОДИАГНОСТИКА: СРЕДНИЕ ОЦЕНКИ ПО УМЕНИЯМ', 4);
  applyHeaderStyle(ws.addRow(['Умение', 'Входная (ср.)', 'Выходная (ср.)', 'Динамика']));
  for (const s of bundle.diagnostics.skills) {
    applyDataBorders(ws.addRow([
      s.skillTitle,
      formatNullableNumber(s.entryAvg),
      formatNullableNumber(s.exitAvg),
      formatDelta(s.delta),
    ]));
  }
  setColumnWidths(ws, [28, 14, 14, 14, 14]);
}

function energyColumnHeader(dayLabel: string, slotLabel: string): string {
  const dayShort = dayLabel.replace(' июня', ' июн').replace(' июля', ' июл');
  const slotShort = slotLabel.replace(' чек-in', '').split(' ')[0]?.toLowerCase() ?? slotLabel;
  return `${dayShort}\n${slotShort}`;
}

function buildEnergyDynamicsSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('📈 Динамика состояния');
  const columns = bundle.energy.byDaySlot.map((slot) => ({
    dayKey: slot.dayKey,
    slotLabel: slot.slotLabel,
    header: energyColumnHeader(slot.dayLabel, slot.slotLabel),
    overallAvg: slot.avgEnergy,
  }));

  applyHeaderStyle(ws.addRow(['Трек', ...columns.map((c) => c.header)]));
  addInfoRows(ws, ['Средняя энергия по трекам в каждом временном слоте. Считается автоматически из чекинов.'], columns.length + 1);
  freezeHeader(ws, 1);

  const tracks = [...new Set(bundle.ranking.tracks.map((t) => t.track))];
  for (const track of tracks) {
    applyDataBorders(ws.addRow([
      track,
      ...columns.map((col) => {
        const match = bundle.energy.byTrackDaySlot.find(
          (ts) => ts.track === track && ts.dayKey === col.dayKey && ts.slotLabel === col.slotLabel,
        );
        return formatNullableNumber(match?.avgEnergy ?? null);
      }),
    ]));
  }

  applyDataBorders(ws.addRow([
    'ВСЕ УЧАСТНИКИ (среднее)',
    ...columns.map((col) => formatNullableNumber(col.overallAvg)),
  ]));
}

function buildEmotionsBySlotSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('😊 Эмоции по слотам');
  applyHeaderStyle(ws.addRow(['Слот', '#1 эмоция (кол-во)', '#2 эмоция (кол-во)', '#3 эмоция (кол-во)', 'Кол-во ответивших']));
  addInfoRows(ws, ['Топ-3 эмоции в каждом временном слоте. Считается автоматически из чекинов.'], 5);
  freezeHeader(ws, 1);

  for (const slot of bundle.emotions.bySlot) {
    applyDataBorders(ws.addRow([
      slot.slotLabel,
      slot.top[0] ? `${slot.top[0].emotion} (${slot.top[0].count})` : '—',
      slot.top[1] ? `${slot.top[1].emotion} (${slot.top[1].count})` : '—',
      slot.top[2] ? `${slot.top[2].emotion} (${slot.top[2].count})` : '—',
      slot.respondents,
    ]));
  }
  setColumnWidths(ws, [22, 22, 22, 22, 18]);
}

function buildActivityByDaySheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('🌡️ Активность по дням');
  const cols = Object.keys(bundle.activity.slotActivity[0]?.values ?? {});
  applyHeaderStyle(ws.addRow(['Тип действия', ...cols]));
  addInfoRows(ws, ['% участников, совершивших хотя бы одно действие в приложении за временной слот.'], cols.length + 1);
  freezeHeader(ws, 1);

  for (const row of bundle.activity.slotActivity) {
    applyDataBorders(ws.addRow([row.actionType, ...cols.map((c) => formatPercent(row.values[c] ?? null))]));
  }
}

function buildFactorsByTrackSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('🔍 Факторы по трекам');
  applyHeaderStyle(ws.addRow(['Фактор', ...TRACKS]));
  addInfoRows(ws, ['Топ-5 факторов рефлексии для каждого трека. % от числа ответивших в треке.'], TRACKS.length + 1);
  freezeHeader(ws, 1);

  for (const f of bundle.factors.byTrack) {
    applyDataBorders(ws.addRow([
      f.factor,
      ...TRACKS.map((t) => formatPercent(f.trackPercents[t] ?? null)),
    ]));
  }
}

function buildTaskTimingSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('⏱️ Задания — тайминг');
  applyHeaderStyle(ws.addRow(['Задание', 'Утро 8–10', 'День 14–17', 'Вечер 19–21', 'Ночь 21+', 'Медиана (часов после активации)']));
  addInfoRows(ws, ['Когда участники выполняют задания — распределение по временным слотам.'], 6);
  freezeHeader(ws, 1);

  for (const t of bundle.tasks.timing) {
    applyDataBorders(ws.addRow([
      t.taskTitle,
      formatPercent(t.morning),
      formatPercent(t.day),
      formatPercent(t.evening),
      formatPercent(t.night),
      formatNullableNumber(t.medianHoursAfterActivation),
    ]));
  }
}

function buildReflectionDepthSheet(wb: ExcelJS.Workbook, bundle: AnalyticsBundle): void {
  const ws = wb.addWorksheet('📝 Глубина рефлексии');
  const dayLabels = bundle.raw.forumDays.map((d) => d.label);
  applyHeaderStyle(ws.addRow(['', ...dayLabels, 'Динамика', 'Медиана (все дни)']));
  addInfoRows(ws, ['Средняя длина текстовых ответов (кол-во слов) — прокси глубины рефлексии. По дням и трекам.'], dayLabels.length + 3);
  freezeHeader(ws, 1);

  const overallValues = bundle.reflectionDepth.overall.map((d) => formatNullableNumber(d.avgWords));
  const first = bundle.reflectionDepth.overall.find((d) => d.avgWords != null)?.avgWords ?? null;
  const last = [...bundle.reflectionDepth.overall].reverse().find((d) => d.avgWords != null)?.avgWords ?? null;
  applyDataBorders(ws.addRow([
    'ВСЕ УЧАСТНИКИ (среднее)',
    ...overallValues,
    formatDelta(first != null && last != null ? Math.round((last - first) * 10) / 10 : null),
    formatNullableNumber(bundle.reflectionDepth.overallMedian),
  ]));

  for (const track of bundle.reflectionDepth.byTrack) {
    applyDataBorders(ws.addRow([
      track.track,
      ...track.byDay.map((d) => formatNullableNumber(d.avgWords)),
      formatPercent(track.dynamicsPercent),
      formatNullableNumber(track.medianWords),
    ]));
  }
}

export async function buildReportWorkbook(): Promise<ExcelJS.Workbook> {
  const bundle = await getAnalyticsBundle();
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  wb.modified = new Date();

  buildParticipantsSheet(wb, bundle);
  buildQuestionsSheet(wb, bundle);
  buildDiagnosticsSheet(wb, bundle);
  buildTasksSheet(wb, bundle);
  buildExchangeSheet(wb, bundle);
  buildRankingSheet(wb, bundle);
  buildAnalyticsSummarySheet(wb, bundle);
  buildEnergyDynamicsSheet(wb, bundle);
  buildEmotionsBySlotSheet(wb, bundle);
  buildActivityByDaySheet(wb, bundle);
  buildFactorsByTrackSheet(wb, bundle);
  buildTaskTimingSheet(wb, bundle);
  buildReflectionDepthSheet(wb, bundle);

  return wb;
}

export function getReportFilename(): string {
  return getMainReportFilename();
}
