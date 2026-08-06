import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Card from "../ui/Card";
import type { ConfidenceMap, ExtractedInvoice } from "../../types/invoice";

const numOrNull = z.preprocess(
  (v) => (typeof v === "number" && Number.isNaN(v) ? null : v),
  z.number().nullable()
);

const itemSchema = z.object({
  description: z.string().nullable(),
  quantity: numOrNull,
  unit_price: numOrNull,
  tax: numOrNull,
  amount: numOrNull
});

const invoiceSchema = z.object({
  vendor_name: z.string().nullable(),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(),
  due_date: z.string().nullable(),
  currency: z.string().nullable(),
  subtotal: numOrNull,
  tax: numOrNull,
  discount: numOrNull,
  shipping: numOrNull,
  total: numOrNull,
  payment_method: z.string().nullable(),
  gst_number: z.string().nullable(),
  customer_name: z.string().nullable(),
  customer_address: z.string().nullable(),
  vendor_address: z.string().nullable(),
  items: z.array(itemSchema)
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

function confidenceClass(confidence: number | null | undefined) {
  if (confidence === null || confidence === undefined) return "";
  if (confidence >= 0.85) return "border-emerald-500";
  if (confidence >= 0.6) return "border-amber-500";
  return "border-rose-500";
}

export default function InvoiceForm({
  initial,
  confidence,
  onSubmit,
  submitting,
  submitLabel
}: {
  initial: ExtractedInvoice;
  confidence: ConfidenceMap | null;
  onSubmit: (values: InvoiceFormValues) => void | Promise<void>;
  submitting?: boolean;
  submitLabel: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initial
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((v) => onSubmit(v))}>
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Vendor Name"
            {...register("vendor_name")}
            error={errors.vendor_name?.message}
            className={confidenceClass(confidence?.vendor_name)}
          />
          <Input
            label="Invoice Number"
            {...register("invoice_number")}
            error={errors.invoice_number?.message}
            className={confidenceClass(confidence?.invoice_number)}
          />
          <Input
            label="Currency"
            {...register("currency")}
            error={errors.currency?.message}
            className={confidenceClass(confidence?.currency)}
          />
          <Input
            label="Invoice Date"
            placeholder="YYYY-MM-DD"
            {...register("invoice_date")}
            error={errors.invoice_date?.message}
            className={confidenceClass(confidence?.invoice_date)}
          />
          <Input
            label="Due Date"
            placeholder="YYYY-MM-DD"
            {...register("due_date")}
            error={errors.due_date?.message}
            className={confidenceClass(confidence?.due_date)}
          />
          <Input
            label="Payment Method"
            {...register("payment_method")}
            error={errors.payment_method?.message}
            className={confidenceClass(confidence?.payment_method)}
          />
          <Input
            label="Subtotal"
            inputMode="decimal"
            {...register("subtotal", { valueAsNumber: true })}
            error={errors.subtotal?.message}
            className={confidenceClass(confidence?.subtotal)}
          />
          <Input
            label="Tax"
            inputMode="decimal"
            {...register("tax", { valueAsNumber: true })}
            error={errors.tax?.message}
            className={confidenceClass(confidence?.tax)}
          />
          <Input
            label="Discount"
            inputMode="decimal"
            {...register("discount", { valueAsNumber: true })}
            error={errors.discount?.message}
            className={confidenceClass(confidence?.discount)}
          />
          <Input
            label="Shipping"
            inputMode="decimal"
            {...register("shipping", { valueAsNumber: true })}
            error={errors.shipping?.message}
            className={confidenceClass(confidence?.shipping)}
          />
          <Input
            label="Grand Total"
            inputMode="decimal"
            {...register("total", { valueAsNumber: true })}
            error={errors.total?.message}
            className={confidenceClass(confidence?.total)}
          />
          <Input
            label="GST/VAT Number"
            {...register("gst_number")}
            error={errors.gst_number?.message}
            className={confidenceClass(confidence?.gst_number)}
          />
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Customer Name"
            {...register("customer_name")}
            error={errors.customer_name?.message}
            className={confidenceClass(confidence?.customer_name)}
          />
          <Input
            label="Customer Address"
            {...register("customer_address")}
            error={errors.customer_address?.message}
            className={confidenceClass(confidence?.customer_address)}
          />
          <Input
            label="Vendor Address"
            {...register("vendor_address")}
            error={errors.vendor_address?.message}
            className={confidenceClass(confidence?.vendor_address)}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Line items</div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              append({ description: null, quantity: null, unit_price: null, tax: null, amount: null })
            }
          >
            Add item
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2">Tax</th>
                <th className="py-2">Amount</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {fields.map((f, idx) => (
                <tr key={f.id}>
                  <td className="py-2 pr-2">
                    <input
                      className="w-72 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      {...register(`items.${idx}.description` as const)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      {...register(`items.${idx}.quantity` as const, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="w-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      {...register(`items.${idx}.unit_price` as const, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      {...register(`items.${idx}.tax` as const, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="w-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      {...register(`items.${idx}.amount` as const, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <Button type="button" variant="danger" onClick={() => remove(idx)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button disabled={submitting} type="submit">
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

