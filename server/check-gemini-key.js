const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Usage: node check-gemini-key.js <your-api-key>");
  process.exit(1);
}

const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.0-pro-exp-02-05",
  "gemini-2.0-pro"
];

const body = {
  contents: [{ parts: [{ text: "Reply with just the word OK." }] }],
  generationConfig: { temperature: 0, maxOutputTokens: 8 }
};

console.log("Testing GEMINI_API_KEY format:");
console.log("  Length    :", API_KEY.length);
console.log("  Prefix    :", API_KEY.slice(0, Math.min(8, API_KEY.length)) + "...");
console.log();

(async () => {
  for (const model of MODELS_TO_TRY) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
      encodeURIComponent(API_KEY);
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const ms = Date.now() - start;
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      if (res.ok) {
        const reply =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ??
          JSON.stringify(data).slice(0, 200);
        console.log(`  ✅ ${model} — OK (${ms}ms) → ${JSON.stringify(reply)}`);
      } else {
        const code = data?.error?.code;
        const status = data?.error?.status;
        const message = (data?.error?.message || "").split("\n")[0].slice(0, 80);
        console.log(`  ❌ ${model} — ${code} ${status}  "${message}"`);
        if (code === 401 || status === "UNAUTHENTICATED" || status === "PERMISSION_DENIED") {
          console.log();
          console.log("Key rejected by Google. Not testing further models.");
          process.exit(1);
        }
      }
    } catch (err) {
      console.log(`  ⚠️  ${model} — network error: ${err?.message || err}`);
    }
  }
})();
