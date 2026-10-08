import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Current Gemini flash-lite model. gemini-2.0-flash-lite was retired by Google
// (caused the 502s) — 2.5-flash-lite is the current GA flash-lite model.
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const FUNCTION_VERSION = 16;

const DOCUMENT_PROMPTS: Record<string, string> = {
  "10th": `You are extracting data from an Indian 10th grade marksheet. Return ONLY a valid JSON object with exactly these keys: board (string e.g. CBSE/ICSE/State board name), year (number), percentage (number or null), cgpa (number or null), subjects (array of {name: string, marks: string} or null). If a field is not visible return null. No explanation, no markdown fences, just the JSON object.`,
  "12th": `You are extracting data from an Indian 12th grade marksheet. Return ONLY a valid JSON object with exactly these keys: board (string), year (number), percentage (number or null), cgpa (number or null), stream (string: exactly one of Science/Commerce/Arts or null), subjects (array of {name: string, marks: string} or null). If a field is not visible return null. No explanation, no markdown fences, just the JSON object.`,
  "graduation": `You are extracting data from an Indian graduation marksheet or transcript. Return ONLY a valid JSON object with exactly these keys: university (string), degree (string e.g. B.Tech/B.Com/B.A), branch (string e.g. Computer Science), year_of_passing (number or null), cgpa (number or null), percentage (number or null). If a field is not visible return null. No explanation, no markdown fences, just the JSON object.`,
  "scorecard": `You are extracting data from an Indian MBA entrance exam scorecard (CAT/XAT/GMAT/GRE/SNAP/NMAT etc). Return ONLY a valid JSON object with exactly these keys: exam (string, uppercase), year (number or null), total_score (number or null), percentile (number or null), section_scores (object with section names as keys and scores as values, or null). If a field is not visible return null. No explanation, no markdown fences, just the JSON object.`
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// The Gemini key is read ONLY from the GEMINI_API_KEY secret. There is no
// hardcoded fallback — a missing secret must fail loudly, never silently fall
// back to a key committed in source.
function getGeminiKey(): string | null {
  const envKey = Deno.env.get("GEMINI_API_KEY");
  return envKey && envKey.trim() ? envKey.trim() : null;
}

Deno.serve(async (req: Request) => {
  const GEMINI_API_KEY = getGeminiKey();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (req.method === "OPTIONS") return cors(null, 204);
  // Public, non-sensitive health check (never returns the key itself).
  if (req.method === "GET") return json({ gemini_key_set: !!GEMINI_API_KEY, key_source: "env", model: GEMINI_MODEL, function_version: FUNCTION_VERSION });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 500);

  // Require a valid user JWT. Reject anonymous / invalid-token requests.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Unauthorized: missing bearer token" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let studentId: string | null = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    if (error || !user) return json({ error: "Unauthorized: invalid token" }, 401);
    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single();
    studentId = student?.id ?? null;
  } catch {
    return json({ error: "Unauthorized: token verification failed" }, 401);
  }

  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return json({ error: "Invalid multipart form data" }, 400); }

  const file = formData.get("file") as File | null;
  const documentType = formData.get("document_type") as string | null;

  if (!file || !documentType) return json({ error: "Missing file or document_type" }, 400);
  if (!DOCUMENT_PROMPTS[documentType]) return json({ error: `Invalid document_type` }, 400);
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return json({ error: `Unsupported file type: ${file.type}` }, 400);
  if (file.size > 5 * 1024 * 1024) return json({ error: "File exceeds 5MB" }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const base64 = toBase64(new Uint8Array(arrayBuffer));

  const storagePath = `ocr-documents/${studentId ?? "anon"}/${documentType}/${Date.now()}-${file.name}`;
  try { await supabase.storage.from("ocr-documents").upload(storagePath, file, { contentType: file.type, upsert: false }); } catch { }

  const geminiBody = {
    contents: [{ parts: [
      { inline_data: { mime_type: file.type, data: base64 } },
      { text: DOCUMENT_PROMPTS[documentType] }
    ]}],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
  };

  const startMs = Date.now();
  let geminiRes: Response;
  try {
    geminiRes = await fetch(GEMINI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiBody) });
  } catch (e) {
    return json({ error: "Failed to reach Gemini API", detail: (e as Error).message }, 502);
  }

  const processingMs = Date.now() - startMs;

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return json({ error: "Gemini API error", detail: errText, status: geminiRes.status, model: GEMINI_MODEL }, 502);
  }

  const geminiData = await geminiRes.json();
  const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!rawText) return json({ error: "Gemini returned empty response", raw: geminiData }, 422);

  const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  let extracted: Record<string, unknown>;
  try { extracted = JSON.parse(cleaned); }
  catch { return json({ error: "Failed to parse Gemini response", raw: rawText }, 422); }

  supabase.from("ocr_training_data").insert({
    student_id: studentId, document_type: documentType, storage_path: storagePath,
    file_mime_type: file.type, gemini_raw_response: rawText, extracted_data: extracted,
    model_version: GEMINI_MODEL, processing_ms: processingMs,
  }).then(({ error }) => { if (error) console.error("[ocr-extract] Training log failed:", error.message); });

  return json({ ok: true, document_type: documentType, extracted, processing_ms: processingMs });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
function cors(body: string | null, status: number): Response {
  return new Response(body, { status, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type" } });
}
