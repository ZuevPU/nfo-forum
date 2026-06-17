import {
  Div,
  Group,
  Panel,
  SegmentedControl,
  Spinner,
  PullToRefresh,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { fetchEvents } from '../api/events';
import type { EventDto } from '../api/home';
import { GradientHeader } from '../components/GradientHeader';
import { FORUM_DAYS } from '../constants/nfoFactors';
import { useAuthContext } from '../contexts/AuthContext';
import {
  cacheEvents,
  formatEventTimeMoscow,
  getCachedEvents,
  getDefaultForumDay,
  isEventNowMoscow,
} from '../lib/scheduleCache';

export function SchedulePanel() {
  const { user } = useAuthContext();
  const [filter, setFilter] = useState<'track' | 'all'>('track');
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getDefaultForumDay());

  const load = () => {
    setLoading(true);
    const track = filter === 'track' ? (user?.track ?? 'all') : 'all';

    const cached = getCachedEvents<EventDto>(track, selectedDay);
    if (cached?.length) {
      setEvents(cached);
      setOffline(!navigator.onLine);
    }

    fetchEvents(track, selectedDay)
      .then((r) => {
        setEvents(r.events);
        cacheEvents(track, selectedDay, r.events);
        setOffline(false);
      })
      .catch(() => {
        if (cached?.length) {
          setEvents(cached);
          setOffline(true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter, user?.track, selectedDay]);

  return (
    <Panel id="schedule">
      <GradientHeader title="Расписание" subtitle={offline ? 'Офлайн — показан кеш' : 'Программа форума'} backToHome>
        <div style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto' }}>
          {FORUM_DAYS.map((tab) => (
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
      <PullToRefresh onRefresh={() => load()} isFetching={loading}>
      <Group>
        <Div>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as 'track' | 'all')}
            options={[
              { label: 'Мой трек', value: 'track' },
              { label: 'Общий трек', value: 'all' },
            ]}
          />
        </Div>
      </Group>
      {loading && events.length === 0 ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      ) : (
        <Group>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
            {events.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)', padding: 24 }}>
                Нет событий на этот день
              </div>
            )}
            {events.map((ev) => {
              const isNow = isEventNowMoscow(ev.startTime, ev.endTime);
              return (
                <div
                  key={ev.id}
                  className={`nfo-card nfo-ev${isNow ? ' nfo-ev-now' : ''}`}
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
                >
                  <div className="nfo-ev-time" style={{ fontSize: 12, fontWeight: 700, color: isNow ? undefined : 'var(--nfo-primary)', minWidth: 36 }}>
                    {formatEventTimeMoscow(ev.startTime)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="nfo-ev-title" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{ev.title}</div>
                    {ev.place && <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>{ev.place}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {isNow && <span className="nfo-tag nfo-tag--now">СЕЙЧАС</span>}
                      {ev.track ? <span className="nfo-tag nfo-tag--trk">{ev.track}</span> : <span className="nfo-tag nfo-tag--gen">ОБЩЕЕ</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </Div>
        </Group>
      )}
      </PullToRefresh>
    </Panel>
  );
}
