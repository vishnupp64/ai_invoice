import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/httpError";

export async function getMe(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true }
  });
  if (!user) throw new HttpError(401, "Unauthorized");

  res.json({ user });
}

const updateSchema = z.object({
  name: z.string().min(2)
});

export async function updateMe(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");
  const body = updateSchema.parse(req.body);

  await prisma.user.update({ where: { id: userId }, data: { name: body.name } });
  res.json({ ok: true });
}

