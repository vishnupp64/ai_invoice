import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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

export async function extractInvoiceFromFile(params: {
  filePath: string;
  mimeType: string;
}): Promise<ExtractionResult> {
  const buffer = await fs.readFile(params.filePath);
  const base64 = buffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt() },
          { inlineData: { data: base64, mimeType: params.mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0
    }
  });

  const jsonText = extractJson(response.text ?? "");
  const data = JSON.parse(jsonText) as ExtractedInvoice;

  const confidenceRes = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: buildConfidencePrompt() },
          { inlineData: { data: base64, mimeType: params.mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0
    }
  });

  const confidenceJson = extractJson(confidenceRes.text ?? "");
  const confidence = JSON.parse(confidenceJson) as Record<string, number | null>;

  return { data, confidence };
}
