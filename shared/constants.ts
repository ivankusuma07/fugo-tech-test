/**
 * Single source of truth for every enum-like value in the app.
 * The DB enums (server/db/schema.ts), the Zod schemas (shared/schemas/*)
 * and the UI labels all read from here.
 */

export const BUDGET_RANGES = ['lt_10m', '10m_25m', '25m_50m', '50m_100m', 'gt_100m'] as const
export type BudgetRange = (typeof BUDGET_RANGES)[number]

export const BUDGET_LABELS: Record<BudgetRange, string> = {
  'lt_10m': '< Rp10 jt',
  '10m_25m': 'Rp10–25 jt',
  '25m_50m': 'Rp25–50 jt',
  '50m_100m': 'Rp50–100 jt',
  'gt_100m': '> Rp100 jt',
}

export const SERVICE_CATEGORIES = [
  'Branding',
  'Website',
  'Mobile App',
  'AI Automation',
  'Social Media',
  'Lainnya',
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const PRIORITIES = ['High', 'Medium', 'Low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const AI_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const
export type AiStatus = (typeof AI_STATUSES)[number]

export const AI_STATUS_LABELS: Record<AiStatus, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  failed: 'Gagal',
}

export const PIPELINE_STATUSES = ['new', 'contacted', 'proposal', 'won', 'lost'] as const
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

/**
 * Forward-only, one step at a time. Won and Lost are final.
 * The server rejects anything not listed here (409).
 */
export const PIPELINE_TRANSITIONS: Record<PipelineStatus, readonly PipelineStatus[]> = {
  new: ['contacted'],
  contacted: ['proposal'],
  proposal: ['won', 'lost'],
  won: [],
  lost: [],
}

export function canTransition(from: PipelineStatus, to: PipelineStatus): boolean {
  return PIPELINE_TRANSITIONS[from].includes(to)
}

/** All business dates (e.g. "target date not in the past") are judged in this zone. */
export const BUSINESS_TIMEZONE = 'Asia/Jakarta'

export const NEEDS_MAX_LENGTH = 5000
export const ADMIN_PAGE_SIZE = 20
