import { and, asc, eq, gte, lte, or, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events } from '../db/schema.js';

export interface EventDto {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  place: string | null;
  track: string | null;
  isKeyBlock: boolean;
}

function toEventDto(e: typeof events.$inferSelect): EventDto {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    place: e.place,
    track: e.track,
    isKeyBlock: e.isKeyBlock,
  };
}

function trackCondition(track?: string | null) {
  if (!track) return undefined;
  return or(eq(events.track, track), isNull(events.track));
}

export async function getEvents(track?: string | null, day?: string): Promise<EventDto[]> {
  const conditions = [];

  const trackFilter = trackCondition(track && track !== 'all' ? track : null);
  if (trackFilter) conditions.push(trackFilter);

  if (day) {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(events.startTime, start));
    conditions.push(lte(events.startTime, end));
  }

  const rows = await db
    .select()
    .from(events)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(events.startTime));

  return rows.map(toEventDto);
}

export async function getCurrentEvent(track?: string | null): Promise<EventDto | null> {
  const now = new Date();
  const conditions = [lte(events.startTime, now), gte(events.endTime, now)];
  const trackFilter = trackCondition(track);
  if (trackFilter) conditions.push(trackFilter);

  const [row] = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.startTime))
    .limit(1);

  return row ? toEventDto(row) : null;
}

export async function getUpcomingKeyBlock(track?: string | null): Promise<EventDto | null> {
  const now = new Date();
  const conditions = [eq(events.isKeyBlock, true), gte(events.endTime, now)];
  const trackFilter = trackCondition(track);
  if (trackFilter) conditions.push(trackFilter);

  const [row] = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.startTime))
    .limit(1);

  return row ? toEventDto(row) : null;
}
