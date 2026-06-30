import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getLogger } from "./logger";

const log = getLogger("api");

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(
  status: number,
  message: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json({ error: message, details: details ?? null }, { status });
}

/** Standardized error mapping for route handlers. */
export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return jsonError(400, "Invalid request parameters", err.flatten());
  }
  log.error({ err }, "unhandled route error");
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : (err as Error).message;
  return jsonError(500, message);
}

export function rateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetSeconds: number;
}): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetSeconds),
  };
}
