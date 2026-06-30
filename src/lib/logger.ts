import pino, { type Logger } from "pino";

/**
 * Structured logger. Pretty-prints in development, emits JSON in production
 * (ideal for Vercel / log drains). Child loggers carry a `module` field.
 */
const isProd = process.env.NODE_ENV === "production";

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { app: "tender-dashboard" },
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }),
});

export function getLogger(module: string): Logger {
  return logger.child({ module });
}
