import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";
import { api } from "../lib/api";
import InvoiceForm, { InvoiceFormValues } from "../components/invoice/InvoiceForm";
import type { ExtractedInvoice } from "../types/invoice";

type InvoiceItem = {
  id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  tax: number | null;
  amount: number | null;
};

type Invoice = {
  id: string;
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
  ai_confidence: Record<string, number | null> | null;
  items: InvoiceItem[];
};

export default function EditInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<{ invoice: Invoice }>(`/invoices/${id}`);
      setInvoice(res.data.invoice);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.response?.data?.message ?? "Failed to load invoice"));
  }, [id]);

  async function save(values: InvoiceFormValues) {
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/invoices/${id}`, values);
      toast.success("Updated");
      navigate(`/invoices/${id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <div className="text-sm text-slate-600 dark:text-slate-300">Invoice not found.</div>
      </Card>
    );
  }

  const initial: ExtractedInvoice = {
    vendor_name: invoice.vendor_name,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    discount: invoice.discount,
    shipping: invoice.shipping,
    total: invoice.total,
    payment_method: invoice.payment_method,
    gst_number: invoice.gst_number,
    customer_name: invoice.customer_name,
    customer_address: invoice.customer_address,
    vendor_address: invoice.vendor_address,
    items: invoice.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      tax: i.tax,
      amount: i.amount
    }))
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Edit Invoice</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Update fields and line items
        </div>
      </div>
      <InvoiceForm
        initial={initial}
        confidence={invoice.ai_confidence}
        onSubmit={save}
        submitting={saving}
        submitLabel="Save changes"
      />
    </div>
  );
}

