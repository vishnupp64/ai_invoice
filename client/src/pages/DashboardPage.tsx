import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Pagination from "../components/ui/Pagination";
import Spinner from "../components/ui/Spinner";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import type { InvoiceRow } from "../types/invoice";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Summary = {
  total_invoices: number;
  total_expenses: number;
  currency: string | null;
};

type MonthlyPoint = { month: string; total: number };

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);

  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("");
  const [month, setMonth] = useState<number | "">("");
  const [year, setYear] = useState<number | "">("");
  const [minAmount, setMinAmount] = useState<number | "">("");
  const [maxAmount, setMaxAmount] = useState<number | "">("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const query = useMemo(() => {
    const q: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (search) q.search = search;
    if (vendor) q.vendor = vendor;
    if (month !== "") q.month = String(month);
    if (year !== "") q.year = String(year);
    if (minAmount !== "") q.minAmount = String(minAmount);
    if (maxAmount !== "") q.maxAmount = String(maxAmount);
    return q;
  }, [page, pageSize, search, vendor, month, year, minAmount, maxAmount]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [listRes, summaryRes, monthlyRes] = await Promise.all([
        api.get<{ rows: InvoiceRow[]; total: number }>("/invoices", { params: query }),
        api.get<Summary>("/invoices/stats/summary"),
        api.get<{ points: MonthlyPoint[] }>("/invoices/stats/monthly", { params: { year: year || "" } })
      ]);
      setRows(listRes.data.rows);
      setTotal(listRes.data.total);
      setSummary(summaryRes.data);
      setMonthly(monthlyRes.data.points);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll().catch((e) => toast.error(e?.response?.data?.message ?? "Failed to load dashboard"));
  }, [query, year]);

  async function deleteInvoice(id: string) {
    const ok = window.confirm("Delete this invoice?");
    if (!ok) return;
    await api.delete(`/invoices/${id}`);
    toast.success("Deleted");
    await fetchAll();
  }

  function downloadCsv() {
    const url = new URL(`${api.defaults.baseURL}/invoices/export/csv`);
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    window.open(url.toString(), "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Search, filter, and manage your invoices
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadCsv}>
            Export CSV
          </Button>
          <Link to="/upload">
            <Button>Upload</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-600 dark:text-slate-300">Total invoices</div>
          <div className="mt-1 text-2xl font-semibold">{summary?.total_invoices ?? "-"}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-600 dark:text-slate-300">Total expenses</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatMoney(summary?.currency, summary?.total_expenses ?? null)}
          </div>
        </Card>
        <Card className="flex items-center justify-center">
          {loading ? <Spinner /> : <div className="text-sm">Last updated: {new Date().toLocaleTimeString()}</div>}
        </Card>
      </div>

      <Card>
        <div className="mb-3 text-sm font-medium">Monthly expenses</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#6366f1" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-6">
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          <Input
            label="Month"
            inputMode="numeric"
            placeholder="1-12"
            value={month}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
          />
          <Input
            label="Year"
            inputMode="numeric"
            placeholder="2026"
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
          />
          <Input
            label="Min amount"
            inputMode="decimal"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : "")}
          />
          <Input
            label="Max amount"
            inputMode="decimal"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value ? Number(e.target.value) : "")}
          />
        </div>
        <div className="mt-3">
          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              setVendor("");
              setMonth("");
              setYear("");
              setMinAmount("");
              setMaxAmount("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size={28} />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Vendor</th>
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Total</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{r.vendor_name ?? "-"}</td>
                    <td className="py-2">{r.invoice_number ?? "-"}</td>
                    <td className="py-2">{formatDate(r.invoice_date)}</td>
                    <td className="py-2">{formatMoney(r.currency, r.total)}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/invoices/${r.id}`}>
                          <Button variant="secondary">View</Button>
                        </Link>
                        <Button variant="danger" onClick={() => deleteInvoice(r.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}

