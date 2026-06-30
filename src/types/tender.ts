import { z } from "zod";

/**
 * Shared domain types & Zod schemas. Single source: the infralens / BidEasy
 * aggregator. The API and UI never import Prisma types directly.
 */

export const MATCH_TYPES = ["KEYWORD", "DEPARTMENT"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const TENDER_STATUSES = [
  "OPEN",
  "CLOSING_SOON",
  "CLOSED",
  "UNKNOWN",
] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];

/** A tender as returned by the API (dates serialized as ISO strings). */
export const tenderSchema = z.object({
  id: z.string(),
  portal: z.string(),
  level: z.string().nullable(),
  sourceTenderId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  organization: z.string().nullable(),
  department: z.string().nullable(),
  sector: z.string().nullable(),
  workType: z.string().nullable(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  publishedDate: z.string().datetime().nullable(),
  closingDate: z.string().datetime().nullable(),
  estimatedValue: z.number().nullable(),
  valueBand: z.string().nullable(),
  currency: z.string(),
  url: z.string().nullable(),
  status: z.enum(TENDER_STATUSES),
  matchType: z.enum(MATCH_TYPES),
  matchedKeywords: z.array(z.string()),
  visited: z.boolean(),
  visitedAt: z.string().datetime().nullable(),
  rawData: z.unknown().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Tender = z.infer<typeof tenderSchema>;

/** A normalized tender produced by the collector before persistence. */
export interface NormalizedTender {
  portal: string;
  level: string | null;
  sourceTenderId: string;
  title: string;
  description: string | null;
  organization: string | null;
  department: string | null;
  sector: string | null;
  workType: string | null;
  state: string | null;
  city: string | null;
  publishedDate: Date | null;
  closingDate: Date | null;
  estimatedValue: number | null;
  valueBand: string | null;
  currency: string;
  url: string | null;
  status: TenderStatus;
  matchType: MatchType;
  matchedKeywords: string[];
  dedupeHash: string;
  rawData: Record<string, unknown> | null;
}

/** Query params accepted by GET /api/tenders. */
export const tenderQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  portal: z.string().trim().max(120).optional(),
  sector: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  department: z.string().trim().max(200).optional(),
  matchType: z.enum(MATCH_TYPES).optional(),
  status: z.enum(TENDER_STATUSES).optional(),
  keyword: z.string().trim().max(100).optional(),
  visited: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  closingFrom: z.string().datetime().optional(),
  closingTo: z.string().datetime().optional(),
  minValue: z.coerce.number().min(0).optional(),
  sort: z
    .enum(["newest", "closingSoon", "highestValue", "sector", "state"])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type TenderQuery = z.infer<typeof tenderQuerySchema>;

export const tenderListResponseSchema = z.object({
  data: z.array(tenderSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type TenderListResponse = z.infer<typeof tenderListResponseSchema>;

const countItem = z.object({ key: z.string(), count: z.number() });

/** Aggregate statistics returned by GET /api/stats. */
export const statsResponseSchema = z.object({
  totalTenders: z.number(),
  totalMatches: z.number(),
  activeCount: z.number(),
  closingSoonCount: z.number(),
  totalValue: z.number(),
  byMatchType: z.object({ KEYWORD: z.number(), DEPARTMENT: z.number() }),
  bySector: z.array(countItem),
  byState: z.array(countItem),
  byKeyword: z.array(countItem),
  dailyTrend: z.array(z.object({ date: z.string(), count: z.number() })),
  weeklyTrend: z.array(z.object({ week: z.string(), count: z.number() })),
  lastRefresh: z.string().datetime().nullable(),
});

export type StatsResponse = z.infer<typeof statsResponseSchema>;

export const refreshResponseSchema = z.object({
  ok: z.boolean(),
  durationMs: z.number(),
  fetched: z.number(),
  matched: z.number(),
  inserted: z.number(),
  updated: z.number(),
  usedFallback: z.boolean(),
  error: z.string().nullable(),
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
