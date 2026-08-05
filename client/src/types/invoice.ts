export type InvoiceItemInput = {
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  tax: number | null;
  amount: number | null;
};

export type ExtractedInvoice = {
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  shipping: number | null;
  total: number | null;
  payment_method: string | null;
  gst_number: string | null;
  customer_name: string | null;
  customer_address: string | null;
  vendor_address: string | null;
  items: InvoiceItemInput[];
};

export type ConfidenceMap = Record<string, number | null>;

export type ExtractionResponse = {
  original_file: string;
  source_hash: string | null;
  duplicate_invoice_id: string | null;
  data: ExtractedInvoice;
  confidence: ConfidenceMap | null;
};

export type InvoiceRow = {
  id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  currency: string | null;
  total: number | null;
  created_at: string;
};

