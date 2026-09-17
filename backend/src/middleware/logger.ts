import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

function clientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return req.socket.remoteAddress ?? null;
}

const SKIP = new Set(["/", "/health", "/api/health"]);

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();

  res.on("finish", () => {
    if (SKIP.has(req.path)) return;
    if (!req.path.startsWith("/api")) return;

    const durationMs = Date.now() - started;
    const userId = req.user?.userId ?? null;
    const record = {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      durationMs,
      ip: clientIp(req),
      userId,
    };

    console.log(
      `[http] ${record.method} ${record.path} ${record.statusCode} ${record.durationMs}ms user=${userId ?? "-"}`
    );

    prisma.apiAccessLog
      .create({ data: record })
      .catch((err) => {
        console.error("Failed to persist API access log", err);
      });
  });

  next();
}
