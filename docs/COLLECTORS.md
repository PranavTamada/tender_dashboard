# Collector

A single collector under `src/collectors/infralens/` fetches from the
tenders.infralens.in aggregator. The rest of the app only sees
`NormalizedTender[]`, so the source can be reworked without touching the API/UI.

```
collectors/
├── infralens/
│   ├── client.ts   # PoW solver + /api/search client (token cached in Redis)
│   ├── index.ts    # query → map → strict classify → dedupe; seed fallback
│   └── seed.ts     # realistic offline fallback records
├── parse.ts        # parseDate / parseValue / cleanText
└── types.ts        # InfralensResult, CollectorResult
```

## Source access (proof-of-work)

`/api/search` is gated by a SHA-256 PoW. `InfralensClient`:

1. `GET /api/challenge` → `{ c, zeros }`
2. brute-forces `n` where `sha256(`${c}:${n}`).slice(0,zeros) === "0".repeat(zeros)`
3. `POST /api/pass { c, n }` → stores the `bqs` cookie
4. `GET /api/search?q=…&limit=50` → JSON results

The cookie is cached (`infralens:token`, ~80 min). On a later `token_required`,
it re-solves once and retries. No browser — runs on Vercel.

### Result fields (mapped)

| API | → NormalizedTender |
|---|---|
| `t` / `wd` | title |
| `or` | organization · `dp` department · `dg` sector · `wk` workType |
| `st` state · `ct` city · `ds` location · `lv` level · `pl` portal |
| `vn` | estimatedValue (₹) · `vs`/`vb` valueBand |
| `cn` (`YYYY-MM-DD HH:mm`) / `cl` | closingDate |
| `stat` (`active`/`closed`) | status |
| `u` | url (`https://tenders.infralens.in` + path); slug tail → sourceTenderId |

## Classification (precision)

The aggregator's relevance search is **fuzzy** (a `q=AI` query returns
"Airport", "Aircraft", "AIS switchgear", etc.). So results are treated as
candidates and re-classified strictly:

- `matchKeywords(title, wd)` — word-boundary matching on the tender's own title.
  Short acronyms (`AI`, `ML`, `ICT`, `IT`) match **exactly** (no plural), which
  is what stops `AI`→`AIS`/`Airport`.
- `isDepartmentMatch(department, organization)` — IT/ICT override.
- A result is **kept only if** it has ≥1 keyword (→ `KEYWORD`) or an IT
  department (→ `DEPARTMENT`); otherwise discarded.

Verified live: ~310 candidates → ~112 matches (70 keyword + 42 department).

## Query set

`QUERIES` in `index.ts` lists ~17 search terms covering the keyword set
(`artificial intelligence`, `chatbot`, `mobile app`, `website development`,
`automation`, `data analytics`, …) plus `information technology` to surface
IT-department tenders. They run with bounded concurrency after a one-shot token
warm-up. Tune by editing that array.

## Resilience

| Env | Effect |
|---|---|
| `COLLECTORS_USE_SEED_ONLY=true` | skip live API, use `seed.ts` (offline/CI/demo) |
| `COLLECTOR_TIMEOUT_MS` | per-request timeout |
| `COLLECTOR_MAX_RETRIES` | PoW/search retry attempts |

If the live fetch throws (network, PoW change, markup change), `collect()`
degrades to the seed dataset and flags `usedFallback` so the dashboard is never
empty.

## If the source changes

- **PoW algorithm changes** → update `solveChallenge()` in `client.ts` (it
  mirrors the site's `/_a/pass.js`).
- **Result fields change** → update the mapping in `index.ts#normalize`.
- **Different/extra source** → add a sibling collector emitting
  `NormalizedTender[]`; nothing downstream changes.
