# API Documentation

Base URL `/api`. JSON responses. Inputs validated with Zod (400 on invalid).
Read endpoints are rate-limited per IP (`X-RateLimit-*` headers; 429 on excess).

Error shape: `{ "error": "message", "details": null }`.

---

## `GET /api/tenders`

Paginated, filterable, sortable list.

| Param | Type | Description |
|---|---|---|
| `q` | string | Free-text over title, org, department, sector, state, ref |
| `portal` | string | Origin portal contains |
| `sector` | string | Sector contains (e.g. `Telecom & IT`) |
| `state` | string | State contains (e.g. `Telangana`) |
| `department` | string | Department contains (e.g. `ITE&C`) |
| `matchType` | `KEYWORD`\|`DEPARTMENT` | |
| `status` | `OPEN`\|`CLOSING_SOON`\|`CLOSED`\|`UNKNOWN` | |
| `keyword` | string | Exact canonical keyword (e.g. `AI`, `Mobile App`) |
| `closingFrom` / `closingTo` | ISO datetime | Closing-date range |
| `minValue` | number | Minimum estimated value (₹) |
| `sort` | `newest`\|`closingSoon`\|`highestValue`\|`sector`\|`state` | default `newest` |
| `page` / `pageSize` | int | default `1` / `24` (max 100) |

```bash
curl "http://localhost:3000/api/tenders?keyword=AI&status=OPEN&sort=highestValue"
```
```json
{
  "data": [{
    "id": "clx…",
    "portal": "TS", "level": "State",
    "sourceTenderId": "meeseva-whatsapp-ai-chatbot-706856",
    "title": "MeeSeva Whatsapp AI Chatbot",
    "organization": "Government of Telangana » Information Technology…",
    "department": "Information Technology and Communications…",
    "sector": "Posts, Telecom & IT", "workType": "Software / Application",
    "state": "Telangana", "city": "Hyderabad",
    "closingDate": "2026-07-09T17:00:00.000Z",
    "estimatedValue": 8500000, "valueBand": "₹50 L+", "currency": "INR",
    "url": "https://tenders.infralens.in/tender/meeseva-whatsapp-ai-chatbot-706856",
    "status": "OPEN", "matchType": "KEYWORD",
    "matchedKeywords": ["AI", "Chatbot", "WhatsApp Bot"],
    "createdAt": "…", "updatedAt": "…"
  }],
  "pagination": { "page": 1, "pageSize": 24, "total": 70, "totalPages": 3 }
}
```

## `GET /api/tenders/:id`
Single tender (same shape). `404` if not found.

## `GET /api/stats`
```json
{
  "totalTenders": 112, "totalMatches": 112,
  "activeCount": 98, "closingSoonCount": 7, "totalValue": 1234500000,
  "byMatchType": { "KEYWORD": 70, "DEPARTMENT": 42 },
  "bySector": [{ "key": "Posts, Telecom & IT", "count": 61 }],
  "byState":  [{ "key": "Telangana", "count": 14 }],
  "byKeyword":[{ "key": "AI", "count": 33 }],
  "dailyTrend": [{ "date": "2026-06-20", "count": 12 }],
  "weeklyTrend":[{ "week": "2026-06-15", "count": 40 }],
  "lastRefresh": "2026-06-22T10:32:00.000Z"
}
```

## `POST /api/refresh`
Live-fetches the latest tenders from infralens (PoW + `/api/search`), stores
them, invalidates caches. Used by the dashboard. `?force=true` always fetches;
`?force=false` (on-load) only if data is older than 3 min. Rate-limited
(10/min/IP); a valid secret bypasses the limit.
```json
{ "ok": true, "refreshed": true, "reason": "refreshed", "lastRefresh": "…" }
```

## `GET /api/refresh`
Same, **secret-protected** (Vercel cron / manual):
```bash
curl https://<host>/api/refresh -H "Authorization: Bearer $REFRESH_SECRET"
```

## `GET /api/health`
`{ status, checks: { database, cache }, lastRefresh, uptime }` — always 200.
