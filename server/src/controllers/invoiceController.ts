import type { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/httpError";
import { extractInvoiceFromFile } from "../services/geminiService";
import { sha256 } from "../utils/fileHash";
import { decimalToNumber } from "../utils/decimal";
import { parseIsoDate, toIsoDate } from "../utils/date";
import { toCsv } from "../utils/csv";

// Query params arrive as strings; treat empty strings as "not provided".
const optionalQueryNumber = (min?: number, max?: number) => {
  let schema: z.ZodNumber = z.coerce.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    schema.optional()
  );
};

const itemSchema = z.object({
  description: z.string().nullable(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  tax: z.number().nullable(),
  amount: z.number().nullable()
});

const invoiceBodySchema = z.object({
  vendor_name: z.string().nullable(),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(),
  due_date: z.string().nullable(),
  currency: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  discount: z.number().nullable(),
  shipping: z.number().nullable(),
  total: z.number().nullable(),
  payment_method: z.string().nullable(),
  gst_number: z.string().nullable(),
  customer_name: z.string().nullable(),
  customer_address: z.string().nullable(),
  vendor_address: z.string().nullable(),
  items: z.array(itemSchema),
  original_file: z.string().optional(),
  source_hash: z.string().nullable().optional(),
  ai_confidence: z
    .record(
      z
        .object({
          value: z.any().nullable(),
          confidence: z.number().nullable()
        })
        .nullable()
    )
    .nullable()
    .optional()
});

export async function extract(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const file = req.file;
  if (!file) throw new HttpError(400, "File is required");

  const buffer = await fs.readFile(file.path);
  const sourceHash = sha256(buffer);

  const duplicate = await prisma.invoice.findFirst({
    where: { userId, sourceHash },
    select: { id: true }
  });

  const extracted = await extractInvoiceFromFile({ filePath: file.path, mimeType: file.mimetype });

  const relativePath = path
    .relative(process.cwd(), file.path)
    .split(path.sep)
    .join("/");

  res.json({
    original_file: relativePath,
    source_hash: sourceHash,
    duplicate_invoice_id: duplicate?.id ?? null,
    data: extracted.data,
    confidence: extracted.confidence
  });
}

export async function create(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const body = invoiceBodySchema.parse(req.body);
  const originalFile = body.original_file;
  if (!originalFile) throw new HttpError(400, "original_file is required");

  if (body.source_hash) {
    const existing = await prisma.invoice.findFirst({
      where: { userId, sourceHash: body.source_hash },
      select: { id: true }
    });
    if (existing) throw new HttpError(409, "Duplicate invoice. This file has already been saved.");
  }

  const invoice = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.invoice.create({
      data: {
        userId,
        vendorName: body.vendor_name,
        invoiceNumber: body.invoice_number,
        invoiceDate: parseIsoDate(body.invoice_date),
        dueDate: parseIsoDate(body.due_date),
        currency: body.currency,
        subtotal: body.subtotal,
        tax: body.tax,
        discount: body.discount,
        shipping: body.shipping,
        total: body.total,
        paymentMethod: body.payment_method,
        gstNumber: body.gst_number,
        customerName: body.customer_name,
        customerAddress: body.customer_address,
        vendorAddress: body.vendor_address,
        originalFile,
        sourceHash: body.source_hash ?? null,
        aiConfidence: body.ai_confidence ?? undefined,
        items: {
          create: body.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unit_price,
            tax: it.tax,
            amount: it.amount
          }))
        }
      },
      select: { id: true }
    });
    return created;
  });

  res.json({ id: invoice.id });
}

export async function list(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const querySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(),
    vendor: z.string().optional(),
    month: optionalQueryNumber(1, 12),
    year: optionalQueryNumber(2000, 2100),
    minAmount: optionalQueryNumber(),
    maxAmount: optionalQueryNumber()
  });

  const q = querySchema.parse(req.query);

  const where: Prisma.InvoiceWhereInput = { userId };
  if (q.vendor) where.vendorName = { contains: q.vendor, mode: "insensitive" };
  if (q.search) {
    where.OR = [
      { vendorName: { contains: q.search, mode: "insensitive" } },
      { invoiceNumber: { contains: q.search, mode: "insensitive" } },
      { customerName: { contains: q.search, mode: "insensitive" } }
    ];
  }
  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    where.total = {
      ...(q.minAmount !== undefined ? { gte: q.minAmount } : {}),
      ...(q.maxAmount !== undefined ? { lte: q.maxAmount } : {})
    };
  }
  if (q.year || q.month) {
    const year = q.year ?? new Date().getFullYear();
    const month = q.month;
    const start = new Date(Date.UTC(year, (month ? month - 1 : 0), 1));
    const end = month
      ? new Date(Date.UTC(year, month, 1))
      : new Date(Date.UTC(year + 1, 0, 1));
    where.invoiceDate = { gte: start, lt: end };
  }

  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        vendorName: true,
        invoiceNumber: true,
        invoiceDate: true,
        currency: true,
        total: true,
        createdAt: true
      }
    })
  ]);

  res.json({
    total,
    rows: rows.map((r) => ({
      id: r.id,
      vendor_name: r.vendorName,
      invoice_number: r.invoiceNumber,
      invoice_date: toIsoDate(r.invoiceDate),
      currency: r.currency,
      total: decimalToNumber(r.total),
      created_at: r.createdAt.toISOString()
    }))
  });
}

export async function getOne(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const id = req.params.id;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { items: true }
  });
  if (!invoice) throw new HttpError(404, "Invoice not found");

  res.json({
    invoice: {
      id: invoice.id,
      vendor_name: invoice.vendorName,
      invoice_number: invoice.invoiceNumber,
      invoice_date: toIsoDate(invoice.invoiceDate),
      due_date: toIsoDate(invoice.dueDate),
      currency: invoice.currency,
      subtotal: decimalToNumber(invoice.subtotal),
      tax: decimalToNumber(invoice.tax),
      discount: decimalToNumber(invoice.discount),
      shipping: decimalToNumber(invoice.shipping),
      total: decimalToNumber(invoice.total),
      payment_method: invoice.paymentMethod,
      gst_number: invoice.gstNumber,
      customer_name: invoice.customerName,
      customer_address: invoice.customerAddress,
      vendor_address: invoice.vendorAddress,
      original_file: invoice.originalFile,
      ai_confidence: invoice.aiConfidence ?? null,
      created_at: invoice.createdAt.toISOString(),
      items: invoice.items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: decimalToNumber(it.quantity),
        unit_price: decimalToNumber(it.unitPrice),
        tax: decimalToNumber(it.tax),
        amount: decimalToNumber(it.amount)
      }))
    }
  });
}

export async function update(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const id = req.params.id;
  const body = invoiceBodySchema
    .omit({ original_file: true, source_hash: true, ai_confidence: true })
    .parse(req.body);

  const existing = await prisma.invoice.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Invoice not found");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({
      where: { id },
      data: {
        vendorName: body.vendor_name,
        invoiceNumber: body.invoice_number,
        invoiceDate: parseIsoDate(body.invoice_date),
        dueDate: parseIsoDate(body.due_date),
        currency: body.currency,
        subtotal: body.subtotal,
        tax: body.tax,
        discount: body.discount,
        shipping: body.shipping,
        total: body.total,
        paymentMethod: body.payment_method,
        gstNumber: body.gst_number,
        customerName: body.customer_name,
        customerAddress: body.customer_address,
        vendorAddress: body.vendor_address,
        items: {
          create: body.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unit_price,
            tax: it.tax,
            amount: it.amount
          }))
        }
      }
    });
  });

  res.json({ ok: true });
}

export async function remove(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const id = req.params.id;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    select: { id: true, originalFile: true }
  });
  if (!invoice) throw new HttpError(404, "Invoice not found");

  await prisma.invoice.delete({ where: { id } });

  const filePath = path.join(process.cwd(), invoice.originalFile);
  await fs.unlink(filePath).catch(() => undefined);

  res.json({ ok: true });
}

async function getOriginalFile(userId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    select: { originalFile: true }
  });
  if (!invoice) throw new HttpError(404, "Invoice not found");
  return path.join(process.cwd(), invoice.originalFile);
}

export async function view(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const abs = await getOriginalFile(userId, req.params.id);
  res.setHeader("Content-Disposition", 'inline');
  res.sendFile(abs);
}

export async function download(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const abs = await getOriginalFile(userId, req.params.id);
  res.download(abs);
}

export async function exportCsv(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const q = z
    .object({
      search: z.string().optional(),
      vendor: z.string().optional()
    })
    .parse(req.query);

  const where: Prisma.InvoiceWhereInput = { userId };
  if (q.vendor) where.vendorName = { contains: q.vendor, mode: "insensitive" };
  if (q.search) {
    where.OR = [
      { vendorName: { contains: q.search, mode: "insensitive" } },
      { invoiceNumber: { contains: q.search, mode: "insensitive" } }
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      vendorName: true,
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      currency: true,
      subtotal: true,
      tax: true,
      discount: true,
      shipping: true,
      total: true,
      paymentMethod: true,
      gstNumber: true,
      customerName: true,
      customerAddress: true,
      vendorAddress: true,
      originalFile: true,
      createdAt: true
    }
  });

  const headers = [
    "id",
    "vendor_name",
    "invoice_number",
    "invoice_date",
    "due_date",
    "currency",
    "subtotal",
    "tax",
    "discount",
    "shipping",
    "total",
    "payment_method",
    "gst_number",
    "customer_name",
    "customer_address",
    "vendor_address",
    "original_file",
    "created_at"
  ];

  const csv = toCsv(
    headers,
    invoices.map((i) => ({
      id: i.id,
      vendor_name: i.vendorName,
      invoice_number: i.invoiceNumber,
      invoice_date: toIsoDate(i.invoiceDate),
      due_date: toIsoDate(i.dueDate),
      currency: i.currency,
      subtotal: decimalToNumber(i.subtotal),
      tax: decimalToNumber(i.tax),
      discount: decimalToNumber(i.discount),
      shipping: decimalToNumber(i.shipping),
      total: decimalToNumber(i.total),
      payment_method: i.paymentMethod,
      gst_number: i.gstNumber,
      customer_name: i.customerName,
      customer_address: i.customerAddress,
      vendor_address: i.vendorAddress,
      original_file: i.originalFile,
      created_at: i.createdAt.toISOString()
    }))
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="invoices.csv"`);
  res.send(csv);
}

export async function statsSummary(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const [count, sum, currencies] = await Promise.all([
    prisma.invoice.count({ where: { userId } }),
    prisma.invoice.aggregate({ where: { userId }, _sum: { total: true } }),
    prisma.invoice.findMany({
      where: { userId },
      distinct: ["currency"],
      select: { currency: true }
    })
  ]);

  const distinctCurrencies = currencies.map((c) => c.currency).filter(Boolean) as string[];

  res.json({
    total_invoices: count,
    total_expenses: decimalToNumber(sum._sum.total ?? null) ?? 0,
    currency: distinctCurrencies.length === 1 ? distinctCurrencies[0] : null
  });
}

export async function statsMonthly(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Unauthorized");

  const year = optionalQueryNumber(2000, 2100).parse(req.query.year);
  const y = year ?? new Date().getFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y + 1, 0, 1));

  const rows = await prisma.invoice.findMany({
    where: { userId, invoiceDate: { gte: start, lt: end } },
    select: { invoiceDate: true, total: true }
  });

  const byMonth = new Map<string, number>();
  for (const r of rows) {
    if (!r.invoiceDate) continue;
    const m = `${r.invoiceDate.getUTCFullYear()}-${String(r.invoiceDate.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const prev = byMonth.get(m) ?? 0;
    byMonth.set(m, prev + (decimalToNumber(r.total) ?? 0));
  }

  const points = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  res.json({ points });
}
