import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { HttpError } from "../utils/httpError";

function formatZodError(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Validation failed";
  const path = issue.path.join(".") || "input";
  return `${path}: ${issue.message}`;
}

function formatMulterError(err: multer.MulterError): string {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return `File too large. Maximum allowed is ${process.env.MAX_UPLOAD_MB ?? 12}MB`;
    case "LIMIT_FILE_COUNT":
      return "Too many files uploaded";
    case "LIMIT_UNEXPECTED_FILE":
      return `Unexpected field: ${err.field}`;
    case "LIMIT_PART_COUNT":
      return "Too many parts";
    case "LIMIT_FIELD_KEY":
    case "LIMIT_FIELD_VALUE":
    case "LIMIT_FIELD_COUNT":
      return "Form field limit exceeded";
    default:
      return `Upload error: ${err.message || err.code}`;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("[errorHandler]", err);

  if (err instanceof ZodError) {
    const message = formatZodError(err);
    res.status(400).json({ message });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message = formatMulterError(err);
    res.status(400).json({ message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let message = "Database error";
    if (err.code === "P2002") {
      message = "Duplicate entry. This record already exists.";
    } else if (err.meta && typeof err.meta.cause === "string") {
      message = err.meta.cause;
    }
    res.status(400).json({ message });
    return;
  }

  if (
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    res.status(400).json({ message: "Invalid database request" });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message || "Unexpected server error" });
    return;
  }

  res.status(500).json({ message: "Unexpected server error" });
}

