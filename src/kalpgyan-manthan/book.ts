import { readFile } from "node:fs/promises";
import { loadBookSource } from "./mcp-book-source.js";

function isRemote(ref: string): boolean {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

function extractPdfText(bytes: Buffer): string {
  const raw = bytes.toString("latin1");
  const chunks: string[] = [];
  for (const block of raw.matchAll(/BT([\s\S]*?)ET/g)) {
    const body = block[1];
    for (const m of body.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
      const value = m[0].replace(/\)\s*Tj$/, "").replace(/^\(/, "").replace(/\\([\\()])/g, "$1");
      if (value.trim()) chunks.push(value);
    }
    for (const m of body.matchAll(/\[(.*?)\]\s*TJ/gs)) {
      const values = [...m[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map(x => x[0].slice(1,-1).replace(/\\([\\()])/g,"$1"));
      if (values.length) chunks.push(values.join(" "));
    }
  }
  return chunks.join(" ");
}

export async function extractBookText(sourceRef: string): Promise<string> {
  if (isRemote(sourceRef)) {
    const loaded = await loadBookSource(sourceRef);
    return loaded.text;
  }
  const bytes = await readFile(sourceRef);
  if (bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
    const text = extractPdfText(bytes).replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
    if (!text) throw new Error("Local PDF contains no extractable text; route scanned PDFs through the MCP OCR/book adapter.");
    return text;
  }
  const loaded = await loadBookSource(sourceRef);
  return loaded.text;
}
