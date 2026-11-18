import { fileURLToPath } from 'node:url'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { beforeAll, describe, expect, it } from 'vitest'
import { E2E_DATABASE_URL, query } from '../support/test-db'

const ADMIN = { email: 'admin@fugo.test', password: 'e2e-password-123' }

// The spawned server inherits these (set before setup, so .env cannot override them).
Object.assign(process.env, {
  DATABASE_URL: E2E_DATABASE_URL,
  NUXT_APP_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
  ADMIN_EMAIL: ADMIN.email,
  ADMIN_PASSWORD: ADMIN.password,
  BRIEF_RATE_LIMIT_PER_MINUTE: '1000',
  AI_WORKER_ENABLED: 'false', // keep briefs in `pending`; AI is covered by service tests
  LLM_API_KEY: '',
  // Turnstile is unit-tested; keep it off here even if .env has real keys.
  TURNSTILE_SECRET_KEY: '',
  NUXT_PUBLIC_TURNSTILE_SITE_KEY: '',
})

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false,
})

const validBrief = {
  name: 'Rina',
  email: 'rina@sinarkopi.id',
  companyName: 'PT Sinar Kopi',
  needs: 'Website company profile dan katalog produk kopi.',
  budgetRange: '25m_50m',
  targetDate: '2099-01-01',
}

function json(body: unknown, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...init.headers },
  }
}

let cookie = ''

beforeAll(async () => {
  const res = await fetch('/api/auth/login', json(ADMIN, { method: 'POST' }))
  expect(res.status).toBe(200)
  cookie = res.headers.get('set-cookie')!.split(';')[0]!
})

describe('POST /api/briefs', () => {
  it('creates a brief and returns 201 with its id', async () => {
    const res = await fetch('/api/briefs', json(validBrief, { method: 'POST' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toMatch(/[0-9a-f-]{36}/)
  })

  it('rejects a past target date on the server, with field errors', async () => {
    const res = await fetch('/api/briefs', json({ ...validBrief, targetDate: '2020-01-01' }, { method: 'POST' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.data.fieldErrors.targetDate).toEqual(['Tanggal tidak boleh di masa lalu.'])
  })

  it('rejects missing fields and an invalid email', async () => {
    const res = await fetch('/api/briefs', json({ email: 'nope' }, { method: 'POST' }))
    expect(res.status).toBe(400)
    const { fieldErrors } = (await res.json()).data
    expect(Object.keys(fieldErrors)).toEqual(
      expect.arrayContaining(['name', 'email', 'companyName', 'needs', 'budgetRange', 'targetDate']),
    )
  })
})

describe('admin API protection', () => {
  it.each([
    ['GET', '/api/admin/briefs'],
    ['GET', '/api/admin/briefs/00000000-0000-4000-8000-000000000000'],
    ['PATCH', '/api/admin/briefs/00000000-0000-4000-8000-000000000000/status'],
    ['POST', '/api/admin/briefs/00000000-0000-4000-8000-000000000000/reprocess'],
  ])('%s %s returns 401 without a session', async (method, path) => {
    const res = await fetch(path, { method })
    expect(res.status).toBe(401)
  })

  it('redirects /admin pages to /login without a session', async () => {
    const res = await fetch('/admin', { redirect: 'manual' })
    expect([301, 302]).toContain(res.status)
    expect(res.headers.get('location')).toMatch(/^\/login/)
  })

  it('rejects a wrong password with 401', async () => {
    const res = await fetch('/api/auth/login', json({ ...ADMIN, password: 'wrong-password' }, { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('issues a session cookie that expires after 8 hours', async () => {
    const res = await fetch('/api/auth/login', json(ADMIN, { method: 'POST' }))
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=28800/i)
  })

  it('renders /admin with its data for a logged-in admin (cookie forwarded during SSR)', async () => {
    await $fetch('/api/briefs', { method: 'POST', body: { ...validBrief, companyName: 'SSR Render Check' } })
    const res = await fetch('/admin', { headers: { cookie }, redirect: 'manual' })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('SSR Render Check')
    expect(html).not.toContain('Silakan login terlebih dahulu')
  })

  it('rejects a session whose user no longer exists', async () => {
    // A second user sharing the admin's password hash, logged in, then removed.
    await query(E2E_DATABASE_URL, `INSERT INTO users (email, password_hash) SELECT 'gone@fugo.test', password_hash FROM users WHERE email = $1`, [ADMIN.email])
    const login = await fetch('/api/auth/login', json({ ...ADMIN, email: 'gone@fugo.test' }, { method: 'POST' }))
    expect(login.status).toBe(200)
    const staleCookie = login.headers.get('set-cookie')!.split(';')[0]!
    await query(E2E_DATABASE_URL, `DELETE FROM users WHERE email = 'gone@fugo.test'`)

    const api = await fetch('/api/admin/me', { headers: { cookie: staleCookie } })
    expect(api.status).toBe(401)
    const page = await fetch('/admin', { headers: { cookie: staleCookie }, redirect: 'manual' })
    expect([301, 302]).toContain(page.status)
    expect(page.headers.get('location')).toMatch(/^\/login/)
  })
})

describe('admin brief endpoints', () => {
  it('lists briefs newest first and filters by priority', async () => {
    const { id } = await $fetch<{ id: string }>('/api/briefs', { method: 'POST', body: { ...validBrief, companyName: 'Prioritas Tinggi' } })
    await query(E2E_DATABASE_URL, `UPDATE briefs SET priority = 'High', service_category = 'Website' WHERE id = $1`, [id])

    const all = await $fetch<{ items: { companyName: string }[] }>('/api/admin/briefs', { headers: { cookie } })
    expect(all.items[0]!.companyName).toBe('Prioritas Tinggi')

    const high = await $fetch<{ items: { id: string }[], total: number }>('/api/admin/briefs?priority=High&category=Website', { headers: { cookie } })
    expect(high.items.map(i => i.id)).toEqual([id])
  })

  it.each([
    'priority=Urgent',
    'pipeline=archived',
    'pageSize=7',
    'pageSize=1000',
  ])('rejects an invalid filter value with 400 (%s)', async (qs) => {
    const res = await fetch(`/api/admin/briefs?${qs}`, { headers: { cookie } })
    expect(res.status).toBe(400)
  })

  it('accepts pageSize=all and a pipeline filter', async () => {
    const res = await $fetch<{ pageSize: number | null, page: number, items: { pipelineStatus: string }[] }>(
      '/api/admin/briefs?pageSize=all&pipeline=new',
      { headers: { cookie } },
    )
    expect(res.pageSize).toBeNull()
    expect(res.page).toBe(1)
    expect(res.items.every(i => i.pipelineStatus === 'new')).toBe(true)
  })

  it('enforces forward-only status changes and records history', async () => {
    const { id } = await $fetch<{ id: string }>('/api/briefs', { method: 'POST', body: validBrief })
    const patch = (to: string) =>
      fetch(`/api/admin/briefs/${id}/status`, json({ pipelineStatus: to }, { method: 'PATCH', headers: { cookie } }))

    expect((await patch('won')).status).toBe(409)
    expect((await patch('contacted')).status).toBe(200)

    const detail = await $fetch<{ brief: { pipelineStatus: string }, history: { fromStatus: string | null, toStatus: string, changedByEmail: string | null }[] }>(
      `/api/admin/briefs/${id}`,
      { headers: { cookie } },
    )
    expect(detail.brief.pipelineStatus).toBe('contacted')
    expect(detail.history).toEqual([
      expect.objectContaining({ fromStatus: 'new', toStatus: 'contacted', changedByEmail: ADMIN.email }),
      expect.objectContaining({ fromStatus: null, toStatus: 'new', changedByEmail: null }),
    ])
  })

  it('returns 404 for an unknown brief and 400 for a malformed id', async () => {
    expect((await fetch('/api/admin/briefs/00000000-0000-4000-8000-000000000000', { headers: { cookie } })).status).toBe(404)
    expect((await fetch('/api/admin/briefs/not-a-uuid', { headers: { cookie } })).status).toBe(400)
  })

  it('reprocess returns 409 while the brief is still pending, 202 once it failed', async () => {
    const { id } = await $fetch<{ id: string }>('/api/briefs', { method: 'POST', body: validBrief })
    const reprocess = () => fetch(`/api/admin/briefs/${id}/reprocess`, { method: 'POST', headers: { cookie } })

    expect((await reprocess()).status).toBe(409)
    await query(E2E_DATABASE_URL, `UPDATE briefs SET ai_status = 'failed', ai_error = 'x' WHERE id = $1`, [id])
    expect((await reprocess()).status).toBe(202)
  })
})
