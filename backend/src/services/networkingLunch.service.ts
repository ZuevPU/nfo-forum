import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  networkingLunchApplications,
  networkingLunchAssignments,
  systemSettings,
  tasks,
  users,
} from '../db/schema.js';
import { sendPush } from './push.service.js';
import { entityLink } from '../utils/appLinks.js';
import { isInSlotWindow } from '../utils/slotMatching.js';
import { moscowDateString } from '../utils/moscowTime.js';

const CONFIG_KEY = 'networking_lunch_config';
const DEFAULT_SESSION_KEY = 'default';

export type NetworkingLunchConfig = {
  taskTitle: string;
  taskDescription: string;
  invitationText: string;
  publishHour: number;
  publishMinute: number;
  tableCount: number;
  seatsPerTable: number;
  taskId: number | null;
  publishedAt: string | null;
  invitationSentAt: string | null;
  assignmentsSentAt: string | null;
  sessionKey: string;
  /** @deprecated legacy fields */
  taskTemplateId?: string;
  invitationTemplateId?: string;
  description?: string;
};

export type LunchApplicationRow = {
  userId: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  createdAt: string;
  status: string;
};

export type LunchAssignmentRow = {
  userId: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  tableNumber: number;
  isPinned: boolean;
};

export type LunchTablePreview = {
  tableNumber: number;
  seats: LunchAssignmentRow[];
};

function normalizeConfig(raw: Partial<NetworkingLunchConfig>): NetworkingLunchConfig {
  const legacyDescription = raw.description?.trim();
  return {
    taskTitle: raw.taskTitle?.trim() || 'Нетворкинг-обед',
    taskDescription: raw.taskDescription?.trim() || legacyDescription || '',
    invitationText: raw.invitationText?.trim() || '',
    publishHour: typeof raw.publishHour === 'number' ? raw.publishHour : 12,
    publishMinute: typeof raw.publishMinute === 'number' ? raw.publishMinute : 0,
    tableCount: typeof raw.tableCount === 'number' && raw.tableCount > 0 ? raw.tableCount : 10,
    seatsPerTable: typeof raw.seatsPerTable === 'number' && raw.seatsPerTable > 0 ? raw.seatsPerTable : 6,
    taskId: typeof raw.taskId === 'number' ? raw.taskId : null,
    publishedAt: raw.publishedAt ?? null,
    invitationSentAt: raw.invitationSentAt ?? null,
    assignmentsSentAt: raw.assignmentsSentAt ?? null,
    sessionKey: raw.sessionKey?.trim() || DEFAULT_SESSION_KEY,
  };
}

async function readConfig(): Promise<NetworkingLunchConfig> {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, CONFIG_KEY))
    .limit(1);
  if (setting?.value && typeof setting.value === 'object') {
    return normalizeConfig(setting.value as Partial<NetworkingLunchConfig>);
  }
  return normalizeConfig({});
}

async function writeConfig(config: NetworkingLunchConfig): Promise<void> {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, CONFIG_KEY))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: config, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: CONFIG_KEY, value: config });
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function publishTimeFromConfig(config: NetworkingLunchConfig): Date {
  const date = moscowDateString();
  const hh = String(config.publishHour).padStart(2, '0');
  const mm = String(config.publishMinute).padStart(2, '0');
  return new Date(`${date}T${hh}:${mm}:00+03:00`);
}

async function syncLinkedTask(config: NetworkingLunchConfig): Promise<number> {
  const title = config.taskTitle.trim();
  const description = config.taskDescription.trim();
  if (!title) throw new Error('Укажите заголовок задания');
  if (!description) throw new Error('Укажите описание задания');

  const slotTime = publishTimeFromConfig(config);
  const isPublished = !!config.publishedAt;
  const status = isPublished ? 'published' : 'draft';
  const publishTime = isPublished ? new Date(config.publishedAt!) : slotTime;

  if (config.taskId) {
    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, config.taskId))
      .limit(1);

    if (existing) {
      await db
        .update(tasks)
        .set({
          title,
          description,
          publishTime,
          status,
          sendNotification: false,
        })
        .where(eq(tasks.id, config.taskId));
      return config.taskId;
    }
  }

  const [row] = await db
    .insert(tasks)
    .values({
      title,
      description,
      points: 5,
      publishTime: slotTime,
      status: 'draft',
      sendNotification: false,
      requiresPhoto: false,
      photoMode: 'none',
      autoApprove: true,
    })
    .returning({ id: tasks.id });

  return row.id;
}

export async function publishNetworkingLunchRegistration(): Promise<NetworkingLunchConfig> {
  const config = await readConfig();
  if (!config.taskTitle.trim()) throw new Error('Укажите заголовок задания');
  if (!config.taskDescription.trim()) throw new Error('Укажите описание задания');
  if (config.publishedAt) throw new Error('Registration already published');

  const now = new Date();
  const taskId = await syncLinkedTask(normalizeConfig({ ...config, publishedAt: now.toISOString() }));

  await db
    .update(tasks)
    .set({
      title: config.taskTitle.trim(),
      description: config.taskDescription.trim(),
      publishTime: now,
      status: 'published',
      sendNotification: false,
    })
    .where(eq(tasks.id, taskId));

  const saved = normalizeConfig({
    ...config,
    taskId,
    publishedAt: now.toISOString(),
  });
  await writeConfig(saved);
  return saved;
}

export async function unpublishNetworkingLunchRegistration(): Promise<NetworkingLunchConfig> {
  const config = await readConfig();
  if (!config.publishedAt) throw new Error('Registration is not published');
  if (config.assignmentsSentAt) {
    throw new Error('Нельзя снять с публикации после рассылки столов');
  }
  if (!config.taskId) throw new Error('Задание не настроено');

  await db
    .update(tasks)
    .set({
      status: 'draft',
      sendNotification: false,
    })
    .where(eq(tasks.id, config.taskId));

  const saved = normalizeConfig({
    ...config,
    publishedAt: null,
  });
  await writeConfig(saved);
  return saved;
}

export async function getNetworkingLunchConfig(): Promise<NetworkingLunchConfig> {
  return readConfig();
}

export async function setNetworkingLunchConfig(
  data: Partial<NetworkingLunchConfig>,
): Promise<NetworkingLunchConfig> {
  const current = await readConfig();
  const merged = normalizeConfig({ ...current, ...data });
  if (!merged.taskTitle.trim()) throw new Error('Укажите заголовок задания');
  if (!merged.taskDescription.trim()) throw new Error('Укажите описание задания');
  if (!merged.invitationText.trim()) throw new Error('Укажите текст приглашения');
  const taskId = await syncLinkedTask(merged);
  const saved = normalizeConfig({ ...merged, taskId });
  await writeConfig(saved);
  return saved;
}

export async function listNetworkingLunchApplications(): Promise<{
  applications: LunchApplicationRow[];
  total: number;
}> {
  const rows = await db
    .select({
      userId: networkingLunchApplications.userId,
      createdAt: networkingLunchApplications.createdAt,
      status: networkingLunchApplications.status,
      firstName: users.firstName,
      lastName: users.lastName,
      track: users.track,
    })
    .from(networkingLunchApplications)
    .innerJoin(users, eq(networkingLunchApplications.userId, users.id))
    .orderBy(asc(networkingLunchApplications.createdAt));

  return {
    applications: rows.map((r) => ({
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      track: r.track,
      createdAt: r.createdAt.toISOString(),
      status: r.status,
    })),
    total: rows.length,
  };
}

export async function listNetworkingLunchAssignments(): Promise<LunchTablePreview[]> {
  const config = await readConfig();
  const rows = await db
    .select({
      userId: networkingLunchAssignments.userId,
      tableNumber: networkingLunchAssignments.tableNumber,
      isPinned: networkingLunchAssignments.isPinned,
      firstName: users.firstName,
      lastName: users.lastName,
      track: users.track,
    })
    .from(networkingLunchAssignments)
    .innerJoin(users, eq(networkingLunchAssignments.userId, users.id))
    .where(eq(networkingLunchAssignments.sessionKey, config.sessionKey));

  const tables: LunchTablePreview[] = [];
  for (let n = 1; n <= config.tableCount; n++) {
    tables.push({ tableNumber: n, seats: [] });
  }

  for (const row of rows) {
    const table = tables.find((t) => t.tableNumber === row.tableNumber);
    const seat: LunchAssignmentRow = {
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      track: row.track,
      tableNumber: row.tableNumber,
      isPinned: row.isPinned,
    };
    if (table) {
      table.seats.push(seat);
    } else {
      tables.push({ tableNumber: row.tableNumber, seats: [seat] });
    }
  }

  return tables.sort((a, b) => a.tableNumber - b.tableNumber);
}

export type NetworkingLunchPhase = 'registration' | 'applied' | 'seated' | 'closed';

export type NetworkingLunchParticipantView = {
  taskId: number;
  title: string;
  description: string;
  points: number;
  phase: NetworkingLunchPhase;
  applied: boolean;
  tableNumber: number | null;
  assignmentsSent: boolean;
  registrationOpen: boolean;
  publishedAt: string | null;
  canApply: boolean;
};

function resolveParticipantPhase(
  config: NetworkingLunchConfig,
  status: { applied: boolean; tableNumber: number | null; assignmentsSent: boolean },
): NetworkingLunchPhase | null {
  if (status.tableNumber != null) return 'seated';
  if (status.assignmentsSent) return 'closed';
  if (status.applied) return 'applied';
  if (config.publishedAt && !config.assignmentsSentAt) return 'registration';
  return null;
}

export async function getNetworkingLunchParticipantView(
  userId: number,
): Promise<NetworkingLunchParticipantView | null> {
  let config = await readConfig();
  if (!config.taskId && !config.taskTitle.trim()) return null;

  let [task] = config.taskId
    ? await db.select().from(tasks).where(eq(tasks.id, config.taskId)).limit(1)
    : [undefined];

  if (!task && config.taskTitle.trim() && config.taskDescription.trim()) {
    const taskId = await syncLinkedTask(config);
    config = normalizeConfig({ ...config, taskId });
    await writeConfig(config);
    [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  }

  if (!task) return null;

  const status = await getUserLunchStatus(userId);
  const phase = resolveParticipantPhase(config, status);

  if (!config.publishedAt || !phase) {
    // #region agent log
    fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d5534'},body:JSON.stringify({sessionId:'9d5534',location:'networkingLunch.service.ts:getNetworkingLunchParticipantView',message:'lunch hidden',data:{userId,publishedAt:config.publishedAt,phase,taskId:config.taskId},timestamp:Date.now(),hypothesisId:'NL1'})}).catch(()=>{});
    // #endregion
    return null;
  }

  const registrationOpen = !!config.publishedAt && !config.assignmentsSentAt;
  const canApply = registrationOpen && !status.applied;

  const view = {
    taskId: config.taskId!,
    title: config.taskTitle || task.title,
    description: config.taskDescription || task.description,
    points: task.points,
    phase,
    applied: status.applied,
    tableNumber: status.tableNumber,
    assignmentsSent: status.assignmentsSent,
    registrationOpen,
    publishedAt: config.publishedAt,
    canApply,
  };

  // #region agent log
  fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d5534'},body:JSON.stringify({sessionId:'9d5534',location:'networkingLunch.service.ts:getNetworkingLunchParticipantView',message:'lunch visible',data:{userId,phase:view.phase,taskId:view.taskId,title:view.title},timestamp:Date.now(),hypothesisId:'NL1',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  return view;
}

export async function applyNetworkingLunch(userId: number): Promise<{ applied: boolean }> {
  const config = await readConfig();
  if (!config.taskId) throw new Error('Networking lunch is not configured — save settings in admin first');
  if (!config.publishedAt) throw new Error('Registration is not open yet');
  if (config.assignmentsSentAt) throw new Error('Registration is closed');

  const [existing] = await db
    .select()
    .from(networkingLunchApplications)
    .where(eq(networkingLunchApplications.userId, userId))
    .limit(1);
  if (existing) return { applied: true };

  await db.insert(networkingLunchApplications).values({ userId, status: 'applied' });
  return { applied: true };
}

export async function getUserLunchStatus(userId: number): Promise<{
  applied: boolean;
  tableNumber: number | null;
  assignmentsSent: boolean;
}> {
  const config = await readConfig();
  const [application] = await db
    .select()
    .from(networkingLunchApplications)
    .where(eq(networkingLunchApplications.userId, userId))
    .limit(1);

  const [assignment] = await db
    .select()
    .from(networkingLunchAssignments)
    .where(
      and(
        eq(networkingLunchAssignments.userId, userId),
        eq(networkingLunchAssignments.sessionKey, config.sessionKey),
      ),
    )
    .limit(1);

  return {
    applied: !!application,
    tableNumber: config.assignmentsSentAt ? (assignment?.tableNumber ?? null) : null,
    assignmentsSent: !!config.assignmentsSentAt,
  };
}

export async function randomizeNetworkingLunchAssignments(): Promise<LunchTablePreview[]> {
  const config = await readConfig();
  const capacity = config.tableCount * config.seatsPerTable;

  const pinned = await db
    .select()
    .from(networkingLunchAssignments)
    .where(
      and(
        eq(networkingLunchAssignments.sessionKey, config.sessionKey),
        eq(networkingLunchAssignments.isPinned, true),
      ),
    );

  const pinnedUserIds = new Set(pinned.map((p) => p.userId));
  const applications = await db
    .select({ userId: networkingLunchApplications.userId })
    .from(networkingLunchApplications);

  const unassignedApplicants = applications
    .map((a) => a.userId)
    .filter((id) => !pinnedUserIds.has(id));

  await db
    .delete(networkingLunchAssignments)
    .where(
      and(
        eq(networkingLunchAssignments.sessionKey, config.sessionKey),
        eq(networkingLunchAssignments.isPinned, false),
      ),
    );

  const seatCounts = new Map<number, number>();
  for (let n = 1; n <= config.tableCount; n++) seatCounts.set(n, 0);
  for (const p of pinned) {
    seatCounts.set(p.tableNumber, (seatCounts.get(p.tableNumber) ?? 0) + 1);
  }

  const shuffled = shuffle(unassignedApplicants);
  let assigned = pinned.length;

  for (const userId of shuffled) {
    if (assigned >= capacity) break;
    let placed = false;
    const tableOrder = shuffle([...Array(config.tableCount)].map((_, i) => i + 1));
    for (const tableNumber of tableOrder) {
      if ((seatCounts.get(tableNumber) ?? 0) >= config.seatsPerTable) continue;
      await db.insert(networkingLunchAssignments).values({
        userId,
        tableNumber,
        isPinned: false,
        sessionKey: config.sessionKey,
      });
      seatCounts.set(tableNumber, (seatCounts.get(tableNumber) ?? 0) + 1);
      assigned++;
      placed = true;
      break;
    }
    if (!placed) break;
  }

  return listNetworkingLunchAssignments();
}

export async function saveNetworkingLunchAssignments(
  assignments: { userId: number; tableNumber: number; isPinned?: boolean }[],
): Promise<LunchTablePreview[]> {
  const config = await readConfig();
  const now = new Date();

  for (const item of assignments) {
    if (item.tableNumber < 1 || item.tableNumber > config.tableCount) {
      throw new Error(`Invalid table number: ${item.tableNumber}`);
    }

    const [existing] = await db
      .select()
      .from(networkingLunchAssignments)
      .where(
        and(
          eq(networkingLunchAssignments.userId, item.userId),
          eq(networkingLunchAssignments.sessionKey, config.sessionKey),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(networkingLunchAssignments)
        .set({
          tableNumber: item.tableNumber,
          isPinned: item.isPinned ?? existing.isPinned,
          updatedAt: now,
        })
        .where(eq(networkingLunchAssignments.id, existing.id));
    } else {
      await db.insert(networkingLunchAssignments).values({
        userId: item.userId,
        tableNumber: item.tableNumber,
        isPinned: item.isPinned ?? false,
        sessionKey: config.sessionKey,
      });
    }
  }

  return listNetworkingLunchAssignments();
}

export async function removeNetworkingLunchAssignment(userId: number): Promise<void> {
  const config = await readConfig();
  await db
    .delete(networkingLunchAssignments)
    .where(
      and(
        eq(networkingLunchAssignments.userId, userId),
        eq(networkingLunchAssignments.sessionKey, config.sessionKey),
      ),
    );
}

export async function publishNetworkingLunchAssignments(): Promise<{ sent: number }> {
  const config = await readConfig();
  if (config.assignmentsSentAt) throw new Error('Assignments already published');

  const assignments = await db
    .select({
      userId: networkingLunchAssignments.userId,
      tableNumber: networkingLunchAssignments.tableNumber,
    })
    .from(networkingLunchAssignments)
    .where(eq(networkingLunchAssignments.sessionKey, config.sessionKey));

  if (assignments.length === 0) throw new Error('No assignments to publish');

  let sent = 0;
  const hash = entityLink('home');

  for (const row of assignments) {
    const result = await sendPush({
      text: `Ваш стол на нетворкинг-обед: № ${row.tableNumber}. Приятного аппетита!`,
      hash,
      linkHash: hash,
      linkLabel: 'На главную',
      targetType: 'user',
      targetUserId: row.userId,
      category: 'tasks',
    });
    sent += result.sent;
  }

  await writeConfig({ ...config, assignmentsSentAt: new Date().toISOString() });
  return { sent };
}

export async function sendNetworkingLunchInvitation(): Promise<{ sent: number }> {
  const config = await readConfig();
  const invitationText = config.invitationText.trim();
  if (!invitationText) throw new Error('Укажите текст приглашения и сохраните настройки');
  if (!config.publishedAt) throw new Error('Сначала опубликуйте регистрацию');
  if (!config.taskId) throw new Error('Задание не настроено — сохраните настройки');

  const now = new Date();
  const hash = entityLink('home');
  const result = await sendPush({
    text: invitationText,
    hash,
    linkHash: hash,
    linkLabel: 'На главную',
    targetType: 'all',
    category: 'tasks',
  });

  const updated = normalizeConfig({
    ...config,
    invitationSentAt: now.toISOString(),
  });
  await writeConfig(updated);

  return { sent: result.sent };
}

export async function runNetworkingLunchPublishPush(now: Date): Promise<number> {
  const config = await readConfig();
  if (!config.taskId || !config.invitationText.trim() || !config.publishedAt) return 0;

  const slot = `${String(config.publishHour).padStart(2, '0')}:${String(config.publishMinute).padStart(2, '0')}`;
  if (!isInSlotWindow(slot, now)) return 0;

  const dedupKey = `networking-lunch:${slot}:${moscowDateString()}`;
  const [dedupRow] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'cron_slot_dedup'))
    .limit(1);
  const dedup = (dedupRow?.value as Record<string, string>) ?? {};
  if (dedup[dedupKey]) return 0;

  const hash = entityLink('home');
  const result = await sendPush({
    text: config.invitationText.trim(),
    hash,
    linkHash: hash,
    linkLabel: 'На главную',
    targetType: 'all',
    category: 'tasks',
    skipBroadcastLog: true,
  });

  dedup[dedupKey] = now.toISOString();
  if (dedupRow) {
    await db
      .update(systemSettings)
      .set({ value: dedup, updatedAt: new Date() })
      .where(eq(systemSettings.id, dedupRow.id));
  } else {
    await db.insert(systemSettings).values({ key: 'cron_slot_dedup', value: dedup });
  }

  await writeConfig({
    ...config,
    invitationSentAt: config.invitationSentAt ?? now.toISOString(),
  });

  return result.sent;
}

export async function getNetworkingLunchTaskId(): Promise<number | null> {
  const config = await readConfig();
  return config.taskId;
}
