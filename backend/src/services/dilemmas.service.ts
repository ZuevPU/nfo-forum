import { and, asc, eq, gt, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dilemmas, dilemmaVotes } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardPoints } from './points.service.js';

export const DILEMMAS_POINTS_PER_VOTE = 3;
export const DILEMMAS_MAX_COUNT = 5;
export const DILEMMAS_MAX_POINTS = DILEMMAS_MAX_COUNT * DILEMMAS_POINTS_PER_VOTE;

async function promoteDilemmas(now: Date = new Date()) {
  await db
    .update(dilemmas)
    .set({ isPublished: true })
    .where(and(eq(dilemmas.isPublished, false), lte(dilemmas.publishedAt, now)));
}

export async function getDilemmasSummary(userId: number) {
  await promoteDilemmas();
  const published = await db.select({ id: dilemmas.id }).from(dilemmas).where(eq(dilemmas.isPublished, true));
  const userVotes = await db
    .select({ dilemmaId: dilemmaVotes.dilemmaId })
    .from(dilemmaVotes)
    .where(eq(dilemmaVotes.userId, userId));
  const votedIds = new Set(userVotes.map((v) => v.dilemmaId));
  const totalCount = published.length;
  const answeredCount = published.filter((d) => votedIds.has(d.id)).length;
  return {
    answeredCount,
    totalCount,
    maxPoints: DILEMMAS_MAX_POINTS,
    status: totalCount > 0 && answeredCount === totalCount ? 'completed' : 'active',
  };
}

export async function listDilemmas(userId: number) {
  await promoteDilemmas();
  const now = new Date();
  const published = await db
    .select()
    .from(dilemmas)
    .where(eq(dilemmas.isPublished, true))
    .orderBy(asc(dilemmas.publishedAt));
  const upcoming = await db
    .select()
    .from(dilemmas)
    .where(and(eq(dilemmas.isPublished, false), gt(dilemmas.publishedAt, now)))
    .orderBy(asc(dilemmas.publishedAt));
  const userVotes = await db.select().from(dilemmaVotes).where(eq(dilemmaVotes.userId, userId));
  const voteMap = new Map(userVotes.map((v) => [v.dilemmaId, v]));
  return [
    ...published.map((d) => {
      const vote = voteMap.get(d.id);
      return {
        id: d.id,
        text: d.text,
        optionA: d.optionA,
        optionB: d.optionB,
        pointsPerVote: d.pointsPerVote,
        status: vote ? 'answered' : 'new',
        myChoice: vote?.chosenOption ?? null,
        myComment: vote?.comment ?? null,
        publishedAt: d.publishedAt.toISOString(),
      };
    }),
    ...upcoming.map((d) => ({
      id: d.id,
      text: d.text,
      optionA: d.optionA,
      optionB: d.optionB,
      pointsPerVote: d.pointsPerVote,
      status: 'soon',
      myChoice: null,
      myComment: null,
      publishedAt: d.publishedAt.toISOString(),
    })),
  ];
}

export async function getDilemmaDetail(dilemmaId: number, userId: number) {
  await promoteDilemmas();
  const [dilemma] = await db
    .select()
    .from(dilemmas)
    .where(and(eq(dilemmas.id, dilemmaId), eq(dilemmas.isPublished, true)))
    .limit(1);
  if (!dilemma) return null;
  const [userVote] = await db
    .select()
    .from(dilemmaVotes)
    .where(and(eq(dilemmaVotes.dilemmaId, dilemmaId), eq(dilemmaVotes.userId, userId)))
    .limit(1);
  let results = null;
  if (userVote) {
    const allVotes = await db
      .select({ chosenOption: dilemmaVotes.chosenOption })
      .from(dilemmaVotes)
      .where(eq(dilemmaVotes.dilemmaId, dilemmaId));
    const total = allVotes.length;
    const aCount = allVotes.filter((v) => v.chosenOption === 'a').length;
    results = {
      total,
      percentA: total > 0 ? Math.round((aCount / total) * 100) : 0,
      percentB: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
    };
  }
  return {
    id: dilemma.id,
    text: dilemma.text,
    optionA: dilemma.optionA,
    optionB: dilemma.optionB,
    pointsPerVote: dilemma.pointsPerVote,
    myChoice: userVote?.chosenOption ?? null,
    myComment: userVote?.comment ?? null,
    results,
  };
}

export async function voteDilemma(
  user: UserDto,
  dilemmaId: number,
  chosenOption: 'a' | 'b',
  comment?: string,
) {
  await promoteDilemmas();
  const [dilemma] = await db
    .select()
    .from(dilemmas)
    .where(and(eq(dilemmas.id, dilemmaId), eq(dilemmas.isPublished, true)))
    .limit(1);
  if (!dilemma) throw new Error('Дилемма не найдена или ещё не опубликована');
  const [existing] = await db
    .select({ id: dilemmaVotes.id })
    .from(dilemmaVotes)
    .where(and(eq(dilemmaVotes.userId, user.id), eq(dilemmaVotes.dilemmaId, dilemmaId)))
    .limit(1);
  if (existing) throw new Error('Вы уже голосовали по этой дилемме');
  const [vote] = await db
    .insert(dilemmaVotes)
    .values({ userId: user.id, dilemmaId, chosenOption, comment: comment ?? null })
    .returning();
  await awardPoints(user.id, dilemma.pointsPerVote, 'dilemma_vote', vote.id, undefined, 0, dilemma.pointsPerVote);
  return vote;
}

export async function adminListDilemmas() {
  const all = await db.select().from(dilemmas).orderBy(asc(dilemmas.publishedAt));
  return Promise.all(
    all.map(async (d) => {
      const votes = await db
        .select({ chosenOption: dilemmaVotes.chosenOption })
        .from(dilemmaVotes)
        .where(eq(dilemmaVotes.dilemmaId, d.id));
      const total = votes.length;
      const aCount = votes.filter((v) => v.chosenOption === 'a').length;
      return {
        ...d,
        publishedAt: d.publishedAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
        votesTotal: total,
        percentA: total > 0 ? Math.round((aCount / total) * 100) : 0,
        percentB: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
      };
    }),
  );
}

export async function adminGetDilemmaResults(dilemmaId: number) {
  const [dilemma] = await db.select().from(dilemmas).where(eq(dilemmas.id, dilemmaId)).limit(1);
  if (!dilemma) return null;
  const votes = await db.select().from(dilemmaVotes).where(eq(dilemmaVotes.dilemmaId, dilemmaId));
  const total = votes.length;
  const aCount = votes.filter((v) => v.chosenOption === 'a').length;
  return {
    dilemma,
    votes,
    total,
    percentA: total > 0 ? Math.round((aCount / total) * 100) : 0,
    percentB: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
  };
}

export async function adminCreateDilemma(data: {
  text: string;
  optionA: string;
  optionB: string;
  publishedAt: string;
  pointsPerVote?: number;
}) {
  const publishedAt = new Date(data.publishedAt);
  const isPublished = publishedAt <= new Date();
  const [created] = await db
    .insert(dilemmas)
    .values({
      text: data.text,
      optionA: data.optionA,
      optionB: data.optionB,
      publishedAt,
      isPublished,
      pointsPerVote: data.pointsPerVote ?? DILEMMAS_POINTS_PER_VOTE,
    })
    .returning();
  return { ...created, publishedAt: created.publishedAt.toISOString(), createdAt: created.createdAt.toISOString() };
}

export async function adminUpdateDilemma(
  id: number,
  data: { text?: string; optionA?: string; optionB?: string; publishedAt?: string; pointsPerVote?: number },
) {
  const updates: Record<string, unknown> = {};
  if (data.text !== undefined) updates.text = data.text;
  if (data.optionA !== undefined) updates.optionA = data.optionA;
  if (data.optionB !== undefined) updates.optionB = data.optionB;
  if (data.pointsPerVote !== undefined) updates.pointsPerVote = data.pointsPerVote;
  if (data.publishedAt !== undefined) {
    const publishedAt = new Date(data.publishedAt);
    updates.publishedAt = publishedAt;
    updates.isPublished = publishedAt <= new Date();
  }
  const [updated] = await db.update(dilemmas).set(updates).where(eq(dilemmas.id, id)).returning();
  return { ...updated, publishedAt: updated.publishedAt.toISOString(), createdAt: updated.createdAt.toISOString() };
}

export async function adminDeleteDilemma(id: number) {
  await db.delete(dilemmas).where(eq(dilemmas.id, id));
}
