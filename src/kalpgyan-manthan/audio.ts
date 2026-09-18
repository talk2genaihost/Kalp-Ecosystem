import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface AudioArtifact {
  path: string;
  bytes: number;
  format: "mp3";
}

export async function persistMp3(productionId: string, audioBase64: string): Promise<AudioArtifact> {
  const root = process.env.KALPGYAN_OUTPUT_DIR ?? "artifacts/kalpgyan-manthan";
  await mkdir(root, { recursive: true });
  const bytes = Buffer.from(audioBase64, "base64");
  if (bytes.length < 64) throw new Error("Audio mastering gate rejected an empty or invalid MP3 payload.");
  const path = join(root, `${productionId}.mp3`);
  await writeFile(path, bytes);
  return { path, bytes: bytes.length, format: "mp3" };
}
