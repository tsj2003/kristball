import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config/env";
import { HttpError } from "../lib/http";
import { authenticateToken } from "../middleware/auth";
import { writeAudit } from "../services/audit";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      include: { base: true },
    });
    if (!user) {
      throw new HttpError(401, "Invalid username or password");
    }
    const matches = await bcrypt.compare(password.trim(), user.passwordHash);
    if (!matches) {
      throw new HttpError(401, "Invalid username or password");
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, baseId: user.baseId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
    );

    await writeAudit(prisma, {
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      details: { username: user.username },
    });

    res.json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { base: true },
    });
    if (!user) {
      throw new HttpError(401, "Account no longer exists");
    }
    res.json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
});

function serializeUser(user: {
  id: string;
  username: string;
  fullName: string;
  role: string;
  baseId: string | null;
  base: { id: string; name: string; code: string } | null;
}) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    baseId: user.baseId,
    base: user.base ? { id: user.base.id, name: user.base.name, code: user.base.code } : null,
  };
}
