import { readFile } from "node:fs/promises";
import { loadBookSource } from "./mcp-book-source.js";

export async function extractBookText(sourceRef: string): Promise<string> {
  const remote = sourceRef.startsWith("http://") || sourceRef.startsWith("https://");
  const loaded = await loadBookSource(sourceRef);
  if (remote) return normalizeExtractedText(loaded.text);

  const bytes = await readFile(sourceRef);
  const signature = bytes.subarray(0, 5).toString("latin1");
  if (signature === "%PDF-") return normalizeExtractedText(extractPdfText(bytes.toString("latin1")));
  return normalizeExtractedText(loaded.text);
}

function extractPdfText(pdf: string): string {
  const chunks: string[] = [];
  for (const match of pdf.matchAll(/BT([\s\S]*?)ET/g)) {
    const block = match[1];
    for (const s of block.matchAll(/\(([^()]*)\)\s*Tj/g)) chunks.push(s[1]);
    for (const arr of block.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      chunks.push(arr[1].replace(/\([^)]*\)/g, " ").replace(/\d+(?:\.\d+)?/g, " "));
    }
  }
  const cleaned = chunks.join(" ").replace(/\\([\\()])/g, "$1").replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) throw new Error("PDF text extraction produced no text. Scanned/image-only PDFs require an OCR adapter.");
  return cleaned;
}

function normalizeExtractedText(text: string): string {
  const normalized = text.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error("Book intake produced no usable text.");
  return normalized;
}
