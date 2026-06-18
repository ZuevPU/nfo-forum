import { DEFAULT_POINT_RULES, type PointSection } from '../../constants/pointsSystem.js';
import type { PointsBreakdown, PointsCategory } from './analytics.types.js';

const CHECKIN_SOURCES = new Set([
  'checkin_emotion',
  'checkin_energy',
  'checkin_comment',
]);

const EXCHANGE_SOURCES = new Set(['exchange_question', 'exchange_answer']);

function sectionToCategory(section: PointSection): PointsCategory {
  if (section === 'tasks') return 'tasks';
  if (section === 'exchange') return 'exchange';
  return 'questions';
}

const SOURCE_CATEGORY = new Map<string, PointsCategory>();

for (const rule of DEFAULT_POINT_RULES) {
  if (CHECKIN_SOURCES.has(rule.id)) {
    SOURCE_CATEGORY.set(rule.id, 'checkins');
  } else if (EXCHANGE_SOURCES.has(rule.id)) {
    SOURCE_CATEGORY.set(rule.id, 'exchange');
  } else {
    SOURCE_CATEGORY.set(rule.id, sectionToCategory(rule.section));
  }
}

export function getPointsCategory(source: string): PointsCategory {
  if (SOURCE_CATEGORY.has(source)) return SOURCE_CATEGORY.get(source)!;
  if (source.startsWith('task_')) return 'tasks';
  if (CHECKIN_SOURCES.has(source)) return 'checkins';
  if (EXCHANGE_SOURCES.has(source)) return 'exchange';
  return 'questions';
}

export function emptyPointsBreakdown(): PointsBreakdown {
  return { total: 0, questions: 0, tasks: 0, checkins: 0, exchange: 0 };
}

export function addToBreakdown(
  breakdown: PointsBreakdown,
  source: string,
  points: number,
): PointsBreakdown {
  const category = getPointsCategory(source);
  breakdown[category] += points;
  breakdown.total += points;
  return breakdown;
}

export function mergeBreakdowns(rows: { source: string; points: number }[]): PointsBreakdown {
  const breakdown = emptyPointsBreakdown();
  for (const row of rows) {
    addToBreakdown(breakdown, row.source, row.points);
  }
  return breakdown;
}
