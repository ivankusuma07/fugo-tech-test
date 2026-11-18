import { relations, sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
// Relative import on purpose: this file is also loaded by drizzle-kit, outside Nuxt's aliases.
import {
  AI_STATUSES,
  BUDGET_RANGES,
  PIPELINE_STATUSES,
  PRIORITIES,
  SERVICE_CATEGORIES,
} from '../../shared/constants'
import type { AiResult } from '../../shared/schemas/ai-result'

export const budgetRangeEnum = pgEnum('budget_range', BUDGET_RANGES)
export const pipelineStatusEnum = pgEnum('pipeline_status', PIPELINE_STATUSES)
export const aiStatusEnum = pgEnum('ai_status', AI_STATUSES)
export const serviceCategoryEnum = pgEnum('service_category', SERVICE_CATEGORIES)
export const priorityEnum = pgEnum('priority', PRIORITIES)
export const aiRunStatusEnum = pgEnum('ai_run_status', ['success', 'failed'])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  ...timestamps,
})

export const briefs = pgTable(
  'briefs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Human-friendly number shown as #BR-0001; the uuid stays the real key.
    number: integer('number').generatedAlwaysAsIdentity().notNull().unique(),

    // Form data
    name: text('name').notNull(),
    email: text('email').notNull(),
    companyName: text('company_name').notNull(),
    needs: text('needs').notNull(),
    budgetRange: budgetRangeEnum('budget_range').notNull(),
    targetDate: date('target_date', { mode: 'string' }).notNull(),

    // Sales pipeline (changed manually by admins)
    pipelineStatus: pipelineStatusEnum('pipeline_status').notNull().default('new'),

    // AI processing state (the row doubles as the job queue entry)
    aiStatus: aiStatusEnum('ai_status').notNull().default('pending'),
    aiResult: jsonb('ai_result').$type<AiResult>(),
    // Denormalized from ai_result so the list can filter and index them
    serviceCategory: serviceCategoryEnum('service_category'),
    priority: priorityEnum('priority'),
    aiError: text('ai_error'),
    aiAttempts: integer('ai_attempts').notNull().default(0),
    aiStartedAt: timestamp('ai_started_at', { withTimezone: true }),
    aiProcessedAt: timestamp('ai_processed_at', { withTimezone: true }),

    // Bonus: AI drafted reply email
    emailDraft: text('email_draft'),

    ...timestamps,
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  t => [
    index('briefs_created_at_idx').on(t.createdAt.desc()),
    index('briefs_priority_idx').on(t.priority),
    index('briefs_service_category_idx').on(t.serviceCategory),
    index('briefs_ai_status_idx').on(t.aiStatus),
    index('briefs_pipeline_status_idx').on(t.pipelineStatus),
  ],
)

/** One row per LLM attempt: success or failure, with raw output for debugging. */
export const aiRuns = pgTable(
  'ai_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    briefId: uuid('brief_id')
      .notNull()
      .references(() => briefs.id, { onDelete: 'cascade' }),
    status: aiRunStatusEnum('status').notNull(),
    model: text('model').notNull(),
    rawOutput: text('raw_output'),
    error: text('error'),
    latencyMs: integer('latency_ms').notNull(),
    ...timestamps,
  },
  t => [index('ai_runs_brief_id_created_at_idx').on(t.briefId, t.createdAt)],
)

/** Append-only audit trail of pipeline status changes. */
export const pipelineStatusHistory = pgTable(
  'pipeline_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    briefId: uuid('brief_id')
      .notNull()
      .references(() => briefs.id, { onDelete: 'cascade' }),
    // null = the brief's creation
    fromStatus: pipelineStatusEnum('from_status'),
    toStatus: pipelineStatusEnum('to_status').notNull(),
    // null = system (brief submitted from the public form)
    changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  t => [index('pipeline_history_brief_id_created_at_idx').on(t.briefId, t.createdAt)],
)

export const briefsRelations = relations(briefs, ({ many }) => ({
  aiRuns: many(aiRuns),
  history: many(pipelineStatusHistory),
}))

export const aiRunsRelations = relations(aiRuns, ({ one }) => ({
  brief: one(briefs, { fields: [aiRuns.briefId], references: [briefs.id] }),
}))

export const pipelineStatusHistoryRelations = relations(pipelineStatusHistory, ({ one }) => ({
  brief: one(briefs, { fields: [pipelineStatusHistory.briefId], references: [briefs.id] }),
  changedByUser: one(users, { fields: [pipelineStatusHistory.changedBy], references: [users.id] }),
}))

export type Brief = typeof briefs.$inferSelect
export type NewBrief = typeof briefs.$inferInsert
export type AiRun = typeof aiRuns.$inferSelect
export type PipelineHistoryEntry = typeof pipelineStatusHistory.$inferSelect
