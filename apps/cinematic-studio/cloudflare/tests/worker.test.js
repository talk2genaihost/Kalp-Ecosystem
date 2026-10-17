import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const TOKEN = "test-only-token";

function makeDb() {
  const profiles = new Map();
  const versions = [];
  const references = [];
  const approvals = [];

  function statement(sql, args = []) {
    return {
      bind(...values) { return statement(sql, values); },
      async first() {
        if (sql.includes("FROM character_profiles WHERE character_id")) {
          const p = profiles.get(args[0]);
          if (!p) return null;
          if (sql.includes("profile_json")) return { ...p };
          return { character_id: p.character_id };
        }
        return null;
      },
      async all() {
        if (sql.includes("FROM character_profiles ORDER BY")) {
          return { results: [...profiles.values()].slice(-Number(args[0] || 50)).map(({ profile_json, ...p }) => p) };
        }
        if (sql.includes("FROM character_profile_versions")) return { results: versions.filter(v => v.character_id === args[0]) };
        if (sql.includes("FROM research_references")) return { results: references.filter(v => v.character_id === args[0]) };
        if (sql.includes("FROM character_approvals")) return { results: approvals.filter(v => v.character_id === args[0]) };
        return { results: [] };
      },
      async run() {
        if (sql.startsWith("INSERT INTO research_references")) {
          references.push({ reference_id: args[0], character_id: args[1], url: args[2], title: args[3], source_type: args[4], notes: args[5], verified: 0 });
        } else if (sql.startsWith("INSERT INTO character_approvals")) {
          approvals.push({ approval_id: args[0], character_id: args[1], version: args[2], decision: args[3], reviewer: args[4], notes: args[5] });
        } else if (sql.startsWith("UPDATE character_profiles")) {
          const p = profiles.get(args[1]);
          if (p) p.status = args[0];
        }
        return { meta: { changes: 1 } };
      }
    };
  }

  return {
    profiles, versions, references, approvals,
    prepare(sql) { return statement(sql); },
    async batch(items) {
      // The Worker batches the initial profile and version inserts.
      for (const item of items) {
        const sql = item.sql;
        const args = item.args;
        if (sql.startsWith("INSERT INTO character_profiles")) {
          if (profiles.has(args[0])) throw new Error("duplicate character");
          profiles.set(args[0], {
            character_id: args[0], display_name: args[1], profile_json: args[2],
            status: "draft", current_version: 1, created_at: "test", updated_at: "test"
          });
        } else if (sql.startsWith("INSERT INTO character_profile_versions")) {
          versions.push({ character_id: args[0], version: 1, change_note: "Initial profile", created_at: "test" });
        }
      }
      return [];
    }
  };
}

// Rebuild prepared statements with inspectable SQL/args for the fake D1 adapter.
const originalMakeDb = makeDb;
function testDb() {
  const db = originalMakeDb();
  const prepare = db.prepare;
  db.prepare = (sql) => {
    const statement = prepare(sql);
    statement.sql = sql;
    const bind = statement.bind;
    statement.bind = (...args) => {
      const bound = bind(...args);
      bound.sql = sql;
      bound.args = args;
      return bound;
    };
    return statement;
  };
  return db;
}

function request(path, { method = "GET", token = TOKEN, body, contentType = "application/json" } = {}) {
  const headers = {};
  if (token !== null) headers.authorization = `Bearer ${token}`;
  if (body !== undefined && contentType) headers["content-type"] = contentType;
  return new Request(`https://example.test${path}`, {
    method, headers, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
  });
}

async function call(req, db = testDb(), token = TOKEN) {
  const res = await worker.fetch(req, { KALP_API_TOKEN: token, KALP_CINEMATIC_DB: db });
  return { res, data: await res.json(), db };
}

test("health endpoint is public and identifies the service", async () => {
  const res = await worker.fetch(request("/health", { token: null }), {});
  assert.equal(res.status, 200);
  assert.equal((await res.json()).storage, "cloudflare-d1");
});

test("data routes reject missing and incorrect bearer tokens", async () => {
  const db = testDb();
  for (const req of [request("/api/characters", { token: null }), request("/api/characters", { token: "wrong" })]) {
    const res = await worker.fetch(req, { KALP_API_TOKEN: TOKEN, KALP_CINEMATIC_DB: db });
    assert.equal(res.status, 401);
  }
});

test("data routes fail closed when token secret or D1 binding is missing", async () => {
  const req = request("/api/characters");
  assert.equal((await worker.fetch(req, { KALP_CINEMATIC_DB: testDb() })).status, 401);
  assert.equal((await worker.fetch(req, { KALP_API_TOKEN: TOKEN })).status, 503);
});

test("create character validates input and stores initial version", async () => {
  const db = testDb();
  const bad = await call(request("/api/characters", { method: "POST", body: { character_id: "bad id", display_name: "Sita", profile: {} } }), db);
  assert.equal(bad.res.status, 400);
  const good = await call(request("/api/characters", { method: "POST", body: { character_id: "SITA_001", display_name: "Sita", profile: { costume: "red" } } }), db);
  assert.equal(good.res.status, 201);
  assert.equal(good.data.version, 1);
  assert.equal(db.profiles.size, 1);
  assert.equal(db.versions.length, 1);
});

test("list and detail return stored profile and related records", async () => {
  const db = testDb();
  await call(request("/api/characters", { method: "POST", body: { character_id: "SITA_001", display_name: "Sita", profile: { costume: "red" } } }), db);
  const list = await call(request("/api/characters?limit=500"), db);
  assert.equal(list.res.status, 200);
  assert.equal(list.data.items.length, 1);
  const detail = await call(request("/api/characters/SITA_001"), db);
  assert.equal(detail.res.status, 200);
  assert.deepEqual(detail.data.profile, { costume: "red" });
  assert.equal(detail.data.versions.length, 1);
});

test("detail for unknown character returns 404", async () => {
  const result = await call(request("/api/characters/UNKNOWN"), testDb());
  assert.equal(result.res.status, 404);
});

test("reference route validates URL and requires an existing character", async () => {
  const db = testDb();
  const missing = await call(request("/api/characters/UNKNOWN/references", { method: "POST", body: { reference_id: "REF1", url: "https://example.com" } }), db);
  assert.equal(missing.res.status, 404);
  await call(request("/api/characters", { method: "POST", body: { character_id: "SITA_001", display_name: "Sita", profile: {} } }), db);
  const bad = await call(request("/api/characters/SITA_001/references", { method: "POST", body: { reference_id: "REF1", url: "javascript:alert(1)" } }), db);
  assert.equal(bad.res.status, 400);
  const good = await call(request("/api/characters/SITA_001/references", { method: "POST", body: { reference_id: "REF1", url: "https://example.com/source" } }), db);
  assert.equal(good.res.status, 201);
});

test("approval route validates decision and records valid approval", async () => {
  const db = testDb();
  const invalid = await call(request("/api/characters/SITA_001/approvals", { method: "POST", body: { approval_id: "A1", version: 1, decision: "maybe", reviewer: "Reviewer" } }), db);
  assert.equal(invalid.res.status, 400);
  const valid = await call(request("/api/characters/SITA_001/approvals", { method: "POST", body: { approval_id: "A1", version: 1, decision: "approved", reviewer: "Reviewer" } }), db);
  assert.equal(valid.res.status, 201);
  assert.equal(db.approvals.length, 1);
});

test("JSON content type, malformed JSON, and oversized body are rejected", async () => {
  const db = testDb();
  const noType = await call(request("/api/characters", { method: "POST", body: "{}", contentType: "text/plain" }), db);
  assert.equal(noType.res.status, 415);
  const malformed = await call(request("/api/characters", { method: "POST", body: "{", contentType: "application/json" }), db);
  assert.equal(malformed.res.status, 400);
  const oversized = await call(request("/api/characters", { method: "POST", body: "x".repeat(256_001), contentType: "application/json" }), db);
  assert.equal(oversized.res.status, 413);
});

test("unknown route returns 404", async () => {
  const result = await call(request("/not-a-route"), testDb());
  assert.equal(result.res.status, 404);
});
