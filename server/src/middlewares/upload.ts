import path from "path";
import fs from "fs";
import multer from "multer";
import type { Request } from "express";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(originalname: string) {
  return originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const userId = (req as Request).userId;
    if (!userId) return cb(new HttpError(401, "Unauthorized"), "");
    const dest = path.join(process.cwd(), env.UPLOAD_DIR, userId);
    ensureDir(dest);
    cb(null, dest);
  },
  filename(_req, file, cb) {
    const fileName = `${Date.now()}_${safeName(file.originalname)}`;
    cb(null, fileName);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new HttpError(400, "Only JPG, PNG, or PDF files are allowed"));
      return;
    }
    cb(null, true);
  }
});

