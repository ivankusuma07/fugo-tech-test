# AI usage log

Running log, written while working (not reconstructed at the end).

**Tools:** Claude Code (Claude Opus) for scaffolding, schema, services, UI from the HTML design reference, tests and docs. DeepSeek `deepseek-v4-flash` is the runtime LLM inside the app.

Every entry below is a case where AI output (from the plan or from generated code) was corrected or rejected.

---

## 1. Outdated auth env variable in the plan

- **AI suggested:** the development plan (drafted with AI help) used `NUXT_SESSION_PASSWORD` as the session sealing key for `nuxt-auth-utils`.
- **Why it was wrong:** on first boot, `nuxt-auth-utils@0.6.2` warned that `NUXT_SESSION_PASSWORD` "is not used anymore" and sessions are sealed with a key derived from `NUXT_APP_SECRET`. Deploying with the old name would have run with an unset secret.
- **What I did:** renamed the variable to `NUXT_APP_SECRET` in `.env.example` and the README, verified the warning is gone.
