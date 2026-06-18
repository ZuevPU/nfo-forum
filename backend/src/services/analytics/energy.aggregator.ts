import { moscowDateString } from '../../utils/moscowTime.js';
import { resolveCheckinSlotLabel, safeAvg } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { EnergyMetrics } from './analytics.types.js';

export function getEnergyMetrics(ctx: AnalyticsContext): EnergyMetrics {
  const byDaySlotMap = new Map<string, number[]>();
  const byTrackSlotMap = new Map<string, number[]>();
  const overallSlotMap = new Map<string, number[]>();

  for (const c of ctx.checkins) {
    const dayKey = moscowDateString(c.createdAt);
    const slotLabel = resolveCheckinSlotLabel(c.createdAt, ctx.checkinSettings);
    const daySlotKey = `${dayKey}:${slotLabel}`;
    if (!byDaySlotMap.has(daySlotKey)) byDaySlotMap.set(daySlotKey, []);
    byDaySlotMap.get(daySlotKey)!.push(c.energyLevel);

    const user = ctx.participants.find((p) => p.id === c.userId);
    const track = user?.track ?? 'Без трека';
    const trackSlotKey = `${track}:${slotLabel}`;
    if (!byTrackSlotMap.has(trackSlotKey)) byTrackSlotMap.set(trackSlotKey, []);
    byTrackSlotMap.get(trackSlotKey)!.push(c.energyLevel);

    if (!overallSlotMap.has(slotLabel)) overallSlotMap.set(slotLabel, []);
    overallSlotMap.get(slotLabel)!.push(c.energyLevel);
  }

  const byDaySlot = [...byDaySlotMap.entries()].map(([key, values]) => {
    const [dayKey, slotLabel] = key.split(':');
    const day = ctx.forumDays.find((d) => d.key === dayKey);
    return {
      dayKey,
      dayLabel: day?.label ?? dayKey,
      slotLabel,
      avgEnergy: safeAvg(values),
    };
  });

  const tracks = [...new Set(ctx.participants.map((p) => p.track).filter(Boolean))] as string[];
  const slotLabels = [...new Set([...byDaySlotMap.keys()].map((k) => k.split(':')[1]))];

  const byTrackSlot = tracks.flatMap((track) =>
    slotLabels.map((slotLabel) => {
      const values = byTrackSlotMap.get(`${track}:${slotLabel}`) ?? [];
      return {
        track,
        slotKey: slotLabel,
        avgEnergy: safeAvg(values),
      };
    }),
  );

  const allValues = ctx.checkins.map((c) => c.energyLevel);
  byTrackSlot.push({
    track: 'ВСЕ УЧАСТНИКИ',
    slotKey: 'all',
    avgEnergy: safeAvg(allValues),
  });

  const overallBySlot = [...overallSlotMap.entries()].map(([slotLabel, values]) => ({
    slotLabel,
    avgEnergy: safeAvg(values),
  }));

  return { byDaySlot, byTrackSlot, overallBySlot };
}

export async function fetchEnergyMetrics(): Promise<EnergyMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getEnergyMetrics(await loadAnalyticsContext());
}
