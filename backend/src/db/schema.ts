import { relations } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as Buffer;
  },
});

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  mimeType: text('mime_type').notNull(),
  data: bytea('data').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  source: text('source'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    vkId: text('vk_id').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    role: text('role').notNull().default('participant'),
    track: text('track'),
    points: integer('points').notNull().default(0),
    reflectionLevel: integer('reflection_level').notNull().default(1),
    reflectionPoints: integer('reflection_points').notNull().default(0),
    notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
    messagesFromGroupAllowed: boolean('messages_from_group_allowed').notNull().default(false),
    notificationPrefs: jsonb('notification_prefs').$type<{
      program: boolean;
      questions: boolean;
      tasks: boolean;
      exchange: boolean;
      points: boolean;
    }>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
    lastSeenExchangeAt: timestamp('last_seen_exchange_at'),
  },
  (table) => [
    uniqueIndex('users_vk_id_unique').on(table.vkId),
    index('idx_users_vk_id').on(table.vkId),
    index('idx_users_track').on(table.track),
  ],
);

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    place: text('place'),
    track: text('track'),
    isKeyBlock: boolean('is_key_block').notNull().default(false),
    reminderSentAt: timestamp('reminder_sent_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_events_track_time').on(table.track, table.startTime, table.endTime)],
);

export const reflectionQuestions = pgTable(
  'reflection_questions',
  {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    type: text('type').notNull(),
    track: text('track'),
    publishTime: timestamp('publish_time').notNull(),
    endTime: timestamp('end_time'),
    points: integer('points').notNull().default(10),
    sendNotification: boolean('send_notification').notNull().default(true),
    notificationSentAt: timestamp('notification_sent_at'),
    groupId: text('group_id'),
    allowMultiple: boolean('allow_multiple').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_reflection_questions_track_publish').on(table.track, table.publishTime),
  ],
);

export const reflectionAnswers = pgTable(
  'reflection_answers',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => reflectionQuestions.id, { onDelete: 'cascade' }),
    answerText: text('answer_text').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_reflection_answers_user_q').on(table.userId, table.questionId)],
);

export const reflectionLevelHistory = pgTable('reflection_level_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  oldLevel: integer('old_level').notNull(),
  newLevel: integer('new_level').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    points: integer('points').notNull().default(20),
    deadline: timestamp('deadline'),
    track: text('track'),
    allowMultiple: boolean('allow_multiple').notNull().default(false),
    autoApprove: boolean('auto_approve').notNull().default(false),
    isRandomDistribution: boolean('is_random_distribution').notNull().default(false),
    networkingContacts: integer('networking_contacts').notNull().default(1),
    isFocusOfDay: boolean('is_focus_of_day').notNull().default(false),
    requiresPhoto: boolean('requires_photo').notNull().default(false),
    sendNotification: boolean('send_notification').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_tasks_track').on(table.track)],
);

export const taskNetworkingQueue = pgTable(
  'task_networking_queue',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    partnerUserId: integer('partner_user_id').references(() => users.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('waiting'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_task_networking_task_status').on(table.taskId, table.status)],
);

export const taskSubmissions = pgTable(
  'task_submissions',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    answerText: text('answer_text'),
    photos: text('photos').array(),
    status: text('status').notNull().default('pending'),
    adminComment: text('admin_comment'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('idx_task_submissions_user_status').on(table.userId, table.status)],
);

export const exchangeQuestions = pgTable(
  'exchange_questions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    scope: text('scope').notNull().default('all'),
    status: text('status').notNull().default('pending'),
    publishTime: timestamp('publish_time'),
    answersCollectedNotifiedAt: timestamp('answers_collected_notified_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_exchange_questions_status_publish').on(table.status, table.publishTime),
  ],
);

export const exchangeAnswers = pgTable(
  'exchange_answers',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => exchangeQuestions.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    answerText: text('answer_text').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_exchange_answers_question').on(table.questionId)],
);

export const exchangeAssignments = pgTable('exchange_assignments', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id')
    .notNull()
    .references(() => exchangeQuestions.id, { onDelete: 'cascade' }),
  assignedUserId: integer('assigned_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const exchangeReactions = pgTable('exchange_reactions', {
  id: serial('id').primaryKey(),
  answerId: integer('answer_id')
    .notNull()
    .references(() => exchangeAnswers.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  reactionType: text('reaction_type').notNull().default('like'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const exchangeReports = pgTable('exchange_reports', {
  id: serial('id').primaryKey(),
  answerId: integer('answer_id')
    .notNull()
    .references(() => exchangeAnswers.id, { onDelete: 'cascade' }),
  reporterUserId: integer('reporter_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const stateCheckins = pgTable(
  'state_checkins',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emotion: text('emotion').notNull(),
    energyLevel: integer('energy_level').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_state_checkins_user_date').on(table.userId, table.createdAt)],
);

export const nfoDayReflections = pgTable('nfo_day_reflections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  answerText: text('answer_text').notNull(),
  factors: text('factors').array().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const pointsHistory = pgTable('points_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  points: integer('points').notNull(),
  source: text('source').notNull(),
  sourceId: integer('source_id'),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const broadcasts = pgTable('broadcasts', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  image: text('image'),
  imageMediaId: uuid('image_media_id').references(() => mediaFiles.id, { onDelete: 'set null' }),
  linkHash: text('link_hash'),
  targetType: text('target_type').notNull(),
  targetTracks: text('target_tracks').array(),
  targetUserId: integer('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedbackMessages = pgTable('feedback_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userNotifications = pgTable(
  'user_notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    category: text('category'),
    linkHash: text('link_hash'),
    linkLabel: text('link_label'),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_user_notifications_user_read').on(table.userId, table.readAt),
    index('idx_user_notifications_user_created').on(table.userId, table.createdAt),
  ],
);

export const trainerSelfDiagnostics = pgTable('trainer_self_diagnostics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  blockId: integer('block_id').notNull(),
  questionId: integer('question_id').notNull(),
  score: integer('score').notNull(),
  attemptNumber: integer('attempt_number').notNull().default(1),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const systemSettings = pgTable(
  'system_settings',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('system_settings_key_unique').on(table.key)],
);

export const userActivityLogs = pgTable('user_activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(userActivityLogs),
  reflectionAnswers: many(reflectionAnswers),
  reflectionLevelHistory: many(reflectionLevelHistory),
  taskSubmissions: many(taskSubmissions),
  exchangeQuestions: many(exchangeQuestions),
  exchangeAnswers: many(exchangeAnswers),
  exchangeAssignments: many(exchangeAssignments),
  exchangeReactions: many(exchangeReactions),
  stateCheckins: many(stateCheckins),
  nfoDayReflections: many(nfoDayReflections),
  pointsHistory: many(pointsHistory),
  feedbackMessages: many(feedbackMessages),
  trainerSelfDiagnostics: many(trainerSelfDiagnostics),
}));

export const eventsRelations = relations(events, () => ({}));

export const reflectionQuestionsRelations = relations(reflectionQuestions, ({ many }) => ({
  answers: many(reflectionAnswers),
}));

export const reflectionAnswersRelations = relations(reflectionAnswers, ({ one }) => ({
  user: one(users, { fields: [reflectionAnswers.userId], references: [users.id] }),
  question: one(reflectionQuestions, {
    fields: [reflectionAnswers.questionId],
    references: [reflectionQuestions.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ many }) => ({
  submissions: many(taskSubmissions),
}));

export const taskSubmissionsRelations = relations(taskSubmissions, ({ one }) => ({
  task: one(tasks, { fields: [taskSubmissions.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskSubmissions.userId], references: [users.id] }),
}));

export const exchangeQuestionsRelations = relations(exchangeQuestions, ({ one, many }) => ({
  user: one(users, { fields: [exchangeQuestions.userId], references: [users.id] }),
  answers: many(exchangeAnswers),
  assignments: many(exchangeAssignments),
}));

export const exchangeAnswersRelations = relations(exchangeAnswers, ({ one, many }) => ({
  question: one(exchangeQuestions, {
    fields: [exchangeAnswers.questionId],
    references: [exchangeQuestions.id],
  }),
  user: one(users, { fields: [exchangeAnswers.userId], references: [users.id] }),
  reactions: many(exchangeReactions),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
