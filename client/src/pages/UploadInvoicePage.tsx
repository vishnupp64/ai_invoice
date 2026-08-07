import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { api } from "../lib/api";
import type { ExtractionResponse, ExtractedInvoice } from "../types/invoice";
import InvoiceForm, { InvoiceFormValues } from "../components/invoice/InvoiceForm";
import { useNavigate } from "react-router-dom";

const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"]
};

export default function UploadInvoicePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setExtraction(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxFiles: 1,
    onDrop
  });

  const fileKind = useMemo(() => {
    if (!file) return null;
    if (file.type === "application/pdf") return "pdf";
    return "image";
  }, [file]);

  async function extract() {
    if (!file) return;
    setExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<ExtractionResponse>("/invoices/extract", form);
      if (res.data.duplicate_invoice_id) {
        toast("Duplicate invoice detected. Opening the existing invoice.");
        navigate(`/invoices/${res.data.duplicate_invoice_id}`);
        return;
      }
      setExtraction(res.data);
      toast.success("Extraction completed");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Extraction failed";
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  }

  async function save(values: InvoiceFormValues) {
    if (!extraction) return;
    setSaving(true);
    try {
      const res = await api.post<{ id: string }>("/invoices", {
        ...values,
        original_file: extraction.original_file,
        source_hash: extraction.source_hash,
        ai_confidence: extraction.confidence
      });
      toast.success("Saved");
      navigate(`/invoices/${res.data.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Upload Invoice</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Drag-and-drop an invoice image or PDF and let Gemini extract the fields
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div
            {...getRootProps()}
            className={[
              "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center",
              isDragActive
                ? "border-indigo-500 bg-indigo-50 dark:bg-slate-950"
                : "border-slate-300 dark:border-slate-700"
            ].join(" ")}
          >
            <input {...getInputProps()} />
            <div className="text-sm">
              {file ? (
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">
                    Click to replace or drop another file
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium">Drop your invoice here</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">
                    JPG, PNG, JPEG, or PDF
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button disabled={!file || extracting} onClick={extract}>
              {extracting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size={16} />
                  Extracting...
                </span>
              ) : (
                "Extract with AI"
              )}
            </Button>
          </div>

          {previewUrl ? (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Preview</div>
              {fileKind === "pdf" ? (
                <iframe className="h-[520px] w-full rounded-md" src={previewUrl} />
              ) : (
                <img className="max-h-[520px] w-full rounded-md object-contain" src={previewUrl} />
              )}
            </div>
          ) : null}
        </Card>

        <div>
          {extraction ? (
            <InvoiceForm
              initial={extraction.data as ExtractedInvoice}
              confidence={extraction.confidence}
              onSubmit={save}
              submitting={saving}
              submitLabel="Save invoice"
            />
          ) : (
            <Card>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                After extraction, the editable form appears here.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

