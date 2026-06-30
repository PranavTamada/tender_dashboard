# Deployment Guide

Everything runs on **Vercel** against a **Supabase** database. No worker, no
browser, no GitHub Actions — the collector is pure HTTP and runs in the Vercel
function on refresh and on a cron.

---

## 1. Supabase

1. Create a project at supabase.com.
2. **Project Settings → Database → Connection string**:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL` (runtime). Keep
     `?pgbouncer=true&connection_limit=1`.
   - **Session / direct** (port `5432`) → `DIRECT_URL` (migrations).
3. Apply the schema (locally, with the env set):
   ```bash
   npm run prisma:deploy
   ```
   Optional smoke test of the live source: `npx tsx scripts/smoke.ts`.

---

## 2. Vercel

1. Import the repo (framework auto-detected: Next.js).
2. **Environment variables**:

   | Var | Value |
   |---|---|
   | `DATABASE_URL` | Supabase pooled URL (`:6543`) |
   | `DIRECT_URL` | Supabase direct URL (`:5432`) |
   | `REFRESH_SECRET` | `openssl rand -hex 32` |
   | `CRON_SECRET` | **same value as `REFRESH_SECRET`** |
   | `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional, recommended |

3. Deploy.

> Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; the refresh route
> validates against `REFRESH_SECRET`, so set both to the same string.

---

## 3. Cron (built in)

`vercel.json` registers:
```json
{ "crons": [{ "path": "/api/refresh", "schedule": "*/15 * * * *" }] }
```
Every 15 minutes Vercel calls `GET /api/refresh`, which live-fetches from
infralens and upserts into Supabase — so data stays fresh even with no visitors.
The dashboard also refreshes on load and via the Refresh button.

---

## Verify

- Open the dashboard → it fetches the latest on load.
- `GET /api/health` → `"status":"healthy"`.
- `npm run collect` locally prints a per-run table (fetched / matched /
  inserted / updated / usedFallback).

---

## Migration & data scripts

| Command | Purpose |
|---|---|
| `npm run prisma:migrate` | create/apply a dev migration |
| `npm run prisma:deploy` | apply migrations (prod/Supabase) |
| `npm run collect` | live-fetch from infralens into the DB |
| `npm run db:seed` | load offline sample data |
| `npx tsx scripts/smoke.ts` | live source sanity check (no DB writes) |

---

## Self-hosting (optional)

`Dockerfile` / `docker-compose.yml` run the app with Postgres + Redis for
self-hosting. Point `DATABASE_URL`/`DIRECT_URL` at Supabase or the Compose
Postgres. Replace Vercel Cron with a host crontab:
```cron
*/15 * * * * curl -fsS -H "Authorization: Bearer $REFRESH_SECRET" https://<host>/api/refresh
```

See [`.env.example`](../.env.example) for all variables.
