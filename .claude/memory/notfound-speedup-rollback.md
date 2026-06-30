---
name: notfound-speedup-rollback
description: run_notfound.py speedup config and the rollback plan if 1000+ verified isn't hit
metadata:
  type: project
---

Goal: reach 1000+ VERIFIED domains out of 2829 in `AP_TS_MERGED.xlsx`.

To speed up `run_notfound.py` (was 0.17 rows/s, ~3hr ETA), applied on 2026-06-02:
- Trimmed TLDS from 14 → 6 winners: `.com .in .co.in .net .shop .store`
- DNS_TIMEOUT 3s → 1.5s
- workers 14 → 24
Expected ~5x faster (~30 min total incl verify pass).

**Why:** candidate explosion (~200 URLs/lead) was the bottleneck, not HTTP timeout.

**ROLLBACK PLAN (user-approved):** if the trimmed run does NOT produce 1000+ verified
after run_notfound + verify_needs_review, revert TLDS to the full 14-entry list and
DNS_TIMEOUT back to 3s, then re-run the full ~3-hour pass on the still-NOT_FOUND rows.
The trimmed run's already-found domains are kept (checkpoint/merged file), so the
rollback only re-processes the remaining not-found leads.

Related: [[project-domain-pipeline]]
