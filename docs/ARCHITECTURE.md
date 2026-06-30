# Architecture

A single Next.js app on Vercel does everything — UI, read APIs, and the live
collector — because the data source is reachable over plain HTTP. There is no
browser and no separate worker.

```mermaid
flowchart TB
  subgraph Client["Browser (React + TanStack Query)"]
    UI["Dashboard: stats · filters · grid · charts · modal"]
  end

  subgraph Vercel["Vercel — Next.js"]
    READ["GET /api/tenders · /stats · /health"]
    REFRESH["POST·GET /api/refresh"]
    AUTO["ensureFreshData()"]
    subgraph COLL["Collector (pure HTTP)"]
      CLIENT["InfralensClient<br/>PoW solve + /api/search"]
      NORM["normalize → classify → dedupe"]
    end
  end

  subgraph Ext["External"]
    SRC["tenders.infralens.in<br/>/api/challenge · /api/pass · /api/search"]
    DB[("Supabase Postgres")]
    REDIS[("Upstash Redis / in-memory")]
    CRON["Vercel Cron */15"]
  end

  UI -->|load + Refresh button| REFRESH --> AUTO --> COLL
  CRON -->|secret| REFRESH
  CLIENT --> SRC
  COLL -->|upsert| DB
  REFRESH -->|invalidate| REDIS
  UI --> READ --> DB
  READ --> REDIS
```

## The proof-of-work gate

`tenders.infralens.in/api/search` returns `{ token_required: true }` until a PoW
is solved:

1. `GET /api/challenge` → `{ c, zeros }`
2. find `n` such that `sha256(`${c}:${n}`)` starts with `zeros` hex zeros
   (`zeros=3` → ~4096 hashes, milliseconds)
3. `POST /api/pass { c, n }` → sets the `bqs` access cookie
4. `GET /api/search?q=…` with that cookie → structured JSON

`InfralensClient` implements this with Node `crypto`, caches the cookie (~80 min)
in Redis/in-memory, and transparently re-solves on `token_required`. Pure HTTP →
runs inside a Vercel function.

## Request lifecycles

- **Dashboard load** → `POST /api/refresh?force=false`: refreshes only if the
  last run is older than 3 min (lock-protected), then the list/stats queries
  read Supabase. So the UI shows the freshest data without hammering the source.
- **Refresh button** → `POST /api/refresh?force=true`: always live-fetches.
- **Cron** → `GET /api/refresh` (Bearer `CRON_SECRET`): keeps Supabase fresh
  every 15 min even with no visitors.

## Collector pipeline

```mermaid
flowchart LR
  Q["~17 keyword queries"] --> S["/api/search (PoW token)"]
  S --> M["merge + dedupe by url/hash"]
  M --> C{"strict classify"}
  C -->|keyword in title| K["KEYWORD"]
  C -->|IT dept/org| D["DEPARTMENT"]
  C -->|neither| X["discard (fuzzy candidate)"]
  K --> P["upsert Supabase"]
  D --> P
```

Keyword detection runs on the tender's **own title text** (not categorical
fields), with word-boundary matching and exact short-acronym handling. The
department override keys off `department`/`organization`. Results matching
neither are dropped — the aggregator's fuzzy search is only a candidate source.

## Database schema

```mermaid
erDiagram
  TENDER {
    string id PK
    string portal
    string level
    string sourceTenderId
    string title
    text description
    string organization
    string department
    string sector
    string workType
    string state
    string city
    datetime closingDate
    decimal estimatedValue
    string valueBand
    enum status
    enum matchType
    string[] matchedKeywords
    string dedupeHash UK
    json rawData
    datetime createdAt
    datetime updatedAt
  }
  COLLECTOR_RUN {
    string id PK
    bool success
    bool usedFallback
    int fetched
    int matched
    int inserted
    int updated
    int durationMs
    datetime finishedAt
  }
```

`dedupeHash` is unique; indexes on `portal`, `matchType`, `department`,
`sector`, `state`, `closingDate`, `status` keep filtering/sorting fast.
