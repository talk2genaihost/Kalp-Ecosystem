import { readFile } from "node:fs/promises";

export async function extractBookText(sourceRef: string): Promise<string> {
  const bytes = sourceRef.startsWith("http://") || sourceRef.startsWith("https://")
    ? Buffer.from(await (await fetch(sourceRef)).arrayBuffer())
    : await readFile(sourceRef);
  const text = bytes.toString("latin1");
  if (/^%PDF-/.test(text)) return extractPdfText(text);
  return bytes.toString("utf8");
}

function extractPdfText(pdf: string): string {
  const chunks: string[] = [];
  for (const match of pdf.matchAll(/BT([\s\S]*?)ET/g)) {
    const block = match[1];
    for (const s of block.matchAll(/\(([^()]*)\)\s*Tj/g)) chunks.push(s[1]);
    for (const arr of block.matchAll(/\[([^\]]*)\]\s*TJ/g)) chunks.push(arr[1].replace(/\([^)]*\)/g, " ").replace(/\d+(?:\.\d+)?/g, " "));
  }
  const cleaned = chunks.join(" ").replace(/\\([\\()])/g, "$1").replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) throw new Error("PDF text extraction produced no text. Scanned/image-only PDFs require an OCR adapter.");
  return cleaned;
}