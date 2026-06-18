import { FormItem, Input } from '@vkontakte/vkui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPointsSettings, savePointsSettings } from '../api/admin';
import {
  REFLECTION_LEVEL_DESCRIPTIONS,
  REFLECTION_LEVEL_NAMES,
  SECTION_MAX_TOTALS,
} from '../constants/reflectionLevels';

type PointRule = {
  id: string;
  label: string;
  section: 'reflection' | 'exchange' | 'tasks';
  pointsPerAction: number;
  maxTotal: number;
  maxCount?: number;
  countsToReflection: boolean;
  optional?: boolean;
  note?: string;
};

type RuleOverride = { pointsPerAction?: number; maxTotal?: number; maxCount?: number };

const SECTION_LABELS: Record<PointRule['section'], string> = {
  reflection: 'Рефлексия',
  exchange: 'Обмен опытом',
  tasks: 'Задания (справочно)',
};

function sectionMax(rules: PointRule[], section: PointRule['section']) {
  return rules.filter((r) => r.section === section).reduce((sum, r) => sum + r.maxTotal, 0);
}

export function PointsSystemSettings({
  reflectionThresholds,
  onReflectionThresholdsChange,
  onSaveReflectionThresholds,
}: {
  reflectionThresholds: number[];
  onReflectionThresholdsChange: (next: number[]) => void;
  onSaveReflectionThresholds: () => void;
}) {
  const [rules, setRules] = useState<PointRule[]>([]);
  const [overrides, setOverrides] = useState<Record<string, RuleOverride>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchPointsSettings()
      .then((r) => {
        setRules(r.rules);
        setOverrides(r.overrides ?? {});
      })
      .catch(console.error);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRuleField = (id: string, field: keyof RuleOverride, value: number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await savePointsSettings(overrides);
      setMessage('Сохранено');
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const sections = useMemo(() => {
    const order: PointRule['section'][] = ['reflection', 'exchange', 'tasks'];
    return order.map((section) => ({
      section,
      label: SECTION_LABELS[section],
      rules: rules.filter((r) => r.section === section),
      maxTotal: sectionMax(rules, section),
      expectedMax: SECTION_MAX_TOTALS[section],
    }));
  }, [rules]);

  return (
    <>
      <div className="nfo-sec-title">Система баллов</div>
      <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginBottom: 8, lineHeight: 1.45 }}>
        Рефлексия и обмен начисляют баллы уровня рефлексии; задания — только рейтинг трека. Лимиты считаются по истории начислений.
      </div>

      {sections.map(({ section, label, rules: sectionRules, maxTotal, expectedMax }) => (
        <div key={section} style={{ marginBottom: 16 }}>
          <div className="nfo-sec-title" style={{ fontSize: 13, marginBottom: 6 }}>{label}</div>
          <div className="nfo-admin-form-card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f2f3f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Действие</th>
                  <th style={{ padding: '8px 6px', width: 64 }}>Балл</th>
                  <th style={{ padding: '8px 6px', width: 80 }}>Макс.</th>
                  <th style={{ padding: '8px 6px', width: 64 }}>Кол-во</th>
                  <th style={{ padding: '8px 6px', width: 72 }}>Рефл.</th>
                  <th style={{ padding: '8px 10px' }}>Примечание</th>
                </tr>
              </thead>
              <tbody>
                {sectionRules.map((rule) => (
                  <tr key={rule.id} style={{ borderTop: '1px solid #e8eaff' }}>
                    <td style={{ padding: '8px 10px', lineHeight: 1.35 }}>
                      {rule.label}
                      {rule.optional && (
                        <span style={{ color: 'var(--vkui--color_text_secondary)' }}> (опц.)</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <Input
                        type="number"
                        value={String(rule.pointsPerAction)}
                        onChange={(e) => updateRuleField(rule.id, 'pointsPerAction', Number(e.target.value))}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <Input
                        type="number"
                        value={String(rule.maxTotal)}
                        onChange={(e) => updateRuleField(rule.id, 'maxTotal', Number(e.target.value))}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <Input
                        type="number"
                        value={rule.maxCount != null ? String(rule.maxCount) : ''}
                        placeholder="—"
                        onChange={(e) => {
                          const v = e.target.value;
                          const num = v === '' ? undefined : Number(v);
                          setRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id ? { ...r, maxCount: num } : r,
                            ),
                          );
                          setOverrides((prev) => ({
                            ...prev,
                            [rule.id]: { ...prev[rule.id], maxCount: num },
                          }));
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {rule.countsToReflection ? 'да' : 'нет'}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--vkui--color_text_secondary)', lineHeight: 1.35 }}>
                      {rule.note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #d8dbef', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '8px 10px' }}>Итого по секции</td>
                  <td colSpan={4} style={{ padding: '8px 10px' }}>
                    {maxTotal} б. {expectedMax !== maxTotal ? `(ожид. ${expectedMax})` : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 12, marginBottom: 10, color: 'var(--vkui--color_text_secondary)' }}>
        Максимум рефлексии с обменом: {SECTION_MAX_TOTALS.reflectionWithExchange} б.
      </div>

      <button type="button" className="nfo-admin-btn-primary" disabled={saving} onClick={() => void handleSave()}>
        {saving ? 'Сохранение…' : 'Сохранить систему баллов'}
      </button>
      {message && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--nfo-green)' }}>{message}</div>}

      <div className="nfo-sec-title" style={{ marginTop: 16 }}>Пороги уровней рефлексии</div>
      <div className="nfo-admin-form-card">
        {reflectionThresholds.slice(1).map((value, index) => (
          <FormItem
            key={index + 2}
            top={`Уровень ${index + 2}: ${REFLECTION_LEVEL_NAMES[index + 2] ?? ''} — от ${value} б.`}
          >
            <Input
              type="number"
              value={String(value)}
              onChange={(e) => {
                const next = [...reflectionThresholds];
                next[index + 1] = Number(e.target.value);
                onReflectionThresholdsChange(next);
              }}
            />
            <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 6, lineHeight: 1.4 }}>
              {REFLECTION_LEVEL_DESCRIPTIONS[index + 2]}
            </div>
          </FormItem>
        ))}
        <button type="button" className="nfo-admin-btn-primary" onClick={onSaveReflectionThresholds}>
          Сохранить пороги рефлексии
        </button>
      </div>
    </>
  );
}
