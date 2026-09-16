import { Request } from "express";
import { Role } from "@prisma/client";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function parseOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Invalid date");
  }
  return date;
}

export function parsePositiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, `${field} must be a positive integer`);
  }
  return n;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export type Actor = {
  userId: string;
  role: Role;
  baseId: string | null;
};

export function actorFrom(req: Request): Actor {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }
  return req.user;
}
