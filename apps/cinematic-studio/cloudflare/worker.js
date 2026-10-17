const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function hasValidToken(request, env) {
  const expected = env.KALP_API_TOKEN;
  const supplied = request.headers.get("authorization") || "";
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

function safeId(value) {
  return typeof value === "string" &&
    value.length > 0 && value.length <= 120 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value);
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const raw = await request.text();
  if (raw.length > 256_000) throw new Error("Request body exceeds 256 KB");
  return JSON.parse(raw);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return response({ ok: true, service: "kalp-cinematic-studio-api", storage: "cloudflare-d1" });
    }

    // All data routes are closed unless a deployment secret has been configured.
    if (!hasValidToken(request, env)) return response({ error: "Unauthorized" }, 401);
    if (!env.KALP_CINEMATIC_DB) return response({ error: "D1 binding is not configured" }, 503);

    try {
      if (url.pathname === "/api/characters" && request.method === "GET") {
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
        const { results } = await env.KALP_CINEMATIC_DB.prepare(
          "SELECT character_id, display_name, status, current_version, created_at, updated_at FROM character_profiles ORDER BY updated_at DESC LIMIT ?"
        ).bind(limit).all();
        return response({ items: results });
      }

      if (url.pathname === "/api/characters" && request.method === "POST") {
        const body = await readJson(request);
        const id = body.character_id;
        const name = body.display_name;
        const profile = body.profile;
        if (!safeId(id) || typeof name !== "string" || !name.trim() || name.length > 200 ||
            !profile || typeof profile !== "object" || Array.isArray(profile)) {
          return response({ error: "Provide a valid character_id, display_name, and profile object" }, 400);
        }
        const profileJson = JSON.stringify(profile);
        await env.KALP_CINEMATIC_DB.batch([
          env.KALP_CINEMATIC_DB.prepare(
            "INSERT INTO character_profiles (character_id, display_name, profile_json, status, current_version) VALUES (?, ?, ?, 'draft', 1)"
          ).bind(id, name.trim(), profileJson),
          env.KALP_CINEMATIC_DB.prepare(
            "INSERT INTO character_profile_versions (character_id, version, profile_json, change_note) VALUES (?, 1, ?, 'Initial profile')"
          ).bind(id, profileJson)
        ]);
        return response({ ok: true, character_id: id, version: 1 }, 201);
      }

      const characterMatch = url.pathname.match(/^\/api\/characters\/([^/]+)$/);
      if (characterMatch && request.method === "GET") {
        const id = decodeURIComponent(characterMatch[1]);
        const profile = await env.KALP_CINEMATIC_DB.prepare(
          "SELECT character_id, display_name, profile_json, status, current_version, created_at, updated_at FROM character_profiles WHERE character_id = ?"
        ).bind(id).first();
        if (!profile) return response({ error: "Character not found" }, 404);
        const versions = await env.KALP_CINEMATIC_DB.prepare(
          "SELECT version, change_note, created_at FROM character_profile_versions WHERE character_id = ? ORDER BY version DESC"
        ).bind(id).all();
        const references = await env.KALP_CINEMATIC_DB.prepare(
          "SELECT reference_id, url, title, source_type, notes, verified, created_at FROM research_references WHERE character_id = ? ORDER BY created_at DESC"
        ).bind(id).all();
        const approvals = await env.KALP_CINEMATIC_DB.prepare(
          "SELECT approval_id, version, decision, reviewer, notes, created_at FROM character_approvals WHERE character_id = ? ORDER BY created_at DESC"
        ).bind(id).all();
        return response({
          ...profile,
          profile: JSON.parse(profile.profile_json),
          versions: versions.results,
          research_references: references.results,
          approvals: approvals.results
        });
      }

      const referenceMatch = url.pathname.match(/^\/api\/characters\/([^/]+)\/references$/);
      if (referenceMatch && request.method === "POST") {
        const id = decodeURIComponent(referenceMatch[1]);
        const body = await readJson(request);
        if (!safeId(body.reference_id) || typeof body.url !== "string" ||
            !/^https?:\/\//i.test(body.url) || body.url.length > 2048) {
          return response({ error: "Provide a valid reference_id and http(s) URL" }, 400);
        }
        const exists = await env.KALP_CINEMATIC_DB.prepare(
          "SELECT character_id FROM character_profiles WHERE character_id = ?"
        ).bind(id).first();
        if (!exists) return response({ error: "Character not found" }, 404);
        await env.KALP_CINEMATIC_DB.prepare(
          "INSERT INTO research_references (reference_id, character_id, url, title, source_type, notes, verified) VALUES (?, ?, ?, ?, ?, ?, 0)"
        ).bind(body.reference_id, id, body.url, String(body.title || "").slice(0, 500),
          String(body.source_type || "web").slice(0, 50), String(body.notes || "").slice(0, 4000)).run();
        return response({ ok: true, reference_id: body.reference_id, verified: false }, 201);
      }

      const approvalMatch = url.pathname.match(/^\/api\/characters\/([^/]+)\/approvals$/);
      if (approvalMatch && request.method === "POST") {
        const id = decodeURIComponent(approvalMatch[1]);
        const body = await readJson(request);
        if (!safeId(body.approval_id) || !Number.isInteger(body.version) || body.version < 1 ||
            !["approved", "rejected", "changes_requested"].includes(body.decision) ||
            typeof body.reviewer !== "string" || !body.reviewer.trim()) {
          return response({ error: "Invalid approval payload" }, 400);
        }
        const result = await env.KALP_CINEMATIC_DB.prepare(
          "INSERT INTO character_approvals (approval_id, character_id, version, decision, reviewer, notes) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(body.approval_id, id, body.version, body.decision, body.reviewer.trim().slice(0, 200),
          String(body.notes || "").slice(0, 4000)).run();
        await env.KALP_CINEMATIC_DB.prepare(
          "UPDATE character_profiles SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE character_id = ?"
        ).bind(body.decision === "approved" ? "approved" :
          body.decision === "rejected" ? "draft" : "pending_approval", id).run();
        return response({ ok: true, decision: body.decision, meta: result.meta }, 201);
      }

      return response({ error: "Not found" }, 404);
    } catch (error) {
      if (error instanceof SyntaxError) return response({ error: "Invalid JSON" }, 400);
      if (error instanceof Error && error.message === "Content-Type must be application/json") {
        return response({ error: error.message }, 415);
      }
      if (error instanceof Error && error.message === "Request body exceeds 256 KB") {
        return response({ error: error.message }, 413);
      }
      // Avoid leaking SQL details or secret configuration to clients.
      return response({ error: "Request could not be completed" }, 500);
    }
  }
};
