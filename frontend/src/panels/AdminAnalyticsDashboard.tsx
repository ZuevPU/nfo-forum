import {
  Button,
  Card,
  CardGrid,
  Div,
  Group,
  MiniInfoCell,
  Placeholder,
  SimpleCell,
  Spinner,
  Spacing,
} from '@vkontakte/vkui';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  downloadAnalyticsReport,
  fetchAnalyticsDashboard,
  type AnalyticsDashboardData,
} from '../api/analytics';

function fmt(value: number | null | undefined, suffix = ''): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}${suffix}`;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card mode="outline">
      <MiniInfoCell textWrap="full">{label}</MiniInfoCell>
      <Div style={{ fontSize: 24, fontWeight: 700, paddingTop: 0 }}>{value}</Div>
    </Card>
  );
}

export function AdminAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAnalyticsDashboard()
      .then((result) => setData(result))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    setExporting(true);
    downloadAnalyticsReport()
      .catch((e: Error) => setError(e.message))
      .finally(() => setExporting(false));
  };

  if (loading) {
    return (
      <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="l" />
      </Div>
    );
  }

  if (error || !data) {
    return (
      <Placeholder
        action={<Button onClick={load}>Повторить</Button>}
      >
        Не удалось загрузить аналитику: {error ?? 'Неизвестная ошибка'}
      </Placeholder>
    );
  }

  const { overview, energy, emotions, factors, tasks, diagnostics, ranking, reflectionDepth } = data;

  const energyChartData = energy.overallBySlot.map((s) => ({
    name: s.slotLabel.replace(' чек-in', ''),
    energy: s.avgEnergy ?? 0,
  }));

  const taskChartData = tasks.completion.slice(0, 8).map((t) => ({
    name: t.taskTitle.length > 18 ? `${t.taskTitle.slice(0, 18)}…` : t.taskTitle,
    percent: t.completionPercent ?? 0,
  }));

  const factorChartData = factors.topOverall.slice(0, 8).map((f) => ({
    name: f.factor.length > 20 ? `${f.factor.slice(0, 20)}…` : f.factor,
    count: f.count,
  }));

  const emotionChartData = emotions.topOverall.map((e) => ({
    name: e.emotion,
    count: e.count,
  }));

  const diagnosticsChartData = diagnostics.skills.map((s) => ({
    name: `У${s.skillId}`,
    entry: s.entryAvg ?? 0,
    exit: s.exitAvg ?? 0,
  }));

  const depthChartData = reflectionDepth.overall.map((d) => ({
    name: d.dayLabel,
    words: d.avgWords ?? 0,
  }));

  return (
    <div className="nfo-admin-section">
      <Div>
        <Button size="l" stretched loading={exporting} onClick={() => void handleExport()}>
          Скачать отчёт в Excel
        </Button>
      </Div>

      <Group header={<div className="nfo-sec-title">KPI</div>}>
        <CardGrid size="l">
          <KpiCard label="Зарегистрировано" value={String(overview.registered)} />
          <KpiCard label="% активных" value={fmt(overview.activePercent, '%')} />
          <KpiCard label="Средняя энергия" value={fmt(overview.avgEnergy, '/10')} />
          <KpiCard label="Глубина рефлексии" value={fmt(overview.avgReflectionDepth, ' слов')} />
          <KpiCard label="Заданий выполнено" value={String(overview.tasksCompleted)} />
          <KpiCard label="% выполнения заданий" value={fmt(overview.tasksCompletionPercent, '%')} />
        </CardGrid>
      </Group>

      <Spacing size={12} />

      <Group header={<div className="nfo-sec-title">Средняя энергия по слотам</div>}>
        <div className="nfo-analytics-chart">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={energyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line type="monotone" dataKey="energy" stroke="#2787F5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Group>

      <Group header={<div className="nfo-sec-title">Выполнение заданий (%)</div>}>
        <div className="nfo-analytics-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={taskChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="percent" fill="#4BB34B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Group>

      <Group header={<div className="nfo-sec-title">Топ факторов рефлексии</div>}>
        <div className="nfo-analytics-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart layout="vertical" data={factorChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#FFA000" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Group>

      <Group header={<div className="nfo-sec-title">Топ эмоций</div>}>
        <div className="nfo-analytics-chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={emotionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#E64646" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Group>

      <Group header={<div className="nfo-sec-title">Самодиагностика: вход vs выход</div>}>
        <div className="nfo-analytics-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={diagnosticsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="entry" name="Входная" fill="#818C99" />
              <Bar dataKey="exit" name="Выходная" fill="#2787F5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Group>

      <Group header={<div className="nfo-sec-title">Глубина рефлексии по дням</div>}>
        <div className="nfo-analytics-chart">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={depthChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="words" stroke="#9C27B0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Group>

      <Group header={<div className="nfo-sec-title">Рейтинг участников (топ-10)</div>}>
        {ranking.participants.slice(0, 10).map((r) => (
          <SimpleCell
            key={r.userId}
            subtitle={`${r.track ?? '—'} · ${r.totalPoints} баллов · ур. рефлексии ${r.reflectionLevel}`}
          >
            {r.position}. {r.firstName} {r.lastName ?? ''}
          </SimpleCell>
        ))}
      </Group>

      <Group header={<div className="nfo-sec-title">Рейтинг по трекам</div>}>
        {ranking.tracks.map((r) => (
          <SimpleCell
            key={r.track}
            subtitle={`${r.participants} уч. · ср. ${fmt(r.avgPoints)}`}
          >
            {r.position}. {r.track} — {r.totalPoints} баллов
          </SimpleCell>
        ))}
      </Group>
    </div>
  );
}
