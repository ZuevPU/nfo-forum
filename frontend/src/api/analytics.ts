import { apiRequest, downloadApiFile } from './client';

export interface AnalyticsOverview {
  registered: number;
  activePercent: number;
  avgEnergy: number | null;
  avgReflectionDepth: number | null;
  tasksCompleted: number;
  tasksTotal: number;
  tasksCompletionPercent: number | null;
  reflectionAnswers: number;
  checkins: number;
}

export interface ForumDayColumn {
  key: string;
  label: string;
}

export interface ActivityDayRow {
  dayKey: string;
  dayLabel: string;
  registeredCumulative: number;
  visited: number;
  activePercent: number | null;
  answeredQuestion: number;
  answeredPercent: number | null;
}

export interface ActivityMetrics {
  days: ForumDayColumn[];
  rows: ActivityDayRow[];
  slotActivity: { slotLabel: string; actionType: string; values: Record<string, number | null> }[];
}

export interface EnergyDaySlot {
  dayKey: string;
  dayLabel: string;
  slotLabel: string;
  avgEnergy: number | null;
}

export interface EnergyMetrics {
  byDaySlot: EnergyDaySlot[];
  byTrackSlot: { track: string; slotKey: string; avgEnergy: number | null }[];
  overallBySlot: { slotLabel: string; avgEnergy: number | null }[];
}

export interface EmotionCount {
  emotion: string;
  count: number;
  percent: number | null;
}

export interface EmotionMetrics {
  topOverall: EmotionCount[];
  bySlot: { slotLabel: string; respondents: number; top: { rank: number; emotion: string; count: number }[] }[];
}

export interface FactorCount {
  factor: string;
  count: number;
  percent: number | null;
  byDay: { dayKey: string; count: number }[];
}

export interface FactorMetrics {
  topOverall: FactorCount[];
  byTrack: { factor: string; trackPercents: Record<string, number | null> }[];
}

export interface TaskCompletionRow {
  taskId: number;
  taskTitle: string;
  availableFor: string;
  completed: number;
  eligible: number;
  completionPercent: number | null;
}

export interface TaskTimingRow {
  taskId: number;
  taskTitle: string;
  morning: number | null;
  day: number | null;
  evening: number | null;
  night: number | null;
  medianHoursAfterActivation: number | null;
}

export interface TaskMetrics {
  completion: TaskCompletionRow[];
  timing: TaskTimingRow[];
}

export interface SkillScore {
  skillId: number;
  skillTitle: string;
  entryAvg: number | null;
  exitAvg: number | null;
  delta: number | null;
}

export interface DiagnosticsMetrics {
  skills: SkillScore[];
}

export interface PointsBreakdown {
  total: number;
  questions: number;
  tasks: number;
  checkins: number;
  exchange: number;
}

export interface ParticipantRankingRow {
  position: number;
  userId: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  totalPoints: number;
  pointsBreakdown: PointsBreakdown;
  reflectionLevel: number;
}

export interface TrackRankingRow {
  position: number;
  track: string;
  totalPoints: number;
  avgPoints: number | null;
  participants: number;
}

export interface RankingMetrics {
  participants: ParticipantRankingRow[];
  tracks: TrackRankingRow[];
}

export interface ReflectionDepthDay {
  dayKey: string;
  dayLabel: string;
  avgWords: number | null;
}

export interface ReflectionDepthTrack {
  track: string;
  byDay: ReflectionDepthDay[];
  dynamicsPercent: number | null;
  medianWords: number | null;
}

export interface ReflectionDepthMetrics {
  overall: ReflectionDepthDay[];
  byTrack: ReflectionDepthTrack[];
  overallMedian: number | null;
}

export interface AnalyticsDashboardData {
  overview: AnalyticsOverview;
  activity: ActivityMetrics;
  energy: EnergyMetrics;
  emotions: EmotionMetrics;
  factors: FactorMetrics;
  tasks: TaskMetrics;
  diagnostics: DiagnosticsMetrics;
  ranking: RankingMetrics;
  reflectionDepth: ReflectionDepthMetrics;
}

export function fetchAnalyticsOverview() {
  return apiRequest<{ overview: AnalyticsOverview }>('/api/admin/analytics/overview');
}

export function fetchAnalyticsActivity() {
  return apiRequest<{ activity: ActivityMetrics }>('/api/admin/analytics/activity');
}

export function fetchAnalyticsEnergy() {
  return apiRequest<{ energy: EnergyMetrics }>('/api/admin/analytics/energy');
}

export function fetchAnalyticsEmotions() {
  return apiRequest<{ emotions: EmotionMetrics }>('/api/admin/analytics/emotions');
}

export function fetchAnalyticsFactors() {
  return apiRequest<{ factors: FactorMetrics }>('/api/admin/analytics/factors');
}

export function fetchAnalyticsTasks() {
  return apiRequest<{ tasks: TaskMetrics }>('/api/admin/analytics/tasks');
}

export function fetchAnalyticsDiagnostics() {
  return apiRequest<{ diagnostics: DiagnosticsMetrics }>('/api/admin/analytics/diagnostics');
}

export function fetchAnalyticsRanking() {
  return apiRequest<{ ranking: RankingMetrics }>('/api/admin/analytics/ranking');
}

export function fetchAnalyticsReflectionDepth() {
  return apiRequest<{ reflectionDepth: ReflectionDepthMetrics }>('/api/admin/analytics/reflection-depth');
}

export async function fetchAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  const [
    overviewRes,
    activityRes,
    energyRes,
    emotionsRes,
    factorsRes,
    tasksRes,
    diagnosticsRes,
    rankingRes,
    reflectionDepthRes,
  ] = await Promise.all([
    fetchAnalyticsOverview(),
    fetchAnalyticsActivity(),
    fetchAnalyticsEnergy(),
    fetchAnalyticsEmotions(),
    fetchAnalyticsFactors(),
    fetchAnalyticsTasks(),
    fetchAnalyticsDiagnostics(),
    fetchAnalyticsRanking(),
    fetchAnalyticsReflectionDepth(),
  ]);

  return {
    overview: overviewRes.overview,
    activity: activityRes.activity,
    energy: energyRes.energy,
    emotions: emotionsRes.emotions,
    factors: factorsRes.factors,
    tasks: tasksRes.tasks,
    diagnostics: diagnosticsRes.diagnostics,
    ranking: rankingRes.ranking,
    reflectionDepth: reflectionDepthRes.reflectionDepth,
  };
}

export function downloadAnalyticsReport() {
  const date = new Date().toISOString().slice(0, 10);
  return downloadApiFile('/api/admin/analytics/export/xlsx', `Выгрузка_Форум_НФО_${date}.xlsx`);
}
