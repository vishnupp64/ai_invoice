import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

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
  original_file: string;
  created_at: string;
  items: InvoiceItem[];
};

export default function InvoiceDetailsPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
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

  function downloadOriginal() {
    if (!invoice) return;
    window.open(`${api.defaults.baseURL}/invoices/${invoice.id}/download`, "_blank");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Invoice</h1>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {invoice.vendor_name ?? "-"} • {invoice.invoice_number ?? "-"}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadOriginal}>
            Download original
          </Button>
          <Link to={`/invoices/${invoice.id}/edit`}>
            <Button>Edit</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-slate-500">Invoice date</div>
            <div className="mt-1">{formatDate(invoice.invoice_date)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Due date</div>
            <div className="mt-1">{formatDate(invoice.due_date)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Total</div>
            <div className="mt-1 font-semibold">{formatMoney(invoice.currency, invoice.total)}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-slate-500">Customer</div>
            <div className="mt-1">{invoice.customer_name ?? "-"}</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {invoice.customer_address ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Vendor</div>
            <div className="mt-1">{invoice.vendor_name ?? "-"}</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {invoice.vendor_address ?? "-"}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-medium">Line items</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit</th>
                <th className="py-2">Tax</th>
                <th className="py-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2">{it.description ?? "-"}</td>
                  <td className="py-2">{it.quantity ?? "-"}</td>
                  <td className="py-2">{it.unit_price ?? "-"}</td>
                  <td className="py-2">{it.tax ?? "-"}</td>
                  <td className="py-2">{it.amount ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

