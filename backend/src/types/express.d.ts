import { Role } from "@prisma/client";

export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        baseId: string | null;
      };
      scopedBaseId?: string | null;
    }
  }
}
