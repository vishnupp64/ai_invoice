import fs from "fs/promises";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

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
  items: Array<{
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
    tax: number | null;
    amount: number | null;
  }>;
};

export type ExtractionResult = {
  data: ExtractedInvoice;
  confidence: Record<string, number | null> | null;
};

function buildPrompt() {
  return `
You are an invoice/receipt parser. Extract fields from the provided file and return ONLY valid JSON.

Rules:
- Return JSON only. No markdown. No code fences. No extra keys outside the schema.
- If any field is unavailable, return null.
- Dates must be in ISO format: YYYY-MM-DD (no time).
- All numeric amounts must be numbers (not strings). If unknown, null.
- Items must be an array (empty if none).

Schema:
{
  "vendor_name": null,
  "invoice_number": null,
  "invoice_date": null,
  "due_date": null,
  "currency": null,
  "subtotal": null,
  "tax": null,
  "discount": null,
  "shipping": null,
  "total": null,
  "payment_method": null,
  "gst_number": null,
  "customer_name": null,
  "customer_address": null,
  "vendor_address": null,
  "items": [
    {
      "description": null,
      "quantity": null,
      "unit_price": null,
      "tax": null,
      "amount": null
    }
  ]
}
`.trim();
}

function buildConfidencePrompt() {
  return `
You are an invoice/receipt parser. For each field in the schema below, output a confidence score between 0 and 1.

Rules:
- Return JSON only. No markdown. No code fences.
- If the field is not present / cannot be determined, return null for that field.
- Only output keys from the schema. No extra keys.

Schema:
{
  "vendor_name": null,
  "invoice_number": null,
  "invoice_date": null,
  "due_date": null,
  "currency": null,
  "subtotal": null,
  "tax": null,
  "discount": null,
  "shipping": null,
  "total": null,
  "payment_method": null,
  "gst_number": null,
  "customer_name": null,
  "customer_address": null,
  "vendor_address": null,
  "items": null
}
`.trim();
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new HttpError(502, "Gemini returned an invalid response");
  }
  return text.slice(start, end + 1);
}

const GEMINI_MODEL = "gemini-flash-latest";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models`;

function mapGoogleError(err: any): HttpError {
  const code = err?.code ?? err?.response?.status ?? 0;
  const status = err?.status ?? err?.response?.data?.error?.status;
  const rawMessage =
    err?.message ??
    err?.response?.data?.error?.message ??
    "Failed to call Gemini API";

  if (status === "RESOURCE_EXHAUSTED" || code === 429) {
    return new HttpError(
      429,
      "AI rate limit or quota exceeded. Please wait a minute and try again, or check your billing in Google AI Studio."
    );
  }
  if (
    status === "UNAUTHENTICATED" ||
    status === "PERMISSION_DENIED" ||
    code === 401 ||
    code === 403
  ) {
    return new HttpError(
      401,
      "Gemini API key is invalid or has no access. Please check GEMINI_API_KEY in server/.env."
    );
  }
  if (code === 404 || String(rawMessage).includes("no longer available")) {
    return new HttpError(502, `AI model not available. ${rawMessage}`);
  }
  return new HttpError(502, `AI service error: ${rawMessage}`);
}

async function callGeminiREST(params: {
  prompt: string;
  base64: string;
  mimeType: string;
}): Promise<string> {
  const url = `${API_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: params.prompt },
          {
            inline_data: {
              mime_type: params.mimeType,
              data: params.base64
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0
    }
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err: any) {
    throw new HttpError(502, `Network error calling Gemini: ${err?.message || err}`);
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(502, "Gemini returned non-JSON response");
  }

  if (!res.ok) {
    const err = data?.error || {};
    throw mapGoogleError({
      code: err.code ?? res.status,
      status: err.status,
      message: err.message ?? text.slice(0, 300)
    });
  }

  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof reply !== "string") {
    throw new HttpError(502, "Gemini response missing text content");
  }
  return reply;
}

export async function extractInvoiceFromFile(params: {
  filePath: string;
  mimeType: string;
}): Promise<ExtractionResult> {
  const buffer = await fs.readFile(params.filePath);
  const base64 = buffer.toString("base64");

  let responseText: string;
  try {
    responseText = await callGeminiREST({
      prompt: buildPrompt(),
      base64,
      mimeType: params.mimeType
    });
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    throw mapGoogleError(err);
  }

  const jsonText = extractJson(responseText);
  let data: ExtractedInvoice;
  try {
    data = JSON.parse(jsonText) as ExtractedInvoice;
  } catch {
    throw new HttpError(502, "Gemini returned invalid JSON");
  }

  let confidenceText: string;
  try {
    confidenceText = await callGeminiREST({
      prompt: buildConfidencePrompt(),
      base64,
      mimeType: params.mimeType
    });
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    throw mapGoogleError(err);
  }

  const confidenceJson = extractJson(confidenceText);
  let confidence: Record<string, number | null> | null;
  try {
    confidence = JSON.parse(confidenceJson) as Record<string, number | null>;
  } catch {
    confidence = null;
  }

  return { data, confidence };
}
