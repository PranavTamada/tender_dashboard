import type { NormalizedTender, TenderStatus } from "@/types/tender";
import { getEnv } from "@/lib/env";
import { getLogger } from "@/lib/logger";
import { computeDedupeHash, dedupeBatch } from "@/lib/dedupe";
import { isDepartmentMatch, matchKeywords } from "@/lib/keywords";
import { computeStatus } from "@/lib/status";
import { cleanText, parseDate, parseValue } from "../parse";
import type { CollectorResult, InfralensResult } from "../types";
import { InfralensClient } from "./client";
import { INFRALENS_SEED } from "./seed";

const log = getLogger("infralens-collector");
const BASE = "https://tenders.infralens.in";

/**
 * Search terms covering the IT/software/AI relevance set. The aggregator's
 * relevance search does the heavy lifting; we re-classify each result with the
 * strict keyword/department matcher. `label` is the canonical keyword to tag
 * when the strict matcher finds nothing explicit. A null label means the query
 * exists to surface IT-department tenders (tagged via the department override).
 */
const QUERIES: { q: string; label: string | null }[] = [
  // ── AI / ML ──
  { q: "artificial intelligence", label: "Artificial Intelligence" },
  { q: "AI chatbot", label: "AI Chatbot Development" },
  { q: "chatbot", label: "Chatbot" },
  { q: "conversational ai", label: "Conversational Chatbot" },
  { q: "machine learning", label: "Machine Learning" },
  { q: "computer vision", label: "Computer Vision" },
  { q: "natural language processing", label: "NLP" },
  { q: "generative ai", label: "Generative AI" },
  { q: "whatsapp bot", label: "WhatsApp Bot" },
  // ── Web / mobile / software ──
  { q: "website development", label: "Website Development" },
  { q: "website", label: "Website" },
  { q: "web application", label: "Web Application" },
  { q: "web portal", label: "Web Portal" },
  { q: "mobile app", label: "Mobile App" },
  { q: "mobile application", label: "Mobile App" },
  { q: "software development", label: "Custom Software Development" },
  { q: "custom software", label: "Custom Software Development" },
  { q: "application development", label: "Custom Software Development" },
  { q: "api integration", label: "API Integration" },
  // ── Platforms / enterprise systems ──
  { q: "erp", label: "ERP" },
  { q: "crm", label: "CRM" },
  { q: "management information system", label: "MIS" },
  { q: "system integration", label: "System Integration" },
  { q: "cloud", label: "Cloud" },
  { q: "saas", label: "SaaS" },
  { q: "gis", label: "GIS" },
  { q: "internet of things", label: "IoT" },
  // ── Automation / analytics / data ──
  { q: "automation", label: "Automation" },
  { q: "robotic process automation", label: "RPA" },
  { q: "data analytics", label: "Data Analytics" },
  { q: "business intelligence", label: "Business Intelligence" },
  { q: "dashboard", label: "Dashboard" },
  // ── Digital / e-governance / consulting ──
  { q: "digital transformation", label: "Digital Transformation Consulting" },
  { q: "e-governance", label: "E-Governance" },
  { q: "digital platform", label: "Digital Platform" },
  { q: "customer support", label: "Customer Support" },
  { q: "it consultancy", label: null },
  { q: "information technology", label: null },
];

/** Run async tasks with bounded concurrency. */
async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export class InfralensCollector {
  private client = new InfralensClient();
  private readonly log = log;

  async collect(): Promise<CollectorResult> {
    const start = Date.now();
    const env = getEnv();

    if (env.COLLECTORS_USE_SEED_ONLY) {
      const tenders = this.normalizeAll(
        INFRALENS_SEED.map((r) => ({ result: r, label: null })),
      );
      return {
        tenders,
        fetched: INFRALENS_SEED.length,
        usedFallback: true,
        error: null,
        durationMs: Date.now() - start,
      };
    }

    try {
      // Acquire the PoW token once, then run every query with bounded
      // concurrency. A single failing/slow query degrades to [] instead of
      // aborting the whole run; we only fall back to seed if EVERY query fails.
      await this.client.warm();
      const perQuery = await pool(QUERIES, 5, async (query) => {
        try {
          const results = await this.client.search(query.q);
          return { query, results, ok: true };
        } catch (err) {
          this.log.warn({ q: query.q, err: (err as Error).message }, "query failed");
          return { query, results: [] as InfralensResult[], ok: false };
        }
      });

      if (perQuery.every((p) => !p.ok)) {
        throw new Error("all infralens queries failed");
      }

      const tagged: { result: InfralensResult; label: string | null }[] =
        perQuery.flatMap(({ query, results }) =>
          results.map((r) => ({ result: r, label: query.label })),
        );

      const fetched = tagged.length;
      if (!fetched) throw new Error("no results from any query");

      const tenders = this.normalizeAll(tagged);
      this.log.info({ fetched, matched: tenders.length }, "live fetch ok");
      return {
        tenders,
        fetched,
        usedFallback: false,
        error: null,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const error = (err as Error).message;
      this.log.warn({ error }, "live fetch failed — using seed fallback");
      const tenders = this.normalizeAll(
        INFRALENS_SEED.map((r) => ({ result: r, label: null })),
      );
      return {
        tenders,
        fetched: INFRALENS_SEED.length,
        usedFallback: true,
        error,
        durationMs: Date.now() - start,
      };
    }
  }

  private normalizeAll(
    items: { result: InfralensResult; label: string | null }[],
  ): NormalizedTender[] {
    const normalized = items
      .map((it) => this.normalize(it.result, it.label))
      .filter((t): t is NormalizedTender => t !== null);
    return dedupeBatch(normalized);
  }

  private normalize(
    r: InfralensResult,
    queryLabel: string | null,
  ): NormalizedTender | null {
    const title = cleanText(r.t ?? r.wd);
    if (!title) return null;

    const organization = cleanText(r.or);
    const department = cleanText(r.dp);
    const sector = cleanText(r.dg);
    const workType = cleanText(r.wk);

    // The infralens relevance search is fuzzy, so we treat its results purely
    // as candidates and apply our own strict classification. A tender is kept
    // only if our matcher finds a real keyword or an IT-department match —
    // this is what prevents false positives (e.g. a metro tender surfacing for
    // an "AI chatbot" query). `queryLabel` is intentionally not used as a tag.
    void queryLabel;
    // Keyword match on the tender's own text only (title); categorical fields
    // like organization/sector are used for the department override, not for
    // keyword detection (avoids acronym noise from place/agency names).
    const keywords = matchKeywords(title, r.wd);
    const dept = isDepartmentMatch(department, organization);
    if (keywords.length === 0 && !dept) return null;
    const matchType: "KEYWORD" | "DEPARTMENT" = keywords.length > 0 ? "KEYWORD" : "DEPARTMENT";
    const matchedKeywords = keywords;

    const url = r.u ? (r.u.startsWith("http") ? r.u : `${BASE}${r.u}`) : null;
    const slug = r.u ? r.u.split("/").filter(Boolean).pop() ?? title : title;
    const closingDate = parseDate(r.cn ?? r.cl);
    const status = this.statusFrom(r.stat, closingDate);

    return {
      portal: cleanText(r.pl) ?? "infralens",
      level: cleanText(r.lv),
      sourceTenderId: slug.slice(0, 120),
      title,
      description: cleanText(r.wd) !== title ? cleanText(r.wd) : null,
      organization,
      department,
      sector,
      workType,
      state: cleanText(r.st) ?? cleanText(r.ds),
      city: cleanText(r.ct),
      publishedDate: null,
      closingDate,
      estimatedValue: parseValue(r.vn),
      valueBand: cleanText(r.vs) ?? cleanText(r.vb),
      currency: "INR",
      url,
      status,
      matchType,
      matchedKeywords,
      dedupeHash: computeDedupeHash({ sourceTenderId: slug, title, url }),
      rawData: r as Record<string, unknown>,
    };
  }

  private statusFrom(
    stat: string | null | undefined,
    closingDate: Date | null,
  ): TenderStatus {
    if (stat === "closed") return "CLOSED";
    const computed = computeStatus(closingDate);
    if (stat === "active" && computed === "CLOSED") return "OPEN"; // trust source
    return computed;
  }
}
