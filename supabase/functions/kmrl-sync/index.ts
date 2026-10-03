import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(supabaseUrl, serviceRoleKey);

const headers = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, POST, OPTIONS",
  "access-control-allow-headers": "authorization, apikey, content-type, if-match, idempotency-key",
  "access-control-max-age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

async function authenticate(req: Request): Promise<string | undefined> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return undefined;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return undefined;
  return data.user.id;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const userId = await authenticate(req);
  if (!userId) return json({ error: "UNAUTHORIZED" }, 401);

  const url = new URL(req.url);
  const match = url.pathname.match(/\/v1\/experiments\/([^/]+)(?:\/mutations)?$/);
  if (!match) return json({ error: "NOT_FOUND" }, 404);

  const experimentId = decodeURIComponent(match[1]);
  const isMutation = url.pathname.endsWith("/mutations");

  if (req.method === "GET" && !isMutation) {
    const { data, error } = await db
      .from("kmrl_experiments")
      .select("snapshot,revision,updated_at,owner_id")
      .eq("experiment_id", experimentId)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!data || data.owner_id !== userId) return json({ error: "NOT_FOUND" }, 404);

    return json({
      snapshot: { ...data.snapshot, revision: data.revision },
      updatedAt: data.updated_at,
    });
  }

  if (req.method === "PUT" && !isMutation) {
    const body = await req.json();
    const expectedRevision = Number(body.expectedRevision);
    const snapshot = body.snapshot;
    const requestedRevision = Number(snapshot?.revision);

    if (
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 0 ||
      !snapshot ||
      !Number.isInteger(requestedRevision) ||
      requestedRevision !== expectedRevision + 1
    ) {
      return json({ error: "INVALID_REVISION" }, 422);
    }

    const { data: current, error: readError } = await db
      .from("kmrl_experiments")
      .select("revision,snapshot,owner_id")
      .eq("experiment_id", experimentId)
      .maybeSingle();

    if (readError) return json({ error: readError.message }, 500);
    if (current && current.owner_id !== userId) return json({ error: "NOT_FOUND" }, 404);

    const { data, error } = await db.rpc("kmrl_upsert_experiment", {
      p_experiment_id: experimentId,
      p_expected_revision: expectedRevision,
      p_snapshot: snapshot,
      p_owner_id: userId,
    });

    if (error) {
      if (error.message.startsWith("REVISION_CONFLICT:")) {
        const remoteRevision = Number(error.message.split(":")[1]);
        const { data: remote } = await db
          .from("kmrl_experiments")
          .select("snapshot,revision")
          .eq("experiment_id", experimentId)
          .eq("owner_id", userId)
          .maybeSingle();

        return json({
          error: "REVISION_CONFLICT",
          current: remote ? { ...remote.snapshot, revision: remote.revision } : undefined,
          remoteRevision,
        }, 409);
      }
      return json({ error: error.message }, 500);
    }

    return json({
      snapshot: { ...data.snapshot, revision: data.revision },
      updatedAt: data.updated_at,
    });
  }

  if (req.method === "POST" && isMutation) {
    const { mutation, nextSnapshot } = await req.json();

    if (
      !mutation?.mutationId ||
      !Number.isInteger(mutation.baseRevision) ||
      !nextSnapshot
    ) {
      return json({ error: "INVALID_REQUEST" }, 400);
    }

    const { data, error } = await db.rpc("kmrl_apply_mutation", {
      p_experiment_id: experimentId,
      p_owner_id: userId,
      p_mutation_id: mutation.mutationId,
      p_base_revision: mutation.baseRevision,
      p_command: mutation.command,
      p_snapshot: nextSnapshot,
    });

    if (error) {
      if (error.message.startsWith("REVISION_CONFLICT:")) {
        const remoteRevision = Number(error.message.split(":")[1]);
        const { data: remote } = await db
          .from("kmrl_experiments")
          .select("snapshot,revision")
          .eq("experiment_id", experimentId)
          .eq("owner_id", userId)
          .maybeSingle();

        return json({
          accepted: false,
          duplicate: false,
          conflict: {
            conflictId: `${experimentId}:${mutation.mutationId}`,
            experimentId,
            local: mutation,
            remoteRevision,
            reason: "REMOTE_REVISION_AHEAD",
          },
          snapshot: remote ? { ...remote.snapshot, revision: remote.revision } : undefined,
        }, 409);
      }
      if (error.message === "EXPERIMENT_NOT_FOUND") return json({ error: "NOT_FOUND" }, 404);
      if (error.message === "EXPERIMENT_FORBIDDEN") return json({ error: "NOT_FOUND" }, 404);
      if (error.message === "INVALID_NEXT_REVISION") return json({ error: "INVALID_NEXT_REVISION" }, 422);
      return json({ error: error.message }, 500);
    }

    return json({
      accepted: data.accepted,
      duplicate: data.duplicate,
      snapshot: data.snapshot ? { ...data.snapshot, revision: data.revision } : undefined,
    });
  }

  return json({ error: "METHOD_NOT_ALLOWED" }, 405);
});
