import {
  Div,
  Group,
  Panel,
  SegmentedControl,
  Spinner,
} from '@vkontakte/vkui';
import { useEffect, useMemo, useState } from 'react';
import { fetchEvents } from '../api/events';
import type { EventDto } from '../api/home';
import { GradientHeader } from '../components/GradientHeader';
import { useAuthContext } from '../contexts/AuthContext';

function formatDayLabel(date: Date): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return `${days[date.getDay()]} ${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function SchedulePanel() {
  const { user } = useAuthContext();
  const [filter, setFilter] = useState<'track' | 'all'>('track');
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);

  const dayTabs = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return { key: toDayKey(d), label: formatDayLabel(d) };
    });
  }, []);

  const [selectedDay, setSelectedDay] = useState(dayTabs[0]?.key ?? toDayKey(new Date()));

  useEffect(() => {
    setLoading(true);
    const track = filter === 'track' ? (user?.track ?? 'all') : 'all';
    fetchEvents(track, selectedDay)
      .then((r) => setEvents(r.events))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, user?.track, selectedDay]);

  const now = new Date();

  return (
    <Panel id="schedule">
      <GradientHeader title="Расписание" subtitle="Программа форума">
        <div style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto' }}>
          {dayTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`nfo-day-tab${selectedDay === tab.key ? ' nfo-day-tab--active' : ''}`}
              onClick={() => setSelectedDay(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </GradientHeader>
      <Group>
        <Div>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as 'track' | 'all')}
            options={[
              { label: 'Мой трек', value: 'track' },
              { label: 'Все', value: 'all' },
            ]}
          />
        </Div>
      </Group>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      ) : (
        <Group>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          {events.length === 0 ? (
            <Div style={{ textAlign: 'center', padding: 24, color: 'var(--vkui--color_text_secondary)' }}>
              Нет событий на этот день
            </Div>
          ) : (
            events.map((ev) => {
              const start = new Date(ev.startTime);
              const end = new Date(ev.endTime);
              const isNow = start <= now && end >= now;
              const time = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={ev.id} className="nfo-card" style={{ borderLeft: isNow ? '3px solid var(--nfo-accent)' : undefined, borderRadius: isNow ? '0 12px 12px 0' : 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isNow ? 'var(--nfo-green)' : 'var(--nfo-primary)', minWidth: 36 }}>
                    {time}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isNow ? 'var(--nfo-green)' : 'inherit', lineHeight: 1.3 }}>{ev.title}</div>
                    {ev.place && <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>{ev.place}</div>}
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {isNow && <span className="nfo-tag nfo-tag--now">СЕЙЧАС</span>}
                      {ev.track ? <span className="nfo-tag nfo-tag--trk">{ev.track}</span> : <span className="nfo-tag nfo-tag--gen">ОБЩЕЕ</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </Div>
        </Group>
      )}
    </Panel>
  );
}
