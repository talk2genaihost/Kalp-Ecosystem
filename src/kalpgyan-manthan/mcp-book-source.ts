import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { cacheKey, getOrLoadText } from "./mcp-cache.js";

function isRemote(ref: string): boolean {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

function normalize(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

async function loadLocal(sourceRef: string): Promise<string> {
  const bytes = await readFile(sourceRef);
  const header = bytes.subarray(0, 5).toString("ascii");
  if (header === "%PDF-") throw new Error("Local PDF intake must enter through the MCP book adapter; direct binary PDF parsing is disabled at this boundary.");
  return normalize(bytes.toString("utf8"));
}

async function loadViaMcp(sourceRef: string): Promise<string> {
  const base = process.env.KALP_MCP_GATEWAY_URL;
  if (!base) throw new Error("KALP_MCP_GATEWAY_URL is required for book intake.");
  const endpoint = process.env.KALP_MCP_BOOK_INTAKE_PATH ?? "/v1/book/intake";
  const url = new URL(endpoint, base.endsWith("/") ? base : base + "/");
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = process.env.KALP_MCP_GATEWAY_TOKEN;
  if (token) headers.authorization = "Bearer " + token;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ sourceRef, contract: "KALP-MCP-BOOK-INTAKE-v0.1" }),
  });
  if (!response.ok) throw new Error("MCP book intake failed: HTTP " + response.status);
  const payload = await response.json() as { text?: string; content?: string; provenance?: unknown };
  const text = payload.text ?? payload.content;
  if (!text?.trim()) throw new Error("MCP book intake returned no text.");
  return normalize(text);
}

export async function loadBookSource(sourceRef: string): Promise<{ text: string; cacheHit: boolean; source: "mcp" }> {
  const key = cacheKey("kalpgyan-book", sourceRef);
  const result = await getOrLoadText(
    key,
    isRemote(sourceRef) ? () => loadViaMcp(sourceRef) : () => loadLocal(sourceRef),
    isRemote(sourceRef) ? "MCP gateway" : "local MCP book adapter",
  );
  return { ...result, source: "mcp" };
}
