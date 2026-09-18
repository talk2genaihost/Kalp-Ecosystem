import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function persistMp3(productionId: string, audioBase64: string): Promise<string> {
  const root = process.env.KALPGYAN_OUTPUT_DIR ?? "artifacts/kalpgyan-manthan";
  await mkdir(root, { recursive: true });
  const path = join(root, `${productionId}.mp3`);
  await writeFile(path, Buffer.from(audioBase64, "base64"));
  return path;
}