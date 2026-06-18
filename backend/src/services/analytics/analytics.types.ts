export interface ForumDayColumn {
  key: string;
  label: string;
}

export type PointsCategory = 'questions' | 'tasks' | 'checkins' | 'exchange';

export interface PointsBreakdown {
  total: number;
  questions: number;
  tasks: number;
  checkins: number;
  exchange: number;
}

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
  slotActivity: SlotActivityRow[];
}

export interface SlotActivityRow {
  slotLabel: string;
  actionType: string;
  values: Record<string, number | null>;
}

export interface EnergyDaySlot {
  dayKey: string;
  dayLabel: string;
  slotLabel: string;
  avgEnergy: number | null;
}

export interface EnergyTrackSlot {
  track: string;
  slotKey: string;
  avgEnergy: number | null;
}

export interface EnergyTrackDaySlot {
  track: string;
  dayKey: string;
  slotLabel: string;
  avgEnergy: number | null;
}

export interface EnergyMetrics {
  byDaySlot: EnergyDaySlot[];
  byTrackSlot: EnergyTrackSlot[];
  byTrackDaySlot: EnergyTrackDaySlot[];
  overallBySlot: { slotLabel: string; avgEnergy: number | null }[];
}

export interface EmotionCount {
  emotion: string;
  count: number;
  percent: number | null;
}

export interface EmotionSlotTop {
  slotLabel: string;
  respondents: number;
  top: { rank: number; emotion: string; count: number }[];
}

export interface EmotionMetrics {
  topOverall: EmotionCount[];
  bySlot: EmotionSlotTop[];
}

export interface FactorDayCount {
  dayKey: string;
  count: number;
}

export interface FactorCount {
  factor: string;
  count: number;
  percent: number | null;
  byDay: FactorDayCount[];
}

export interface FactorTrackCount {
  factor: string;
  trackPercents: Record<string, number | null>;
}

export interface FactorMetrics {
  topOverall: FactorCount[];
  byTrack: FactorTrackCount[];
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

export interface ParticipantRow {
  id: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  createdAt: Date;
  totalPoints: number;
  reflectionLevel: number;
}

export interface QuestionCheckinRow {
  firstName: string;
  lastName: string | null;
  track: string | null;
  date: string;
  time: string;
  question: string;
  answer: string;
  factors: string;
  questionType: string;
}

export interface DiagnosticRow {
  firstName: string;
  lastName: string | null;
  track: string | null;
  attemptType: string;
  scores: Record<number, number>;
  avgScore: number | null;
  completedAt: Date;
}

export interface TaskExportRow {
  firstName: string;
  lastName: string | null;
  track: string | null;
  taskTitle: string;
  dateTime: string;
  answer: string;
  photo: string;
  points: number;
  status: string;
}

export interface ExchangeQuestionRow {
  firstName: string;
  lastName: string | null;
  track: string | null;
  text: string;
  audience: string;
  dateTime: string;
  answersCount: number;
}

export interface ExchangeAnswerRow {
  firstName: string;
  lastName: string | null;
  track: string | null;
  questionText: string;
  answer: string;
  dateTime: string;
}

export interface AnalyticsRawData {
  participants: ParticipantRow[];
  questionCheckinRows: QuestionCheckinRow[];
  diagnosticRows: DiagnosticRow[];
  taskRows: TaskExportRow[];
  exchangeQuestions: ExchangeQuestionRow[];
  exchangeAnswers: ExchangeAnswerRow[];
  forumDays: ForumDayColumn[];
}

export interface AnalyticsBundle {
  overview: AnalyticsOverview;
  activity: ActivityMetrics;
  energy: EnergyMetrics;
  emotions: EmotionMetrics;
  factors: FactorMetrics;
  tasks: TaskMetrics;
  diagnostics: DiagnosticsMetrics;
  ranking: RankingMetrics;
  reflectionDepth: ReflectionDepthMetrics;
  raw: AnalyticsRawData;
}
