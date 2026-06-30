# Maintenance Guide

## Routine checks

| Cadence | Check |
|---|---|
| Daily | `GET /api/health` is `healthy`; `lastRefresh` recent |
| Weekly | `usedFallback` not persistently true (see below) |
| On source change | Re-verify the PoW flow / result mapping |

## "Refreshes show `usedFallback: true`"

The live infralens fetch failed and seed data was served. Diagnose locally:
```bash
npm run collect            # prints fetched/matched/usedFallback/error
npx tsx scripts/smoke.ts   # live fetch, no DB writes
```
Likely causes & fixes:
1. **PoW algorithm changed** — the site's `/_a/pass.js` changed. Re-check it and
   update `solveChallenge()` in `src/collectors/infralens/client.ts`.
2. **Result fields renamed** — update the mapping in
   `src/collectors/infralens/index.ts` (`normalize`).
3. **Timeouts / rate-limited** — raise `COLLECTOR_TIMEOUT_MS`, set a small
   `COLLECTOR_RATE_LIMIT_MS`.

## Tuning relevance

- **Which tenders surface**: edit the `QUERIES` array in
  `src/collectors/infralens/index.ts`.
- **Keyword matching**: edit `KEYWORD_GROUPS` in `src/lib/keywords.ts`. Short
  acronyms match exactly — keep that to avoid false positives like `AI`→`AIS`.
  Add a case to `tests/keywords.test.ts` and run `npm test`.
- **Department override**: `DEPARTMENT_PATTERNS` / `IT_DEPARTMENT_LABELS`.

## Database

- Migrations: edit `prisma/schema.prisma` → `prisma:migrate` (dev) → commit →
  `prisma:deploy` (prod).
- Growth: tenders accumulate; closed ones sink by sort order. Add a periodic
  prune if needed (`status = CLOSED` older than N months).

## Caching

- TTLs: list 30s, item 120s, stats 30s; PoW token ~80 min. After any manual DB
  edit, call `POST /api/refresh` or wait for TTL.
- Needs Upstash in multi-instance deployments for a shared cache + rate-limit
  counter + shared PoW token.

## Scheduling

- Interval in `vercel.json` (`*/15 * * * *`). The dashboard also refreshes on
  load (≥3-min freshness window) and via the Refresh button (forced).

## Security

- `REFRESH_SECRET` / `CRON_SECRET` set & rotated. Inputs Zod-validated; outputs
  serialized via `serializeTender`. Respect the source's terms of use.

## Logs

Structured pino (JSON in prod). Filter by `module`:
`infralens-client`, `infralens-collector`, `refresh`, `api`, `cache`.
