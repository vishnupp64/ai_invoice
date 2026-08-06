import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ override: true });

function trimQuotes(val: string | undefined): string | undefined {
  if (!val) return val;
  if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) {
    return val.slice(1, -1);
  }
  if (val.length >= 2 && val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1);
  }
  return val;
}

const GEMINI_HELP = `

╔══════════════════════════════════════════════════════════════════════════════╗
║                  MISSING OR INVALID GEMINI_API_KEY                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  GEMINI_API_KEY is empty or too short. Get a key here:                       ║
║                                                                              ║
║    1. Go to  https://aistudio.google.com/apikey                             ║
║    2. Sign in with your Google account                                      ║
║    3. Click "Create API key" → select or create a project                   ║
║    4. Copy the key (may start with AIza..., AQ..., or gen-lang-client-...)  ║
║    5. Paste it into server/.env as:                                         ║
║           GEMINI_API_KEY=AIzaSy...your-key-here...                          ║
║                                                                              ║
║  No quotes around the value. Restart server after editing.                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

`;

const MIN_KEY_LEN = 20;

const geminiKeySchema = z
  .string()
  .min(MIN_KEY_LEN, GEMINI_HELP)
  .transform((v) => trimQuotes(v) ?? v)
  .refine((v) => v.length >= MIN_KEY_LEN, { message: GEMINI_HELP });

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).transform((v) => trimQuotes(v) ?? v),
  JWT_SECRET: z.string().min(16).transform((v) => trimQuotes(v) ?? v),
  GEMINI_API_KEY: geminiKeySchema,
  UPLOAD_DIR: z.string().default("uploads").transform((v) => trimQuotes(v) ?? v),
  MAX_UPLOAD_MB: z.coerce.number().default(12)
});

export type Env = z.infer<typeof schema>;

let parsedEnv: Env;
try {
  parsedEnv = schema.parse(process.env);
} catch (err: any) {
  const issues = err?.issues ?? [];
  for (const issue of issues) {
    if (issue?.path?.includes("GEMINI_API_KEY")) {
      console.error(issue.message);
    } else {
      console.error(`[ENV] ${issue?.path?.join(".") || "env"}: ${issue?.message ?? err}`);
    }
  }
  process.exit(1);
}

export const env: Env = parsedEnv;

