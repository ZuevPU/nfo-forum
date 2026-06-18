import {
  Div,
  Group,
  Headline,
  Panel,
  Placeholder,
  Progress,
  SimpleCell,
  Spinner,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchReflectionLevel, type ReflectionLevelData } from '../api/rating';
import { GradientHeader } from '../components/GradientHeader';
import { REFLECTION_LEVEL_DESCRIPTIONS, REFLECTION_LEVEL_NAMES, DEFAULT_REFLECTION_THRESHOLDS, getReflectionProgress } from '../constants/reflectionLevels';
import { useAuthContext } from '../contexts/AuthContext';

export function ReflectionLevelPanel() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [data, setData] = useState<ReflectionLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReflectionLevel()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const level = data?.level ?? user.reflectionLevel;
  const reflectionPoints = data?.reflectionPoints ?? user.reflectionPoints;
  const thresholds = data?.thresholds?.length ? data.thresholds : DEFAULT_REFLECTION_THRESHOLDS;
  const { progress, pointsToNextLevel, nextLevel } = getReflectionProgress(level, reflectionPoints, thresholds);

  return (
    <Panel id="reflection-level">
      <GradientHeader title="Уровень рефлексии 💭" subtitle="Прогресс осмысления опыта" backToHome />

      <div className="nfo-bg">
        {loading ? (
          <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size="l" />
          </Div>
        ) : error ? (
          <Placeholder>{error}</Placeholder>
        ) : (
          <>
            <Group>
              <Div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <Headline level="1" weight="2">
                  Ур. {level}
                </Headline>
                <div style={{ fontSize: 16, color: 'var(--vkui--color_text_secondary)', marginTop: 8 }}>
                  {REFLECTION_LEVEL_NAMES[level] ?? ''}
                </div>
                {(data?.levelDescriptions?.[level] ?? REFLECTION_LEVEL_DESCRIPTIONS[level]) && (
                  <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', marginTop: 10, lineHeight: 1.45 }}>
                    {data?.levelDescriptions?.[level] ?? REFLECTION_LEVEL_DESCRIPTIONS[level]}
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <Progress value={Math.min(100, Math.max(0, progress))} />
                </div>
                <div style={{ fontSize: 13, marginTop: 8, color: 'var(--vkui--color_text_secondary)' }}>
                  {reflectionPoints} баллов рефлексии
                  {pointsToNextLevel > 0 && nextLevel != null && ` · ${pointsToNextLevel} до ${nextLevel} ур.`}
                </div>
              </Div>
            </Group>

            <Group header={<div className="nfo-sec-title">Пороги уровней</div>}>
              {thresholds.slice(1).map((threshold, index) => (
                <SimpleCell
                  key={threshold}
                  subtitle={`от ${threshold} баллов · ${REFLECTION_LEVEL_DESCRIPTIONS[index + 2] ?? ''}`}
                >
                  Уровень {index + 2}: {REFLECTION_LEVEL_NAMES[index + 2] ?? ''}
                </SimpleCell>
              ))}
            </Group>

            <Group header={<div className="nfo-sec-title">История повышения уровня</div>}>
              {!data?.history.length ? (
                <Div style={{ padding: '0 16px 16px' }}>
                  <div className="nfo-admin-empty">История появится после первого повышения уровня</div>
                </Div>
              ) : (
                data.history.map((h) => (
                  <SimpleCell
                    key={h.id}
                    subtitle={new Date(h.createdAt).toLocaleString('ru-RU')}
                  >
                    {h.oldLevel} → {h.newLevel} ур. ({REFLECTION_LEVEL_NAMES[h.newLevel] ?? ''})
                  </SimpleCell>
                ))
              )}
            </Group>

            <Div style={{ padding: '0 16px 24px' }}>
              <button type="button" className="nfo-admin-btn-secondary stretched" onClick={() => navigate('/home')}>
                На главную
              </button>
            </Div>
          </>
        )}
      </div>
    </Panel>
  );
}
