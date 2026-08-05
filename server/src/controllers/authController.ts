import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/httpError";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function register(req: Request, res: Response) {
  const body = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new HttpError(409, "Email already registered");

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash }
  });

  const token = signAccessToken(user.id);
  res.json({ token });
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw new HttpError(401, "Invalid email or password");

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid email or password");

  const token = signAccessToken(user.id);
  res.json({ token });
}

