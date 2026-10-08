import { createClient } from "jsr:@supabase/supabase-js@2";

// Inbound email webhook (Cloudflare Email Routing will POST here). Foundation only:
// capture + classify + store. No sending/forwarding. verify_jwt=false — this is a
// public webhook; it only writes via the service role and never reflects data back.
//
// Expected JSON body: { to, from, subject, text, html }

const STATUS_RULES: Array<{ status: string; re: RegExp }> = [
  { status: "offer",          re: /\b(offer of admission|admission offer|you have been admitted|provisional admission|congratulations[,!].*admit|welcome to the)\b/i },
  { status: "rejection",      re: /\b(regret to inform|not been selected|unfortunately|unsuccessful|we are unable to offer|application.*(declined|rejected))\b/i },
  { status: "interview_call", re: /\b(interview|gd\s*\/?\s*pi|personal interview|group discussion|shortlist(ed)?|called for|schedule your interview)\b/i },
  { status: "verification",   re: /\b(verify your email|email verification|confirm your (email|account)|activate your account|one[- ]time password|otp|verification (code|link))\b/i },
  { status: "acknowledgement",re: /\b(application received|we have received|thank you for applying|thanks for your application|successfully submitted|received your application)\b/i },
];

function extractAddress(raw: string): string {
  const s = (raw || "").toString().trim();
  const m = s.match(/<([^>]+)>/);        // "Name <addr@x>" -> addr@x
  return (m ? m[1] : s).toLowerCase().trim();
}

function classify(subject: string, body: string): string {
  const t = `${subject || ""}\n${body || ""}`;
  for (const { status, re } of STATUS_RULES) {
    if (re.test(t)) return status;
  }
  return "other";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); }
  catch { return json({ error: "invalid json body" }, 400); }

  const toAddr    = extractAddress(String(payload.to ?? ""));
  const fromAddr  = extractAddress(String(payload.from ?? ""));
  const subject   = String(payload.subject ?? "");
  const bodyText  = String(payload.text ?? "");
  const bodyHtml  = String(payload.html ?? "");

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Resolve alias -> student. Unknown alias: store nothing, 200 (never bounce).
  const { data: aliasRow } = await supa
    .from("email_aliases")
    .select("student_id, alias")
    .eq("alias", toAddr)
    .eq("active", true)
    .maybeSingle();

  if (!aliasRow) return json({ ok: true, matched_alias: false }, 200);

  // 2) Match the sender's domain to a college (null when no match).
  const senderDomain = fromAddr.includes("@") ? fromAddr.split("@")[1] : null;
  let matchedCollegeId: string | null = null;
  if (senderDomain) {
    const { data: college } = await supa
      .from("colleges")
      .select("id")
      .eq("domain", senderDomain)
      .limit(1)
      .maybeSingle();
    matchedCollegeId = college?.id ?? null;
  }

  // 3) Rule-based classification (no LLM yet).
  const parsedStatus = classify(subject, bodyText || bodyHtml);

  // 4) Store.
  const { error } = await supa.from("inbound_emails").insert({
    student_id:         aliasRow.student_id,
    alias:              toAddr,
    from_address:       fromAddr,
    subject,
    body_text:          bodyText,
    body_html:          bodyHtml,
    received_at:        new Date().toISOString(),
    parsed_status:      parsedStatus,
    matched_college_id: matchedCollegeId,
    raw:                payload,
  });

  if (error) return json({ error: "insert failed", detail: error.message }, 500);

  return json({ ok: true, matched_alias: true, parsed_status: parsedStatus, matched_college_id: matchedCollegeId }, 200);
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
