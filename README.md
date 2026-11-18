# Fugo Brief Inbox

Internal tool for Fugo Creative. Prospective clients send a project brief through a public form; the sales team sees every brief in a protected dashboard, already summarized, categorized and prioritized by an LLM.

- **Live URL:** _to be filled in after the Railway deploy_
- **Admin login:** credentials are sent in the submission email (seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

| Public | Admin |
|---|---|
| `/` brief form (all fields required, date not in the past in WIB) | `/login` → `/admin` list with priority/category filters → `/admin/briefs/:id` detail, pipeline status, AI result, "Proses ulang AI" |

---

## 1. Running locally

Requirements: Node 24, Docker.

```bash
cp .env.example .env          # fill in NUXT_APP_SECRET, ADMIN_PASSWORD, LLM_API_KEY
docker compose up -d db       # Postgres on localhost:5433
npm install
npm run db:migrate
npm run dev                   # http://localhost:3000
```

The admin user is created on server start if it does not exist yet. `openssl rand -base64 32` gives a good `NUXT_APP_SECRET`.

Everything in Docker (production image + Postgres):

```bash
docker compose up --build     # http://localhost:3000
```

### Tests

```bash
docker compose up -d db
npm test                      # unit + integration + e2e (80 tests)
npm run test:unit             # pure unit tests only, no database needed
```

- **unit**: AI output parser, brief schema (WIB date edge cases), transition map.
- **integration**: services against a real Postgres (`fugo_test`) with the LLM mocked: success, non-JSON, wrong enum, timeout, transient retry, `SKIP LOCKED` claims, stuck-job recovery, 409 transitions, concurrent status change.
- **e2e**: builds and boots the app (`fugo_e2e` database) and tests over HTTP: validation errors, 401 on every admin route, page redirect, filters, history, reprocess.

### Environment variables

| Name | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | | Postgres connection string |
| `NUXT_APP_SECRET` | yes | | Key that seals the session cookie (≥ 32 chars) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | yes | | Admin account seeded on start (password ≥ 8 chars, hashed with scrypt) |
| `LLM_API_KEY` | yes | | DeepSeek API key |
| `LLM_BASE_URL` | | `https://api.deepseek.com` | Any OpenAI-compatible endpoint |
| `LLM_MODEL` | | `deepseek-flash` | Model id |
| `LLM_TIMEOUT_MS` | | `20000` | Per-call timeout |
| `AI_WORKER_INTERVAL_MS` | | `3000` | Worker poll interval |
| `AI_WORKER_ENABLED` | | `true` | Turn the in-process worker off (used by e2e tests) |
| `AI_FORCE_FAIL` | | `false` | Demo: every analysis fails validation, to show the failed → reprocess path |
| `BRIEF_RATE_LIMIT_PER_MINUTE` | | `5` | Public form submissions per IP per minute |

### Deploying (Railway)

1. New project → add **PostgreSQL** → add a service from this GitHub repo (it builds the `Dockerfile`, see `railway.json`).
2. On the app service set `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `NUXT_APP_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `LLM_API_KEY`.
3. Generate a public domain. Each push to `main` redeploys; migrations run on boot (`scripts/migrate.mjs`), then the server starts. Health check: `/api/health`.

---

## 2. Architecture

```
Browser ──► Nuxt pages (/ public form, /login, /admin/**)
              │  app/middleware/auth.global.ts: /admin/** needs a session
              ▼
         Nitro API (server/api/**)          thin handlers: validate → service → respond
              │  server/middleware/admin-auth.ts: /api/admin/** → 401 without a session
              ▼
        Services (server/services/*)  ──► Drizzle ──► PostgreSQL
              ▲
              │ claims pending briefs (FOR UPDATE SKIP LOCKED)
     AI worker (server/services/ai-worker.ts, started by a Nitro plugin)
              │
              ▼
     LLM client (server/lib/llm.ts) ──► DeepSeek (OpenAI-compatible API)
              │
     Zod parse (shared/schemas/ai-result.ts) ──► completed | failed
```

**Flow for a new brief**

1. `POST /api/briefs` validates with the shared Zod schema, then in one transaction inserts the brief (`ai_status = pending`, `pipeline_status = new`) and its first history row (`changed_by = null`, "Sistem"). It answers `201` immediately and nudges the worker. **The brief is saved before any AI work**, so an LLM outage never loses a submission.
2. The worker (every 3 s, or right after a nudge) recovers jobs stuck in `processing` for over 2 minutes, then claims up to 3 pending briefs with `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)`.
3. For each: call the LLM (20 s timeout) → `JSON.parse` → `AiResultSchema.safeParse`.
4. Success: store `ai_result`, copy `service_category` / `priority` to their own columns, `completed`. Any failure: `failed` with `ai_error`. Every attempt is logged in `ai_runs` with the raw output and latency.
5. `POST /api/admin/briefs/:id/reprocess` puts a finished brief back to `pending` (`202`); the detail page polls until it is done.

### Folder layout

```
app/            pages (form, login, admin list, detail), components, layout, route middleware
server/
  api/          HTTP handlers only
  middleware/   admin API guard
  plugins/      admin seed, AI worker start/stop
  services/     brief.service (CRUD, transitions, history), ai.service (analysis, queue), ai-worker
  lib/          llm client, prompts, AI output parser
  db/           Drizzle schema, client, SQL migrations
  utils/        env (Zod-validated), db, validation, rate limit, auth
shared/         constants (all enums), Zod schemas, WIB date helper — used by app AND server
tests/          unit, integration, e2e
docs/ai-log.md  AI usage log
```

### Data model

Enums (`shared/constants.ts` → Postgres enums): `budget_range`, `pipeline_status`, `ai_status`, `service_category`, `priority`.

**briefs**: `id uuid`, `number` (identity, shown as `#BR-0001`), `name`, `email`, `company_name`, `needs`, `budget_range`, `target_date date`, `pipeline_status`, `ai_status`, `ai_result jsonb`, `service_category`, `priority`, `ai_error`, `ai_attempts`, `ai_started_at`, `ai_processed_at`, `email_draft`, `created_at`, `updated_at`.
Indexes: `created_at desc`, `priority`, `service_category`, `ai_status`.

**ai_runs**: one row per LLM attempt — `brief_id`, `status (success|failed)`, `model`, `raw_output`, `error`, `latency_ms`, `created_at`.

**pipeline_status_history**: append-only — `brief_id`, `from_status` (`null` = created), `to_status`, `changed_by` (`null` = system), `created_at`.

**users**: `email` unique, `password_hash` (scrypt).

### API

All errors share one shape: `{ statusCode, message, data?: { fieldErrors: { field: [msg] } } }`.

| Method | Route | Auth | Result |
|---|---|---|---|
| POST | `/api/briefs` | public, rate-limited, honeypot | `201 { id, number }` / `400` / `429` |
| POST | `/api/auth/login` | public, rate-limited | `200` + session cookie / `401` |
| POST | `/api/auth/logout` | | `204` |
| GET | `/api/admin/briefs?priority=&category=&page=&pageSize=` | admin | `{ items, total, page, pageSize, stats }` |
| GET | `/api/admin/briefs/:id` | admin | `{ brief, aiRuns, history }` / `404` |
| PATCH | `/api/admin/briefs/:id/status` | admin | `{ pipelineStatus }` → `200 { pipelineStatus, historyEntry }` / `409` invalid jump |
| POST | `/api/admin/briefs/:id/reprocess` | admin | `202` / `409` while pending or processing |
| POST | `/api/admin/briefs/:id/email-draft` | admin | `{ emailDraft }` (bonus) |
| GET | `/api/health` | public | DB check |

---

## 3. AI integration

- **Provider / model:** DeepSeek, `deepseek-flash`, through the official OpenAI-compatible API with the `openai` npm SDK (`baseURL` from env, so another OpenAI-compatible provider is a config change).
- **Call settings:** JSON mode (`response_format: json_object`), **thinking explicitly disabled** (`thinking: { type: "disabled" }` — DeepSeek enables it by default), `temperature 0.2`, `max_tokens 800`, SDK retries off (we control retries).
- **Prompt** (`server/lib/prompts.ts`): role (sales analyst at Fugo), exact JSON shape with enum spelling generated from `shared/constants.ts`, an explicit priority rubric (High: ≥ Rp50 jt or < 30 days with clear scope; Low: < Rp10 jt, vague or unrealistic), `missing_info` rules, one example, and today's date in WIB so the model can judge urgency. The brief is wrapped in `<brief>` tags and declared to be data, not instructions.
- **Validation:** `AiResultSchema` is a strict Zod object (no extra keys, exact enums, length limits). Nothing unvalidated is ever stored as a result.
- **Failure policy:**

| Case | Handling |
|---|---|
| Network error, 429, 5xx, blank JSON-mode content | 1 automatic retry after 1.5 s, then `failed` |
| Timeout (20 s, `AbortController`) | `failed` ("LLM timeout (20 dtk)"), no retry |
| Non-JSON, schema mismatch, truncated output | `failed`, raw output kept in `ai_runs` |
| Missing API key | `failed` with a clear message |
| Process crash mid-job | row stays `processing`; recovered to `pending` after 2 minutes |

A failed brief shows the error and a "Proses ulang AI" button. `AI_FORCE_FAIL=true` makes the worker return an output with `priority: "Urgent"`, which fails the real validation path — used to demo the failure flow.

---

## 4. Technical decisions & trade-offs

- **Nuxt 4 full-stack instead of the suggested Next.js.** One repo, one deploy, and the same TypeScript/Zod schemas validate the form, the API and the LLM output. Vue/Nuxt is the stack I can change fastest and defend in review. Route handlers stay thin, so the services could move to a standalone Node API if other clients (WhatsApp, email intake) appear.
- **Postgres as the job queue instead of Redis/BullMQ.** The `briefs` row is the job: state survives restarts, there is nothing extra to deploy, and `SKIP LOCKED` keeps claims safe even with several instances. Trade-off: polling, no per-job backoff schedule, and the worker runs inside the web process (needs a long-running host, which is why Railway and not serverless).
- **Category and priority copied out of `ai_result`** into enum columns, so list filters use indexes instead of JSONB queries. `ai_result` stays the full validated record.
- **Forward-only, one-step pipeline** (`New → Contacted → Proposal → Won/Lost`), enforced on the server with a row lock, every change appended to history. The stepper's checkmarks are therefore always true. Trade-off: no undo for a mis-click (a future "revert" would just be one more allowed transition and history row).
- **A failed re-run clears the previous AI result**, so what the list shows always matches the latest run; older runs remain in `ai_runs`.
- **Single admin seeded from env**, sealed-cookie sessions (`nuxt-auth-utils`), no roles. Pages and API are guarded separately.
- **In-memory rate limiter** per IP: fine for one instance; it would move to Postgres/Redis when scaling out.
- **Plain Tailwind with design tokens** taken from the provided UI design, instead of a component library, so the screens match the reference closely with very little CSS.

## 5. What I'd do next

- Several users with roles, and "assigned to" on briefs.
- Intake from WhatsApp / email into the same `createBrief` service.
- Notifications (Slack / email) for new High-priority briefs.
- Run the worker as a separate process and scale it horizontally (the `SKIP LOCKED` claim already allows it); per-job retry with backoff.
- Search, pipeline filter, CSV export; an admin "revert last status change".

## 6. Libraries & boilerplate

Nuxt 4 (Vue 3, Nitro), Tailwind CSS 4, Drizzle ORM + drizzle-kit, `pg`, Zod 4, nuxt-auth-utils, `openai` SDK, Vitest + @nuxt/test-utils, ESLint (@nuxt/eslint). No starter template; the project was scaffolded by hand. Fonts: Inter and Bricolage Grotesque (Google Fonts).

## 7. AI usage log

Tools: **Claude Code** (Claude Opus) for scaffolding, schema, services, UI built from the HTML design reference, tests and docs; **DeepSeek** is the runtime model inside the app. Every piece of generated code was run, tested (80 automated tests) and checked against the live DeepSeek docs.

Corrected or rejected AI output, in detail, is in **[docs/ai-log.md](docs/ai-log.md)**. Highlights:

1. **Outdated session env var** — `NUXT_SESSION_PASSWORD` is ignored by `nuxt-auth-utils@0.6`; the warning on first boot led to `NUXT_APP_SECRET`.
2. **Wrong model id and thinking default** — the plan's `deepseek-v4-flash` is a retired alias and DeepSeek enables thinking by default; switched to `deepseek-flash` and disable thinking explicitly.
3. **Database URL read from Nuxt runtime config** — would only work as `NUXT_DATABASE_URL`, not Railway's `DATABASE_URL`; replaced by a validated `process.env` reader.
4. **Admin API guard matched too broadly** (`startsWith('/api/admin')`); tightened and covered by e2e tests.
