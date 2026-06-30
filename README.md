# Tender Intelligence Dashboard

> Real-time monitoring of government **IT / software / AI** tenders, sourced live from the [tenders.infralens.in](https://tenders.infralens.in) aggregator (244k+ tenders across 50+ portals), with keyword & department intelligence, analytics, and a modern SaaS-style UI.

The dashboard **fetches the latest tenders on every refresh**, filters them to AI / software / web / app / automation relevance (plus everything from IT/ICT departments), de-duplicates them, stores them in Supabase, and presents them in a clean, filterable, dark-mode UI. It runs entirely on **Vercel serverless** — no browser, no separate worker.

---

## 🏗️ How it works

```
Browser ──► Vercel (Next.js)
              /api/refresh ──► InfralensClient
                 │              1. GET  /api/challenge  (PoW: {c, zeros})
                 │              2. solve sha256(c:n) with `zeros` leading 0s
                 │              3. POST /api/pass {c,n}  → access cookie (cached)
                 │              4. GET  /api/search?q=<keyword> × N
                 │            merge + dedupe + strict keyword/department classify
                 ├──► upsert ──► Supabase Postgres
              /api/tenders, /api/stats ──► read Supabase (cached)
```

The infralens search API is gated by a lightweight **SHA-256 proof-of-work**. We reproduce it in ~20 lines of Node `crypto` (instant — a few thousand hashes), cache the resulting token ~80 min, and query the API directly. Because it's pure HTTP, the whole pipeline runs inside a Vercel function and on every dashboard refresh.

> **Precision:** the aggregator's relevance search is fuzzy, so we treat its results purely as *candidates* and apply our own strict, word-boundary keyword matcher + IT-department override. Verified live: ~310 candidates → ~112 high-precision matches (70 keyword + 42 department), in ~1.5s.

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 14 (App Router)** + TypeScript |
| UI | TailwindCSS, **shadcn/ui**, Lucide, Recharts, light/dark |
| Data fetching | **TanStack Query** |
| Validation | **Zod** (every API input + env) |
| Database | **Supabase Postgres** via **Prisma** |
| Cache | **Upstash Redis** (HTTP) with in-memory fallback |
| Source | **tenders.infralens.in** `/api/search` (PoW-gated, pure HTTP) |
| Scheduling | **Vercel Cron** (`*/15`) → `/api/refresh` |
| Logging | **pino** |

---

## 🚀 Quick Start (local)

```bash
npm install

cp .env.example .env
#   set DATABASE_URL / DIRECT_URL to your Supabase connection strings

npm run prisma:migrate     # create the schema
npm run collect            # live-fetch from infralens into the DB
npm run dev                # http://localhost:3000
```

- Offline demo: `COLLECTORS_USE_SEED_ONLY=true npm run db:seed`
- Sanity-check the live source: `npx tsx scripts/smoke.ts`

---

## ☁️ Deploy (Vercel + Supabase)

1. **Supabase** → create a project, copy the pooled (`:6543`) and direct (`:5432`) connection strings.
2. **Vercel** → import the repo, set `DATABASE_URL`, `DIRECT_URL`, `REFRESH_SECRET`, `CRON_SECRET` (= `REFRESH_SECRET`), and optionally Upstash vars.
3. Apply the schema: `npm run prisma:deploy` (with prod env).
4. Deploy. `vercel.json` registers the 15-minute cron that keeps Supabase fresh.

Full walkthrough: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 🔌 API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/tenders` | Paginated, filterable, sortable list |
| `GET` | `/api/tenders/:id` | Single tender detail |
| `GET` | `/api/stats` | Aggregate analytics |
| `POST` | `/api/refresh` | Live-fetch latest from infralens + store (Refresh button) |
| `GET` | `/api/refresh` | Same, secret-protected (Vercel cron) |
| `GET` | `/api/health` | Liveness + dependency status |

Details: [`docs/API.md`](docs/API.md).

---

## 🗂️ Structure

```
src/
├── app/                      # Next.js pages + API routes (Vercel)
├── collectors/
│   ├── infralens/
│   │   ├── client.ts         # PoW solver + /api/search client
│   │   ├── index.ts          # query → map → classify → dedupe
│   │   └── seed.ts           # offline fallback data
│   ├── parse.ts types.ts
├── server/                   # refresh(persist) / tenders / stats / serialize
├── lib/                      # prisma, redis, env, logger, keywords, dedupe
├── components/  hooks/  types/
scripts/collect.ts  scripts/smoke.ts
prisma/  tests/  docs/
```

---

## 🔑 Keyword & Department Logic

- **Keywords** (`AI`, `chatbot`, `mobile app`, `website`, `automation`, `data analytics`, …) match case-insensitively with partial & plural tolerance, de-duplicated to canonical labels. Short acronyms (`AI`, `ML`, `ICT`, `IT`) match **exactly** (word boundaries, no plural) — so `AI` does not match `AIS`/`Airport` and `IT` does not match `items`.
- **Department override**: tenders from `Information Technology Department`, `ITE&C`, `ICT`, `IT & Communications`, `DeitY`, etc. are included **even with no keyword** and tagged **Department Match**.

See [`src/lib/keywords.ts`](src/lib/keywords.ts) and [`docs/COLLECTORS.md`](docs/COLLECTORS.md).

---

## 🧪 Tests

```bash
npm test          # keyword matching, dedupe, parsing, collector (32 tests)
npm run typecheck
npm run build
```
