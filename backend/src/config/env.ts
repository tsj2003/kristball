import { Role } from "@prisma/client";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4522),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:4521",
  databaseUrl: required("DATABASE_URL"),
};

export type AuthTokenPayload = {
  userId: string;
  role: Role;
  baseId: string | null;
};
