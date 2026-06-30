import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidateTenderCaches } from "@/lib/redis";
import { getTenderById } from "@/server/tenders";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { clientId, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/tenders/:id — full tender detail. */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const rl = await rateLimit(`tender:${clientId(req)}`, { limit: 240 });
    if (!rl.allowed) return jsonError(429, "Too many requests");

    const tender = await getTenderById(params.id);
    if (!tender) return jsonError(404, "Tender not found");

    return jsonOk(tender);
  } catch (err) {
    return handleRouteError(err);
  }
}

const patchSchema = z.object({ visited: z.boolean() });

/** PATCH /api/tenders/:id — toggle the visited flag. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const rl = await rateLimit(`tender-write:${clientId(req)}`, { limit: 120 });
    if (!rl.allowed) return jsonError(429, "Too many requests");

    const { visited } = patchSchema.parse(await req.json());
    const existing = await prisma.tender.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return jsonError(404, "Tender not found");

    await prisma.tender.update({
      where: { id: params.id },
      data: { visited, visitedAt: visited ? new Date() : null },
    });
    await invalidateTenderCaches();
    return jsonOk({ ok: true, id: params.id, visited });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** DELETE /api/tenders/:id — permanently remove a tender. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const rl = await rateLimit(`tender-write:${clientId(req)}`, { limit: 120 });
    if (!rl.allowed) return jsonError(429, "Too many requests");

    const existing = await prisma.tender.findUnique({
      where: { id: params.id },
      select: { dedupeHash: true, title: true },
    });
    if (!existing) return jsonError(404, "Tender not found");

    // Hard-delete the row AND blocklist its hash so a live refresh can't
    // resurrect it.
    await prisma.$transaction([
      prisma.deletedTender.upsert({
        where: { dedupeHash: existing.dedupeHash },
        create: { dedupeHash: existing.dedupeHash, title: existing.title },
        update: {},
      }),
      prisma.tender.delete({ where: { id: params.id } }),
    ]);
    await invalidateTenderCaches();
    return jsonOk({ ok: true, id: params.id, deleted: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
