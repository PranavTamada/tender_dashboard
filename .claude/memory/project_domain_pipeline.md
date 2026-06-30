---
name: project-domain-pipeline
description: domain_pipeline package for AP_TS signalhire leads — architecture, key decisions, what's working
metadata:
  type: project
---

Built a production domain discovery+verification pipeline in `domain_pipeline/` package + `run_pipeline.py` CLI.

**Input:** `AP_TS signalhire leads.xlsx` (1700 rows, Indian SMBs, ~92% have no email)
**Output:** `AP_TS_signalhire_leads_ENRICHED.xlsx` with 5 sheets + 7 new columns

**Architecture:**
- Stage 1 resolvers: email, clearbit (free autocomplete), apollo, serper (Google/Bing search), name_guess
- Stage 2 signals: S1 liveness gate, S2 on-page name (40pts), S3 email corr (20pts), S4 consensus (25pts), S5 logo phash (20pts), S6 location (8pts), S7 domain sim (7pts)
- VERIFIED_HIGH requires: S1 pass + score ≥ 55 + ≥ 2 strong signals

**Cache:** SQLite `domain_pipeline_cache.db`, resume-safe

**Tested on 50 rows (no API keys):** 12 VERIFIED_HIGH (24%), 23 NEEDS_REVIEW, 15 NOT_FOUND. ~5s/row.
With Serper key expected ~50-60% VERIFIED_HIGH.

**User has keys available:** SERPER_KEY, GOOGLE_CSE_KEY+CX, APOLLO_KEY — needs to put in `.env`

**Key false-positive protection:**
- Single-token company names use word-boundary matching in S2 (not partial_ratio) — prevents "anevin" matching "anemonevinkel.com"
- S3 only grants strong points if S2 confirmed the site represents the company
- CONFLICT only fires if 2+ sources agree on different domains AND both score ≥ 10 pts

**Regression tests:** `tests/test_regression.py` — 9 tests verify Leaf Water, Sri Vishal Garments, NIFT mismatch cases are rejected

**How to run full 1700 rows:**
1. Create `.env` with SERPER_KEY etc.
2. `python run_pipeline.py` (auto-resumes from cache on re-run)
