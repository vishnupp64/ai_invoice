CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "vendorName" TEXT,
  "invoiceNumber" TEXT,
  "invoiceDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "currency" TEXT,
  "subtotal" NUMERIC(12,2),
  "tax" NUMERIC(12,2),
  "discount" NUMERIC(12,2),
  "shipping" NUMERIC(12,2),
  "total" NUMERIC(12,2),
  "paymentMethod" TEXT,
  "gstNumber" TEXT,
  "customerName" TEXT,
  "customerAddress" TEXT,
  "vendorAddress" TEXT,
  "originalFile" TEXT NOT NULL,
  "sourceHash" TEXT,
  "aiConfidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoices_userId_vendorName_idx" ON "invoices"("userId", "vendorName");
CREATE INDEX "invoices_userId_invoiceDate_idx" ON "invoices"("userId", "invoiceDate");
CREATE UNIQUE INDEX "invoices_userId_sourceHash_key" ON "invoices"("userId", "sourceHash");

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "invoice_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL,
  "description" TEXT,
  "quantity" NUMERIC(12,2),
  "unitPrice" NUMERIC(12,2),
  "tax" NUMERIC(12,2),
  "amount" NUMERIC(12,2),
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

ALTER TABLE "invoice_items"
ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

