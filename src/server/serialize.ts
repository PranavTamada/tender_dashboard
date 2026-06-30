import type { Tender as PrismaTender } from "@prisma/client";
import type { Tender } from "@/types/tender";

/** Convert a Prisma Tender row into the API/UI-facing shape. */
export function serializeTender(row: PrismaTender): Tender {
  return {
    id: row.id,
    portal: row.portal,
    level: row.level,
    sourceTenderId: row.sourceTenderId,
    title: row.title,
    description: row.description,
    organization: row.organization,
    department: row.department,
    sector: row.sector,
    workType: row.workType,
    state: row.state,
    city: row.city,
    publishedDate: row.publishedDate ? row.publishedDate.toISOString() : null,
    closingDate: row.closingDate ? row.closingDate.toISOString() : null,
    estimatedValue:
      row.estimatedValue != null ? Number(row.estimatedValue) : null,
    valueBand: row.valueBand,
    currency: row.currency,
    url: row.url,
    status: row.status,
    matchType: row.matchType,
    matchedKeywords: row.matchedKeywords,
    visited: row.visited,
    visitedAt: row.visitedAt ? row.visitedAt.toISOString() : null,
    rawData: row.rawData ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
