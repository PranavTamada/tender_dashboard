import type { Prisma } from "@prisma/client";
import type { Tender, TenderListResponse, TenderQuery } from "@/types/tender";
import { prisma } from "@/lib/prisma";
import { cache, CACHE_KEYS } from "@/lib/redis";
import { serializeTender } from "./serialize";

const LIST_TTL_SECONDS = 30;
const ITEM_TTL_SECONDS = 120;

function buildWhere(q: TenderQuery): Prisma.TenderWhereInput {
  const where: Prisma.TenderWhereInput = {};

  if (q.matchType) where.matchType = q.matchType;
  if (q.status) where.status = q.status;
  if (q.portal) where.portal = { contains: q.portal, mode: "insensitive" };
  if (q.sector) where.sector = { contains: q.sector, mode: "insensitive" };
  if (q.state) where.state = { contains: q.state, mode: "insensitive" };
  if (q.keyword) where.matchedKeywords = { has: q.keyword };
  if (q.visited !== undefined) where.visited = q.visited;
  if (q.minValue != null) where.estimatedValue = { gte: q.minValue };

  if (q.closingFrom || q.closingTo) {
    where.closingDate = {
      ...(q.closingFrom ? { gte: new Date(q.closingFrom) } : {}),
      ...(q.closingTo ? { lte: new Date(q.closingTo) } : {}),
    };
  }

  if (q.q) {
    const term = q.q;
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { organization: { contains: term, mode: "insensitive" } },
      { department: { contains: term, mode: "insensitive" } },
      { sector: { contains: term, mode: "insensitive" } },
      { state: { contains: term, mode: "insensitive" } },
      { sourceTenderId: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(
  sort: TenderQuery["sort"],
): Prisma.TenderOrderByWithRelationInput[] {
  switch (sort) {
    case "closingSoon":
      // NULL closing dates last, soonest real date first.
      return [{ closingDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "highestValue":
      // NULL values last, highest real value first.
      return [{ estimatedValue: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "sector":
      return [{ sector: "asc" }, { createdAt: "desc" }];
    case "state":
      return [{ state: "asc" }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { closingDate: "asc" }];
  }
}

export async function queryTenders(q: TenderQuery): Promise<TenderListResponse> {
  const cacheKey = `${CACHE_KEYS.tenders}${JSON.stringify(q)}`;
  const cached = await cache.get<TenderListResponse>(cacheKey);
  if (cached) return cached;

  const where = buildWhere(q);
  const orderBy = buildOrderBy(q.sort);
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.tender.findMany({ where, orderBy, skip, take: q.pageSize }),
    prisma.tender.count({ where }),
  ]);

  const response: TenderListResponse = {
    data: rows.map(serializeTender),
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    },
  };

  await cache.set(cacheKey, response, LIST_TTL_SECONDS);
  return response;
}

export async function getTenderById(id: string): Promise<Tender | null> {
  const cacheKey = `${CACHE_KEYS.tender}${id}`;
  const cached = await cache.get<Tender>(cacheKey);
  if (cached) return cached;

  const row = await prisma.tender.findUnique({ where: { id } });
  if (!row) return null;

  const tender = serializeTender(row);
  await cache.set(cacheKey, tender, ITEM_TTL_SECONDS);
  return tender;
}
