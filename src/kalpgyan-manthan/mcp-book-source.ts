import { readFile } from "node:fs/promises";
import { cacheKey, getOrLoadText } from "./mcp-cache.js";

function isRemote(ref: string): boolean {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

async function loadLocal(sourceRef: string): Promise<string> {
  const bytes = await readFile(sourceRef);
  return bytes.toString("utf8");
}

async function loadViaMcp(sourceRef: string): Promise<string> {
  const base = process.env.KALP_MCP_GATEWAY_URL;
  if (!base) throw new Error("KALP_MCP_GATEWAY_URL is required for remote book intake; external sources must enter through the MCP gateway.");
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
  const payload = await response.json() as { text?: string; content?: string };
  const text = payload.text ?? payload.content;
  if (!text?.trim()) throw new Error("MCP book intake returned no text.");
  return text;
}

export async function loadBookSource(sourceRef: string): Promise<{ text: string; cacheHit: boolean; source: "local" | "mcp" }> {
  const remote = isRemote(sourceRef);
  const key = cacheKey("kalpgyan-book", sourceRef);
  const result = await getOrLoadText(
    key,
    remote ? () => loadViaMcp(sourceRef) : () => loadLocal(sourceRef),
    remote ? "MCP gateway" : "local source",
  );
  return { ...result, source: remote ? "mcp" : "local" };
}
