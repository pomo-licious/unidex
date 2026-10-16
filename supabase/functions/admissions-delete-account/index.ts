import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "unidex-admissions-private";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST is required." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Account deletion is not configured. Contact support." }, 503);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Sign in again before deleting your account." }, 401);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Your session has expired. Sign in again before deleting your account." }, 401);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Type DELETE to confirm account deletion." }, 400); }
  if (body?.confirmation !== "DELETE") return json({ error: "Type DELETE to confirm account deletion." }, 400);
  const userId = auth.user.id;
  let accountDeleted = false;

  async function removePrivateFiles() {
    const folders = [userId];
    const files: string[] = [];
    const visited = new Set<string>();
    while (folders.length) {
      const folder = folders.pop()!;
      if (visited.has(folder)) continue;
      visited.add(folder);
      if (visited.size > 5000 || files.length > 20000) throw new Error("Your document library needs support-assisted cleanup. Account deletion has not completed.");
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await db.storage.from(BUCKET).list(folder, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
        if (error) throw new Error("Could not list your private documents. Please retry account deletion.");
        for (const item of data || []) {
          if (!item.name || item.name.includes("/") || item.name.includes("\\") || item.name === "." || item.name === "..") throw new Error("A document path needs support-assisted cleanup. Account deletion has not completed.");
          const path = `${folder}/${item.name}`;
          if (!path.startsWith(`${userId}/`)) throw new Error("Document cleanup ownership check failed.");
          if (item.id) files.push(path);
          else folders.push(path);
        }
        if (!data || data.length < 100) break;
      }
    }
    for (let index = 0; index < files.length; index += 100) {
      const { error } = await db.storage.from(BUCKET).remove(files.slice(index, index + 100));
      if (error) throw new Error("Some private files could not be removed. Please retry account deletion.");
    }
  }

  try {
    // Include orphaned uploads by listing the entire owned prefix, not just metadata.
    await removePrivateFiles();
    const { error: metadataError } = await db.from("student_admissions_documents").delete().eq("user_id", userId);
    if (metadataError) throw new Error("Your files were removed, but document records could not be cleared. Retry account deletion.");

    // The existing function owns the legacy-storage and auth-user deletion workflow.
    // Forward only this authenticated account's bearer token, never an arbitrary ID.
    const { error: legacyError } = await db.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: "DELETE" },
    });
    // Independently verify deletion; a success-looking legacy payload is insufficient.
    const { data: remaining, error: verifyError } = await db.auth.admin.getUserById(userId);
    accountDeleted = !remaining?.user && (verifyError?.status === 404 || verifyError?.code === "user_not_found");
    if (!accountDeleted) {
      if (legacyError) throw new Error("Private documents were removed, but account deletion did not complete. Retry or contact support.");
      throw new Error("Account deletion could not be verified. Your account may still exist; retry or contact support.");
    }
    // Catch any upload completed concurrently before auth deletion revoked the user.
    await removePrivateFiles();
    return json({ ok: true });
  } catch (error) {
    const message = accountDeleted
      ? "Your account was deleted, but private document cleanup could not be verified. Contact support to finish file cleanup."
      : error instanceof Error ? error.message : "Account deletion did not complete. Retry or contact support.";
    return json({ ok: false, error: message, account_deleted: accountDeleted }, 502);
  }
});
