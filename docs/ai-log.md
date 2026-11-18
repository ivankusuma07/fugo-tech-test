# AI usage log

Running log, written while working (not reconstructed at the end).

**Tools:** Claude Code (Claude Opus) for scaffolding, schema, services, UI from the HTML design reference, tests and docs. DeepSeek `deepseek-v4-flash` is the runtime LLM inside the app.

Every entry below is a case where AI output (from the plan or from generated code) was corrected or rejected.

---

## 1. Outdated auth env variable in the plan

- **AI suggested:** the development plan (drafted with AI help) used `NUXT_SESSION_PASSWORD` as the session sealing key for `nuxt-auth-utils`.
- **Why it was wrong:** on first boot, `nuxt-auth-utils@0.6.2` warned that `NUXT_SESSION_PASSWORD` "is not used anymore" and sessions are sealed with a key derived from `NUXT_APP_SECRET`. Deploying with the old name would have run with an unset secret.
- **What I did:** renamed the variable to `NUXT_APP_SECRET` in `.env.example` and the README, verified the warning is gone.

## 2. Model name and thinking-mode default for DeepSeek

- **AI suggested:** the plan fixed the model as `deepseek-v4-flash` and said "thinking mode disabled, check the exact parameter on day one", implying non-thinking was something to opt into lightly.
- **Why it was wrong:** the live DeepSeek docs (checked 18 Nov 2026) list `deepseek-flash` and `deepseek-v4-pro` as the current model ids; `deepseek-v4-flash` is a legacy alias for a retired model that is silently routed to the new one. Thinking mode is **on by default** (effort `high`), so leaving the parameter out would have made every call slower and pricier, and `temperature` has no effect in thinking mode.
- **What I did:** default `LLM_MODEL=deepseek-flash` (still overridable by env), send `thinking: { type: "disabled" }` explicitly on every call, and handle the documented JSON-mode caveat that `content` can come back blank (retried once, then marked failed).
