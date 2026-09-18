const MAX_CHARS = Number(process.env.GOOGLE_TTS_MAX_CHARS ?? "4500");

export function splitForTts(text: string, maxChars = MAX_CHARS): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized.split(/(?<=[.!?।])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!current) { current = sentence; continue; }
    if ((current.length + 1 + sentence.length) <= maxChars) current += " " + sentence;
    else { chunks.push(current); current = sentence; }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function synthesizeSpeech(text: string, languageCode = "hi-IN"): Promise<{ audioBase64: string; mimeType: string }> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY is required for real TTS.");

  const voiceName = process.env.GOOGLE_TTS_VOICE ?? "hi-IN-Neural2-A";
  const chunks = splitForTts(text);
  if (!chunks.length) throw new Error("TTS received empty text.");
  const audioParts: Buffer[] = [];

  for (const chunk of chunks) {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { text: chunk },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: "MP3", speakingRate: Number(process.env.GOOGLE_TTS_RATE ?? "0.95") },
      }),
    });
    if (!response.ok) throw new Error(`Google TTS failed: HTTP ${response.status}`);
    const data = await response.json() as { audioContent?: string };
    if (!data.audioContent) throw new Error("Google TTS returned no audio.");
    audioParts.push(Buffer.from(data.audioContent, "base64"));
  }

  return { audioBase64: Buffer.concat(audioParts).toString("base64"), mimeType: "audio/mpeg" };
}
